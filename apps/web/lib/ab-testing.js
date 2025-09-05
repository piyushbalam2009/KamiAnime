// A/B Testing framework for gamification features
import { config } from './config';

class ABTestingFramework {
  constructor() {
    this.activeTests = new Map();
    this.userAssignments = new Map();
    this.testResults = new Map();
    this.conversionEvents = new Set([
      'account_link',
      'badge_unlock',
      'level_up',
      'quest_complete',
      'watchparty_join',
      'streak_milestone'
    ]);
  }

  /**
   * Initialize A/B testing framework
   */
  async initialize() {
    try {
      await this.loadActiveTests();
      await this.loadUserAssignments();
      console.log('🧪 A/B Testing framework initialized');
    } catch (error) {
      console.error('A/B Testing initialization error:', error);
    }
  }

  /**
   * Create a new A/B test
   */
  async createTest(testConfig) {
    try {
      const test = {
        id: testConfig.id || this.generateTestId(),
        name: testConfig.name,
        description: testConfig.description,
        feature: testConfig.feature,
        variants: testConfig.variants, // Array of variant objects
        trafficAllocation: testConfig.trafficAllocation || 0.5, // 50% by default
        startDate: testConfig.startDate || new Date(),
        endDate: testConfig.endDate,
        status: 'active',
        targetMetrics: testConfig.targetMetrics || ['conversion_rate'],
        segmentation: testConfig.segmentation || {},
        createdAt: new Date(),
        createdBy: testConfig.createdBy || 'system'
      };

      // Validate test configuration
      this.validateTestConfig(test);

      // Store test in database
      await this.storeTest(test);
      this.activeTests.set(test.id, test);

      console.log(`🧪 Created A/B test: ${test.name} (${test.id})`);
      return test;

    } catch (error) {
      console.error('Create test error:', error);
      throw error;
    }
  }

  /**
   * Assign user to test variant
   */
  assignUserToTest(userId, testId) {
    try {
      const test = this.activeTests.get(testId);
      if (!test || test.status !== 'active') {
        return null;
      }

      // Check if user already assigned
      const existingAssignment = this.getUserAssignment(userId, testId);
      if (existingAssignment) {
        return existingAssignment;
      }

      // Check traffic allocation
      const hash = this.hashUserId(userId, testId);
      if (hash > test.trafficAllocation) {
        return null; // User not in test
      }

      // Check segmentation criteria
      if (!this.matchesSegmentation(userId, test.segmentation)) {
        return null;
      }

      // Assign to variant based on hash
      const variantIndex = Math.floor(hash * test.variants.length / test.trafficAllocation);
      const variant = test.variants[variantIndex];

      const assignment = {
        userId,
        testId,
        variant: variant.id,
        assignedAt: new Date(),
        exposureEvents: []
      };

      this.userAssignments.set(`${userId}_${testId}`, assignment);
      this.storeUserAssignment(assignment);

      return assignment;

    } catch (error) {
      console.error('User assignment error:', error);
      return null;
    }
  }

  /**
   * Get user's test variant
   */
  getUserVariant(userId, testId) {
    const assignment = this.getUserAssignment(userId, testId);
    return assignment ? assignment.variant : null;
  }

  /**
   * Track test exposure
   */
  async trackExposure(userId, testId, context = {}) {
    try {
      const assignment = this.getUserAssignment(userId, testId);
      if (!assignment) return;

      const exposureEvent = {
        timestamp: new Date(),
        context,
        sessionId: context.sessionId || 'unknown'
      };

      assignment.exposureEvents.push(exposureEvent);
      
      // Log exposure for analytics
      await this.logTestEvent('exposure', {
        userId,
        testId,
        variant: assignment.variant,
        context
      });

    } catch (error) {
      console.error('Track exposure error:', error);
    }
  }

  /**
   * Track conversion event
   */
  async trackConversion(userId, event, metadata = {}) {
    try {
      if (!this.conversionEvents.has(event)) return;

      // Check all active tests for this user
      for (const [key, assignment] of this.userAssignments.entries()) {
        if (assignment.userId === userId) {
          const test = this.activeTests.get(assignment.testId);
          if (test && test.targetMetrics.includes(event)) {
            await this.logTestEvent('conversion', {
              userId,
              testId: assignment.testId,
              variant: assignment.variant,
              event,
              metadata
            });
          }
        }
      }

    } catch (error) {
      console.error('Track conversion error:', error);
    }
  }

  /**
   * Get test results
   */
  async getTestResults(testId) {
    try {
      const test = this.activeTests.get(testId);
      if (!test) {
        throw new Error(`Test ${testId} not found`);
      }

      const { db } = await import('./firebase');
      
      // Get exposure events
      const exposureSnapshot = await db.collection('ab_test_events')
        .where('testId', '==', testId)
        .where('eventType', '==', 'exposure')
        .get();

      // Get conversion events
      const conversionSnapshot = await db.collection('ab_test_events')
        .where('testId', '==', testId)
        .where('eventType', '==', 'conversion')
        .get();

      const exposures = exposureSnapshot.docs.map(doc => doc.data());
      const conversions = conversionSnapshot.docs.map(doc => doc.data());

      // Calculate results by variant
      const results = {};
      
      for (const variant of test.variants) {
        const variantExposures = exposures.filter(e => e.variant === variant.id);
        const variantConversions = conversions.filter(c => c.variant === variant.id);
        
        const uniqueUsers = new Set(variantExposures.map(e => e.userId)).size;
        const conversionCount = variantConversions.length;
        const conversionRate = uniqueUsers > 0 ? conversionCount / uniqueUsers : 0;

        results[variant.id] = {
          variant: variant.id,
          name: variant.name,
          exposures: variantExposures.length,
          uniqueUsers,
          conversions: conversionCount,
          conversionRate,
          confidence: this.calculateConfidence(variantExposures, variantConversions)
        };
      }

      // Calculate statistical significance
      const significance = this.calculateStatisticalSignificance(results);

      return {
        testId,
        testName: test.name,
        status: test.status,
        startDate: test.startDate,
        endDate: test.endDate,
        results,
        significance,
        winner: significance.winner,
        generatedAt: new Date()
      };

    } catch (error) {
      console.error('Get test results error:', error);
      throw error;
    }
  }

  /**
   * Feature flag with A/B testing
   */
  isFeatureEnabled(userId, feature, defaultValue = false) {
    try {
      // Check for active A/B tests for this feature
      for (const [testId, test] of this.activeTests.entries()) {
        if (test.feature === feature && test.status === 'active') {
          const variant = this.getUserVariant(userId, testId);
          if (variant) {
            const variantConfig = test.variants.find(v => v.id === variant);
            return variantConfig ? variantConfig.enabled : defaultValue;
          }
        }
      }

      return defaultValue;
    } catch (error) {
      console.error('Feature flag error:', error);
      return defaultValue;
    }
  }

  /**
   * Get feature configuration for A/B test
   */
  getFeatureConfig(userId, feature, defaultConfig = {}) {
    try {
      for (const [testId, test] of this.activeTests.entries()) {
        if (test.feature === feature && test.status === 'active') {
          const variant = this.getUserVariant(userId, testId);
          if (variant) {
            const variantConfig = test.variants.find(v => v.id === variant);
            return variantConfig ? { ...defaultConfig, ...variantConfig.config } : defaultConfig;
          }
        }
      }

      return defaultConfig;
    } catch (error) {
      console.error('Feature config error:', error);
      return defaultConfig;
    }
  }

  /**
   * Helper methods
   */
  generateTestId() {
    return `test_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  validateTestConfig(test) {
    if (!test.name || !test.feature || !test.variants || test.variants.length < 2) {
      throw new Error('Invalid test configuration');
    }

    if (test.trafficAllocation < 0 || test.trafficAllocation > 1) {
      throw new Error('Traffic allocation must be between 0 and 1');
    }

    // Validate variants
    for (const variant of test.variants) {
      if (!variant.id || !variant.name) {
        throw new Error('Each variant must have id and name');
      }
    }
  }

  hashUserId(userId, testId) {
    // Simple hash function for consistent user assignment
    let hash = 0;
    const str = `${userId}_${testId}`;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) / Math.pow(2, 31); // Normalize to 0-1
  }

  getUserAssignment(userId, testId) {
    return this.userAssignments.get(`${userId}_${testId}`);
  }

  matchesSegmentation(userId, segmentation) {
    // Placeholder for segmentation logic
    // Could check user properties, location, device, etc.
    return true;
  }

  async loadActiveTests() {
    try {
      const { db } = await import('./firebase');
      const snapshot = await db.collection('ab_tests')
        .where('status', '==', 'active')
        .get();

      snapshot.docs.forEach(doc => {
        const test = { id: doc.id, ...doc.data() };
        this.activeTests.set(test.id, test);
      });
    } catch (error) {
      console.error('Load active tests error:', error);
    }
  }

  async loadUserAssignments() {
    try {
      const { db } = await import('./firebase');
      const snapshot = await db.collection('ab_test_assignments')
        .limit(1000) // Limit for performance
        .get();

      snapshot.docs.forEach(doc => {
        const assignment = doc.data();
        this.userAssignments.set(`${assignment.userId}_${assignment.testId}`, assignment);
      });
    } catch (error) {
      console.error('Load user assignments error:', error);
    }
  }

  async storeTest(test) {
    try {
      const { db } = await import('./firebase');
      await db.collection('ab_tests').doc(test.id).set(test);
    } catch (error) {
      console.error('Store test error:', error);
    }
  }

  async storeUserAssignment(assignment) {
    try {
      const { db } = await import('./firebase');
      await db.collection('ab_test_assignments')
        .doc(`${assignment.userId}_${assignment.testId}`)
        .set(assignment);
    } catch (error) {
      console.error('Store user assignment error:', error);
    }
  }

  async logTestEvent(eventType, data) {
    try {
      const { db } = await import('./firebase');
      await db.collection('ab_test_events').add({
        eventType,
        timestamp: new Date(),
        ...data
      });
    } catch (error) {
      console.error('Log test event error:', error);
    }
  }

  calculateConfidence(exposures, conversions) {
    // Simplified confidence calculation
    const n = exposures.length;
    const conversions_count = conversions.length;
    
    if (n === 0) return 0;
    
    const p = conversions_count / n;
    const se = Math.sqrt(p * (1 - p) / n);
    
    // 95% confidence interval
    const margin = 1.96 * se;
    return Math.min(95, Math.max(0, (1 - margin) * 100));
  }

  calculateStatisticalSignificance(results) {
    const variants = Object.values(results);
    if (variants.length < 2) {
      return { significant: false, pValue: 1, winner: null };
    }

    // Simple comparison between first two variants
    const [variantA, variantB] = variants;
    
    // Chi-square test approximation
    const n1 = variantA.uniqueUsers;
    const n2 = variantB.uniqueUsers;
    const x1 = variantA.conversions;
    const x2 = variantB.conversions;
    
    if (n1 === 0 || n2 === 0) {
      return { significant: false, pValue: 1, winner: null };
    }
    
    const p1 = x1 / n1;
    const p2 = x2 / n2;
    const pooled_p = (x1 + x2) / (n1 + n2);
    
    const se = Math.sqrt(pooled_p * (1 - pooled_p) * (1/n1 + 1/n2));
    const z = Math.abs(p1 - p2) / se;
    
    // Approximate p-value
    const pValue = 2 * (1 - this.normalCDF(Math.abs(z)));
    const significant = pValue < 0.05;
    
    let winner = null;
    if (significant) {
      winner = p1 > p2 ? variantA.variant : variantB.variant;
    }
    
    return { significant, pValue, winner, zScore: z };
  }

  normalCDF(x) {
    // Approximation of normal cumulative distribution function
    return 0.5 * (1 + this.erf(x / Math.sqrt(2)));
  }

  erf(x) {
    // Approximation of error function
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;
    
    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);
    
    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    
    return sign * y;
  }

  /**
   * Predefined test templates
   */
  getTestTemplates() {
    return {
      xp_multiplier: {
        name: 'XP Multiplier Test',
        description: 'Test different XP multiplier values',
        feature: 'xp_system',
        variants: [
          { id: 'control', name: 'Control (1x)', enabled: true, config: { multiplier: 1.0 } },
          { id: 'variant_a', name: 'Higher XP (1.5x)', enabled: true, config: { multiplier: 1.5 } }
        ],
        targetMetrics: ['level_up', 'badge_unlock']
      },
      
      badge_notification: {
        name: 'Badge Notification Style',
        description: 'Test different badge notification styles',
        feature: 'badge_notifications',
        variants: [
          { id: 'control', name: 'Standard Notification', enabled: true, config: { style: 'standard' } },
          { id: 'variant_a', name: 'Animated Notification', enabled: true, config: { style: 'animated' } }
        ],
        targetMetrics: ['badge_unlock', 'account_link']
      },
      
      quest_difficulty: {
        name: 'Quest Difficulty Test',
        description: 'Test different quest difficulty levels',
        feature: 'quest_system',
        variants: [
          { id: 'control', name: 'Standard Difficulty', enabled: true, config: { difficulty: 'normal' } },
          { id: 'variant_a', name: 'Easy Difficulty', enabled: true, config: { difficulty: 'easy' } }
        ],
        targetMetrics: ['quest_complete', 'streak_milestone']
      }
    };
  }
}

// Export singleton instance
export const abTesting = new ABTestingFramework();

export default ABTestingFramework;

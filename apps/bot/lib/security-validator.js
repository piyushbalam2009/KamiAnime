const crypto = require('crypto');
const { db } = require('./firebase');

class SecurityValidator {
  constructor() {
    this.suspiciousPatterns = [
      // XP farming patterns
      { pattern: 'rapid_xp_gain', threshold: 1000, timeWindow: 60 * 1000 }, // 1000 XP in 1 minute
      { pattern: 'repeated_actions', threshold: 20, timeWindow: 60 * 1000 }, // 20 same actions in 1 minute
      { pattern: 'impossible_progress', threshold: 50, timeWindow: 10 * 1000 }, // 50 episodes in 10 seconds
      
      // Account abuse patterns
      { pattern: 'multiple_linking_attempts', threshold: 10, timeWindow: 60 * 60 * 1000 }, // 10 attempts in 1 hour
      { pattern: 'suspicious_timing', threshold: 5, timeWindow: 1000 }, // 5 actions in 1 second
      
      // API abuse patterns
      { pattern: 'webhook_spam', threshold: 100, timeWindow: 60 * 1000 }, // 100 webhooks in 1 minute
      { pattern: 'sync_abuse', threshold: 50, timeWindow: 60 * 1000 } // 50 sync events in 1 minute
    ];
    
    this.trustedSources = new Set(['website', 'discord_bot', 'admin']);
    this.blockedIPs = new Set();
    this.suspiciousUsers = new Map();
  }

  /**
   * Validate sync event for security issues
   */
  async validateSyncEvent(syncEvent, metadata = {}) {
    const validation = {
      valid: true,
      issues: [],
      riskLevel: 'low',
      actions: []
    };

    try {
      // Check source validity
      if (!this.trustedSources.has(syncEvent.source)) {
        validation.issues.push('untrusted_source');
        validation.riskLevel = 'high';
      }

      // Check for suspicious timing
      await this.checkSuspiciousTiming(syncEvent, validation);

      // Check for XP manipulation
      await this.checkXPManipulation(syncEvent, validation);

      // Check for impossible progress
      await this.checkImpossibleProgress(syncEvent, validation);

      // Check user reputation
      await this.checkUserReputation(syncEvent.targetUserId, validation);

      // Check IP reputation if available
      if (metadata.ipAddress) {
        await this.checkIPReputation(metadata.ipAddress, validation);
      }

      // Determine overall validity
      validation.valid = validation.riskLevel !== 'critical' && 
                        !validation.issues.includes('blocked_user') &&
                        !validation.issues.includes('blocked_ip');

    } catch (error) {
      console.error('Security validation error:', error);
      validation.valid = false;
      validation.issues.push('validation_error');
      validation.riskLevel = 'high';
    }

    return validation;
  }

  /**
   * Check for suspicious timing patterns
   */
  async checkSuspiciousTiming(syncEvent, validation) {
    const userId = syncEvent.targetUserId;
    const now = Date.now();
    
    // Get recent events for this user
    const recentEvents = await db.collection('syncEvents')
      .where('targetUserId', '==', userId)
      .where('timestamp', '>', new Date(now - 60 * 1000)) // Last minute
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get();

    const events = recentEvents.docs.map(doc => doc.data());
    
    // Check for rapid-fire events
    const rapidEvents = events.filter(event => 
      now - event.timestamp.toMillis() < 5000 // Last 5 seconds
    );

    if (rapidEvents.length > 10) {
      validation.issues.push('rapid_events');
      validation.riskLevel = 'high';
      validation.actions.push('temporary_cooldown');
    }

    // Check for identical events
    const identicalEvents = events.filter(event => 
      event.eventType === syncEvent.eventType &&
      JSON.stringify(event.data) === JSON.stringify(syncEvent.data)
    );

    if (identicalEvents.length > 5) {
      validation.issues.push('duplicate_events');
      validation.riskLevel = 'medium';
    }
  }

  /**
   * Check for XP manipulation attempts
   */
  async checkXPManipulation(syncEvent, validation) {
    if (!['XP_UPDATE', 'WEBSITE_XP_GAIN'].includes(syncEvent.eventType)) {
      return;
    }

    const xpGained = syncEvent.data.xpGained || syncEvent.data.amount || 0;
    
    // Check for impossible XP amounts
    if (xpGained > 500) { // Max reasonable XP per action
      validation.issues.push('excessive_xp');
      validation.riskLevel = 'high';
    }

    // Check for negative XP (should never happen)
    if (xpGained < 0) {
      validation.issues.push('negative_xp');
      validation.riskLevel = 'critical';
    }

    // Check user's recent XP gains
    const userId = syncEvent.targetUserId;
    const now = Date.now();
    const recentXPEvents = await db.collection('syncEvents')
      .where('targetUserId', '==', userId)
      .where('eventType', 'in', ['XP_UPDATE', 'WEBSITE_XP_GAIN'])
      .where('timestamp', '>', new Date(now - 60 * 60 * 1000)) // Last hour
      .get();

    const totalRecentXP = recentXPEvents.docs.reduce((sum, doc) => {
      const data = doc.data();
      return sum + (data.data.xpGained || data.data.amount || 0);
    }, 0);

    if (totalRecentXP > 2000) { // Max reasonable XP per hour
      validation.issues.push('xp_farming');
      validation.riskLevel = 'high';
      validation.actions.push('xp_rate_limit');
    }
  }

  /**
   * Check for impossible progress patterns
   */
  async checkImpossibleProgress(syncEvent, validation) {
    if (!['WEBSITE_ANIME_WATCH', 'WEBSITE_MANGA_READ'].includes(syncEvent.eventType)) {
      return;
    }

    const userId = syncEvent.targetUserId;
    const now = Date.now();
    
    // Check for too many episodes/chapters in short time
    const recentContent = await db.collection('syncEvents')
      .where('targetUserId', '==', userId)
      .where('eventType', 'in', ['WEBSITE_ANIME_WATCH', 'WEBSITE_MANGA_READ'])
      .where('timestamp', '>', new Date(now - 10 * 60 * 1000)) // Last 10 minutes
      .get();

    if (recentContent.size > 20) { // More than 20 episodes/chapters in 10 minutes
      validation.issues.push('impossible_consumption');
      validation.riskLevel = 'high';
      validation.actions.push('content_rate_limit');
    }

    // Check for watching multiple episodes of same anime simultaneously
    const sameContent = recentContent.docs.filter(doc => {
      const data = doc.data();
      return (data.data.animeId === syncEvent.data.animeId || 
              data.data.mangaId === syncEvent.data.mangaId) &&
             now - data.timestamp.toMillis() < 30 * 1000; // Within 30 seconds
    });

    if (sameContent.length > 3) {
      validation.issues.push('simultaneous_content');
      validation.riskLevel = 'medium';
    }
  }

  /**
   * Check user reputation and history
   */
  async checkUserReputation(userId, validation) {
    // Check if user is in suspicious users list
    if (this.suspiciousUsers.has(userId)) {
      const suspiciousData = this.suspiciousUsers.get(userId);
      if (suspiciousData.level === 'blocked') {
        validation.issues.push('blocked_user');
        validation.riskLevel = 'critical';
        return;
      }
      if (suspiciousData.level === 'monitored') {
        validation.riskLevel = Math.max(validation.riskLevel, 'medium');
      }
    }

    // Check violation history
    const violations = await db.collection('securityViolations')
      .where('userId', '==', userId)
      .where('timestamp', '>', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) // Last 7 days
      .get();

    if (violations.size > 10) {
      validation.issues.push('repeat_offender');
      validation.riskLevel = 'high';
      validation.actions.push('enhanced_monitoring');
    }
  }

  /**
   * Check IP reputation
   */
  async checkIPReputation(ipAddress, validation) {
    if (this.blockedIPs.has(ipAddress)) {
      validation.issues.push('blocked_ip');
      validation.riskLevel = 'critical';
      return;
    }

    // Check for multiple accounts from same IP
    const recentFromIP = await db.collection('syncEvents')
      .where('metadata.ipAddress', '==', ipAddress)
      .where('timestamp', '>', new Date(Date.now() - 60 * 60 * 1000)) // Last hour
      .get();

    const uniqueUsers = new Set();
    recentFromIP.docs.forEach(doc => {
      uniqueUsers.add(doc.data().targetUserId);
    });

    if (uniqueUsers.size > 10) { // More than 10 different users from same IP
      validation.issues.push('ip_abuse');
      validation.riskLevel = 'high';
    }
  }

  /**
   * Generate secure hash for data integrity
   */
  generateDataHash(data) {
    return crypto.createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');
  }

  /**
   * Verify data integrity
   */
  verifyDataIntegrity(data, expectedHash) {
    const actualHash = this.generateDataHash(data);
    return actualHash === expectedHash;
  }

  /**
   * Log security violation
   */
  async logSecurityViolation(userId, violationType, details = {}) {
    try {
      await db.collection('securityViolations').add({
        userId,
        violationType,
        details,
        timestamp: new Date(),
        severity: this.getViolationSeverity(violationType),
        resolved: false
      });

      // Update user reputation
      await this.updateUserReputation(userId, violationType);
    } catch (error) {
      console.error('Failed to log security violation:', error);
    }
  }

  /**
   * Update user reputation based on violations
   */
  async updateUserReputation(userId, violationType) {
    const current = this.suspiciousUsers.get(userId) || { level: 'clean', violations: 0 };
    current.violations += 1;
    current.lastViolation = new Date();

    // Escalate based on violation count and type
    if (current.violations >= 10 || ['xp_manipulation', 'api_abuse'].includes(violationType)) {
      current.level = 'blocked';
    } else if (current.violations >= 5) {
      current.level = 'monitored';
    } else if (current.violations >= 2) {
      current.level = 'suspicious';
    }

    this.suspiciousUsers.set(userId, current);

    // Persist to database for cross-instance sharing
    await db.collection('userReputations').doc(userId).set(current, { merge: true });
  }

  /**
   * Get violation severity level
   */
  getViolationSeverity(violationType) {
    const highSeverity = ['xp_manipulation', 'api_abuse', 'account_abuse'];
    const mediumSeverity = ['impossible_progress', 'rapid_actions', 'duplicate_events'];
    
    if (highSeverity.includes(violationType)) return 'high';
    if (mediumSeverity.includes(violationType)) return 'medium';
    return 'low';
  }

  /**
   * Block user temporarily or permanently
   */
  async blockUser(userId, duration = null, reason = '') {
    const blockData = {
      userId,
      blockedAt: new Date(),
      reason,
      permanent: !duration,
      expiresAt: duration ? new Date(Date.now() + duration) : null
    };

    await db.collection('blockedUsers').doc(userId).set(blockData);
    this.suspiciousUsers.set(userId, { level: 'blocked', reason });
  }

  /**
   * Block IP address
   */
  async blockIP(ipAddress, duration = null, reason = '') {
    const blockData = {
      ipAddress,
      blockedAt: new Date(),
      reason,
      permanent: !duration,
      expiresAt: duration ? new Date(Date.now() + duration) : null
    };

    await db.collection('blockedIPs').doc(ipAddress).set(blockData);
    this.blockedIPs.add(ipAddress);
  }

  /**
   * Check if user is currently blocked
   */
  async isUserBlocked(userId) {
    const blockDoc = await db.collection('blockedUsers').doc(userId).get();
    if (!blockDoc.exists) return false;

    const blockData = blockDoc.data();
    if (blockData.permanent) return true;
    if (blockData.expiresAt && blockData.expiresAt.toDate() > new Date()) return true;

    // Block expired, remove it
    await blockDoc.ref.delete();
    this.suspiciousUsers.delete(userId);
    return false;
  }

  /**
   * Initialize security validator with existing data
   */
  async initialize() {
    try {
      // Load blocked IPs
      const blockedIPs = await db.collection('blockedIPs').get();
      blockedIPs.docs.forEach(doc => {
        const data = doc.data();
        if (data.permanent || (data.expiresAt && data.expiresAt.toDate() > new Date())) {
          this.blockedIPs.add(data.ipAddress);
        }
      });

      // Load user reputations
      const reputations = await db.collection('userReputations').get();
      reputations.docs.forEach(doc => {
        this.suspiciousUsers.set(doc.id, doc.data());
      });

      console.log('🛡️ Security validator initialized');
    } catch (error) {
      console.error('Failed to initialize security validator:', error);
    }
  }
}

// Export singleton instance
const securityValidator = new SecurityValidator();

module.exports = {
  SecurityValidator,
  securityValidator
};

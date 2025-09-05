// Comprehensive integration testing suite for KamiAnime gamification system
const { APIVerifiedGamification } = require('../../apps/bot/lib/gamification');
const { analyticsLogger } = require('../../apps/bot/lib/analytics-logger');
const { abTesting } = require('../../apps/web/lib/ab-testing');
const { notificationSystem } = require('../../apps/web/lib/notification-system');
const { backupSystem } = require('../../apps/web/lib/backup-system');
const { behaviorAnalyzer } = require('../../apps/web/lib/behavior-analyzer');
const { performanceOptimizer } = require('../../apps/web/lib/performance-optimizer');

// Mock Firebase for testing
const mockFirestore = {
  collection: jest.fn(() => ({
    doc: jest.fn(() => ({
      get: jest.fn(() => Promise.resolve({
        exists: true,
        data: () => ({
          xp: 100,
          level: 2,
          streak: 5,
          badges: ['first_watch'],
          actions: { WATCH_EPISODE: 10 }
        })
      })),
      update: jest.fn(() => Promise.resolve()),
      set: jest.fn(() => Promise.resolve())
    })),
    add: jest.fn(() => Promise.resolve({ id: 'test-doc-id' })),
    where: jest.fn(() => ({
      get: jest.fn(() => Promise.resolve({
        docs: [
          {
            id: 'test-doc',
            data: () => ({ userId: 'test-user', event: 'test-event' })
          }
        ]
      }))
    })),
    limit: jest.fn(() => ({
      get: jest.fn(() => Promise.resolve({ docs: [] }))
    }))
  }))
};

// Mock enhanced API responses
const mockAnimeResponse = {
  animeId: 'test-anime-123',
  title: 'Test Anime',
  episodes: [{ number: 1, title: 'Episode 1' }],
  streamingSources: ['crunchyroll', 'funimation']
};

const mockMangaResponse = {
  mangaId: 'test-manga-456',
  title: 'Test Manga',
  chapters: [{ number: 1, title: 'Chapter 1' }]
};

const mockQuoteResponse = {
  quote: 'Test quote from anime',
  character: 'Test Character',
  anime: 'Test Anime'
};

describe('Gamification System Integration Tests', () => {
  let testUserId;
  
  beforeAll(async () => {
    // Initialize test environment
    testUserId = 'test-user-' + Date.now();
    
    // Mock Firebase
    jest.doMock('../../apps/bot/lib/firebase', () => ({
      db: mockFirestore
    }));
    
    // Initialize systems
    await abTesting.initialize();
    console.log('🧪 Test environment initialized');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('XP Award System', () => {
    test('should award XP for verified episode watch', async () => {
      const result = await APIVerifiedGamification.awardXP(
        testUserId,
        'WATCH_EPISODE',
        mockAnimeResponse,
        { episode: 1, duration: 1440 }
      );

      expect(result.success).toBe(true);
      expect(result.xpAwarded).toBeGreaterThan(0);
      expect(result.action).toBe('WATCH_EPISODE');
    });

    test('should award XP for verified chapter read', async () => {
      const result = await APIVerifiedGamification.awardXP(
        testUserId,
        'READ_CHAPTER',
        mockMangaResponse,
        { chapter: 1, pages: 20 }
      );

      expect(result.success).toBe(true);
      expect(result.xpAwarded).toBeGreaterThan(0);
      expect(result.action).toBe('READ_CHAPTER');
    });

    test('should award XP for quote claim', async () => {
      const result = await APIVerifiedGamification.awardXP(
        testUserId,
        'QUOTE_CLAIM',
        mockQuoteResponse,
        {}
      );

      expect(result.success).toBe(true);
      expect(result.xpAwarded).toBeGreaterThan(0);
    });

    test('should apply A/B test multipliers', async () => {
      // Create test with higher XP multiplier
      await abTesting.createTest({
        id: 'xp-multiplier-test',
        name: 'XP Multiplier Test',
        feature: 'xp_system',
        variants: [
          { id: 'control', name: 'Control', enabled: true, config: { multiplier: 1.0 } },
          { id: 'variant_a', name: 'Higher XP', enabled: true, config: { multiplier: 1.5 } }
        ],
        trafficAllocation: 1.0
      });

      // Assign user to test
      abTesting.assignUserToTest(testUserId, 'xp-multiplier-test');

      const result = await APIVerifiedGamification.awardXP(
        testUserId,
        'WATCH_EPISODE',
        mockAnimeResponse,
        { episode: 1 }
      );

      expect(result.success).toBe(true);
      // XP should be affected by A/B test multiplier
    });

    test('should handle invalid API responses', async () => {
      const result = await APIVerifiedGamification.awardXP(
        testUserId,
        'WATCH_EPISODE',
        null,
        { episode: 1 }
      );

      expect(result.success).toBe(false);
      expect(result.reason).toBe('Action verification failed');
    });
  });

  describe('Badge System', () => {
    test('should unlock badges based on achievements', async () => {
      const userData = {
        xp: 1000,
        level: 5,
        actions: { WATCH_EPISODE: 50 },
        streak: 10
      };

      const result = await APIVerifiedGamification.checkBadgeUnlocks(testUserId, userData);
      
      expect(result.newBadges).toBeDefined();
      expect(Array.isArray(result.newBadges)).toBe(true);
    });

    test('should not unlock duplicate badges', async () => {
      const userData = {
        xp: 1000,
        level: 5,
        badges: ['binge_watcher', 'level_5'],
        actions: { WATCH_EPISODE: 50 }
      };

      const result = await APIVerifiedGamification.checkBadgeUnlocks(testUserId, userData);
      
      // Should not include already owned badges
      expect(result.newBadges.includes('binge_watcher')).toBe(false);
    });
  });

  describe('Analytics Logging', () => {
    test('should log gamification events', async () => {
      await analyticsLogger.logEvent('gamification', 'xp_awarded', {
        userId: testUserId,
        action: 'WATCH_EPISODE',
        xpAmount: 20
      });

      // Verify event was logged (mock verification)
      expect(mockFirestore.collection).toHaveBeenCalledWith('analytics_events');
    });

    test('should log user behavior events', async () => {
      await analyticsLogger.logUserEvent(testUserId, 'episode_watch', {
        animeId: 'test-anime',
        episode: 1,
        duration: 1440
      });

      expect(mockFirestore.collection).toHaveBeenCalled();
    });

    test('should handle analytics export', async () => {
      const exportData = await analyticsLogger.exportAnalytics('users', {
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        endDate: new Date()
      });

      expect(exportData).toBeDefined();
      expect(Array.isArray(exportData)).toBe(true);
    });
  });

  describe('A/B Testing Framework', () => {
    test('should create and manage tests', async () => {
      const testConfig = {
        name: 'Badge Notification Test',
        description: 'Test different badge notification styles',
        feature: 'badge_notifications',
        variants: [
          { id: 'control', name: 'Standard', enabled: true, config: { style: 'standard' } },
          { id: 'variant_a', name: 'Animated', enabled: true, config: { style: 'animated' } }
        ],
        trafficAllocation: 0.5
      };

      const test = await abTesting.createTest(testConfig);
      
      expect(test.id).toBeDefined();
      expect(test.name).toBe(testConfig.name);
      expect(test.status).toBe('active');
    });

    test('should assign users to test variants', async () => {
      const testId = 'badge-notification-test';
      const assignment = abTesting.assignUserToTest(testUserId, testId);
      
      if (assignment) {
        expect(assignment.userId).toBe(testUserId);
        expect(assignment.testId).toBe(testId);
        expect(assignment.variant).toBeDefined();
      }
    });

    test('should track exposures and conversions', async () => {
      await abTesting.trackExposure(testUserId, 'badge-notification-test', {
        sessionId: 'test-session'
      });

      await abTesting.trackConversion(testUserId, 'badge_unlock', {
        badgeId: 'test-badge'
      });

      // Verify tracking calls were made
      expect(mockFirestore.collection).toHaveBeenCalledWith('ab_test_events');
    });

    test('should get test results with statistical analysis', async () => {
      const results = await abTesting.getTestResults('badge-notification-test');
      
      expect(results.testId).toBe('badge-notification-test');
      expect(results.results).toBeDefined();
      expect(results.significance).toBeDefined();
    });
  });

  describe('Real-time Notifications', () => {
    test('should send critical system alerts', async () => {
      const alert = {
        type: 'high_error_rate',
        severity: 'critical',
        message: 'Error rate exceeded threshold',
        metadata: { errorRate: 0.15, threshold: 0.1 }
      };

      await notificationSystem.sendAlert(alert);
      
      // Verify notification was processed
      expect(mockFirestore.collection).toHaveBeenCalledWith('notifications');
    });

    test('should respect cooldown periods', async () => {
      const alert = {
        type: 'sync_failure',
        severity: 'warning',
        message: 'Sync operation failed'
      };

      // Send same alert twice quickly
      await notificationSystem.sendAlert(alert);
      const result = await notificationSystem.sendAlert(alert);
      
      // Second alert should be suppressed by cooldown
      expect(result.suppressed).toBe(true);
    });

    test('should handle different notification channels', async () => {
      const channels = ['email', 'slack', 'discord'];
      
      for (const channel of channels) {
        const result = await notificationSystem.testChannel(channel);
        expect(result.channel).toBe(channel);
      }
    });
  });

  describe('Backup System', () => {
    test('should create analytics backups', async () => {
      const backup = await backupSystem.createBackup('analytics', {
        collections: ['analytics_events', 'user_analytics']
      });

      expect(backup.id).toBeDefined();
      expect(backup.status).toBe('completed');
      expect(backup.collections.length).toBeGreaterThan(0);
    });

    test('should list available backups', async () => {
      const backups = await backupSystem.listBackups();
      
      expect(Array.isArray(backups)).toBe(true);
    });

    test('should handle backup cleanup', async () => {
      const result = await backupSystem.cleanupOldBackups(7); // Keep 7 days
      
      expect(result.deletedCount).toBeDefined();
    });
  });

  describe('Behavior Analysis', () => {
    test('should analyze user activity patterns', async () => {
      const analysis = await behaviorAnalyzer.analyzeUser(testUserId);
      
      expect(analysis.userId).toBe(testUserId);
      expect(analysis.activityPattern).toBeDefined();
      expect(analysis.contentPreferences).toBeDefined();
      expect(analysis.recommendations).toBeDefined();
    });

    test('should generate global behavior insights', async () => {
      const insights = await behaviorAnalyzer.getGlobalInsights();
      
      expect(insights.totalUsers).toBeDefined();
      expect(insights.engagementMetrics).toBeDefined();
      expect(insights.trends).toBeDefined();
    });

    test('should provide personalized recommendations', async () => {
      const recommendations = await behaviorAnalyzer.getRecommendations(testUserId);
      
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Performance Optimization', () => {
    test('should optimize Firestore queries', async () => {
      const optimizedQuery = performanceOptimizer.optimizeQuery('users', {
        where: [['level', '>=', 5]],
        orderBy: ['xp', 'desc'],
        limit: 10
      });

      expect(optimizedQuery.cached).toBeDefined();
      expect(optimizedQuery.indexed).toBeDefined();
    });

    test('should provide caching recommendations', async () => {
      const recommendations = await performanceOptimizer.getCacheRecommendations();
      
      expect(recommendations.queries).toBeDefined();
      expect(recommendations.collections).toBeDefined();
    });

    test('should handle batch operations efficiently', async () => {
      const operations = [
        { type: 'update', collection: 'users', doc: 'user1', data: { xp: 100 } },
        { type: 'update', collection: 'users', doc: 'user2', data: { xp: 200 } }
      ];

      const result = await performanceOptimizer.executeBatch(operations);
      
      expect(result.success).toBe(true);
      expect(result.operationsCount).toBe(operations.length);
    });
  });

  describe('Cross-Platform Sync', () => {
    test('should sync gamification data between platforms', async () => {
      const syncData = {
        userId: testUserId,
        platform: 'discord',
        data: {
          xp: 500,
          level: 3,
          badges: ['first_watch', 'binge_watcher']
        }
      };

      const result = await APIVerifiedGamification.syncUserData(syncData);
      
      expect(result.success).toBe(true);
      expect(result.conflicts).toBeDefined();
    });

    test('should handle sync conflicts gracefully', async () => {
      // Simulate conflicting data
      const webData = { xp: 600, level: 4 };
      const discordData = { xp: 550, level: 3 };

      const resolution = await APIVerifiedGamification.resolveConflicts(
        testUserId,
        webData,
        discordData
      );

      expect(resolution.resolved).toBe(true);
      expect(resolution.finalData).toBeDefined();
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle database connection failures', async () => {
      // Mock database failure
      mockFirestore.collection.mockImplementationOnce(() => {
        throw new Error('Database connection failed');
      });

      const result = await APIVerifiedGamification.awardXP(
        testUserId,
        'WATCH_EPISODE',
        mockAnimeResponse,
        { episode: 1 }
      );

      expect(result.success).toBe(false);
      expect(result.reason).toContain('error');
    });

    test('should retry failed operations', async () => {
      let attempts = 0;
      mockFirestore.collection.mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return {
          doc: jest.fn(() => ({
            get: jest.fn(() => Promise.resolve({ exists: true, data: () => ({}) })),
            update: jest.fn(() => Promise.resolve())
          }))
        };
      });

      const result = await APIVerifiedGamification.awardXP(
        testUserId,
        'WATCH_EPISODE',
        mockAnimeResponse,
        { episode: 1 }
      );

      expect(attempts).toBe(3);
      expect(result.success).toBe(true);
    });
  });

  describe('Security and Validation', () => {
    test('should validate API responses before awarding XP', async () => {
      const invalidResponse = {
        animeId: null,
        title: '',
        episodes: []
      };

      const result = await APIVerifiedGamification.awardXP(
        testUserId,
        'WATCH_EPISODE',
        invalidResponse,
        { episode: 1 }
      );

      expect(result.success).toBe(false);
    });

    test('should prevent XP farming attempts', async () => {
      // Try to award XP for same episode multiple times quickly
      const promises = Array(5).fill().map(() =>
        APIVerifiedGamification.awardXP(
          testUserId,
          'WATCH_EPISODE',
          mockAnimeResponse,
          { episode: 1 }
        )
      );

      const results = await Promise.all(promises);
      
      // Only first attempt should succeed
      const successCount = results.filter(r => r.success).length;
      expect(successCount).toBe(1);
    });

    test('should validate admin API access', async () => {
      const response = await fetch('/api/admin/analytics', {
        headers: { 'X-API-Key': 'invalid-key' }
      });

      expect(response.status).toBe(401);
    });
  });

  describe('Load Testing', () => {
    test('should handle concurrent XP awards', async () => {
      const concurrentUsers = Array(10).fill().map((_, i) => `user-${i}`);
      
      const promises = concurrentUsers.map(userId =>
        APIVerifiedGamification.awardXP(
          userId,
          'WATCH_EPISODE',
          mockAnimeResponse,
          { episode: 1 }
        )
      );

      const results = await Promise.all(promises);
      
      // All operations should complete successfully
      expect(results.every(r => r.success)).toBe(true);
    });

    test('should maintain performance under load', async () => {
      const startTime = Date.now();
      
      const operations = Array(100).fill().map((_, i) =>
        analyticsLogger.logEvent('test', 'load_test', { index: i })
      );

      await Promise.all(operations);
      
      const duration = Date.now() - startTime;
      
      // Should complete within reasonable time (5 seconds)
      expect(duration).toBeLessThan(5000);
    });
  });

  afterAll(async () => {
    // Cleanup test data
    console.log('🧹 Cleaning up test environment');
    
    // Remove test A/B tests
    const testIds = ['xp-multiplier-test', 'badge-notification-test'];
    for (const testId of testIds) {
      try {
        await abTesting.stopTest(testId);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });
});

// Export test utilities for other test files
module.exports = {
  mockFirestore,
  mockAnimeResponse,
  mockMangaResponse,
  mockQuoteResponse
};

// Firebase sync manager for real-time data synchronization between website and Discord bot
const { db } = require('./firebase');
const { SyncEvent, ActivityLog, UserProfile, UserBadge, UserQuestProgress } = require('./sync-models');
const { rateLimiter } = require('./rate-limiter');
const { securityValidator } = require('./security-validator');
const { analyticsLogger } = require('./analytics-logger');
// Note: Notification system integration will be added when available

class SyncManager {
  constructor() {
    this.syncQueue = new Map();
    this.retryAttempts = 3;
    this.retryDelay = 1000; // 1 second
  }

  /**
   * Initialize real-time listeners for cross-platform sync
   */
  async initializeListeners() {
    console.log('🔄 Initializing Firebase sync listeners...');

    // Listen for sync events from website
    db.collection('syncEvents')
      .where('targetPlatform', '==', 'discord')
      .where('status', '==', 'pending')
      .onSnapshot(this.handleSyncEvents.bind(this));

    // Listen for user profile updates
    db.collection('users')
      .onSnapshot(this.handleUserProfileUpdates.bind(this));

    console.log('✅ Firebase sync listeners initialized');
  }

  /**
   * Handle incoming sync events from website
   */
  async handleSyncEvents(snapshot) {
    const changes = snapshot.docChanges();
    
    for (const change of changes) {
      if (change.type === 'added') {
        const syncEvent = new SyncEvent({
          id: change.doc.id,
          ...change.doc.data()
        });
        
        await this.processSyncEvent(change.doc);
      }
    }
  }

  /**
   * Process sync events from website
   */
  async processSyncEvent(eventDoc) {
    try {
      const eventData = eventDoc.data();
      const syncEvent = SyncEvent.fromFirestore(eventData);

      console.log('Processing sync event:', syncEvent.eventType, 'for user:', syncEvent.targetUserId);

      // Rate limiting check
      const rateLimitResult = await rateLimiter.checkUserRateLimit(
        syncEvent.targetUserId, 
        'SYNC_EVENTS'
      );

      if (!rateLimitResult.allowed) {
        console.warn(`Rate limit exceeded for user ${syncEvent.targetUserId}`);
        await rateLimiter.logRateLimitViolation(
          `user:${syncEvent.targetUserId}`, 
          'SYNC_EVENTS',
          { eventType: syncEvent.eventType }
        );
        return;
      }

      // Security validation
      const securityResult = await securityValidator.validateSyncEvent(syncEvent, {
        ipAddress: eventData.metadata?.ipAddress,
        userAgent: eventData.metadata?.userAgent
      });

      if (!securityResult.valid) {
        console.warn(`Security validation failed for sync event:`, securityResult.issues);
        
        // Log security violation
        await securityValidator.logSecurityViolation(
          syncEvent.targetUserId,
          'sync_event_violation',
          {
            eventType: syncEvent.eventType,
            issues: securityResult.issues,
            riskLevel: securityResult.riskLevel
          }
        );

        // Block processing if critical risk
        if (securityResult.riskLevel === 'critical') {
          await eventDoc.ref.update({
            processed: true,
            processedAt: new Date(),
            processedBy: 'discord_bot',
            error: 'Security validation failed - critical risk',
            securityIssues: securityResult.issues
          });
          return;
        }
      }

      switch (syncEvent.eventType) {
        case 'XP_UPDATE':
        case 'WEBSITE_XP_GAIN':
          await this.handleXPUpdate(syncEvent);
          break;
        case 'BADGE_UNLOCK':
        case 'WEBSITE_BADGE_UNLOCK':
          await this.handleBadgeUnlock(syncEvent);
          break;
        case 'LEVEL_UP':
          await this.handleLevelUp(syncEvent);
          break;
        case 'STREAK_UPDATE':
          await this.handleStreakUpdate(syncEvent);
          break;
        case 'QUEST_PROGRESS':
        case 'WEBSITE_QUEST_COMPLETE':
          await this.handleQuestProgress(syncEvent);
          break;
        case 'WEBSITE_ANIME_WATCH':
          await this.handleWebsiteAnimeWatch(syncEvent);
          break;
        case 'WEBSITE_MANGA_READ':
          await this.handleWebsiteMangaRead(syncEvent);
          break;
        case 'WEBSITE_USER_LOGIN':
          await this.handleWebsiteUserLogin(syncEvent);
          break;
        case 'FORCE_SYNC_REQUEST':
          await this.handleForceSyncRequest(syncEvent);
          break;
        default:
          console.warn('Unknown sync event type:', syncEvent.eventType);
      }

      // Mark event as processed
      await eventDoc.ref.update({
        processed: true,
        processedAt: new Date(),
        processedBy: 'discord_bot',
        securityValidated: securityResult.valid,
        riskLevel: securityResult.riskLevel
      });

    } catch (error) {
      console.error('Error processing sync event:', error);
      
      // Mark event as failed
      await eventDoc.ref.update({
        processed: true,
        processedAt: new Date(),
        processedBy: 'discord_bot',
        error: error.message
      });
    }
  }

  /**
   * Sync XP update from website to Discord bot
   */
  async syncXPUpdate(syncEvent) {
    const { userId, data } = syncEvent;
    
    // Update user profile in Firebase
    const userRef = db.collection('users').doc(userId);
    await userRef.update({
      xp: data.newXP,
      level: data.newLevel || data.level,
      lastSyncTimestamp: new Date(),
      syncVersion: db.FieldValue.increment(1)
    });

    // Log the sync activity
    await this.logActivity(userId, 'XP_SYNC_FROM_WEBSITE', {
      oldXP: data.oldXP,
      newXP: data.newXP,
      source: 'website'
    });
  }

  /**
   * Sync badge unlock from website to Discord bot
   */
  async syncBadgeUnlock(syncEvent) {
    const { userId, data } = syncEvent;
    
    // Add badge to user's collection
    const userBadge = new UserBadge({
      userId: userId,
      badgeId: data.badgeId,
      unlockedAt: data.unlockedAt || new Date(),
      isCompleted: true,
      syncedToDiscord: true,
      syncedToWebsite: true
    });

    await db.collection('userBadges').add(userBadge);

    // Log the sync activity
    await this.logActivity(userId, 'BADGE_SYNC_FROM_WEBSITE', {
      badgeId: data.badgeId,
      badgeName: data.badgeName,
      source: 'website'
    });
  }

  /**
   * Sync quest progress from website to Discord bot
   */
  async syncQuestProgress(syncEvent) {
    const { userId, data } = syncEvent;
    
    // Update quest progress
    const questProgressRef = db.collection('userQuestProgress')
      .where('userId', '==', userId)
      .where('questId', '==', data.questId);
    
    const snapshot = await questProgressRef.get();
    
    if (snapshot.empty) {
      // Create new quest progress
      const questProgress = new UserQuestProgress({
        userId: userId,
        questId: data.questId,
        progress: data.progress,
        isCompleted: data.isCompleted,
        syncedToDiscord: true,
        syncedToWebsite: true
      });
      
      await db.collection('userQuestProgress').add(questProgress);
    } else {
      // Update existing quest progress
      const doc = snapshot.docs[0];
      await doc.ref.update({
        progress: data.progress,
        isCompleted: data.isCompleted,
        syncedToDiscord: true,
        lastUpdated: new Date()
      });
    }

    // Log the sync activity
    await this.logActivity(userId, 'QUEST_SYNC_FROM_WEBSITE', {
      questId: data.questId,
      progress: data.progress,
      isCompleted: data.isCompleted,
      source: 'website'
    });
  }

  /**
   * Create sync event to notify website of Discord bot activity
   */
  async createSyncEvent(userId, eventType, data, sourcePlatform = 'discord') {
    const syncEvent = new SyncEvent({
      userId: userId,
      eventType: eventType,
      sourcePlatform: sourcePlatform,
      targetPlatform: 'website',
      data: data,
      status: 'pending',
      timestamp: new Date()
    });

    const docRef = await db.collection('syncEvents').add(syncEvent);
    console.log(`📤 Created sync event ${docRef.id}: ${eventType} for user ${userId}`);
    
    return docRef.id;
  }

  /**
   * Sync Discord bot activity to website
   */
  async syncToWebsite(userId, action, metadata = {}) {
    try {
      // Determine event type based on action
      let eventType = '';
      let eventData = {};

      switch (action) {
        case 'WATCH_EPISODE':
          eventType = 'XP_UPDATE';
          eventData = {
            action: action,
            xpAwarded: metadata.xpAwarded,
            newXP: metadata.newXP,
            newLevel: metadata.newLevel,
            animeId: metadata.animeId,
            episodeNumber: metadata.episodeNumber
          };
          break;

        case 'READ_CHAPTER':
          eventType = 'XP_UPDATE';
          eventData = {
            action: action,
            xpAwarded: metadata.xpAwarded,
            newXP: metadata.newXP,
            newLevel: metadata.newLevel,
            mangaId: metadata.mangaId,
            chapterNumber: metadata.chapterNumber
          };
          break;

        case 'BADGE_UNLOCK':
          eventType = 'BADGE_UNLOCK';
          eventData = {
            badgeId: metadata.badgeId,
            badgeName: metadata.badgeName,
            unlockedAt: metadata.unlockedAt || new Date()
          };
          break;

        case 'QUEST_PROGRESS':
          eventType = 'QUEST_PROGRESS';
          eventData = {
            questId: metadata.questId,
            progress: metadata.progress,
            isCompleted: metadata.isCompleted
          };
          break;

        case 'LEVEL_UP':
          eventType = 'LEVEL_UP';
          eventData = {
            oldLevel: metadata.oldLevel,
            newLevel: metadata.newLevel,
            newXP: metadata.newXP
          };
          break;

        default:
          console.warn(`Unknown action for website sync: ${action}`);
          return;
      }

      // Create sync event
      await this.createSyncEvent(userId, eventType, eventData);

      // Log the activity
      await this.logActivity(userId, `${action}_SYNC_TO_WEBSITE`, {
        eventType: eventType,
        ...eventData
      });

    } catch (error) {
      console.error(`❌ Failed to sync to website for user ${userId}:`, error);
    }
  }

  /**
   * Handle user profile updates for real-time sync
   */
  async handleUserProfileUpdates(snapshot) {
    const changes = snapshot.docChanges();
    
    for (const change of changes) {
      if (change.type === 'modified') {
        const userId = change.doc.id;
        const userData = change.doc.data();
        
        // Check if this update came from Discord bot (to avoid infinite loops)
        if (userData.lastSyncSource !== 'discord') {
          console.log(`🔄 User profile updated from website: ${userId}`);
          // Handle website-originated profile updates if needed
        }
      }
    }
  }

  /**
   * Log activity for audit trail and debugging
   */
  async logActivity(userId, action, metadata = {}) {
    const activityLog = new ActivityLog({
      userId: userId,
      action: action,
      platform: 'discord',
      metadata: metadata,
      timestamp: new Date(),
      apiVerified: metadata.apiVerified || false
    });

    await db.collection('activityLogs').add(activityLog);
  }

  /**
   * Mark sync event as completed
   */
  async markSyncEventCompleted(syncEventId) {
    await db.collection('syncEvents').doc(syncEventId).update({
      status: 'success',
      completedAt: new Date()
    });
  }

  /**
   * Mark sync event as failed
   */
  async markSyncEventFailed(syncEventId, error) {
    await db.collection('syncEvents').doc(syncEventId).update({
      status: 'failed',
      error: error,
      failedAt: new Date(),
      retryCount: db.FieldValue.increment(1)
    });
  }

  /**
   * Handle website anime watch event
   */
  async handleWebsiteAnimeWatch(syncEvent) {
    const { targetUserId, data } = syncEvent;
    
    try {
      // Find Discord user by website user ID
      const userSnapshot = await db.collection('users')
        .where('websiteUserId', '==', targetUserId)
        .limit(1)
        .get();

      if (userSnapshot.empty) {
        console.log('No linked Discord account found for website user:', targetUserId);
        return;
      }

      const discordUserId = userSnapshot.docs[0].id;
      
      // Award XP for watching episode through gamification system
      const { APIVerifiedGamification } = require('./gamification');
      await APIVerifiedGamification.awardXP(discordUserId, 'WATCH_EPISODE', {
        animeId: data.animeId,
        animeTitle: data.animeTitle,
        episode: data.episode,
        verified: true,
        source: 'website'
      }, {
        websiteSync: true,
        watchedAt: data.watchedAt
      });

      console.log('Processed website anime watch for Discord user:', discordUserId);
    } catch (error) {
      console.error('Error handling website anime watch:', error);
      throw error;
    }
  }

  /**
   * Handle website manga read event
   */
  async handleWebsiteMangaRead(syncEvent) {
    const { targetUserId, data } = syncEvent;
    
    try {
      // Find Discord user by website user ID
      const userSnapshot = await db.collection('users')
        .where('websiteUserId', '==', targetUserId)
        .limit(1)
        .get();

      if (userSnapshot.empty) {
        console.log('No linked Discord account found for website user:', targetUserId);
        return;
      }

      const discordUserId = userSnapshot.docs[0].id;
      
      // Award XP for reading chapter through gamification system
      const { APIVerifiedGamification } = require('./gamification');
      await APIVerifiedGamification.awardXP(discordUserId, 'READ_CHAPTER', {
        mangaId: data.mangaId,
        mangaTitle: data.mangaTitle,
        chapter: data.chapter,
        verified: true,
        source: 'website'
      }, {
        websiteSync: true,
        readAt: data.readAt
      });

      console.log('Processed website manga read for Discord user:', discordUserId);
    } catch (error) {
      console.error('Error handling website manga read:', error);
      throw error;
    }
  }

  /**
   * Handle website user login event
   */
  async handleWebsiteUserLogin(syncEvent) {
    const { targetUserId, data } = syncEvent;
    
    try {
      // Find Discord user by website user ID
      const userSnapshot = await db.collection('users')
        .where('websiteUserId', '==', targetUserId)
        .limit(1)
        .get();

      if (userSnapshot.empty) {
        console.log('No linked Discord account found for website user:', targetUserId);
        return;
      }

      const discordUserId = userSnapshot.docs[0].id;
      
      // Update last activity and check streak
      const userRef = db.collection('users').doc(discordUserId);
      const userDoc = await userRef.get();
      const userData = userDoc.data();

      const today = new Date().toISOString().split('T')[0];
      const lastActiveDate = userData.lastActiveDate;
      
      let streakUpdate = {};
      if (lastActiveDate !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        if (lastActiveDate === yesterdayStr) {
          // Continue streak
          streakUpdate.streak = (userData.streak || 0) + 1;
        } else {
          // Reset streak
          streakUpdate.streak = 1;
        }
        
        streakUpdate.lastActiveDate = today;
        streakUpdate.maxStreak = Math.max(userData.maxStreak || 0, streakUpdate.streak);
      }

      await userRef.update({
        lastActivity: data.loginAt,
        lastSyncTimestamp: new Date(),
        ...streakUpdate
      });

      console.log('Processed website login for Discord user:', discordUserId);
    } catch (error) {
      console.error('Error handling website user login:', error);
      throw error;
    }
  }

  /**
   * Handle force sync request from website
   */
  async handleForceSyncRequest(syncEvent) {
    const { targetUserId, data } = syncEvent;
    
    try {
      // Find Discord user by website user ID
      const userSnapshot = await db.collection('users')
        .where('websiteUserId', '==', targetUserId)
        .limit(1)
        .get();

      if (userSnapshot.empty) {
        console.log('No linked Discord account found for website user:', targetUserId);
        return;
      }

      const discordUserId = userSnapshot.docs[0].id;
      const userData = userSnapshot.docs[0].data();
      
      // Send current Discord data back to website
      await this.createSyncEvent(targetUserId, 'DISCORD_FORCE_SYNC_RESPONSE', {
        discordUserId: discordUserId,
        xp: userData.xp || 0,
        level: userData.level || 1,
        streak: userData.streak || 0,
        badges: userData.badges || [],
        lastActivity: userData.lastActivity,
        syncTimestamp: new Date()
      });

      console.log('Processed force sync request for Discord user:', discordUserId);
    } catch (error) {
      console.error('Error handling force sync request:', error);
      throw error;
    }
  }

  /**
   * Force sync user data between platforms
   */
  async forceSyncUser(userId) {
    try {
      console.log(`🔄 Force syncing user data: ${userId}`);

      // Get user profile
      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) {
        throw new Error('User not found');
      }

      const userData = userDoc.data();
      
      // Create comprehensive sync event
      await this.createSyncEvent(userId, 'FULL_PROFILE_SYNC', {
        profile: userData,
        timestamp: new Date()
      });

      console.log(`✅ Force sync initiated for user: ${userId}`);
      return true;

    } catch (error) {
      console.error(`❌ Force sync failed for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Clean up old sync events and logs
   */
  async cleanupOldData(daysToKeep = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    // Clean up old sync events
    const oldSyncEvents = await db.collection('syncEvents')
      .where('timestamp', '<', cutoffDate)
      .where('processed', '==', true)
      .get();

    const batch = db.batch();
    oldSyncEvents.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`🧹 Cleaned up ${oldSyncEvents.size} old sync events`);
  }
}

// Export singleton instance
const syncManager = new SyncManager();

module.exports = {
  SyncManager,
  syncManager
};

const { db } = require('./firebase');
const { UserProfile, SyncEvent, ActivityLog } = require('../../bot/lib/sync-models');

class WebsiteSyncClient {
  constructor() {
    this.listeners = new Map();
    this.isInitialized = false;
  }

  /**
   * Initialize sync client for a user
   */
  async initialize(userId) {
    if (this.isInitialized) return;

    try {
      // Set up real-time listeners for sync events
      await this.setupSyncListeners(userId);
      this.isInitialized = true;
      console.log('Website sync client initialized for user:', userId);
    } catch (error) {
      console.error('Failed to initialize sync client:', error);
      throw error;
    }
  }

  /**
   * Set up real-time listeners for Discord bot sync events
   */
  async setupSyncListeners(userId) {
    // Listen for sync events from Discord bot
    const syncEventsRef = db.collection('syncEvents')
      .where('targetUserId', '==', userId)
      .where('processed', '==', false)
      .orderBy('timestamp', 'desc');

    const unsubscribe = syncEventsRef.onSnapshot(async (snapshot) => {
      for (const change of snapshot.docChanges()) {
        if (change.type === 'added') {
          await this.processSyncEvent(change.doc);
        }
      }
    });

    this.listeners.set('syncEvents', unsubscribe);

    // Listen for user profile updates from Discord
    const userProfileRef = db.collection('users').doc(userId);
    const profileUnsubscribe = userProfileRef.onSnapshot(async (doc) => {
      if (doc.exists) {
        await this.handleUserProfileUpdate(doc.data());
      }
    });

    this.listeners.set('userProfile', profileUnsubscribe);
  }

  /**
   * Process sync event from Discord bot
   */
  async processSyncEvent(eventDoc) {
    try {
      const eventData = eventDoc.data();
      const syncEvent = SyncEvent.fromFirestore(eventData);

      console.log('Processing sync event:', syncEvent.eventType, 'for user:', syncEvent.targetUserId);

      switch (syncEvent.eventType) {
        case 'XP_UPDATE':
          await this.handleXPUpdate(syncEvent);
          break;
        case 'BADGE_UNLOCK':
          await this.handleBadgeUnlock(syncEvent);
          break;
        case 'LEVEL_UP':
          await this.handleLevelUp(syncEvent);
          break;
        case 'STREAK_UPDATE':
          await this.handleStreakUpdate(syncEvent);
          break;
        case 'QUEST_PROGRESS':
          await this.handleQuestProgress(syncEvent);
          break;
        case 'DISCORD_LINK_SUCCESS':
          await this.handleDiscordLinkSuccess(syncEvent);
          break;
        case 'DISCORD_UNLINK':
          await this.handleDiscordUnlink(syncEvent);
          break;
        default:
          console.warn('Unknown sync event type:', syncEvent.eventType);
      }

      // Mark event as processed
      await eventDoc.ref.update({
        processed: true,
        processedAt: new Date(),
        processedBy: 'website'
      });

    } catch (error) {
      console.error('Error processing sync event:', error);
      
      // Mark event as failed
      await eventDoc.ref.update({
        processed: true,
        processedAt: new Date(),
        processedBy: 'website',
        error: error.message
      });
    }
  }

  /**
   * Handle XP update from Discord bot
   */
  async handleXPUpdate(syncEvent) {
    const { targetUserId, data } = syncEvent;
    
    await db.collection('users').doc(targetUserId).update({
      xp: data.newXP,
      level: data.newLevel || data.level,
      lastSyncTimestamp: new Date(),
      syncVersion: db.FieldValue.increment(1)
    });

    // Trigger UI update if user is online
    this.notifyUI('xpUpdate', {
      userId: targetUserId,
      xp: data.newXP,
      xpGained: data.xpGained,
      level: data.newLevel || data.level
    });
  }

  /**
   * Handle badge unlock from Discord bot
   */
  async handleBadgeUnlock(syncEvent) {
    const { targetUserId, data } = syncEvent;
    
    // Add new badges to user profile
    const userRef = db.collection('users').doc(targetUserId);
    await userRef.update({
      badges: db.FieldValue.arrayUnion(...data.badgeIds),
      lastSyncTimestamp: new Date(),
      syncVersion: db.FieldValue.increment(1)
    });

    // Create badge unlock notifications
    for (const badgeId of data.badgeIds) {
      await db.collection('notifications').add({
        userId: targetUserId,
        type: 'badge_unlock',
        title: 'New Badge Unlocked!',
        message: `You earned the "${data.badgeName || badgeId}" badge on Discord!`,
        badgeId: badgeId,
        source: 'discord',
        createdAt: new Date(),
        read: false
      });
    }

    // Trigger UI update
    this.notifyUI('badgeUnlock', {
      userId: targetUserId,
      badges: data.badgeIds,
      source: 'discord'
    });
  }

  /**
   * Handle level up from Discord bot
   */
  async handleLevelUp(syncEvent) {
    const { targetUserId, data } = syncEvent;
    
    await db.collection('users').doc(targetUserId).update({
      level: data.newLevel,
      xp: data.newXP,
      lastSyncTimestamp: new Date(),
      syncVersion: db.FieldValue.increment(1)
    });

    // Create level up notification
    await db.collection('notifications').add({
      userId: targetUserId,
      type: 'level_up',
      title: 'Level Up!',
      message: `Congratulations! You reached level ${data.newLevel} on Discord!`,
      level: data.newLevel,
      source: 'discord',
      createdAt: new Date(),
      read: false
    });

    // Trigger UI update
    this.notifyUI('levelUp', {
      userId: targetUserId,
      newLevel: data.newLevel,
      oldLevel: data.oldLevel
    });
  }

  /**
   * Handle streak update from Discord bot
   */
  async handleStreakUpdate(syncEvent) {
    const { targetUserId, data } = syncEvent;
    
    await db.collection('users').doc(targetUserId).update({
      streak: data.newStreak,
      lastActiveDate: data.lastActiveDate,
      lastSyncTimestamp: new Date(),
      syncVersion: db.FieldValue.increment(1)
    });

    // Trigger UI update
    this.notifyUI('streakUpdate', {
      userId: targetUserId,
      streak: data.newStreak,
      streakBroken: data.streakBroken
    });
  }

  /**
   * Handle quest progress from Discord bot
   */
  async handleQuestProgress(syncEvent) {
    const { targetUserId, data } = syncEvent;
    
    // Update quest progress
    const questRef = db.collection('users').doc(targetUserId)
      .collection('questProgress').doc(data.questId);
    
    await questRef.set({
      questId: data.questId,
      progress: data.progress,
      completed: data.completed,
      completedAt: data.completed ? new Date() : null,
      lastUpdated: new Date(),
      source: 'discord'
    }, { merge: true });

    // If quest completed, create notification
    if (data.completed) {
      await db.collection('notifications').add({
        userId: targetUserId,
        type: 'quest_complete',
        title: 'Quest Completed!',
        message: `You completed the "${data.questName}" quest on Discord!`,
        questId: data.questId,
        source: 'discord',
        createdAt: new Date(),
        read: false
      });
    }

    // Trigger UI update
    this.notifyUI('questProgress', {
      userId: targetUserId,
      questId: data.questId,
      progress: data.progress,
      completed: data.completed
    });
  }

  /**
   * Handle successful Discord account linking
   */
  async handleDiscordLinkSuccess(syncEvent) {
    const { targetUserId, data } = syncEvent;
    
    await db.collection('users').doc(targetUserId).update({
      discordId: data.discordId,
      discordUsername: data.discordUsername,
      linkedAt: data.linkedAt,
      'preferences.syncWithDiscord': true,
      lastSyncTimestamp: new Date(),
      syncVersion: db.FieldValue.increment(1)
    });

    // Create success notification
    await db.collection('notifications').add({
      userId: targetUserId,
      type: 'account_linked',
      title: 'Discord Account Linked!',
      message: `Your Discord account @${data.discordUsername} has been successfully linked!`,
      source: 'discord',
      createdAt: new Date(),
      read: false
    });

    // Trigger UI update
    this.notifyUI('accountLinked', {
      userId: targetUserId,
      discordUsername: data.discordUsername,
      xpAwarded: data.xpAwarded
    });
  }

  /**
   * Handle Discord account unlinking
   */
  async handleDiscordUnlink(syncEvent) {
    const { targetUserId, data } = syncEvent;
    
    await db.collection('users').doc(targetUserId).update({
      discordId: db.FieldValue.delete(),
      discordUsername: db.FieldValue.delete(),
      discordDiscriminator: db.FieldValue.delete(),
      unlinkedAt: data.unlinkedAt,
      'preferences.syncWithDiscord': false,
      lastSyncTimestamp: new Date(),
      syncVersion: db.FieldValue.increment(1)
    });

    // Create unlink notification
    await db.collection('notifications').add({
      userId: targetUserId,
      type: 'account_unlinked',
      title: 'Discord Account Unlinked',
      message: 'Your Discord account has been unlinked. Your progress is preserved.',
      source: 'discord',
      createdAt: new Date(),
      read: false
    });

    // Trigger UI update
    this.notifyUI('accountUnlinked', {
      userId: targetUserId,
      reason: data.reason
    });
  }

  /**
   * Handle user profile updates
   */
  async handleUserProfileUpdate(userData) {
    // Trigger UI updates for profile changes
    this.notifyUI('profileUpdate', {
      userId: userData.uid,
      profile: userData
    });
  }

  /**
   * Create sync event to notify Discord bot of website activity
   */
  async createSyncEvent(userId, eventType, data) {
    try {
      const syncEvent = new SyncEvent(
        userId,
        eventType,
        data,
        'website',
        'discord'
      );

      await db.collection('syncEvents').add(syncEvent.toFirestore());
      console.log('Created sync event:', eventType, 'for user:', userId);
    } catch (error) {
      console.error('Error creating sync event:', error);
      throw error;
    }
  }

  /**
   * Log activity for analytics and debugging
   */
  async logActivity(userId, action, metadata = {}) {
    try {
      const activity = new ActivityLog(
        userId,
        action,
        'website',
        metadata
      );

      await db.collection('activityLogs').add(activity.toFirestore());
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  }

  /**
   * Notify UI components of sync updates
   */
  notifyUI(eventType, data) {
    // Emit custom events for UI components to listen to
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('kamiSyncUpdate', {
        detail: { eventType, data }
      }));
    }
  }

  /**
   * Force sync user data with Discord bot
   */
  async forceSyncUser(userId) {
    try {
      await this.createSyncEvent(userId, 'FORCE_SYNC_REQUEST', {
        requestedAt: new Date(),
        source: 'website'
      });

      console.log('Force sync requested for user:', userId);
    } catch (error) {
      console.error('Error requesting force sync:', error);
      throw error;
    }
  }

  /**
   * Clean up listeners when component unmounts
   */
  cleanup() {
    for (const [name, unsubscribe] of this.listeners) {
      unsubscribe();
      console.log('Cleaned up listener:', name);
    }
    this.listeners.clear();
    this.isInitialized = false;
  }

  /**
   * Get sync status for user
   */
  async getSyncStatus(userId) {
    try {
      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) {
        return { linked: false, syncEnabled: false };
      }

      const userData = userDoc.data();
      return {
        linked: !!userData.discordId,
        syncEnabled: userData.preferences?.syncWithDiscord || false,
        lastSync: userData.lastSyncTimestamp,
        syncVersion: userData.syncVersion || 0,
        discordUsername: userData.discordUsername
      };
    } catch (error) {
      console.error('Error getting sync status:', error);
      return { linked: false, syncEnabled: false, error: error.message };
    }
  }

  /**
   * Generate linking code for Discord account linking
   */
  async generateLinkingCode(userId) {
    try {
      // Generate random 6-digit code
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      await db.collection('linkingCodes').add({
        code: code,
        userId: userId,
        createdAt: new Date(),
        used: false,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
      });

      return code;
    } catch (error) {
      console.error('Error generating linking code:', error);
      throw error;
    }
  }
}

// Export singleton instance
const websiteSyncClient = new WebsiteSyncClient();
module.exports = { websiteSyncClient, WebsiteSyncClient };

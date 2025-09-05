// Shared data models for KamiAnime website-bot synchronization
// These models ensure consistent data structure across platforms

/**
 * User Profile Model - Shared between website and Discord bot
 */
class UserProfile {
  constructor(data = {}) {
    this.id = data.id || null;
    this.discordId = data.discordId || null;
    this.websiteUserId = data.websiteUserId || null;
    this.email = data.email || null;
    this.username = data.username || '';
    this.displayName = data.displayName || '';
    this.avatar = data.avatar || null;
    
    // Gamification data
    this.xp = data.xp || 0;
    this.level = data.level || 1;
    this.streak = data.streak || 0;
    this.lastActivity = data.lastActivity || null;
    this.joinDate = data.joinDate || new Date();
    
    // Statistics
    this.watchedEpisodes = data.watchedEpisodes || 0;
    this.readChapters = data.readChapters || 0;
    this.quotesCollected = data.quotesCollected || 0;
    this.watchPartiesJoined = data.watchPartiesJoined || 0;
    
    // Preferences
    this.preferences = {
      notifications: data.preferences?.notifications || true,
      publicProfile: data.preferences?.publicProfile || true,
      showOnLeaderboard: data.preferences?.showOnLeaderboard || true,
      syncWithDiscord: data.preferences?.syncWithDiscord || true,
      ...data.preferences
    };
    
    // Premium status
    this.isPremium = data.isPremium || false;
    this.premiumExpiry = data.premiumExpiry || null;
    
    // Sync metadata
    this.lastSyncTimestamp = data.lastSyncTimestamp || new Date();
    this.syncVersion = data.syncVersion || 1;
  }

  // Convert to Firebase document format
  toFirestore() {
    return {
      id: this.id,
      discordId: this.discordId,
      websiteUserId: this.websiteUserId,
      email: this.email,
      username: this.username,
      displayName: this.displayName,
      avatar: this.avatar,
      xp: this.xp,
      level: this.level,
      streak: this.streak,
      lastActivity: this.lastActivity,
      joinDate: this.joinDate,
      watchedEpisodes: this.watchedEpisodes,
      readChapters: this.readChapters,
      quotesCollected: this.quotesCollected,
      watchPartiesJoined: this.watchPartiesJoined,
      preferences: this.preferences,
      isPremium: this.isPremium,
      premiumExpiry: this.premiumExpiry,
      lastSyncTimestamp: this.lastSyncTimestamp,
      syncVersion: this.syncVersion
    };
  }

  // Create from Firebase document
  static fromFirestore(doc) {
    const data = doc.data();
    return new UserProfile({
      id: doc.id,
      ...data
    });
  }
}

/**
 * Badge Model - Shared between platforms
 */
class Badge {
  constructor(data = {}) {
    this.id = data.id || '';
    this.name = data.name || '';
    this.description = data.description || '';
    this.icon = data.icon || '';
    this.rarity = data.rarity || 'common'; // common, rare, epic, legendary
    this.category = data.category || 'general';
    this.unlockCondition = data.unlockCondition || {};
    this.isHidden = data.isHidden || false;
    this.xpReward = data.xpReward || 0;
  }
}

/**
 * User Badge Model - Tracks user's earned badges
 */
class UserBadge {
  constructor(data = {}) {
    this.userId = data.userId || '';
    this.badgeId = data.badgeId || '';
    this.unlockedAt = data.unlockedAt || new Date();
    this.progress = data.progress || 0;
    this.maxProgress = data.maxProgress || 1;
    this.isCompleted = data.isCompleted || false;
    this.syncedToWebsite = data.syncedToWebsite || false;
    this.syncedToDiscord = data.syncedToDiscord || false;
  }
}

/**
 * Quest Model - Shared quest system
 */
class Quest {
  constructor(data = {}) {
    this.id = data.id || '';
    this.name = data.name || '';
    this.description = data.description || '';
    this.type = data.type || 'daily'; // daily, weekly, monthly, special
    this.category = data.category || 'general';
    this.target = data.target || 1;
    this.xpReward = data.xpReward || 0;
    this.badgeReward = data.badgeReward || null;
    this.startDate = data.startDate || new Date();
    this.endDate = data.endDate || null;
    this.isActive = data.isActive || true;
    this.requirements = data.requirements || {};
  }
}

/**
 * User Quest Progress Model
 */
class UserQuestProgress {
  constructor(data = {}) {
    this.userId = data.userId || '';
    this.questId = data.questId || '';
    this.progress = data.progress || 0;
    this.isCompleted = data.isCompleted || false;
    this.completedAt = data.completedAt || null;
    this.startedAt = data.startedAt || new Date();
    this.syncedToWebsite = data.syncedToWebsite || false;
    this.syncedToDiscord = data.syncedToDiscord || false;
  }
}

/**
 * Activity Log Model - Tracks user actions for sync
 */
class ActivityLog {
  constructor(data = {}) {
    this.id = data.id || '';
    this.userId = data.userId || '';
    this.action = data.action || ''; // WATCH_EPISODE, READ_CHAPTER, etc.
    this.platform = data.platform || ''; // discord, website
    this.metadata = data.metadata || {};
    this.xpAwarded = data.xpAwarded || 0;
    this.timestamp = data.timestamp || new Date();
    this.syncedToPlatforms = data.syncedToPlatforms || [];
    this.apiVerified = data.apiVerified || false;
  }
}

/**
 * Sync Event Model - Tracks synchronization events
 */
class SyncEvent {
  constructor(data = {}) {
    this.id = data.id || '';
    this.userId = data.userId || '';
    this.eventType = data.eventType || ''; // XP_UPDATE, BADGE_UNLOCK, QUEST_PROGRESS, etc.
    this.sourcePlatform = data.sourcePlatform || '';
    this.targetPlatform = data.targetPlatform || '';
    this.data = data.data || {};
    this.status = data.status || 'pending'; // pending, success, failed
    this.timestamp = data.timestamp || new Date();
    this.retryCount = data.retryCount || 0;
    this.error = data.error || null;
  }
}

/**
 * Leaderboard Entry Model
 */
class LeaderboardEntry {
  constructor(data = {}) {
    this.userId = data.userId || '';
    this.username = data.username || '';
    this.displayName = data.displayName || '';
    this.avatar = data.avatar || null;
    this.xp = data.xp || 0;
    this.level = data.level || 1;
    this.streak = data.streak || 0;
    this.rank = data.rank || 0;
    this.isPremium = data.isPremium || false;
    this.lastUpdated = data.lastUpdated || new Date();
  }
}

/**
 * Watch Party Model - Enhanced for cross-platform sync
 */
class WatchParty {
  constructor(data = {}) {
    this.id = data.id || '';
    this.anime = data.anime || {};
    this.host = data.host || {};
    this.participants = data.participants || [];
    this.guildId = data.guildId || null;
    this.channelId = data.channelId || null;
    this.websiteRoomId = data.websiteRoomId || null;
    this.status = data.status || 'waiting'; // waiting, active, completed, cancelled
    this.currentEpisode = data.currentEpisode || 1;
    this.watchedEpisodes = data.watchedEpisodes || [];
    this.maxParticipants = data.maxParticipants || 10;
    this.createdAt = data.createdAt || new Date();
    this.startedAt = data.startedAt || null;
    this.completedAt = data.completedAt || null;
    this.lastActivity = data.lastActivity || new Date();
    this.syncedToWebsite = data.syncedToWebsite || false;
  }
}

module.exports = {
  UserProfile,
  Badge,
  UserBadge,
  Quest,
  UserQuestProgress,
  ActivityLog,
  SyncEvent,
  LeaderboardEntry,
  WatchParty
};

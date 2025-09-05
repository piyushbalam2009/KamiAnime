const { config } = require('./config');
const { EnhancedAnimeAPI, EnhancedMangaAPI } = require('./enhanced-api');
const { analyticsLogger } = require('./analytics-logger');

// Import Firebase and A/B Testing
let db, abTesting;
(async () => {
  try {
    const firebase = await import('./firebase');
    db = firebase.db;
    
    // Import A/B testing framework
    const abTestingModule = await import('../../web/lib/ab-testing');
    abTesting = abTestingModule.abTesting;
    await abTesting.initialize();
  } catch (error) {
    console.error('Firebase/A/B Testing import error:', error);
  }
})();

// XP Values for different actions
const XP_VALUES = {
  WATCH_EPISODE: 20,
  READ_CHAPTER: 15,
  QUOTE_CLAIM: 5,
  WATCH_PARTY_JOIN: 25,
  WATCH_PARTY_HOST: 30,
  QUEST_DAILY_COMPLETE: 50,
  QUEST_WEEKLY_COMPLETE: 200,
  
  // Bonus XP
  TRENDING_BONUS: 10,
  SEASONAL_BONUS: 15,
  POPULAR_MANGA_BONUS: 5,
  FIRST_TIME_BONUS: 25,
  STREAK_MULTIPLIER: 1.5
};

// Badge definitions with API verification conditions
const BADGES = {
  BINGE_WATCHER: {
    id: 'binge_watcher',
    name: 'Binge Watcher',
    description: 'Watch 10 episodes in one day',
    icon: '📺',
    condition: { type: 'episodes_per_day', count: 10 }
  },
  MANGA_DEVOURER: {
    id: 'manga_devourer',
    name: 'Manga Devourer',
    description: 'Read 50 chapters',
    icon: '📚',
    condition: { type: 'total_chapters', count: 50 }
  },
  SEASONAL_HUNTER: {
    id: 'seasonal_hunter',
    name: 'Seasonal Hunter',
    description: 'Complete a full seasonal anime',
    icon: '🎯',
    condition: { type: 'seasonal_complete', count: 1 }
  },
  TRENDING_EXPLORER: {
    id: 'trending_explorer',
    name: 'Trending Explorer',
    description: 'Watch 10 trending anime episodes',
    icon: '🔥',
    condition: { type: 'trending_episodes', count: 10 }
  },
  QUOTE_COLLECTOR: {
    id: 'quote_collector',
    name: 'Quote Collector',
    description: 'Claim 100 anime quotes',
    icon: '💬',
    condition: { type: 'total_quotes', count: 100 }
  },
  WATCH_PARTY_HOST: {
    id: 'watch_party_host',
    name: 'Watch Party Host',
    description: 'Host 5 watch parties',
    icon: '🎉',
    condition: { type: 'parties_hosted', count: 5 }
  },
  STREAK_MASTER: {
    id: 'streak_master',
    name: 'Streak Master',
    description: 'Maintain a 30-day streak',
    icon: '🔥',
    condition: { type: 'max_streak', count: 30 }
  },
  COMPLETIONIST: {
    id: 'completionist',
    name: 'Completionist',
    description: 'Finish 10 anime series',
    icon: '✅',
    condition: { type: 'completed_series', count: 10 }
  }
};

// Quest definitions
const DAILY_QUESTS = [
  {
    id: 'daily_trending',
    name: 'Trending Watcher',
    description: 'Watch 1 trending anime episode',
    xp: 50,
    condition: { type: 'trending_episodes', count: 1 }
  },
  {
    id: 'daily_manga',
    name: 'Daily Reader',
    description: 'Read 3 manga chapters',
    xp: 45,
    condition: { type: 'chapters_read', count: 3 }
  },
  {
    id: 'daily_quote',
    name: 'Quote Seeker',
    description: 'Claim 1 anime quote',
    xp: 25,
    condition: { type: 'quotes_claimed', count: 1 }
  }
];

const WEEKLY_QUESTS = [
  {
    id: 'weekly_seasonal',
    name: 'Seasonal Explorer',
    description: 'Watch 5 seasonal anime episodes',
    xp: 200,
    condition: { type: 'seasonal_episodes', count: 5 }
  },
  {
    id: 'weekly_parties',
    name: 'Social Watcher',
    description: 'Join 2 watch parties',
    xp: 150,
    condition: { type: 'parties_joined', count: 2 }
  },
  {
    id: 'weekly_recommendations',
    name: 'Anime Curator',
    description: 'Recommend 3 anime from different genres',
    xp: 100,
    condition: { type: 'recommendations_made', count: 3 }
  }
];

class APIVerifiedGamification {
  // Award XP for verified actions
  static async awardXP(userId, action, apiResponse, metadata = {}) {
    try {
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();
      
      if (!userDoc.exists) {
        await this.createUserProfile(userId);
      }

      const userData = userDoc.data() || {};
      let xpToAward = 0;
      let bonusXP = 0;
      let actionValid = false;

      // Verify action based on API response
      switch (action) {
        case 'WATCH_EPISODE':
          actionValid = await this.verifyEpisodeWatch(apiResponse, metadata);
          if (actionValid) {
            xpToAward = XP_VALUES.WATCH_EPISODE;
            bonusXP = await this.calculateWatchBonus(metadata, userData);
          }
          break;

        case 'READ_CHAPTER':
          actionValid = await this.verifyChapterRead(apiResponse, metadata);
          if (actionValid) {
            xpToAward = XP_VALUES.READ_CHAPTER;
            bonusXP = await this.calculateReadBonus(metadata, userData);
          }
          break;

        case 'QUOTE_CLAIM':
          actionValid = apiResponse && apiResponse.quote;
          if (actionValid) {
            xpToAward = XP_VALUES.QUOTE_CLAIM;
          }
          break;

        case 'WATCH_PARTY_JOIN':
          actionValid = true; // Watch party join is always valid
          xpToAward = XP_VALUES.WATCH_PARTY_JOIN;
          break;

        case 'WATCH_PARTY_HOST':
          actionValid = true; // Watch party hosting is always valid
          xpToAward = XP_VALUES.WATCH_PARTY_HOST;
          break;

        case 'ACCOUNT_LINK':
          actionValid = true; // Account linking is always valid
          xpToAward = 100; // Bonus XP for linking account
          break;

        default:
          console.warn(`Unknown action: ${action}`);
          return { success: false, reason: 'Unknown action' };
      }

      if (!actionValid) {
        return { success: false, reason: 'Action verification failed' };
      }

      // Apply A/B testing multipliers if available
      let abTestMultiplier = 1.0;
      if (abTesting) {
        try {
          const xpConfig = abTesting.getFeatureConfig(userId, 'xp_system', { multiplier: 1.0 });
          abTestMultiplier = xpConfig.multiplier || 1.0;
          
          // Track A/B test exposure
          await abTesting.trackExposure(userId, 'xp_system', { action, xpToAward });
        } catch (error) {
          console.error('A/B testing error:', error);
        }
      }

      // Calculate total XP with bonuses
      let xpAmount = xpToAward + bonusXP;

      const currentXP = userData.xp || 0;
      const currentLevel = userData.level || 1;
      const currentStreak = userData.streak || 0;

      // Apply streak multiplier and A/B test multiplier
      if (currentStreak > 0) {
        xpAmount = Math.floor(xpAmount * XP_VALUES.STREAK_MULTIPLIER * abTestMultiplier);
      } else {
        xpAmount = Math.floor(xpAmount * abTestMultiplier);
      }

      const newXP = currentXP + xpAmount;
      const newLevel = this.calculateLevel(newXP);
      const levelUp = newLevel > currentLevel;

      // Update user profile
      const updateData = {
        xp: newXP,
        level: newLevel,
        lastActivity: new Date(),
        [`actions.${action}`]: (userData.actions?.[action] || 0) + 1
      };

      // Update action-specific tracking
      if (action === 'WATCH_EPISODE') {
        const episodeKey = `${apiResponse.animeId}_${metadata.episode}`;
        updateData[`watchHistory.${episodeKey}`] = new Date();
      } else if (action === 'READ_CHAPTER') {
        const chapterKey = `${apiResponse.mangaId}_${metadata.chapter}`;
        updateData[`readHistory.${chapterKey}`] = new Date();
      }

      await userDoc.ref.update(updateData);

      // Check for badge unlocks
      const badgeResults = await this.checkBadgeUnlocks(userId, userData);
      
      // Update quest progress
      await this.updateQuestProgress(userId, action, metadata);

      // Log successful XP award
      await analyticsLogger.logGamificationEvent('xp_awarded', userId, {
        action,
        xpAmount,
        newXP,
        newLevel,
        levelUp,
        streakMultiplier: currentStreak > 0 ? XP_VALUES.STREAK_MULTIPLIER : 1,
        badgesUnlocked: badgeResults.newBadges?.length || 0
      });

      // Log level up if occurred
      if (levelUp) {
        await analyticsLogger.logAchievement(userId, 'level_up', {
          oldLevel: currentLevel,
          newLevel,
          totalXP: newXP
        });
      }

      // Log badge unlocks
      if (badgeResults.newBadges && badgeResults.newBadges.length > 0) {
        for (const badge of badgeResults.newBadges) {
          await analyticsLogger.logAchievement(userId, 'badge_unlock', {
            badgeId: badge.id,
            badgeName: badge.name,
            totalBadges: (userData.badges?.length || 0) + badgeResults.newBadges.length
          });
        }
      }

      console.log(`✅ Awarded ${xpAmount} XP to user ${userId} (Total: ${newXP})`);

      return {
        success: true,
        xpAwarded: xpAmount,
        newXP,
        newLevel,
        levelUp,
        badgesUnlocked: badgeResults.newBadges || []
      };

    } catch (error) {
      console.error(`❌ Error awarding XP:`, error);
      
      // Log error
      await analyticsLogger.logError('gamification_error', error, {
        userId,
        action,
        metadata
      });
      
      return { success: false, error: error.message };
    }
  }

  // Verify episode watch through streaming API
  static async verifyEpisodeWatch(apiResponse, metadata) {
    if (!apiResponse || !apiResponse.sources || apiResponse.sources.length === 0) {
      return false;
    }

    // Check if valid streaming sources were returned
    const validSources = apiResponse.sources.filter(source => 
      source.url && source.url.startsWith('http')
    );

    if (validSources.length === 0) {
      return false;
    }

    // Additional verification: check if anime exists in our database
    if (metadata.animeId) {
      try {
        const animeData = await EnhancedAnimeAPI.searchAnime(metadata.animeTitle || '', 1);
        return animeData.length > 0;
      } catch (error) {
        console.error('Anime verification failed:', error);
        return false;
      }
    }

    return true;
  }

  // Verify chapter read through manga API
  static async verifyChapterRead(apiResponse, metadata) {
    if (!apiResponse || (!apiResponse.pages && !apiResponse.images)) {
      return false;
    }

    // Check if chapter has valid pages/images
    const pages = apiResponse.pages || apiResponse.images || [];
    if (pages.length === 0) {
      return false;
    }

    // Verify manga exists
    if (metadata.mangaId) {
      try {
        const mangaData = await EnhancedMangaAPI.searchManga(metadata.mangaTitle || '', 1);
        return mangaData.length > 0;
      } catch (error) {
        console.error('Manga verification failed:', error);
        return false;
      }
    }

    return true;
  }

  // Verify quote claim
  static verifyQuoteClaim(apiResponse) {
    return apiResponse && 
           apiResponse.quote && 
           apiResponse.character && 
           apiResponse.anime &&
           apiResponse.quote.length > 10;
  }

  // Calculate bonus XP for watching
  static async calculateWatchBonus(metadata, userData) {
    let bonus = 0;

    // Trending bonus
    if (metadata.isTrending) {
      bonus += XP_VALUES.TRENDING_BONUS;
    }

    // Seasonal bonus
    if (metadata.isSeasonal) {
      bonus += XP_VALUES.SEASONAL_BONUS;
    }

    // First time watching this anime
    const watchHistory = userData.watchHistory || {};
    if (!watchHistory[metadata.animeId]) {
      bonus += XP_VALUES.FIRST_TIME_BONUS;
    }

    return bonus;
  }

  // Calculate bonus XP for reading
  static async calculateReadBonus(metadata, userData) {
    let bonus = 0;

    // Popular manga bonus
    if (metadata.isPopular) {
      bonus += XP_VALUES.POPULAR_MANGA_BONUS;
    }

    // First time reading this manga
    const readHistory = userData.readHistory || {};
    if (!readHistory[metadata.mangaId]) {
      bonus += XP_VALUES.FIRST_TIME_BONUS;
    }

    return bonus;
  }

  // Get streak multiplier
  static async getStreakMultiplier(userId) {
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data() || {};
    
    const streak = userData.streak || 0;
    if (streak >= 7) {
      return XP_VALUES.STREAK_MULTIPLIER;
    }
    
    return 1.0;
  }

  // Update daily statistics
  static async updateDailyStats(userId, action, metadata) {
    const today = new Date().toISOString().split('T')[0];
    const dailyRef = db.collection('dailyStats').doc(`${userId}_${today}`);
    
    const dailyDoc = await dailyRef.get();
    const dailyData = dailyDoc.exists ? dailyDoc.data() : {
      userId: userId,
      date: today,
      episodesWatched: 0,
      chaptersRead: 0,
      quotesClaimed: 0,
      partiesJoined: 0,
      partiesHosted: 0,
      trendingEpisodes: 0,
      seasonalEpisodes: 0
    };

    // Update based on action
    switch (action) {
      case 'WATCH_EPISODE':
        dailyData.episodesWatched++;
        if (metadata.isTrending) dailyData.trendingEpisodes++;
        if (metadata.isSeasonal) dailyData.seasonalEpisodes++;
        break;
      case 'READ_CHAPTER':
        dailyData.chaptersRead++;
        break;
      case 'QUOTE_CLAIM':
        dailyData.quotesClaimed++;
        break;
      case 'WATCH_PARTY_JOIN':
        dailyData.partiesJoined++;
        break;
      case 'WATCH_PARTY_HOST':
        dailyData.partiesHosted++;
        break;
    }

    await dailyRef.set(dailyData);

    // Update streak
    await this.updateStreak(userId);
  }

  // Update user streak
  static async updateStreak(userId) {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    const userData = userDoc.data() || {};

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // Check if user was active today
    const todayStats = await db.collection('dailyStats').doc(`${userId}_${today}`).get();
    const todayActive = todayStats.exists && (
      todayStats.data().episodesWatched > 0 || 
      todayStats.data().chaptersRead > 0
    );

    if (!todayActive) {
      return; // No streak update if not active today
    }

    // Check if user was active yesterday
    const yesterdayStats = await db.collection('dailyStats').doc(`${userId}_${yesterday}`).get();
    const yesterdayActive = yesterdayStats.exists && (
      yesterdayStats.data().episodesWatched > 0 || 
      yesterdayStats.data().chaptersRead > 0
    );

    let newStreak = 1;
    if (yesterdayActive) {
      newStreak = (userData.streak || 0) + 1;
    }

    const maxStreak = Math.max(userData.maxStreak || 0, newStreak);

    await userRef.update({
      streak: newStreak,
      maxStreak: maxStreak,
      lastStreakUpdate: today
    });
  }

  // Check for badge unlocks
  static async checkBadgeUnlocks(userId, userData) {
    const userBadges = userData.badges || [];
    const newBadges = [];

    for (const [badgeId, badge] of Object.entries(BADGES)) {
      if (userBadges.includes(badgeId)) {
        continue; // Already has this badge
      }

      const unlocked = await this.checkBadgeCondition(userId, badge.condition, userData);
      if (unlocked) {
        newBadges.push(badgeId);
      }
    }

    if (newBadges.length > 0) {
      await db.collection('users').doc(userId).update({
        badges: [...userBadges, ...newBadges],
        lastBadgeUnlock: new Date()
      });
    }

    return newBadges;
  }

  // Check individual badge condition
  static async checkBadgeCondition(userId, condition, userData) {
    const today = new Date().toISOString().split('T')[0];

    switch (condition.type) {
      case 'episodes_per_day':
        const todayStats = await db.collection('dailyStats').doc(`${userId}_${today}`).get();
        return todayStats.exists && todayStats.data().episodesWatched >= condition.count;

      case 'total_chapters':
        return (userData.actions?.read_chapter || 0) >= condition.count;

      case 'trending_episodes':
        const trendingCount = await this.getTotalTrendingEpisodes(userId);
        return trendingCount >= condition.count;

      case 'total_quotes':
        return (userData.actions?.quote_claim || 0) >= condition.count;

      case 'parties_hosted':
        return (userData.actions?.watch_party_host || 0) >= condition.count;

      case 'max_streak':
        return (userData.maxStreak || 0) >= condition.count;

      case 'completed_series':
        return (userData.completedSeries || 0) >= condition.count;

      default:
        return false;
    }
  }

  // Get total trending episodes watched
  static async getTotalTrendingEpisodes(userId) {
    const statsQuery = await db.collection('dailyStats')
      .where('userId', '==', userId)
      .get();

    let total = 0;
    statsQuery.forEach(doc => {
      total += doc.data().trendingEpisodes || 0;
    });

    return total;
  }

  // Update quest progress
  static async updateQuestProgress(userId, action, metadata) {
    const today = new Date().toISOString().split('T')[0];
    const weekStart = this.getWeekStart();

    // Update daily quests
    await this.updateDailyQuests(userId, today, action, metadata);

    // Update weekly quests
    await this.updateWeeklyQuests(userId, weekStart, action, metadata);
  }

  // Update daily quest progress
  static async updateDailyQuests(userId, date, action, metadata) {
    const questRef = db.collection('questProgress').doc(`${userId}_daily_${date}`);
    const questDoc = await questRef.get();
    
    let questData = questDoc.exists ? questDoc.data() : {
      userId: userId,
      type: 'daily',
      date: date,
      quests: {}
    };

    // Initialize quest progress if not exists
    for (const quest of DAILY_QUESTS) {
      if (!questData.quests[quest.id]) {
        questData.quests[quest.id] = { progress: 0, completed: false, claimed: false };
      }
    }

    // Update progress based on action
    this.updateQuestProgressByAction(questData.quests, DAILY_QUESTS, action, metadata);

    await questRef.set(questData);
  }

  // Update weekly quest progress
  static async updateWeeklyQuests(userId, weekStart, action, metadata) {
    const questRef = db.collection('questProgress').doc(`${userId}_weekly_${weekStart}`);
    const questDoc = await questRef.get();
    
    let questData = questDoc.exists ? questDoc.data() : {
      userId: userId,
      type: 'weekly',
      weekStart: weekStart,
      quests: {}
    };

    // Initialize quest progress if not exists
    for (const quest of WEEKLY_QUESTS) {
      if (!questData.quests[quest.id]) {
        questData.quests[quest.id] = { progress: 0, completed: false, claimed: false };
      }
    }

    // Update progress based on action
    this.updateQuestProgressByAction(questData.quests, WEEKLY_QUESTS, action, metadata);

    await questRef.set(questData);
  }

  // Update quest progress by action
  static updateQuestProgressByAction(questProgress, questList, action, metadata) {
    for (const quest of questList) {
      const questData = questProgress[quest.id];
      if (questData.completed) continue;

      let shouldIncrement = false;

      // Check if action matches quest condition
      switch (quest.condition.type) {
        case 'trending_episodes':
          shouldIncrement = action === 'WATCH_EPISODE' && metadata.isTrending;
          break;
        case 'chapters_read':
          shouldIncrement = action === 'READ_CHAPTER';
          break;
        case 'quotes_claimed':
          shouldIncrement = action === 'QUOTE_CLAIM';
          break;
        case 'seasonal_episodes':
          shouldIncrement = action === 'WATCH_EPISODE' && metadata.isSeasonal;
          break;
        case 'parties_joined':
          shouldIncrement = action === 'WATCH_PARTY_JOIN';
          break;
      }

      if (shouldIncrement) {
        questData.progress++;
        if (questData.progress >= quest.condition.count) {
          questData.completed = true;
        }
      }
    }
  }

  // Calculate level from XP
  static calculateLevel(xp) {
    return Math.floor(Math.sqrt(xp / 100)) + 1;
  }

  // Get week start date
  static getWeekStart() {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek;
    const weekStart = new Date(now.setDate(diff));
    return weekStart.toISOString().split('T')[0];
  }

  // Create user profile
  static async createUserProfile(userId) {
    const userRef = db.collection('users').doc(userId);
    await userRef.set({
      xp: 0,
      level: 1,
      streak: 0,
      maxStreak: 0,
      badges: [],
      actions: {},
      watchHistory: {},
      readHistory: {},
      createdAt: new Date(),
      lastActivity: new Date()
    });
  }

  // Get user profile with gamification data
  static async getUserProfile(userId) {
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      await this.createUserProfile(userId);
      return await this.getUserProfile(userId);
    }

    const userData = userDoc.data();
    const level = this.calculateLevel(userData.xp || 0);
    const xpForNextLevel = Math.pow(level, 2) * 100;
    const xpProgress = (userData.xp || 0) - (Math.pow(level - 1, 2) * 100);

    return {
      ...userData,
      level,
      xpForNextLevel,
      xpProgress,
      badges: userData.badges?.map(badgeId => BADGES[badgeId]).filter(Boolean) || []
    };
  }

  // Get leaderboard
  static async getLeaderboard(type = 'global', limit = 10) {
    let query = db.collection('users').orderBy('xp', 'desc').limit(limit);
    
    if (type === 'weekly') {
      const weekStart = this.getWeekStart();
      // For weekly, we'd need to track weekly XP separately
      // This is a simplified version
    }

    const snapshot = await query.get();
    const leaderboard = [];

    snapshot.forEach((doc, index) => {
      const userData = doc.data();
      leaderboard.push({
        rank: index + 1,
        userId: doc.id,
        xp: userData.xp || 0,
        level: this.calculateLevel(userData.xp || 0),
        badges: userData.badges?.length || 0
      });
    });

    return leaderboard;
  }

  // Initialize user profile for cross-platform sync
  static async initializeUser(discordId, options = {}) {
    try {
      const userRef = db.collection('users').doc(discordId);
      const userDoc = await userRef.get();

      if (userDoc.exists) {
        // User already exists, update with Discord info if needed
        const updates = {
          lastActivity: new Date(),
          lastSyncTimestamp: new Date()
        };

        if (options.websiteUserId) {
          updates.websiteUserId = options.websiteUserId;
        }

        await userRef.update(updates);
        return { success: true, message: 'User profile updated' };
      }

      // Create new user profile
      const initialData = {
        xp: options.existingXP || 0,
        level: options.existingLevel || 1,
        streak: options.existingStreak || 0,
        maxStreak: options.existingStreak || 0,
        badges: [],
        actions: {},
        watchHistory: {},
        readHistory: {},
        createdAt: new Date(),
        lastActivity: new Date(),
        lastSyncTimestamp: new Date(),
        syncVersion: 1
      };

      if (options.websiteUserId) {
        initialData.websiteUserId = options.websiteUserId;
      }
      if (options.username) {
        initialData.username = options.username;
      }
      if (options.email) {
        initialData.email = options.email;
      }

      await userRef.set(initialData);
      return { success: true, message: 'User profile created' };
    } catch (error) {
      console.error('Error initializing user:', error);
      return { success: false, error: error.message };
    }
  }

  // Clean up user data when unlinking
  static async cleanupUserData(discordId) {
    try {
      const userRef = db.collection('users').doc(discordId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        return { success: true, message: 'User not found' };
      }

      // Remove Discord-specific data but preserve website link if exists
      const userData = userDoc.data();
      if (userData.websiteUserId) {
        // Keep minimal data for potential re-linking
        await userRef.update({
          actions: {},
          watchHistory: {},
          readHistory: {},
          lastActivity: new Date(),
          cleanedAt: new Date()
        });
      } else {
        // No website link, safe to delete
        await userRef.delete();
      }

      return { success: true, message: 'User data cleaned up' };
    } catch (error) {
      console.error('Error cleaning up user data:', error);
      return { success: false, error: error.message };
    }
  }

  // Sync user data with website
  static async syncWithWebsite(discordId, websiteData) {
    try {
      const userRef = db.collection('users').doc(discordId);
      
      await userRef.update({
        xp: websiteData.xp || 0,
        level: websiteData.level || 1,
        streak: websiteData.streak || 0,
        badges: websiteData.badges || [],
        lastSyncTimestamp: new Date(),
        syncVersion: db.FieldValue.increment(1)
      });

      return { success: true, message: 'Synced with website data' };
    } catch (error) {
      console.error('Error syncing with website:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = {
  APIVerifiedGamification,
  XP_VALUES,
  BADGES,
  DAILY_QUESTS,
  WEEKLY_QUESTS
};

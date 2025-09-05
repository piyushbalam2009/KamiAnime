const { websiteSyncClient } = require('./sync-client');
const { db } = require('./firebase');

class WebhookHandler {
  /**
   * Handle anime watch event from website
   */
  static async handleAnimeWatch(userId, animeData, episodeData) {
    try {
      // Create sync event for Discord bot
      await websiteSyncClient.createSyncEvent(userId, 'WEBSITE_ANIME_WATCH', {
        animeId: animeData.id,
        animeTitle: animeData.title,
        episode: episodeData.number,
        episodeTitle: episodeData.title,
        watchedAt: new Date(),
        source: 'website',
        verified: true
      });

      // Log activity
      await websiteSyncClient.logActivity(userId, 'ANIME_EPISODE_WATCHED', {
        animeId: animeData.id,
        episode: episodeData.number,
        platform: 'website'
      });

      console.log('Anime watch event sent to Discord bot for user:', userId);
    } catch (error) {
      console.error('Error handling anime watch event:', error);
      throw error;
    }
  }

  /**
   * Handle manga chapter read event from website
   */
  static async handleMangaRead(userId, mangaData, chapterData) {
    try {
      // Create sync event for Discord bot
      await websiteSyncClient.createSyncEvent(userId, 'WEBSITE_MANGA_READ', {
        mangaId: mangaData.id,
        mangaTitle: mangaData.title,
        chapter: chapterData.number,
        chapterTitle: chapterData.title,
        readAt: new Date(),
        source: 'website',
        verified: true
      });

      // Log activity
      await websiteSyncClient.logActivity(userId, 'MANGA_CHAPTER_READ', {
        mangaId: mangaData.id,
        chapter: chapterData.number,
        platform: 'website'
      });

      console.log('Manga read event sent to Discord bot for user:', userId);
    } catch (error) {
      console.error('Error handling manga read event:', error);
      throw error;
    }
  }

  /**
   * Handle user login event
   */
  static async handleUserLogin(userId, loginData) {
    try {
      // Create sync event for streak and activity tracking
      await websiteSyncClient.createSyncEvent(userId, 'WEBSITE_USER_LOGIN', {
        loginAt: new Date(),
        loginMethod: loginData.method,
        ipAddress: loginData.ipAddress,
        userAgent: loginData.userAgent,
        source: 'website'
      });

      // Log activity
      await websiteSyncClient.logActivity(userId, 'USER_LOGIN', {
        method: loginData.method,
        platform: 'website'
      });

      console.log('User login event sent to Discord bot for user:', userId);
    } catch (error) {
      console.error('Error handling user login event:', error);
      throw error;
    }
  }

  /**
   * Handle quest completion on website
   */
  static async handleQuestComplete(userId, questData) {
    try {
      // Create sync event for Discord bot
      await websiteSyncClient.createSyncEvent(userId, 'WEBSITE_QUEST_COMPLETE', {
        questId: questData.id,
        questName: questData.name,
        questType: questData.type,
        completedAt: new Date(),
        progress: questData.progress,
        source: 'website'
      });

      // Log activity
      await websiteSyncClient.logActivity(userId, 'QUEST_COMPLETED', {
        questId: questData.id,
        questType: questData.type,
        platform: 'website'
      });

      console.log('Quest completion event sent to Discord bot for user:', userId);
    } catch (error) {
      console.error('Error handling quest completion event:', error);
      throw error;
    }
  }

  /**
   * Handle badge unlock on website
   */
  static async handleBadgeUnlock(userId, badgeData) {
    try {
      // Create sync event for Discord bot
      await websiteSyncClient.createSyncEvent(userId, 'WEBSITE_BADGE_UNLOCK', {
        badgeId: badgeData.id,
        badgeName: badgeData.name,
        badgeType: badgeData.type,
        unlockedAt: new Date(),
        source: 'website'
      });

      // Log activity
      await websiteSyncClient.logActivity(userId, 'BADGE_UNLOCKED', {
        badgeId: badgeData.id,
        badgeType: badgeData.type,
        platform: 'website'
      });

      console.log('Badge unlock event sent to Discord bot for user:', userId);
    } catch (error) {
      console.error('Error handling badge unlock event:', error);
      throw error;
    }
  }

  /**
   * Handle XP gain on website
   */
  static async handleXPGain(userId, xpData) {
    try {
      // Create sync event for Discord bot
      await websiteSyncClient.createSyncEvent(userId, 'WEBSITE_XP_GAIN', {
        xpGained: xpData.amount,
        newXP: xpData.newTotal,
        newLevel: xpData.newLevel,
        oldLevel: xpData.oldLevel,
        action: xpData.action,
        gainedAt: new Date(),
        source: 'website'
      });

      // Log activity
      await websiteSyncClient.logActivity(userId, 'XP_GAINED', {
        amount: xpData.amount,
        action: xpData.action,
        platform: 'website'
      });

      console.log('XP gain event sent to Discord bot for user:', userId);
    } catch (error) {
      console.error('Error handling XP gain event:', error);
      throw error;
    }
  }

  /**
   * Handle profile update on website
   */
  static async handleProfileUpdate(userId, updateData) {
    try {
      // Create sync event for Discord bot
      await websiteSyncClient.createSyncEvent(userId, 'WEBSITE_PROFILE_UPDATE', {
        updatedFields: updateData.fields,
        updatedAt: new Date(),
        source: 'website'
      });

      // Log activity
      await websiteSyncClient.logActivity(userId, 'PROFILE_UPDATED', {
        fields: updateData.fields,
        platform: 'website'
      });

      console.log('Profile update event sent to Discord bot for user:', userId);
    } catch (error) {
      console.error('Error handling profile update event:', error);
      throw error;
    }
  }

  /**
   * Handle watchlist addition on website
   */
  static async handleWatchlistAdd(userId, animeData) {
    try {
      // Create sync event for Discord bot
      await websiteSyncClient.createSyncEvent(userId, 'WEBSITE_WATCHLIST_ADD', {
        animeId: animeData.id,
        animeTitle: animeData.title,
        addedAt: new Date(),
        source: 'website'
      });

      // Log activity
      await websiteSyncClient.logActivity(userId, 'WATCHLIST_ADDED', {
        animeId: animeData.id,
        platform: 'website'
      });

      console.log('Watchlist add event sent to Discord bot for user:', userId);
    } catch (error) {
      console.error('Error handling watchlist add event:', error);
      throw error;
    }
  }

  /**
   * Handle reading list addition on website
   */
  static async handleReadingListAdd(userId, mangaData) {
    try {
      // Create sync event for Discord bot
      await websiteSyncClient.createSyncEvent(userId, 'WEBSITE_READINGLIST_ADD', {
        mangaId: mangaData.id,
        mangaTitle: mangaData.title,
        addedAt: new Date(),
        source: 'website'
      });

      // Log activity
      await websiteSyncClient.logActivity(userId, 'READINGLIST_ADDED', {
        mangaId: mangaData.id,
        platform: 'website'
      });

      console.log('Reading list add event sent to Discord bot for user:', userId);
    } catch (error) {
      console.error('Error handling reading list add event:', error);
      throw error;
    }
  }

  /**
   * Handle review submission on website
   */
  static async handleReviewSubmit(userId, reviewData) {
    try {
      // Create sync event for Discord bot
      await websiteSyncClient.createSyncEvent(userId, 'WEBSITE_REVIEW_SUBMIT', {
        contentId: reviewData.contentId,
        contentType: reviewData.contentType,
        rating: reviewData.rating,
        reviewLength: reviewData.review?.length || 0,
        submittedAt: new Date(),
        source: 'website'
      });

      // Log activity
      await websiteSyncClient.logActivity(userId, 'REVIEW_SUBMITTED', {
        contentId: reviewData.contentId,
        contentType: reviewData.contentType,
        rating: reviewData.rating,
        platform: 'website'
      });

      console.log('Review submit event sent to Discord bot for user:', userId);
    } catch (error) {
      console.error('Error handling review submit event:', error);
      throw error;
    }
  }

  /**
   * Process webhook request
   */
  static async processWebhook(eventType, userId, data) {
    try {
      // Validate user exists and has sync enabled
      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) {
        throw new Error('User not found');
      }

      const userData = userDoc.data();
      if (!userData.preferences?.syncWithDiscord) {
        console.log('Sync disabled for user:', userId);
        return { success: true, message: 'Sync disabled' };
      }

      // Route to appropriate handler
      switch (eventType) {
        case 'anime_watch':
          await this.handleAnimeWatch(userId, data.anime, data.episode);
          break;
        case 'manga_read':
          await this.handleMangaRead(userId, data.manga, data.chapter);
          break;
        case 'user_login':
          await this.handleUserLogin(userId, data.login);
          break;
        case 'quest_complete':
          await this.handleQuestComplete(userId, data.quest);
          break;
        case 'badge_unlock':
          await this.handleBadgeUnlock(userId, data.badge);
          break;
        case 'xp_gain':
          await this.handleXPGain(userId, data.xp);
          break;
        case 'profile_update':
          await this.handleProfileUpdate(userId, data.update);
          break;
        case 'watchlist_add':
          await this.handleWatchlistAdd(userId, data.anime);
          break;
        case 'readinglist_add':
          await this.handleReadingListAdd(userId, data.manga);
          break;
        case 'review_submit':
          await this.handleReviewSubmit(userId, data.review);
          break;
        default:
          throw new Error(`Unknown event type: ${eventType}`);
      }

      return { success: true, message: 'Event processed successfully' };
    } catch (error) {
      console.error('Error processing webhook:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = { WebhookHandler };

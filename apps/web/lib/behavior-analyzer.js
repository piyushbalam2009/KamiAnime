// User behavior analysis and recommendation system
import { config } from './config';

class BehaviorAnalyzer {
  constructor() {
    this.analysisCache = new Map();
    this.cacheExpiry = 30 * 60 * 1000; // 30 minutes
    this.minDataPoints = 10; // Minimum events needed for analysis
  }

  /**
   * Analyze user behavior patterns
   */
  async analyzeUserBehavior(userId, timeRange = '30d') {
    try {
      const cacheKey = `${userId}_${timeRange}`;
      const cached = this.analysisCache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
        return cached.data;
      }

      const { db } = await import('./firebase');
      const timeFilter = this.getTimeFilter(timeRange);
      
      // Get user activity data
      const snapshot = await db.collection('analytics')
        .where('userId', '==', userId)
        .where('timestamp', '>=', timeFilter)
        .orderBy('timestamp', 'desc')
        .get();

      const events = snapshot.docs.map(doc => doc.data());
      
      if (events.length < this.minDataPoints) {
        return {
          insufficient_data: true,
          message: 'Not enough data for meaningful analysis',
          eventCount: events.length
        };
      }

      const analysis = {
        userId,
        timeRange,
        totalEvents: events.length,
        activityPatterns: this.analyzeActivityPatterns(events),
        contentPreferences: this.analyzeContentPreferences(events),
        engagementMetrics: this.analyzeEngagement(events),
        gamificationBehavior: this.analyzeGamificationBehavior(events),
        recommendations: [],
        generatedAt: new Date()
      };

      // Generate personalized recommendations
      analysis.recommendations = this.generateRecommendations(analysis);

      // Cache the analysis
      this.analysisCache.set(cacheKey, {
        data: analysis,
        timestamp: Date.now()
      });

      return analysis;

    } catch (error) {
      console.error('Behavior analysis error:', error);
      throw error;
    }
  }

  /**
   * Analyze activity patterns (when user is most active)
   */
  analyzeActivityPatterns(events) {
    const hourlyActivity = new Array(24).fill(0);
    const dailyActivity = new Array(7).fill(0);
    const sessionLengths = [];
    
    let currentSession = null;
    
    events.forEach(event => {
      const timestamp = new Date(event.timestamp);
      const hour = timestamp.getHours();
      const day = timestamp.getDay();
      
      hourlyActivity[hour]++;
      dailyActivity[day]++;
      
      // Track session lengths
      if (currentSession && timestamp - currentSession.lastActivity > 30 * 60 * 1000) {
        // Session ended (30 min gap)
        sessionLengths.push(currentSession.lastActivity - currentSession.start);
        currentSession = { start: timestamp, lastActivity: timestamp };
      } else if (!currentSession) {
        currentSession = { start: timestamp, lastActivity: timestamp };
      } else {
        currentSession.lastActivity = timestamp;
      }
    });

    // Add final session
    if (currentSession) {
      sessionLengths.push(currentSession.lastActivity - currentSession.start);
    }

    const peakHour = hourlyActivity.indexOf(Math.max(...hourlyActivity));
    const peakDay = dailyActivity.indexOf(Math.max(...dailyActivity));
    const avgSessionLength = sessionLengths.length > 0 
      ? sessionLengths.reduce((a, b) => a + b, 0) / sessionLengths.length 
      : 0;

    return {
      peakHour,
      peakDay: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][peakDay],
      hourlyDistribution: hourlyActivity,
      dailyDistribution: dailyActivity,
      averageSessionLength: Math.round(avgSessionLength / (1000 * 60)), // in minutes
      totalSessions: sessionLengths.length
    };
  }

  /**
   * Analyze content preferences
   */
  analyzeContentPreferences(events) {
    const animeGenres = {};
    const mangaGenres = {};
    const watchedAnime = new Set();
    const readManga = new Set();
    const commands = {};

    events.forEach(event => {
      // Track command usage
      if (event.type === 'user_interaction' && event.metadata?.command) {
        const cmd = event.metadata.command;
        commands[cmd] = (commands[cmd] || 0) + 1;
      }

      // Track anime preferences
      if (event.type === 'gamification' && event.event === 'xp_awarded' && event.metadata?.action === 'WATCH_EPISODE') {
        const animeId = event.metadata?.animeId;
        const genres = event.metadata?.genres || [];
        
        if (animeId) watchedAnime.add(animeId);
        genres.forEach(genre => {
          animeGenres[genre] = (animeGenres[genre] || 0) + 1;
        });
      }

      // Track manga preferences
      if (event.type === 'gamification' && event.event === 'xp_awarded' && event.metadata?.action === 'READ_CHAPTER') {
        const mangaId = event.metadata?.mangaId;
        const genres = event.metadata?.genres || [];
        
        if (mangaId) readManga.add(mangaId);
        genres.forEach(genre => {
          mangaGenres[genre] = (mangaGenres[genre] || 0) + 1;
        });
      }
    });

    return {
      favoriteCommands: this.getTopItems(commands, 5),
      favoriteAnimeGenres: this.getTopItems(animeGenres, 5),
      favoriteMangaGenres: this.getTopItems(mangaGenres, 5),
      uniqueAnimeWatched: watchedAnime.size,
      uniqueMangaRead: readManga.size,
      contentBalance: {
        anime: watchedAnime.size,
        manga: readManga.size,
        preference: watchedAnime.size > readManga.size ? 'anime' : 
                   readManga.size > watchedAnime.size ? 'manga' : 'balanced'
      }
    };
  }

  /**
   * Analyze engagement metrics
   */
  analyzeEngagement(events) {
    const gamificationEvents = events.filter(e => e.type === 'gamification');
    const interactionEvents = events.filter(e => e.type === 'user_interaction');
    
    const totalXP = gamificationEvents
      .filter(e => e.event === 'xp_awarded')
      .reduce((sum, e) => sum + (e.metadata?.xpAmount || 0), 0);

    const badgesEarned = gamificationEvents
      .filter(e => e.event === 'badge_unlock').length;

    const levelUps = gamificationEvents
      .filter(e => e.event === 'level_up').length;

    const streakDays = this.calculateStreakDays(events);
    const engagementScore = this.calculateEngagementScore(events);

    return {
      totalXP,
      badgesEarned,
      levelUps,
      streakDays,
      engagementScore,
      averageXPPerDay: this.calculateAverageXPPerDay(events),
      mostActiveTimeframe: this.getMostActiveTimeframe(events),
      consistencyScore: this.calculateConsistencyScore(events)
    };
  }

  /**
   * Analyze gamification behavior
   */
  analyzeGamificationBehavior(events) {
    const gamificationEvents = events.filter(e => e.type === 'gamification');
    
    const xpSources = {};
    const badgeTypes = {};
    const questCompletions = 0;

    gamificationEvents.forEach(event => {
      if (event.event === 'xp_awarded') {
        const source = event.metadata?.action || 'unknown';
        xpSources[source] = (xpSources[source] || 0) + (event.metadata?.xpAmount || 0);
      }
      
      if (event.event === 'badge_unlock') {
        const badgeType = event.metadata?.badgeId?.split('_')[0] || 'unknown';
        badgeTypes[badgeType] = (badgeTypes[badgeType] || 0) + 1;
      }
    });

    return {
      xpSourceDistribution: xpSources,
      badgeTypeDistribution: badgeTypes,
      questCompletions,
      gamificationMotivation: this.assessGamificationMotivation(gamificationEvents),
      progressionRate: this.calculateProgressionRate(gamificationEvents),
      achievementFocus: this.getTopItems(badgeTypes, 3)
    };
  }

  /**
   * Generate personalized recommendations
   */
  generateRecommendations(analysis) {
    const recommendations = [];

    // Activity pattern recommendations
    if (analysis.activityPatterns.averageSessionLength < 15) {
      recommendations.push({
        type: 'engagement',
        priority: 'medium',
        title: 'Extend Your Sessions',
        description: 'Try exploring more features during your visits. Consider joining watch parties or reading manga chapters.',
        action: 'explore_features'
      });
    }

    // Content recommendations
    if (analysis.contentPreferences.contentBalance.preference === 'anime') {
      recommendations.push({
        type: 'content',
        priority: 'low',
        title: 'Try Reading Manga',
        description: 'Expand your experience by exploring manga. You might discover new stories!',
        action: 'try_manga'
      });
    } else if (analysis.contentPreferences.contentBalance.preference === 'manga') {
      recommendations.push({
        type: 'content',
        priority: 'low',
        title: 'Watch More Anime',
        description: 'Balance your content consumption by watching anime adaptations of your favorite manga.',
        action: 'try_anime'
      });
    }

    // Gamification recommendations
    if (analysis.engagementMetrics.engagementScore < 0.5) {
      recommendations.push({
        type: 'gamification',
        priority: 'high',
        title: 'Boost Your Engagement',
        description: 'Complete daily quests and maintain your streak to earn more XP and unlock badges.',
        action: 'increase_activity'
      });
    }

    // Social recommendations
    if (analysis.contentPreferences.favoriteCommands.find(cmd => cmd.name === 'watchparty')) {
      recommendations.push({
        type: 'social',
        priority: 'medium',
        title: 'Host a Watch Party',
        description: 'You enjoy watch parties! Consider hosting one for your favorite anime.',
        action: 'host_watchparty'
      });
    }

    // Time-based recommendations
    const peakHour = analysis.activityPatterns.peakHour;
    if (peakHour >= 18 && peakHour <= 22) {
      recommendations.push({
        type: 'timing',
        priority: 'low',
        title: 'Evening Routine',
        description: 'You\'re most active in the evening. Perfect time for binge-watching!',
        action: 'evening_content'
      });
    }

    return recommendations.slice(0, 5); // Return top 5 recommendations
  }

  /**
   * Helper methods
   */
  getTopItems(obj, limit) {
    return Object.entries(obj)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([name, count]) => ({ name, count }));
  }

  getTimeFilter(timeRange) {
    const now = new Date();
    switch (timeRange) {
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }

  calculateStreakDays(events) {
    const days = new Set();
    events.forEach(event => {
      const date = new Date(event.timestamp).toDateString();
      days.add(date);
    });
    return days.size;
  }

  calculateEngagementScore(events) {
    const factors = {
      dailyActivity: Math.min(events.length / 30, 1), // Normalize to 30 days
      diversity: this.calculateActivityDiversity(events),
      consistency: this.calculateConsistencyScore(events),
      gamification: this.calculateGamificationEngagement(events)
    };

    return (factors.dailyActivity * 0.3 + 
            factors.diversity * 0.2 + 
            factors.consistency * 0.3 + 
            factors.gamification * 0.2);
  }

  calculateActivityDiversity(events) {
    const types = new Set(events.map(e => e.type));
    return Math.min(types.size / 5, 1); // Normalize to 5 types
  }

  calculateConsistencyScore(events) {
    if (events.length < 7) return 0;
    
    const dailyActivity = {};
    events.forEach(event => {
      const date = new Date(event.timestamp).toDateString();
      dailyActivity[date] = (dailyActivity[date] || 0) + 1;
    });

    const activeDays = Object.keys(dailyActivity).length;
    const totalDays = Math.min(30, Math.ceil((Date.now() - new Date(events[events.length - 1].timestamp)) / (24 * 60 * 60 * 1000)));
    
    return activeDays / totalDays;
  }

  calculateGamificationEngagement(events) {
    const gamificationEvents = events.filter(e => e.type === 'gamification');
    return Math.min(gamificationEvents.length / events.length * 2, 1);
  }

  calculateAverageXPPerDay(events) {
    const xpEvents = events.filter(e => e.type === 'gamification' && e.event === 'xp_awarded');
    const totalXP = xpEvents.reduce((sum, e) => sum + (e.metadata?.xpAmount || 0), 0);
    const days = this.calculateStreakDays(events);
    return days > 0 ? Math.round(totalXP / days) : 0;
  }

  getMostActiveTimeframe(events) {
    const timeframes = { morning: 0, afternoon: 0, evening: 0, night: 0 };
    
    events.forEach(event => {
      const hour = new Date(event.timestamp).getHours();
      if (hour >= 6 && hour < 12) timeframes.morning++;
      else if (hour >= 12 && hour < 18) timeframes.afternoon++;
      else if (hour >= 18 && hour < 24) timeframes.evening++;
      else timeframes.night++;
    });

    return Object.entries(timeframes).reduce((a, b) => timeframes[a[0]] > timeframes[b[0]] ? a : b)[0];
  }

  assessGamificationMotivation(events) {
    const xpEvents = events.filter(e => e.event === 'xp_awarded').length;
    const badgeEvents = events.filter(e => e.event === 'badge_unlock').length;
    const levelEvents = events.filter(e => e.event === 'level_up').length;

    if (badgeEvents > xpEvents * 0.1) return 'achievement_focused';
    if (levelEvents > 0) return 'progression_focused';
    if (xpEvents > events.length * 0.5) return 'xp_focused';
    return 'casual';
  }

  calculateProgressionRate(events) {
    const levelUps = events.filter(e => e.event === 'level_up');
    if (levelUps.length < 2) return 'slow';
    
    const timeBetweenLevels = levelUps.reduce((acc, event, index) => {
      if (index === 0) return acc;
      return acc + (new Date(levelUps[index - 1].timestamp) - new Date(event.timestamp));
    }, 0) / (levelUps.length - 1);

    const avgDays = timeBetweenLevels / (24 * 60 * 60 * 1000);
    
    if (avgDays < 3) return 'fast';
    if (avgDays < 7) return 'moderate';
    return 'slow';
  }

  /**
   * Get behavior insights for multiple users (admin view)
   */
  async getGlobalBehaviorInsights(timeRange = '30d') {
    try {
      const { db } = await import('./firebase');
      const timeFilter = this.getTimeFilter(timeRange);
      
      const snapshot = await db.collection('analytics')
        .where('timestamp', '>=', timeFilter)
        .get();

      const events = snapshot.docs.map(doc => doc.data());
      const users = [...new Set(events.map(e => e.userId).filter(Boolean))];

      const insights = {
        totalUsers: users.length,
        totalEvents: events.length,
        averageEventsPerUser: Math.round(events.length / users.length),
        topGenres: this.getGlobalTopGenres(events),
        peakActivityHours: this.getGlobalPeakHours(events),
        engagementDistribution: this.getEngagementDistribution(events),
        retentionMetrics: await this.calculateRetentionMetrics(users, timeRange)
      };

      return insights;
    } catch (error) {
      console.error('Global behavior insights error:', error);
      throw error;
    }
  }

  getGlobalTopGenres(events) {
    const genres = {};
    events.forEach(event => {
      if (event.metadata?.genres) {
        event.metadata.genres.forEach(genre => {
          genres[genre] = (genres[genre] || 0) + 1;
        });
      }
    });
    return this.getTopItems(genres, 10);
  }

  getGlobalPeakHours(events) {
    const hours = new Array(24).fill(0);
    events.forEach(event => {
      const hour = new Date(event.timestamp).getHours();
      hours[hour]++;
    });
    return hours;
  }

  getEngagementDistribution(events) {
    const userActivity = {};
    events.forEach(event => {
      if (event.userId) {
        userActivity[event.userId] = (userActivity[event.userId] || 0) + 1;
      }
    });

    const activityCounts = Object.values(userActivity);
    return {
      low: activityCounts.filter(count => count < 10).length,
      medium: activityCounts.filter(count => count >= 10 && count < 50).length,
      high: activityCounts.filter(count => count >= 50).length
    };
  }

  async calculateRetentionMetrics(users, timeRange) {
    // Simplified retention calculation
    const activeUsers = users.length;
    const estimatedRetention = Math.min(activeUsers / 100, 1); // Placeholder calculation
    
    return {
      activeUsers,
      estimatedRetention: Math.round(estimatedRetention * 100),
      timeRange
    };
  }
}

// Export singleton instance
export const behaviorAnalyzer = new BehaviorAnalyzer();

export default BehaviorAnalyzer;

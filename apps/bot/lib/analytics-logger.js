const { db } = require('./firebase');
const { config } = require('./config');

class AnalyticsLogger {
  constructor() {
    this.batchSize = config.analytics.batchSize;
    this.flushInterval = config.analytics.flushInterval;
    this.eventQueue = [];
    this.metricsCache = new Map();
    
    // Start periodic flush
    setInterval(() => this.flushEvents(), this.flushInterval);
  }

  /**
   * Log gamification event
   */
  async logGamificationEvent(eventType, userId, data = {}) {
    const event = {
      type: 'gamification',
      eventType,
      userId,
      timestamp: new Date(),
      data,
      platform: 'discord',
      sessionId: this.generateSessionId(userId)
    };

    this.eventQueue.push(event);
    
    // Flush immediately if queue is full
    if (this.eventQueue.length >= this.batchSize) {
      await this.flushEvents();
    }
  }

  /**
   * Log sync event
   */
  async logSyncEvent(eventType, userId, data = {}) {
    const event = {
      type: 'sync',
      eventType,
      userId,
      timestamp: new Date(),
      data,
      platform: data.source || 'unknown',
      syncDirection: data.syncDirection || 'unknown'
    };

    this.eventQueue.push(event);
  }

  /**
   * Log user interaction
   */
  async logUserInteraction(command, userId, guildId, data = {}) {
    const event = {
      type: 'interaction',
      command,
      userId,
      guildId,
      timestamp: new Date(),
      data,
      platform: 'discord'
    };

    this.eventQueue.push(event);
    
    // Update command usage metrics
    await this.updateCommandMetrics(command, guildId);
  }

  /**
   * Log API usage
   */
  async logAPIUsage(apiName, endpoint, responseTime, success, userId = null) {
    const event = {
      type: 'api_usage',
      apiName,
      endpoint,
      responseTime,
      success,
      userId,
      timestamp: new Date(),
      platform: 'discord'
    };

    this.eventQueue.push(event);
    
    // Update API metrics
    await this.updateAPIMetrics(apiName, success, responseTime);
  }

  /**
   * Log error event
   */
  async logError(errorType, error, context = {}) {
    const event = {
      type: 'error',
      errorType,
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date(),
      platform: 'discord'
    };

    this.eventQueue.push(event);
    
    // Flush errors immediately for monitoring
    if (errorType === 'critical') {
      await this.flushEvents();
    }
  }

  /**
   * Log performance metrics
   */
  async logPerformance(operation, duration, metadata = {}) {
    const event = {
      type: 'performance',
      operation,
      duration,
      metadata,
      timestamp: new Date(),
      platform: 'discord'
    };

    this.eventQueue.push(event);
  }

  /**
   * Log user achievement
   */
  async logAchievement(userId, achievementType, achievementData) {
    const event = {
      type: 'achievement',
      userId,
      achievementType,
      data: achievementData,
      timestamp: new Date(),
      platform: 'discord'
    };

    this.eventQueue.push(event);
    
    // Track achievement metrics
    await this.updateAchievementMetrics(achievementType);
  }

  /**
   * Flush events to database
   */
  async flushEvents() {
    if (this.eventQueue.length === 0) return;

    const eventsToFlush = [...this.eventQueue];
    this.eventQueue = [];

    try {
      const batch = db.batch();
      
      eventsToFlush.forEach(event => {
        const docRef = db.collection('analytics').doc();
        batch.set(docRef, {
          ...event,
          id: docRef.id,
          createdAt: event.timestamp
        });
      });

      await batch.commit();
      console.log(`📊 Flushed ${eventsToFlush.length} analytics events`);
    } catch (error) {
      console.error('Failed to flush analytics events:', error);
      // Re-add events to queue for retry
      this.eventQueue.unshift(...eventsToFlush);
    }
  }

  /**
   * Update command usage metrics
   */
  async updateCommandMetrics(command, guildId) {
    const key = `command:${command}`;
    const guildKey = `guild:${guildId}:${command}`;
    
    // Update global command metrics
    const globalCount = (this.metricsCache.get(key) || 0) + 1;
    this.metricsCache.set(key, globalCount);
    
    // Update guild-specific metrics
    const guildCount = (this.metricsCache.get(guildKey) || 0) + 1;
    this.metricsCache.set(guildKey, guildCount);
    
    // Persist to database periodically
    if (globalCount % 10 === 0) {
      await this.persistMetrics();
    }
  }

  /**
   * Update API metrics
   */
  async updateAPIMetrics(apiName, success, responseTime) {
    const successKey = `api:${apiName}:success`;
    const errorKey = `api:${apiName}:error`;
    const responseKey = `api:${apiName}:response_time`;
    
    if (success) {
      const successCount = (this.metricsCache.get(successKey) || 0) + 1;
      this.metricsCache.set(successKey, successCount);
    } else {
      const errorCount = (this.metricsCache.get(errorKey) || 0) + 1;
      this.metricsCache.set(errorKey, errorCount);
    }
    
    // Track average response time
    const currentAvg = this.metricsCache.get(responseKey) || 0;
    const newAvg = (currentAvg + responseTime) / 2;
    this.metricsCache.set(responseKey, newAvg);
  }

  /**
   * Update achievement metrics
   */
  async updateAchievementMetrics(achievementType) {
    const key = `achievement:${achievementType}`;
    const count = (this.metricsCache.get(key) || 0) + 1;
    this.metricsCache.set(key, count);
  }

  /**
   * Persist metrics to database
   */
  async persistMetrics() {
    try {
      const metricsData = {};
      for (const [key, value] of this.metricsCache.entries()) {
        metricsData[key] = value;
      }
      
      await db.collection('metrics').doc('current').set({
        ...metricsData,
        lastUpdated: new Date()
      }, { merge: true });
      
    } catch (error) {
      console.error('Failed to persist metrics:', error);
    }
  }

  /**
   * Generate session ID for user
   */
  generateSessionId(userId) {
    const today = new Date().toISOString().split('T')[0];
    return `${userId}_${today}`;
  }

  /**
   * Get analytics summary
   */
  async getAnalyticsSummary(timeRange = '24h') {
    const timeRangeMs = this.parseTimeRange(timeRange);
    const startTime = new Date(Date.now() - timeRangeMs);
    
    try {
      const snapshot = await db.collection('analytics')
        .where('timestamp', '>=', startTime)
        .get();
      
      const summary = {
        totalEvents: snapshot.size,
        eventTypes: {},
        platforms: {},
        users: new Set(),
        commands: {},
        errors: 0
      };
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        
        // Count event types
        summary.eventTypes[data.type] = (summary.eventTypes[data.type] || 0) + 1;
        
        // Count platforms
        summary.platforms[data.platform] = (summary.platforms[data.platform] || 0) + 1;
        
        // Count unique users
        if (data.userId) {
          summary.users.add(data.userId);
        }
        
        // Count commands
        if (data.command) {
          summary.commands[data.command] = (summary.commands[data.command] || 0) + 1;
        }
        
        // Count errors
        if (data.type === 'error') {
          summary.errors++;
        }
      });
      
      summary.uniqueUsers = summary.users.size;
      delete summary.users; // Remove Set object
      
      return summary;
    } catch (error) {
      console.error('Failed to get analytics summary:', error);
      return null;
    }
  }

  /**
   * Get user analytics
   */
  async getUserAnalytics(userId, timeRange = '7d') {
    const timeRangeMs = this.parseTimeRange(timeRange);
    const startTime = new Date(Date.now() - timeRangeMs);
    
    try {
      const snapshot = await db.collection('analytics')
        .where('userId', '==', userId)
        .where('timestamp', '>=', startTime)
        .orderBy('timestamp', 'desc')
        .get();
      
      const analytics = {
        totalEvents: snapshot.size,
        commands: {},
        achievements: [],
        xpGained: 0,
        badgesUnlocked: 0,
        timeline: []
      };
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        
        if (data.command) {
          analytics.commands[data.command] = (analytics.commands[data.command] || 0) + 1;
        }
        
        if (data.type === 'achievement') {
          analytics.achievements.push({
            type: data.achievementType,
            timestamp: data.timestamp,
            data: data.data
          });
        }
        
        if (data.type === 'gamification' && data.eventType === 'xp_gain') {
          analytics.xpGained += data.data.amount || 0;
        }
        
        if (data.type === 'gamification' && data.eventType === 'badge_unlock') {
          analytics.badgesUnlocked++;
        }
        
        analytics.timeline.push({
          type: data.type,
          eventType: data.eventType,
          timestamp: data.timestamp,
          data: data.data
        });
      });
      
      return analytics;
    } catch (error) {
      console.error('Failed to get user analytics:', error);
      return null;
    }
  }

  /**
   * Parse time range string to milliseconds
   */
  parseTimeRange(timeRange) {
    const units = {
      'm': 60 * 1000,
      'h': 60 * 60 * 1000,
      'd': 24 * 60 * 60 * 1000,
      'w': 7 * 24 * 60 * 60 * 1000
    };
    
    const match = timeRange.match(/^(\d+)([mhdw])$/);
    if (!match) return 24 * 60 * 60 * 1000; // Default to 24 hours
    
    const [, amount, unit] = match;
    return parseInt(amount) * units[unit];
  }

  /**
   * Clean up old analytics data
   */
  async cleanupOldData(retentionDays = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    try {
      const oldData = await db.collection('analytics')
        .where('timestamp', '<', cutoffDate)
        .limit(1000)
        .get();
      
      if (oldData.empty) return;
      
      const batch = db.batch();
      oldData.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      console.log(`🧹 Cleaned up ${oldData.size} old analytics records`);
      
      // Continue cleanup if there are more records
      if (oldData.size === 1000) {
        setTimeout(() => this.cleanupOldData(retentionDays), 1000);
      }
    } catch (error) {
      console.error('Failed to cleanup old analytics data:', error);
    }
  }

  /**
   * Export analytics data
   */
  async exportAnalytics(startDate, endDate, format = 'json') {
    try {
      const snapshot = await db.collection('analytics')
        .where('timestamp', '>=', startDate)
        .where('timestamp', '<=', endDate)
        .orderBy('timestamp', 'desc')
        .get();
      
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      if (format === 'csv') {
        return this.convertToCSV(data);
      }
      
      return data;
    } catch (error) {
      console.error('Failed to export analytics:', error);
      return null;
    }
  }

  /**
   * Convert data to CSV format
   */
  convertToCSV(data) {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    
    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
        return typeof value === 'object' ? JSON.stringify(value) : value;
      });
      csvRows.push(values.join(','));
    });
    
    return csvRows.join('\n');
  }

  /**
   * Export analytics data for admin dashboard
   */
  async exportData(timeRange = '24h', format = 'json') {
    try {
      const events = await this.getEventsByTimeRange(timeRange);
      
      if (format === 'csv') {
        return this.convertToCSV(events);
      }
      
      return {
        metadata: {
          timeRange,
          exportedAt: new Date(),
          eventCount: events.length
        },
        events
      };
    } catch (error) {
      console.error('Export error:', error);
      throw error;
    }
  }

  /**
   * Export user-specific data
   */
  async exportUserData(timeRange = '24h') {
    try {
      const timeFilter = this.getTimeFilter(timeRange);
      const snapshot = await db.collection('analytics')
        .where('timestamp', '>=', timeFilter)
        .where('type', 'in', ['gamification', 'user_interaction'])
        .orderBy('timestamp', 'desc')
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Export user data error:', error);
      throw error;
    }
  }

  /**
   * Export event data
   */
  async exportEventData(timeRange = '24h') {
    try {
      const timeFilter = this.getTimeFilter(timeRange);
      const snapshot = await db.collection('analytics')
        .where('timestamp', '>=', timeFilter)
        .where('type', '==', 'sync_event')
        .orderBy('timestamp', 'desc')
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Export event data error:', error);
      throw error;
    }
  }

  /**
   * Export error data
   */
  async exportErrorData(timeRange = '24h') {
    try {
      const timeFilter = this.getTimeFilter(timeRange);
      const snapshot = await db.collection('analytics')
        .where('timestamp', '>=', timeFilter)
        .where('type', '==', 'error')
        .orderBy('timestamp', 'desc')
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Export error data error:', error);
      throw error;
    }
  }

  /**
   * Export sync data
   */
  async exportSyncData(timeRange = '24h') {
    try {
      const timeFilter = this.getTimeFilter(timeRange);
      const snapshot = await db.collection('analytics')
        .where('timestamp', '>=', timeFilter)
        .where('event', 'in', ['sync_created', 'sync_processed', 'sync_failed'])
        .orderBy('timestamp', 'desc')
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Export sync data error:', error);
      throw error;
    }
  }

  /**
   * Export all data
   */
  async exportAllData(timeRange = '24h') {
    try {
      const timeFilter = this.getTimeFilter(timeRange);
      const snapshot = await db.collection('analytics')
        .where('timestamp', '>=', timeFilter)
        .orderBy('timestamp', 'desc')
        .limit(10000) // Limit for performance
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Export all data error:', error);
      throw error;
    }
  }

  /**
   * Get user analytics
   */
  async getUserAnalytics(userId, timeRange = '24h') {
    try {
      const timeFilter = this.getTimeFilter(timeRange);
      const snapshot = await db.collection('analytics')
        .where('userId', '==', userId)
        .where('timestamp', '>=', timeFilter)
        .orderBy('timestamp', 'desc')
        .get();

      const events = snapshot.docs.map(doc => doc.data());
      
      return {
        userId,
        timeRange,
        totalEvents: events.length,
        eventTypes: this.aggregateEventTypes(events),
        xpGained: this.calculateXPGained(events),
        commandsUsed: this.aggregateCommands(events),
        lastActivity: events[0]?.timestamp || null
      };
    } catch (error) {
      console.error('Get user analytics error:', error);
      throw error;
    }
  }

  /**
   * Get analytics summary
   */
  async getAnalyticsSummary(timeRange = '24h') {
    try {
      const timeFilter = this.getTimeFilter(timeRange);
      const snapshot = await db.collection('analytics')
        .where('timestamp', '>=', timeFilter)
        .get();

      const events = snapshot.docs.map(doc => doc.data());
      const uniqueUsers = new Set(events.map(e => e.userId).filter(Boolean));
      
      return {
        totalEvents: events.length,
        uniqueUsers: uniqueUsers.size,
        eventTypes: this.aggregateEventTypes(events),
        platforms: this.aggregatePlatforms(events),
        commands: this.aggregateCommands(events),
        errors: events.filter(e => e.type === 'error').length,
        timeRange
      };
    } catch (error) {
      console.error('Get analytics summary error:', error);
      throw error;
    }
  }

  /**
   * Generate session ID for user
   */
  generateSessionId(userId) {
    const today = new Date().toISOString().split('T')[0];
    return `${userId}_${today}`;
  }

  /**
   * Convert data to CSV format
   */
  convertToCSV(events) {
    if (!events || events.length === 0) return '';
    
    const headers = Object.keys(events[0]);
    const csvRows = [headers.join(',')];
    
    events.forEach(event => {
      const row = headers.map(header => {
        const value = event[header];
        return typeof value === 'string' ? `"${value}"` : value;
      });
      csvRows.push(row.join(','));
    });
    
    return csvRows.join('\n');
  }

  /**
   * Helper methods for data aggregation
   */
  aggregateEventTypes(events) {
    const types = {};
    events.forEach(event => {
      const type = event.type || 'unknown';
      types[type] = (types[type] || 0) + 1;
    });
    return types;
  }

  aggregatePlatforms(events) {
    const platforms = {};
    events.forEach(event => {
      const platform = event.platform || 'unknown';
      platforms[platform] = (platforms[platform] || 0) + 1;
    });
    return platforms;
  }

  aggregateCommands(events) {
    const commands = {};
    events.forEach(event => {
      if (event.type === 'user_interaction' && event.metadata?.command) {
        const command = event.metadata.command;
        commands[command] = (commands[command] || 0) + 1;
      }
    });
    return commands;
  }

  calculateXPGained(events) {
    return events
      .filter(e => e.type === 'gamification' && e.event === 'xp_awarded')
      .reduce((total, e) => total + (e.metadata?.xpAmount || 0), 0);
  }

  getTimeFilter(timeRange) {
    const now = new Date();
    switch (timeRange) {
      case '1h':
        return new Date(now.getTime() - 60 * 60 * 1000);
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  }
}

// Export singleton instance
const analyticsLogger = new AnalyticsLogger();

module.exports = {
  AnalyticsLogger,
  analyticsLogger
};

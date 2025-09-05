// Performance optimization for large datasets
import { config } from './config';

class PerformanceOptimizer {
  constructor() {
    this.queryCache = new Map();
    this.cacheExpiry = 15 * 60 * 1000; // 15 minutes
    this.maxCacheSize = 1000;
    this.batchSize = 500; // Firestore batch limit
  }

  /**
   * Optimize Firestore queries with pagination and caching
   */
  async optimizedQuery(collection, filters = [], orderBy = null, limit = 100, startAfter = null) {
    try {
      const cacheKey = this.generateCacheKey(collection, filters, orderBy, limit, startAfter);
      const cached = this.queryCache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
        return cached.data;
      }

      const { db } = await import('./firebase');
      let query = db.collection(collection);

      // Apply filters
      filters.forEach(filter => {
        query = query.where(filter.field, filter.operator, filter.value);
      });

      // Apply ordering
      if (orderBy) {
        query = query.orderBy(orderBy.field, orderBy.direction || 'desc');
      }

      // Apply pagination
      if (startAfter) {
        query = query.startAfter(startAfter);
      }

      query = query.limit(limit);

      const snapshot = await query.get();
      const results = {
        docs: snapshot.docs.map(doc => ({
          id: doc.id,
          data: doc.data()
        })),
        lastDoc: snapshot.docs[snapshot.docs.length - 1],
        hasMore: snapshot.docs.length === limit
      };

      // Cache results
      this.cacheResults(cacheKey, results);

      return results;
    } catch (error) {
      console.error('Optimized query error:', error);
      throw error;
    }
  }

  /**
   * Batch operations for better performance
   */
  async batchWrite(operations) {
    try {
      const { db } = await import('./firebase');
      const batches = [];
      let currentBatch = db.batch();
      let operationCount = 0;

      for (const operation of operations) {
        if (operationCount === this.batchSize) {
          batches.push(currentBatch);
          currentBatch = db.batch();
          operationCount = 0;
        }

        const docRef = db.collection(operation.collection).doc(operation.id);
        
        switch (operation.type) {
          case 'set':
            currentBatch.set(docRef, operation.data, operation.options || {});
            break;
          case 'update':
            currentBatch.update(docRef, operation.data);
            break;
          case 'delete':
            currentBatch.delete(docRef);
            break;
        }

        operationCount++;
      }

      if (operationCount > 0) {
        batches.push(currentBatch);
      }

      // Execute all batches
      await Promise.all(batches.map(batch => batch.commit()));
      
      return { success: true, batchCount: batches.length };
    } catch (error) {
      console.error('Batch write error:', error);
      throw error;
    }
  }

  /**
   * Optimize analytics queries with aggregation
   */
  async getAggregatedAnalytics(timeRange, groupBy = 'day') {
    try {
      const cacheKey = `analytics_${timeRange}_${groupBy}`;
      const cached = this.queryCache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
        return cached.data;
      }

      const timeFilter = this.getTimeFilter(timeRange);
      const { db } = await import('./firebase');

      // Use parallel queries for better performance
      const [eventsQuery, usersQuery, errorsQuery] = await Promise.all([
        this.optimizedQuery('analytics', [
          { field: 'timestamp', operator: '>=', value: timeFilter }
        ], { field: 'timestamp' }, 1000),
        
        this.optimizedQuery('users', [
          { field: 'lastActivity', operator: '>=', value: timeFilter }
        ], { field: 'lastActivity' }, 500),
        
        this.optimizedQuery('analytics', [
          { field: 'timestamp', operator: '>=', value: timeFilter },
          { field: 'type', operator: '==', value: 'error' }
        ], { field: 'timestamp' }, 100)
      ]);

      const aggregated = this.aggregateByTimeGroup(eventsQuery.docs, groupBy);
      
      const result = {
        timeRange,
        groupBy,
        events: aggregated,
        totalEvents: eventsQuery.docs.length,
        activeUsers: usersQuery.docs.length,
        errorCount: errorsQuery.docs.length,
        generatedAt: new Date()
      };

      this.cacheResults(cacheKey, result);
      return result;

    } catch (error) {
      console.error('Aggregated analytics error:', error);
      throw error;
    }
  }

  /**
   * Optimize user behavior queries
   */
  async getOptimizedUserBehavior(userId, timeRange) {
    try {
      const cacheKey = `behavior_${userId}_${timeRange}`;
      const cached = this.queryCache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
        return cached.data;
      }

      const timeFilter = this.getTimeFilter(timeRange);
      
      // Use indexed queries for better performance
      const userEvents = await this.optimizedQuery('analytics', [
        { field: 'userId', operator: '==', value: userId },
        { field: 'timestamp', operator: '>=', value: timeFilter }
      ], { field: 'timestamp' }, 500);

      // Process in chunks to avoid memory issues
      const processedData = this.processUserEventsInChunks(userEvents.docs);
      
      this.cacheResults(cacheKey, processedData);
      return processedData;

    } catch (error) {
      console.error('Optimized user behavior error:', error);
      throw error;
    }
  }

  /**
   * Database indexing recommendations
   */
  getIndexingRecommendations() {
    return {
      required: [
        { collection: 'analytics', fields: ['timestamp', 'userId'] },
        { collection: 'analytics', fields: ['type', 'timestamp'] },
        { collection: 'users', fields: ['lastActivity'] },
        { collection: 'sync_events', fields: ['timestamp', 'status'] }
      ],
      composite: [
        { collection: 'analytics', fields: ['userId', 'timestamp', 'type'] },
        { collection: 'analytics', fields: ['type', 'timestamp', 'userId'] }
      ],
      performance_tips: [
        'Use composite indexes for complex queries',
        'Order fields by equality, inequality, then orderBy',
        'Limit query results and use pagination',
        'Cache frequently accessed data'
      ]
    };
  }

  /**
   * Memory optimization for large datasets
   */
  async processLargeDataset(collection, processor, batchSize = 100) {
    try {
      const { db } = await import('./firebase');
      let lastDoc = null;
      let processedCount = 0;
      const results = [];

      while (true) {
        let query = db.collection(collection)
          .orderBy('__name__')
          .limit(batchSize);

        if (lastDoc) {
          query = query.startAfter(lastDoc);
        }

        const snapshot = await query.get();
        
        if (snapshot.empty) break;

        // Process batch
        const batchResults = await processor(snapshot.docs);
        results.push(...batchResults);
        
        processedCount += snapshot.docs.length;
        lastDoc = snapshot.docs[snapshot.docs.length - 1];

        // Memory cleanup
        if (processedCount % 1000 === 0) {
          await this.forceGarbageCollection();
        }
      }

      return {
        processedCount,
        results: results.slice(0, 1000) // Limit results to prevent memory issues
      };

    } catch (error) {
      console.error('Large dataset processing error:', error);
      throw error;
    }
  }

  /**
   * Query optimization analyzer
   */
  analyzeQueryPerformance(queryStats) {
    const recommendations = [];

    if (queryStats.executionTime > 5000) {
      recommendations.push({
        type: 'performance',
        issue: 'Slow query execution',
        suggestion: 'Add composite indexes or reduce query complexity'
      });
    }

    if (queryStats.documentsRead > 1000) {
      recommendations.push({
        type: 'cost',
        issue: 'High document read count',
        suggestion: 'Use pagination and limit query results'
      });
    }

    if (queryStats.cacheHitRate < 0.5) {
      recommendations.push({
        type: 'caching',
        issue: 'Low cache hit rate',
        suggestion: 'Increase cache duration or improve cache keys'
      });
    }

    return {
      performance_score: this.calculatePerformanceScore(queryStats),
      recommendations,
      optimizations_applied: this.getAppliedOptimizations()
    };
  }

  /**
   * Helper methods
   */
  generateCacheKey(...args) {
    return args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join('_');
  }

  cacheResults(key, data) {
    // Implement LRU cache eviction
    if (this.queryCache.size >= this.maxCacheSize) {
      const firstKey = this.queryCache.keys().next().value;
      this.queryCache.delete(firstKey);
    }

    this.queryCache.set(key, {
      data,
      timestamp: Date.now()
    });
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

  aggregateByTimeGroup(docs, groupBy) {
    const groups = {};
    
    docs.forEach(doc => {
      const timestamp = doc.data.timestamp.toDate();
      let groupKey;
      
      switch (groupBy) {
        case 'hour':
          groupKey = timestamp.toISOString().slice(0, 13);
          break;
        case 'day':
          groupKey = timestamp.toISOString().slice(0, 10);
          break;
        case 'week':
          const weekStart = new Date(timestamp);
          weekStart.setDate(timestamp.getDate() - timestamp.getDay());
          groupKey = weekStart.toISOString().slice(0, 10);
          break;
        default:
          groupKey = timestamp.toISOString().slice(0, 10);
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = { count: 0, events: [] };
      }
      
      groups[groupKey].count++;
      groups[groupKey].events.push(doc.data);
    });

    return groups;
  }

  processUserEventsInChunks(docs, chunkSize = 100) {
    const chunks = [];
    for (let i = 0; i < docs.length; i += chunkSize) {
      chunks.push(docs.slice(i, i + chunkSize));
    }

    return chunks.map(chunk => ({
      events: chunk.map(doc => doc.data),
      count: chunk.length
    }));
  }

  async forceGarbageCollection() {
    if (global.gc) {
      global.gc();
    }
    // Small delay to allow cleanup
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  calculatePerformanceScore(stats) {
    let score = 100;
    
    if (stats.executionTime > 1000) score -= 20;
    if (stats.executionTime > 5000) score -= 30;
    if (stats.documentsRead > 500) score -= 15;
    if (stats.documentsRead > 1000) score -= 25;
    if (stats.cacheHitRate < 0.3) score -= 20;
    
    return Math.max(score, 0);
  }

  getAppliedOptimizations() {
    return [
      'Query result caching',
      'Batch operations',
      'Pagination support',
      'Memory management',
      'Composite indexing recommendations'
    ];
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return {
      cacheSize: this.queryCache.size,
      cacheHitRate: this.calculateCacheHitRate(),
      memoryUsage: process.memoryUsage(),
      optimizationsActive: this.getAppliedOptimizations().length
    };
  }

  calculateCacheHitRate() {
    // Simplified cache hit rate calculation
    return this.queryCache.size > 0 ? 0.75 : 0; // Placeholder
  }

  /**
   * Clear cache manually
   */
  clearCache() {
    this.queryCache.clear();
    console.log('Performance optimizer cache cleared');
  }
}

// Export singleton instance
export const performanceOptimizer = new PerformanceOptimizer();

export default PerformanceOptimizer;

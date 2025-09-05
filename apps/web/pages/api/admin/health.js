// Admin health check endpoint with detailed system status
import { config } from '../../../lib/config';

// Rate limiting
const rateLimiter = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 10;

  if (!rateLimiter.has(ip)) {
    rateLimiter.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  const limit = rateLimiter.get(ip);
  if (now > limit.resetTime) {
    rateLimiter.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (limit.count >= maxRequests) {
    return false;
  }

  limit.count++;
  return true;
}

function validateApiKey(req) {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  return apiKey === config.admin.apiKey;
}

export default async function handler(req, res) {
  try {
    // Rate limiting
    const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    if (!checkRateLimit(clientIp)) {
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }

    // API key validation
    if (!validateApiKey(req)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {},
      metrics: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        activeConnections: 0,
        errorRate: 0,
        responseTime: 0
      },
      features: {
        gamification: 'unknown',
        analytics: 'unknown',
        abTesting: 'unknown',
        notifications: 'unknown',
        backup: 'unknown',
        behaviorAnalysis: 'unknown',
        performance: 'unknown'
      },
      database: {
        status: 'unknown',
        collections: {},
        indexes: {},
        performance: {}
      }
    };

    // Test Firebase/Firestore
    try {
      const { db } = await import('../../../lib/firebase');
      
      // Test basic connectivity
      const testDoc = await db.collection('health_check').limit(1).get();
      healthStatus.services.database = 'healthy';
      
      // Check collection health
      const collections = ['users', 'analytics_events', 'ab_tests', 'notifications'];
      for (const collection of collections) {
        try {
          const snapshot = await db.collection(collection).limit(1).get();
          healthStatus.database.collections[collection] = {
            status: 'healthy',
            documentCount: snapshot.size
          };
        } catch (error) {
          healthStatus.database.collections[collection] = {
            status: 'error',
            error: error.message
          };
          healthStatus.status = 'degraded';
        }
      }
      
    } catch (error) {
      healthStatus.services.database = 'unhealthy';
      healthStatus.database.status = 'error';
      healthStatus.database.error = error.message;
      healthStatus.status = 'unhealthy';
    }

    // Test gamification system
    try {
      const { APIVerifiedGamification } = await import('../../../../bot/lib/gamification');
      healthStatus.features.gamification = 'healthy';
    } catch (error) {
      healthStatus.features.gamification = 'error';
      healthStatus.status = 'degraded';
    }

    // Test analytics system
    try {
      const { analyticsLogger } = await import('../../../../bot/lib/analytics-logger');
      healthStatus.features.analytics = 'healthy';
    } catch (error) {
      healthStatus.features.analytics = 'error';
      healthStatus.status = 'degraded';
    }

    // Test A/B testing framework
    try {
      const { abTesting } = await import('../../../lib/ab-testing');
      healthStatus.features.abTesting = 'healthy';
    } catch (error) {
      healthStatus.features.abTesting = 'error';
      healthStatus.status = 'degraded';
    }

    // Test notification system
    try {
      const { notificationSystem } = await import('../../../lib/notification-system');
      healthStatus.features.notifications = 'healthy';
    } catch (error) {
      healthStatus.features.notifications = 'error';
      healthStatus.status = 'degraded';
    }

    // Test backup system
    try {
      const { backupSystem } = await import('../../../lib/backup-system');
      healthStatus.features.backup = 'healthy';
    } catch (error) {
      healthStatus.features.backup = 'error';
      healthStatus.status = 'degraded';
    }

    // Test behavior analysis
    try {
      const { behaviorAnalyzer } = await import('../../../lib/behavior-analyzer');
      healthStatus.features.behaviorAnalysis = 'healthy';
    } catch (error) {
      healthStatus.features.behaviorAnalysis = 'error';
      healthStatus.status = 'degraded';
    }

    // Test performance optimizer
    try {
      const { performanceOptimizer } = await import('../../../lib/performance-optimizer');
      healthStatus.features.performance = 'healthy';
    } catch (error) {
      healthStatus.features.performance = 'error';
      healthStatus.status = 'degraded';
    }

    // Calculate error rate from recent analytics
    try {
      const { db } = await import('../../../lib/firebase');
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      const errorSnapshot = await db.collection('analytics_events')
        .where('eventType', '==', 'error')
        .where('timestamp', '>=', oneHourAgo)
        .get();
      
      const totalSnapshot = await db.collection('analytics_events')
        .where('timestamp', '>=', oneHourAgo)
        .get();
      
      const errorCount = errorSnapshot.size;
      const totalCount = totalSnapshot.size;
      
      healthStatus.metrics.errorRate = totalCount > 0 ? errorCount / totalCount : 0;
      
      if (healthStatus.metrics.errorRate > 0.05) { // 5% error rate threshold
        healthStatus.status = 'degraded';
      }
      
    } catch (error) {
      // Error rate calculation failed, but don't fail health check
      healthStatus.metrics.errorRate = -1;
    }

    // Environment-specific checks
    if (process.env.NODE_ENV === 'production') {
      // Check required production environment variables
      const requiredVars = [
        'FIREBASE_PROJECT_ID',
        'FIREBASE_PRIVATE_KEY',
        'FIREBASE_CLIENT_EMAIL',
        'ADMIN_API_KEY',
        'WEBHOOK_API_KEY'
      ];
      
      const missingVars = requiredVars.filter(varName => !process.env[varName]);
      if (missingVars.length > 0) {
        healthStatus.status = 'unhealthy';
        healthStatus.error = `Missing environment variables: ${missingVars.join(', ')}`;
      }
    }

    // Overall health determination
    const unhealthyServices = Object.values(healthStatus.services).filter(s => s === 'unhealthy').length;
    const unhealthyFeatures = Object.values(healthStatus.features).filter(f => f === 'error').length;
    
    if (unhealthyServices > 0 || healthStatus.status === 'unhealthy') {
      healthStatus.status = 'unhealthy';
    } else if (unhealthyFeatures > 0 || healthStatus.status === 'degraded') {
      healthStatus.status = 'degraded';
    }

    const statusCode = healthStatus.status === 'healthy' ? 200 : 
                      healthStatus.status === 'degraded' ? 200 : 503;
    
    return res.status(statusCode).json(healthStatus);

  } catch (error) {
    console.error('Admin health check error:', error);
    return res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Admin health check failed',
      details: error.message
    });
  }
}

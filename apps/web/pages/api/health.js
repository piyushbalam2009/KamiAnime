// Health check endpoint for production monitoring
import { config } from '../../lib/config';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: 'unknown',
        analytics: 'unknown',
        notifications: 'unknown',
        backup: 'unknown'
      },
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      system: {
        platform: process.platform,
        nodeVersion: process.version
      }
    };

    // Test database connectivity
    try {
      const { db } = await import('../../lib/firebase');
      await db.collection('health_check').limit(1).get();
      healthStatus.services.database = 'healthy';
    } catch (error) {
      healthStatus.services.database = 'unhealthy';
      healthStatus.status = 'degraded';
    }

    // Test analytics system
    try {
      const { analyticsLogger } = await import('../../../bot/lib/analytics-logger');
      healthStatus.services.analytics = 'healthy';
    } catch (error) {
      healthStatus.services.analytics = 'unhealthy';
      healthStatus.status = 'degraded';
    }

    // Test notification system
    try {
      const { notificationSystem } = await import('../../lib/notification-system');
      healthStatus.services.notifications = 'healthy';
    } catch (error) {
      healthStatus.services.notifications = 'unhealthy';
      healthStatus.status = 'degraded';
    }

    // Test backup system
    try {
      const { backupSystem } = await import('../../lib/backup-system');
      healthStatus.services.backup = 'healthy';
    } catch (error) {
      healthStatus.services.backup = 'unhealthy';
      healthStatus.status = 'degraded';
    }

    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
    return res.status(statusCode).json(healthStatus);

  } catch (error) {
    console.error('Health check error:', error);
    return res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      uptime: process.uptime()
    });
  }
}

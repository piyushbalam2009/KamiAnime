import { notificationSystem, SlackNotificationHandler, DiscordNotificationHandler } from '../../../lib/notification-system';
import { analyticsLogger } from '../../../lib/analytics-logger';
import { config } from '../../../lib/config';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Get notification status and recent alerts
    try {
      const recentAlerts = await getRecentAlerts();
      const systemStatus = await getSystemStatus();
      
      res.status(200).json({
        success: true,
        data: {
          recentAlerts,
          systemStatus,
          notificationChannels: getConfiguredChannels()
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  } else if (req.method === 'POST') {
    // Send test notification or configure channels
    try {
      const { action, type, data } = req.body;
      
      if (action === 'test') {
        await notificationSystem.notify('TEST_NOTIFICATION', {
          message: 'This is a test notification from KamiAnime admin dashboard',
          timestamp: new Date(),
          severity: type || 'MEDIUM'
        });
        
        res.status(200).json({ success: true, message: 'Test notification sent' });
      } else if (action === 'configure') {
        // Configure notification channels
        await configureNotificationChannels(data);
        res.status(200).json({ success: true, message: 'Notification channels configured' });
      } else {
        res.status(400).json({ error: 'Invalid action' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to process notification request' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

async function getRecentAlerts() {
  try {
    // Get recent critical events from analytics
    const timeFilter = new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours
    const snapshot = await analyticsLogger.db.collection('notifications')
      .where('timestamp', '>=', timeFilter)
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching recent alerts:', error);
    return [];
  }
}

async function getSystemStatus() {
  try {
    // Get system health metrics
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    const snapshot = await analyticsLogger.db.collection('analytics')
      .where('timestamp', '>=', oneHourAgo)
      .get();

    const events = snapshot.docs.map(doc => doc.data());
    const errorEvents = events.filter(e => e.type === 'error');
    const syncEvents = events.filter(e => e.type === 'sync_event');
    const failedSyncs = syncEvents.filter(e => e.event === 'sync_failed');

    return {
      totalEvents: events.length,
      errorRate: events.length > 0 ? (errorEvents.length / events.length) : 0,
      syncSuccessRate: syncEvents.length > 0 ? ((syncEvents.length - failedSyncs.length) / syncEvents.length) : 1,
      lastUpdate: now,
      status: getOverallStatus(errorEvents.length, events.length, failedSyncs.length)
    };
  } catch (error) {
    console.error('Error getting system status:', error);
    return {
      status: 'UNKNOWN',
      lastUpdate: new Date(),
      error: error.message
    };
  }
}

function getOverallStatus(errorCount, totalEvents, failedSyncs) {
  const errorRate = totalEvents > 0 ? errorCount / totalEvents : 0;
  
  if (errorRate > 0.1 || failedSyncs > 10) {
    return 'CRITICAL';
  } else if (errorRate > 0.05 || failedSyncs > 5) {
    return 'WARNING';
  } else {
    return 'HEALTHY';
  }
}

function getConfiguredChannels() {
  const channels = [];
  
  if (process.env.SLACK_WEBHOOK_URL) {
    channels.push({ type: 'slack', configured: true });
  }
  
  if (process.env.DISCORD_WEBHOOK_URL) {
    channels.push({ type: 'discord', configured: true });
  }
  
  if (process.env.ADMIN_EMAIL) {
    channels.push({ type: 'email', configured: true });
  }
  
  return channels;
}

async function configureNotificationChannels(data) {
  // Set up notification handlers based on configuration
  if (data.slack?.webhookUrl) {
    const slackHandler = new SlackNotificationHandler(data.slack.webhookUrl);
    notificationSystem.subscribe('HIGH_ERROR_RATE', slackHandler.handle.bind(slackHandler));
    notificationSystem.subscribe('SYNC_FAILURES', slackHandler.handle.bind(slackHandler));
    notificationSystem.subscribe('SECURITY_VIOLATIONS', slackHandler.handle.bind(slackHandler));
  }
  
  if (data.discord?.webhookUrl) {
    const discordHandler = new DiscordNotificationHandler(data.discord.webhookUrl);
    notificationSystem.subscribe('SUSPICIOUS_ACTIVITY', discordHandler.handle.bind(discordHandler));
    notificationSystem.subscribe('SYSTEM_HEALTH', discordHandler.handle.bind(discordHandler));
    notificationSystem.subscribe('RATE_LIMIT_VIOLATIONS', discordHandler.handle.bind(discordHandler));
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};

// Real-time notification system for critical events
import { config } from './config';

class NotificationSystem {
  constructor() {
    this.subscribers = new Map();
    this.criticalThresholds = {
      errorRate: 0.05, // 5% error rate
      responseTime: 5000, // 5 seconds
      failedSyncs: 10, // 10 failed syncs in 5 minutes
      suspiciousActivity: 5, // 5 suspicious events in 1 minute
    };
    this.alertCooldowns = new Map();
    this.minCooldownTime = 5 * 60 * 1000; // 5 minutes between same alerts
  }

  /**
   * Subscribe to notifications
   */
  subscribe(eventType, callback) {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }
    this.subscribers.get(eventType).add(callback);
    
    return () => {
      this.subscribers.get(eventType)?.delete(callback);
    };
  }

  /**
   * Send notification to subscribers
   */
  async notify(eventType, data) {
    const subscribers = this.subscribers.get(eventType);
    if (!subscribers) return;

    const notification = {
      id: this.generateNotificationId(),
      type: eventType,
      timestamp: new Date(),
      data,
      severity: this.getSeverity(eventType, data),
    };

    // Check cooldown
    const cooldownKey = `${eventType}_${JSON.stringify(data)}`;
    if (this.isInCooldown(cooldownKey)) {
      return;
    }

    // Set cooldown for this alert type
    this.alertCooldowns.set(cooldownKey, Date.now());

    // Notify all subscribers
    for (const callback of subscribers) {
      try {
        await callback(notification);
      } catch (error) {
        console.error('Notification callback error:', error);
      }
    }

    // Log notification
    console.log(`🚨 ALERT [${notification.severity}]: ${eventType}`, data);
  }

  /**
   * Monitor error rates
   */
  async monitorErrorRate(totalEvents, errorEvents) {
    const errorRate = totalEvents > 0 ? errorEvents / totalEvents : 0;
    
    if (errorRate > this.criticalThresholds.errorRate) {
      await this.notify('HIGH_ERROR_RATE', {
        errorRate: (errorRate * 100).toFixed(2),
        totalEvents,
        errorEvents,
        threshold: (this.criticalThresholds.errorRate * 100).toFixed(2)
      });
    }
  }

  /**
   * Monitor response times
   */
  async monitorResponseTime(operation, responseTime) {
    if (responseTime > this.criticalThresholds.responseTime) {
      await this.notify('SLOW_RESPONSE', {
        operation,
        responseTime,
        threshold: this.criticalThresholds.responseTime
      });
    }
  }

  /**
   * Monitor sync failures
   */
  async monitorSyncFailures(failedSyncs, timeWindow = '5m') {
    if (failedSyncs > this.criticalThresholds.failedSyncs) {
      await this.notify('SYNC_FAILURES', {
        failedSyncs,
        timeWindow,
        threshold: this.criticalThresholds.failedSyncs
      });
    }
  }

  /**
   * Monitor suspicious activity
   */
  async monitorSuspiciousActivity(userId, activityCount, activityType) {
    if (activityCount > this.criticalThresholds.suspiciousActivity) {
      await this.notify('SUSPICIOUS_ACTIVITY', {
        userId,
        activityCount,
        activityType,
        threshold: this.criticalThresholds.suspiciousActivity
      });
    }
  }

  /**
   * Monitor system health
   */
  async monitorSystemHealth(metrics) {
    const issues = [];

    // Check memory usage
    if (metrics.memoryUsage > 0.9) {
      issues.push(`High memory usage: ${(metrics.memoryUsage * 100).toFixed(1)}%`);
    }

    // Check CPU usage
    if (metrics.cpuUsage > 0.8) {
      issues.push(`High CPU usage: ${(metrics.cpuUsage * 100).toFixed(1)}%`);
    }

    // Check database connections
    if (metrics.dbConnections > 100) {
      issues.push(`High database connections: ${metrics.dbConnections}`);
    }

    if (issues.length > 0) {
      await this.notify('SYSTEM_HEALTH', {
        issues,
        metrics
      });
    }
  }

  /**
   * Monitor rate limit violations
   */
  async monitorRateLimitViolations(violations) {
    if (violations.length > 0) {
      await this.notify('RATE_LIMIT_VIOLATIONS', {
        violationCount: violations.length,
        violations: violations.slice(0, 5), // Show first 5
        timeWindow: '1h'
      });
    }
  }

  /**
   * Monitor security violations
   */
  async monitorSecurityViolations(violations) {
    if (violations.length > 0) {
      await this.notify('SECURITY_VIOLATIONS', {
        violationCount: violations.length,
        violations: violations.slice(0, 3), // Show first 3
        severity: 'CRITICAL'
      });
    }
  }

  /**
   * Get notification severity
   */
  getSeverity(eventType, data) {
    switch (eventType) {
      case 'SECURITY_VIOLATIONS':
        return 'CRITICAL';
      case 'HIGH_ERROR_RATE':
      case 'SYNC_FAILURES':
        return 'HIGH';
      case 'SLOW_RESPONSE':
      case 'SUSPICIOUS_ACTIVITY':
      case 'RATE_LIMIT_VIOLATIONS':
        return 'MEDIUM';
      case 'SYSTEM_HEALTH':
        return data.issues?.length > 2 ? 'HIGH' : 'MEDIUM';
      default:
        return 'LOW';
    }
  }

  /**
   * Check if alert is in cooldown
   */
  isInCooldown(cooldownKey) {
    const lastAlert = this.alertCooldowns.get(cooldownKey);
    if (!lastAlert) return false;
    
    return (Date.now() - lastAlert) < this.minCooldownTime;
  }

  /**
   * Generate unique notification ID
   */
  generateNotificationId() {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clean up old cooldowns
   */
  cleanupCooldowns() {
    const now = Date.now();
    for (const [key, timestamp] of this.alertCooldowns.entries()) {
      if (now - timestamp > this.minCooldownTime * 2) {
        this.alertCooldowns.delete(key);
      }
    }
  }

  /**
   * Start periodic cleanup
   */
  startCleanup() {
    setInterval(() => {
      this.cleanupCooldowns();
    }, 10 * 60 * 1000); // Clean up every 10 minutes
  }
}

// Notification handlers for different channels
export class EmailNotificationHandler {
  constructor(emailConfig) {
    this.emailConfig = emailConfig;
  }

  async handle(notification) {
    if (notification.severity === 'CRITICAL' || notification.severity === 'HIGH') {
      // TODO: Implement email sending logic
      console.log(`📧 Email alert: ${notification.type}`, notification.data);
    }
  }
}

export class SlackNotificationHandler {
  constructor(webhookUrl) {
    this.webhookUrl = webhookUrl;
  }

  async handle(notification) {
    try {
      const message = this.formatSlackMessage(notification);
      
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        throw new Error(`Slack notification failed: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Slack notification error:', error);
    }
  }

  formatSlackMessage(notification) {
    const emoji = this.getSeverityEmoji(notification.severity);
    const color = this.getSeverityColor(notification.severity);

    return {
      text: `${emoji} KamiAnime Alert: ${notification.type}`,
      attachments: [
        {
          color,
          fields: [
            {
              title: 'Severity',
              value: notification.severity,
              short: true,
            },
            {
              title: 'Time',
              value: notification.timestamp.toISOString(),
              short: true,
            },
            {
              title: 'Details',
              value: JSON.stringify(notification.data, null, 2),
              short: false,
            },
          ],
        },
      ],
    };
  }

  getSeverityEmoji(severity) {
    switch (severity) {
      case 'CRITICAL': return '🚨';
      case 'HIGH': return '⚠️';
      case 'MEDIUM': return '⚡';
      default: return 'ℹ️';
    }
  }

  getSeverityColor(severity) {
    switch (severity) {
      case 'CRITICAL': return 'danger';
      case 'HIGH': return 'warning';
      case 'MEDIUM': return '#36a64f';
      default: return '#439FE0';
    }
  }
}

export class DiscordNotificationHandler {
  constructor(webhookUrl) {
    this.webhookUrl = webhookUrl;
  }

  async handle(notification) {
    try {
      const message = this.formatDiscordMessage(notification);
      
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        throw new Error(`Discord notification failed: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Discord notification error:', error);
    }
  }

  formatDiscordMessage(notification) {
    const emoji = this.getSeverityEmoji(notification.severity);
    const color = this.getSeverityColor(notification.severity);

    return {
      embeds: [
        {
          title: `${emoji} KamiAnime System Alert`,
          description: `**${notification.type}**`,
          color,
          fields: [
            {
              name: 'Severity',
              value: notification.severity,
              inline: true,
            },
            {
              name: 'Time',
              value: notification.timestamp.toISOString(),
              inline: true,
            },
            {
              name: 'Details',
              value: `\`\`\`json\n${JSON.stringify(notification.data, null, 2)}\`\`\``,
              inline: false,
            },
          ],
          timestamp: notification.timestamp.toISOString(),
        },
      ],
    };
  }

  getSeverityEmoji(severity) {
    switch (severity) {
      case 'CRITICAL': return '🚨';
      case 'HIGH': return '⚠️';
      case 'MEDIUM': return '⚡';
      default: return 'ℹ️';
    }
  }

  getSeverityColor(severity) {
    switch (severity) {
      case 'CRITICAL': return 0xFF0000; // Red
      case 'HIGH': return 0xFFA500; // Orange
      case 'MEDIUM': return 0xFFFF00; // Yellow
      default: return 0x0099FF; // Blue
    }
  }
}

// Export singleton instance
export const notificationSystem = new NotificationSystem();

// Auto-start cleanup
notificationSystem.startCleanup();

export default NotificationSystem;

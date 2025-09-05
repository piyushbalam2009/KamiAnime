// Production monitoring and alerting system for KamiAnime
const { notificationSystem } = require('./apps/web/lib/notification-system');

class ProductionMonitor {
  constructor() {
    this.metrics = {
      responseTime: [],
      errorRate: 0,
      activeUsers: 0,
      systemHealth: 'unknown',
      lastCheck: null
    };
    
    this.thresholds = {
      responseTime: 2000,    // 2 seconds
      errorRate: 0.05,       // 5%
      uptime: 0.99,          // 99%
      memoryUsage: 0.85,     // 85%
      cpuUsage: 0.80         // 80%
    };
    
    this.intervals = {
      healthCheck: 60000,     // 1 minute
      metricsCollection: 30000, // 30 seconds
      alertCheck: 120000      // 2 minutes
    };
    
    this.isRunning = false;
  }

  async start() {
    if (this.isRunning) {
      console.log('📊 Monitor already running');
      return;
    }

    console.log('🚀 Starting production monitoring...');
    this.isRunning = true;

    // Start monitoring intervals
    this.healthCheckInterval = setInterval(() => this.performHealthCheck(), this.intervals.healthCheck);
    this.metricsInterval = setInterval(() => this.collectMetrics(), this.intervals.metricsCollection);
    this.alertInterval = setInterval(() => this.checkAlerts(), this.intervals.alertCheck);

    // Initial health check
    await this.performHealthCheck();
    
    console.log('✅ Production monitoring started');
  }

  async stop() {
    if (!this.isRunning) {
      return;
    }

    console.log('🛑 Stopping production monitoring...');
    
    clearInterval(this.healthCheckInterval);
    clearInterval(this.metricsInterval);
    clearInterval(this.alertInterval);
    
    this.isRunning = false;
    console.log('✅ Production monitoring stopped');
  }

  async performHealthCheck() {
    try {
      const baseUrl = process.env.PRODUCTION_URL || 'https://kamianime.com';
      const adminApiKey = process.env.ADMIN_API_KEY;

      // Check main health endpoint
      const healthResponse = await fetch(`${baseUrl}/api/health`);
      const healthData = await healthResponse.json();

      // Check admin health endpoint
      const adminHealthResponse = await fetch(`${baseUrl}/api/admin/health`, {
        headers: { 'X-API-Key': adminApiKey }
      });
      const adminHealthData = await adminHealthResponse.json();

      // Update system health
      this.metrics.systemHealth = this.determineOverallHealth(healthData, adminHealthData);
      this.metrics.lastCheck = new Date();

      // Log health status
      console.log(`🏥 System Health: ${this.metrics.systemHealth} at ${this.metrics.lastCheck.toISOString()}`);

      // Store health data for analysis
      await this.storeHealthMetrics(healthData, adminHealthData);

    } catch (error) {
      console.error('❌ Health check failed:', error.message);
      this.metrics.systemHealth = 'unhealthy';
      
      await notificationSystem.sendAlert({
        type: 'health_check_failure',
        severity: 'critical',
        message: 'Production health check failed',
        metadata: { error: error.message, timestamp: new Date() }
      });
    }
  }

  async collectMetrics() {
    try {
      const baseUrl = process.env.PRODUCTION_URL || 'https://kamianime.com';
      const adminApiKey = process.env.ADMIN_API_KEY;

      // Collect response time metrics
      const startTime = Date.now();
      await fetch(`${baseUrl}/api/health`);
      const responseTime = Date.now() - startTime;

      this.metrics.responseTime.push({
        timestamp: new Date(),
        value: responseTime
      });

      // Keep only last 100 measurements
      if (this.metrics.responseTime.length > 100) {
        this.metrics.responseTime = this.metrics.responseTime.slice(-100);
      }

      // Get detailed metrics from admin endpoint
      const metricsResponse = await fetch(`${baseUrl}/api/admin/analytics?action=metrics`, {
        headers: { 'X-API-Key': adminApiKey }
      });
      
      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        this.metrics.activeUsers = metricsData.activeUsers || 0;
        this.metrics.errorRate = metricsData.errorRate || 0;
      }

    } catch (error) {
      console.error('📊 Metrics collection failed:', error.message);
    }
  }

  async checkAlerts() {
    const alerts = [];

    // Check response time
    if (this.metrics.responseTime.length > 0) {
      const avgResponseTime = this.metrics.responseTime
        .slice(-10) // Last 10 measurements
        .reduce((sum, metric) => sum + metric.value, 0) / Math.min(10, this.metrics.responseTime.length);

      if (avgResponseTime > this.thresholds.responseTime) {
        alerts.push({
          type: 'high_response_time',
          severity: 'warning',
          message: `Average response time (${avgResponseTime.toFixed(0)}ms) exceeds threshold (${this.thresholds.responseTime}ms)`,
          metadata: { avgResponseTime, threshold: this.thresholds.responseTime }
        });
      }
    }

    // Check error rate
    if (this.metrics.errorRate > this.thresholds.errorRate) {
      alerts.push({
        type: 'high_error_rate',
        severity: 'critical',
        message: `Error rate (${(this.metrics.errorRate * 100).toFixed(2)}%) exceeds threshold (${(this.thresholds.errorRate * 100).toFixed(2)}%)`,
        metadata: { errorRate: this.metrics.errorRate, threshold: this.thresholds.errorRate }
      });
    }

    // Check system health
    if (this.metrics.systemHealth === 'unhealthy') {
      alerts.push({
        type: 'system_unhealthy',
        severity: 'critical',
        message: 'System health check indicates unhealthy status',
        metadata: { systemHealth: this.metrics.systemHealth, lastCheck: this.metrics.lastCheck }
      });
    } else if (this.metrics.systemHealth === 'degraded') {
      alerts.push({
        type: 'system_degraded',
        severity: 'warning',
        message: 'System health check indicates degraded performance',
        metadata: { systemHealth: this.metrics.systemHealth, lastCheck: this.metrics.lastCheck }
      });
    }

    // Send alerts
    for (const alert of alerts) {
      await notificationSystem.sendAlert(alert);
    }
  }

  determineOverallHealth(healthData, adminHealthData) {
    if (!healthData || !adminHealthData) {
      return 'unhealthy';
    }

    if (healthData.status === 'unhealthy' || adminHealthData.status === 'unhealthy') {
      return 'unhealthy';
    }

    if (healthData.status === 'degraded' || adminHealthData.status === 'degraded') {
      return 'degraded';
    }

    return 'healthy';
  }

  async storeHealthMetrics(healthData, adminHealthData) {
    try {
      const { db } = await import('./apps/web/lib/firebase');
      
      await db.collection('monitoring_metrics').add({
        timestamp: new Date(),
        type: 'health_check',
        data: {
          main: healthData,
          admin: adminHealthData,
          overall: this.metrics.systemHealth
        }
      });

    } catch (error) {
      console.error('Failed to store health metrics:', error);
    }
  }

  async generateDailyReport() {
    try {
      const { db } = await import('./apps/web/lib/firebase');
      
      // Get metrics from last 24 hours
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const metricsSnapshot = await db.collection('monitoring_metrics')
        .where('timestamp', '>=', yesterday)
        .get();

      const metrics = metricsSnapshot.docs.map(doc => doc.data());
      
      // Calculate daily statistics
      const healthyChecks = metrics.filter(m => m.data.overall === 'healthy').length;
      const totalChecks = metrics.length;
      const uptime = totalChecks > 0 ? healthyChecks / totalChecks : 0;

      const report = {
        date: new Date().toISOString().split('T')[0],
        uptime: uptime,
        totalChecks: totalChecks,
        healthyChecks: healthyChecks,
        degradedChecks: metrics.filter(m => m.data.overall === 'degraded').length,
        unhealthyChecks: metrics.filter(m => m.data.overall === 'unhealthy').length,
        avgResponseTime: this.calculateAverageResponseTime(),
        errorRate: this.metrics.errorRate,
        activeUsers: this.metrics.activeUsers
      };

      // Store daily report
      await db.collection('daily_reports').add(report);

      // Send daily report notification
      await notificationSystem.sendAlert({
        type: 'daily_report',
        severity: 'info',
        message: `Daily Report: ${(uptime * 100).toFixed(2)}% uptime, ${totalChecks} health checks`,
        metadata: report
      });

      console.log('📊 Daily report generated:', report);
      return report;

    } catch (error) {
      console.error('Failed to generate daily report:', error);
    }
  }

  calculateAverageResponseTime() {
    if (this.metrics.responseTime.length === 0) return 0;
    
    const total = this.metrics.responseTime.reduce((sum, metric) => sum + metric.value, 0);
    return total / this.metrics.responseTime.length;
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      metrics: this.metrics,
      thresholds: this.thresholds,
      lastCheck: this.metrics.lastCheck
    };
  }
}

// CLI interface
if (require.main === module) {
  const action = process.argv[2] || 'start';
  const monitor = new ProductionMonitor();

  switch (action) {
    case 'start':
      monitor.start()
        .then(() => {
          console.log('📊 Monitoring started. Press Ctrl+C to stop.');
          
          // Handle graceful shutdown
          process.on('SIGINT', async () => {
            console.log('\n🛑 Received SIGINT, stopping monitor...');
            await monitor.stop();
            process.exit(0);
          });
          
          // Generate daily report at midnight
          const now = new Date();
          const tomorrow = new Date(now);
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(0, 0, 0, 0);
          
          const msUntilMidnight = tomorrow.getTime() - now.getTime();
          setTimeout(() => {
            monitor.generateDailyReport();
            // Set up daily interval
            setInterval(() => monitor.generateDailyReport(), 24 * 60 * 60 * 1000);
          }, msUntilMidnight);
        })
        .catch((error) => {
          console.error('💥 Failed to start monitoring:', error);
          process.exit(1);
        });
      break;

    case 'status':
      console.log('📊 Monitor Status:', JSON.stringify(monitor.getStatus(), null, 2));
      break;

    case 'report':
      monitor.generateDailyReport()
        .then((report) => {
          console.log('📋 Daily Report:', JSON.stringify(report, null, 2));
          process.exit(0);
        })
        .catch((error) => {
          console.error('💥 Failed to generate report:', error);
          process.exit(1);
        });
      break;

    default:
      console.log('Usage: node monitoring-setup.js [start|status|report]');
      process.exit(1);
  }
}

module.exports = ProductionMonitor;

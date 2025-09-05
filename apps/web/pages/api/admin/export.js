import { analyticsLogger } from '../../../lib/analytics-logger';
import { rateLimiter } from '../../../lib/rate-limiter';
import { config } from '../../../lib/config';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { timeRange = '24h', format = 'csv', type = 'all' } = req.query;
    const clientIP = req.ip || req.connection.remoteAddress;

    // Rate limiting for export endpoints (stricter limits)
    const rateLimitResult = await rateLimiter.checkIPRateLimit(clientIP, 'EXPORT_REQUESTS', {
      count: 10,
      window: 60 * 60 * 1000 // 10 exports per hour
    });

    if (!rateLimitResult.allowed) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        retryAfter: rateLimitResult.retryAfter
      });
    }

    // Admin authentication
    const adminKey = req.headers['x-admin-key'];
    if (adminKey !== config.admin.apiKey) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get analytics data based on type
    let exportData;
    switch (type) {
      case 'users':
        exportData = await analyticsLogger.exportUserData(timeRange);
        break;
      case 'events':
        exportData = await analyticsLogger.exportEventData(timeRange);
        break;
      case 'errors':
        exportData = await analyticsLogger.exportErrorData(timeRange);
        break;
      case 'sync':
        exportData = await analyticsLogger.exportSyncData(timeRange);
        break;
      default:
        exportData = await analyticsLogger.exportAllData(timeRange);
    }

    if (!exportData || exportData.length === 0) {
      return res.status(404).json({ error: 'No data found for the specified criteria' });
    }

    // Format data based on requested format
    if (format === 'csv') {
      const csv = convertToCSV(exportData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="analytics-${type}-${timeRange}-${new Date().toISOString().split('T')[0]}.csv"`);
      res.status(200).send(csv);
    } else if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="analytics-${type}-${timeRange}-${new Date().toISOString().split('T')[0]}.json"`);
      res.status(200).json({
        metadata: {
          exportType: type,
          timeRange,
          exportedAt: new Date().toISOString(),
          recordCount: exportData.length
        },
        data: exportData
      });
    } else {
      return res.status(400).json({ error: 'Unsupported format. Use csv or json.' });
    }

  } catch (error) {
    console.error('Export API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

function convertToCSV(data) {
  if (!data || data.length === 0) {
    return '';
  }

  // Get all unique keys from all objects
  const allKeys = new Set();
  data.forEach(item => {
    Object.keys(item).forEach(key => allKeys.add(key));
  });

  const headers = Array.from(allKeys);
  const csvRows = [];

  // Add header row
  csvRows.push(headers.map(header => `"${header}"`).join(','));

  // Add data rows
  data.forEach(item => {
    const row = headers.map(header => {
      const value = item[header];
      if (value === null || value === undefined) {
        return '""';
      }
      // Handle nested objects and arrays
      if (typeof value === 'object') {
        return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
      }
      // Escape quotes in strings
      return `"${String(value).replace(/"/g, '""')}"`;
    });
    csvRows.push(row.join(','));
  });

  return csvRows.join('\n');
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

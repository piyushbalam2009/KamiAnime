import { behaviorAnalyzer } from '../../../lib/behavior-analyzer';
import { rateLimiter } from '../../../lib/rate-limiter';
import { config } from '../../../lib/config';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, type = 'user', timeRange = '30d' } = req.query;
    const clientIP = req.ip || req.connection.remoteAddress;

    // Rate limiting for behavior analysis
    const rateLimitResult = await rateLimiter.checkIPRateLimit(clientIP, 'BEHAVIOR_ANALYSIS', {
      count: 50,
      window: 60 * 60 * 1000 // 50 requests per hour
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

    let analysisData;

    if (type === 'global') {
      // Get global behavior insights
      analysisData = await behaviorAnalyzer.getGlobalBehaviorInsights(timeRange);
    } else if (userId) {
      // Get user-specific behavior analysis
      analysisData = await behaviorAnalyzer.analyzeUserBehavior(userId, timeRange);
    } else {
      return res.status(400).json({ error: 'Missing userId for user analysis' });
    }

    if (!analysisData) {
      return res.status(500).json({ error: 'Failed to generate behavior analysis' });
    }

    res.status(200).json({
      success: true,
      data: analysisData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Behavior analysis API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};

import { websiteSyncClient } from '../../../lib/sync-client';
import { rateLimiter } from '../../../lib/rate-limiter';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.body;

    // Validate user ID
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Rate limiting check for force sync
    const rateLimitResult = await rateLimiter.checkUserRateLimit(userId, 'FORCE_SYNC');
    
    if (!rateLimitResult.allowed) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        retryAfter: rateLimitResult.retryAfter,
        resetTime: rateLimitResult.resetTime,
        message: 'Force sync is limited to prevent abuse'
      });
    }

    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', rateLimiter.limits.FORCE_SYNC.count);
    res.setHeader('X-RateLimit-Remaining', rateLimitResult.remaining);
    res.setHeader('X-RateLimit-Reset', rateLimitResult.resetTime.toISOString());

    // Force sync user data
    await websiteSyncClient.forceSyncUser(userId);

    res.status(200).json({
      success: true,
      message: 'Force sync initiated',
      remaining: rateLimitResult.remaining,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Force sync error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initiate force sync'
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

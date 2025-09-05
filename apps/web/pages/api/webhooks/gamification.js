import { WebhookHandler } from '../../../lib/webhook-handler';
import { rateLimiter } from '../../../lib/rate-limiter';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { eventType, userId, data, apiKey } = req.body;

    // Validate API key
    if (apiKey !== process.env.WEBHOOK_API_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate required fields
    if (!eventType || !userId) {
      return res.status(400).json({ error: 'Missing required fields: eventType, userId' });
    }

    // Rate limiting check
    const rateLimitResult = await rateLimiter.checkUserRateLimit(userId, 'WEBHOOK_CALLS');
    
    if (!rateLimitResult.allowed) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        retryAfter: rateLimitResult.retryAfter,
        resetTime: rateLimitResult.resetTime
      });
    }

    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', rateLimiter.limits.WEBHOOK_CALLS.count);
    res.setHeader('X-RateLimit-Remaining', rateLimitResult.remaining);
    res.setHeader('X-RateLimit-Reset', rateLimitResult.resetTime.toISOString());

    // Process the webhook
    const result = await WebhookHandler.processWebhook(eventType, userId, data);

    if (result.success) {
      res.status(200).json({ 
        success: true, 
        message: result.message,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: result.error,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('Webhook API error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
}

// Configure API route
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};

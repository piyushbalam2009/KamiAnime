import { websiteSyncClient } from '../../../lib/sync-client';
import { rateLimiter } from '../../../lib/rate-limiter';
import { db } from '../../../lib/firebase';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.body;
    const clientIP = req.ip || req.connection.remoteAddress;

    // Validate user ID
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Rate limiting check for account linking
    const rateLimitResult = await rateLimiter.checkIPRateLimit(clientIP, 'ACCOUNT_LINKING');
    
    if (!rateLimitResult.allowed) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        retryAfter: rateLimitResult.retryAfter,
        resetTime: rateLimitResult.resetTime
      });
    }

    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', rateLimiter.limits.ACCOUNT_LINKING.count);
    res.setHeader('X-RateLimit-Remaining', rateLimitResult.remaining);
    res.setHeader('X-RateLimit-Reset', rateLimitResult.resetTime.toISOString());

    // Check if user exists
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user already has a Discord account linked
    const userData = userDoc.data();
    if (userData.discordId) {
      return res.status(400).json({ 
        error: 'Discord account already linked',
        discordUsername: userData.discordUsername
      });
    }

    // Generate linking code
    const linkingCode = await websiteSyncClient.generateLinkingCode(userId);

    res.status(200).json({
      success: true,
      linkingCode: linkingCode,
      expiresIn: 600, // 10 minutes
      instructions: [
        'Copy this linking code',
        'Open Discord and use the /link command',
        'Paste the code when prompted',
        'Your accounts will be linked!'
      ]
    });

  } catch (error) {
    console.error('Link generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate linking code'
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

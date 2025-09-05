const { db } = require('./firebase');

class RateLimiter {
  constructor() {
    this.limits = {
      // Sync events per user per minute
      SYNC_EVENTS: { count: 30, window: 60 * 1000 },
      // XP awards per user per minute
      XP_AWARDS: { count: 20, window: 60 * 1000 },
      // Badge unlocks per user per hour
      BADGE_UNLOCKS: { count: 10, window: 60 * 60 * 1000 },
      // Account linking attempts per IP per hour
      ACCOUNT_LINKING: { count: 5, window: 60 * 60 * 1000 },
      // Webhook calls per user per minute
      WEBHOOK_CALLS: { count: 50, window: 60 * 1000 },
      // Force sync requests per user per hour
      FORCE_SYNC: { count: 3, window: 60 * 60 * 1000 }
    };
    
    // In-memory cache for rate limiting (consider Redis for production)
    this.cache = new Map();
    
    // Clean up old entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Check if action is rate limited
   */
  async checkRateLimit(identifier, action, customLimit = null) {
    const limit = customLimit || this.limits[action];
    if (!limit) {
      console.warn(`No rate limit defined for action: ${action}`);
      return { allowed: true, remaining: Infinity };
    }

    const key = `${identifier}:${action}`;
    const now = Date.now();
    const windowStart = now - limit.window;

    // Get or create entry
    if (!this.cache.has(key)) {
      this.cache.set(key, []);
    }

    const requests = this.cache.get(key);
    
    // Remove old requests outside the window
    const validRequests = requests.filter(timestamp => timestamp > windowStart);
    this.cache.set(key, validRequests);

    // Check if limit exceeded
    if (validRequests.length >= limit.count) {
      const oldestRequest = Math.min(...validRequests);
      const resetTime = oldestRequest + limit.window;
      
      return {
        allowed: false,
        remaining: 0,
        resetTime: new Date(resetTime),
        retryAfter: Math.ceil((resetTime - now) / 1000)
      };
    }

    // Add current request
    validRequests.push(now);
    this.cache.set(key, validRequests);

    return {
      allowed: true,
      remaining: limit.count - validRequests.length,
      resetTime: new Date(now + limit.window)
    };
  }

  /**
   * Check rate limit for user-based actions
   */
  async checkUserRateLimit(userId, action, customLimit = null) {
    return this.checkRateLimit(`user:${userId}`, action, customLimit);
  }

  /**
   * Check rate limit for IP-based actions
   */
  async checkIPRateLimit(ipAddress, action, customLimit = null) {
    return this.checkRateLimit(`ip:${ipAddress}`, action, customLimit);
  }

  /**
   * Check rate limit for Discord guild-based actions
   */
  async checkGuildRateLimit(guildId, action, customLimit = null) {
    return this.checkRateLimit(`guild:${guildId}`, action, customLimit);
  }

  /**
   * Log rate limit violation for monitoring
   */
  async logRateLimitViolation(identifier, action, metadata = {}) {
    try {
      await db.collection('rateLimitViolations').add({
        identifier,
        action,
        timestamp: new Date(),
        metadata,
        severity: this.getRateLimitSeverity(action)
      });
    } catch (error) {
      console.error('Failed to log rate limit violation:', error);
    }
  }

  /**
   * Get severity level for rate limit violations
   */
  getRateLimitSeverity(action) {
    const highSeverityActions = ['ACCOUNT_LINKING', 'WEBHOOK_CALLS'];
    const mediumSeverityActions = ['XP_AWARDS', 'BADGE_UNLOCKS'];
    
    if (highSeverityActions.includes(action)) return 'high';
    if (mediumSeverityActions.includes(action)) return 'medium';
    return 'low';
  }

  /**
   * Clean up old cache entries
   */
  cleanup() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, requests] of this.cache.entries()) {
      // Find the longest window among all actions
      const maxWindow = Math.max(...Object.values(this.limits).map(l => l.window));
      const cutoff = now - maxWindow;
      
      const validRequests = requests.filter(timestamp => timestamp > cutoff);
      
      if (validRequests.length === 0) {
        this.cache.delete(key);
        cleanedCount++;
      } else if (validRequests.length < requests.length) {
        this.cache.set(key, validRequests);
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} rate limit cache entries`);
    }
  }

  /**
   * Get current rate limit status for identifier
   */
  async getRateLimitStatus(identifier, action) {
    const limit = this.limits[action];
    if (!limit) return null;

    const key = `${identifier}:${action}`;
    const requests = this.cache.get(key) || [];
    const now = Date.now();
    const windowStart = now - limit.window;
    const validRequests = requests.filter(timestamp => timestamp > windowStart);

    return {
      action,
      limit: limit.count,
      used: validRequests.length,
      remaining: limit.count - validRequests.length,
      windowMs: limit.window,
      resetTime: validRequests.length > 0 ? 
        new Date(Math.min(...validRequests) + limit.window) : 
        new Date(now + limit.window)
    };
  }

  /**
   * Reset rate limit for identifier (admin function)
   */
  async resetRateLimit(identifier, action = null) {
    if (action) {
      const key = `${identifier}:${action}`;
      this.cache.delete(key);
    } else {
      // Reset all actions for identifier
      const keysToDelete = [];
      for (const key of this.cache.keys()) {
        if (key.startsWith(`${identifier}:`)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => this.cache.delete(key));
    }
  }

  /**
   * Middleware for Express routes
   */
  middleware(action, options = {}) {
    return async (req, res, next) => {
      try {
        const identifier = options.useIP ? 
          req.ip || req.connection.remoteAddress :
          req.body?.userId || req.query?.userId || req.ip;

        if (!identifier) {
          return res.status(400).json({ error: 'Unable to identify request for rate limiting' });
        }

        const result = await this.checkRateLimit(identifier, action, options.customLimit);

        // Add rate limit headers
        res.set({
          'X-RateLimit-Limit': this.limits[action]?.count || 'unknown',
          'X-RateLimit-Remaining': result.remaining,
          'X-RateLimit-Reset': result.resetTime?.toISOString()
        });

        if (!result.allowed) {
          // Log violation
          await this.logRateLimitViolation(identifier, action, {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            endpoint: req.path
          });

          return res.status(429).json({
            error: 'Rate limit exceeded',
            retryAfter: result.retryAfter,
            resetTime: result.resetTime
          });
        }

        next();
      } catch (error) {
        console.error('Rate limiting middleware error:', error);
        next(); // Allow request to proceed on rate limiter error
      }
    };
  }
}

// Export singleton instance
const rateLimiter = new RateLimiter();

module.exports = {
  RateLimiter,
  rateLimiter
};

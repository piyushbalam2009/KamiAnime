// Configuration management for KamiAnime Discord bot
const config = {
  // Discord Configuration
  discord: {
    token: process.env.DISCORD_BOT_TOKEN,
    clientId: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
  },

  // Firebase Configuration
  firebase: {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  },

  // Webhook Configuration
  webhook: {
    apiKey: process.env.WEBHOOK_API_KEY,
  },

  // Analytics Configuration
  analytics: {
    retentionDays: parseInt(process.env.ANALYTICS_RETENTION_DAYS) || 90,
    batchSize: parseInt(process.env.ANALYTICS_BATCH_SIZE) || 100,
    flushInterval: parseInt(process.env.ANALYTICS_FLUSH_INTERVAL) || 30000,
  },

  // API Configuration
  api: {
    consumet: process.env.CONSUMET_API || 'https://api.consumet.org',
    mangadex: process.env.MANGADEX_API || 'https://api.mangadex.org',
    anilist: {
      clientId: process.env.ANILIST_CLIENT_ID,
      clientSecret: process.env.ANILIST_CLIENT_SECRET,
    },
    mal: {
      clientId: process.env.MAL_CLIENT_ID,
    },
  },

  // Rate Limiting Configuration
  rateLimit: {
    sync: {
      perUser: 10,
      perIP: 50,
      window: 60 * 1000, // 1 minute
    },
    webhook: {
      perIP: 100,
      window: 60 * 60 * 1000, // 1 hour
    },
    commands: {
      perUser: 30,
      window: 60 * 1000, // 1 minute
    },
  },

  // Security Configuration
  security: {
    maxXPPerHour: 1000,
    maxActionsPerMinute: 10,
    suspiciousThreshold: 5,
    blockDuration: 24 * 60 * 60 * 1000, // 24 hours
  },

  // Application Configuration
  app: {
    nodeEnv: process.env.NODE_ENV || 'development',
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
    websiteUrl: process.env.WEBSITE_URL || 'http://localhost:3000',
  },
};

// Validation function to check required environment variables
function validateConfig() {
  const requiredVars = [
    'DISCORD_BOT_TOKEN',
    'FIREBASE_PROJECT_ID',
    'WEBHOOK_API_KEY',
  ];

  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return true;
}

// Helper function to get configuration with fallbacks
function getConfig(path, fallback = null) {
  const keys = path.split('.');
  let value = config;
  
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return fallback;
    }
  }
  
  return value;
}

module.exports = {
  config,
  validateConfig,
  getConfig,
};

// Configuration management for KamiAnime web application
export const config = {
  // Admin Configuration
  admin: {
    apiKey: process.env.ADMIN_API_KEY,
    publicApiKey: process.env.NEXT_PUBLIC_ADMIN_API_KEY,
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  },

  // Webhook Configuration
  webhook: {
    apiKey: process.env.WEBHOOK_API_KEY,
    publicApiKey: process.env.NEXT_PUBLIC_WEBHOOK_API_KEY,
  },

  // Analytics Configuration
  analytics: {
    retentionDays: parseInt(process.env.ANALYTICS_RETENTION_DAYS) || 90,
    batchSize: parseInt(process.env.ANALYTICS_BATCH_SIZE) || 100,
    flushInterval: parseInt(process.env.ANALYTICS_FLUSH_INTERVAL) || 30000,
  },

  // Firebase Configuration
  firebase: {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  },

  // API Configuration
  api: {
    consumet: process.env.NEXT_PUBLIC_CONSUMET_API || 'https://api.consumet.org',
    mangadex: process.env.NEXT_PUBLIC_MANGADEX_API || 'https://api.mangadex.org',
    anilist: {
      clientId: process.env.NEXT_PUBLIC_ANILIST_CLIENT_ID,
      clientSecret: process.env.NEXT_PUBLIC_ANILIST_CLIENT_SECRET,
    },
    mal: {
      clientId: process.env.NEXT_PUBLIC_MAL_CLIENT_ID,
    },
  },

  // Discord Configuration
  discord: {
    botToken: process.env.DISCORD_BOT_TOKEN,
    clientId: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    inviteUrl: process.env.NEXT_PUBLIC_DISCORD_INVITE_URL,
  },

  // Application Configuration
  app: {
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    nodeEnv: process.env.NODE_ENV || 'development',
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
  },

  // AdSense Configuration
  adsense: {
    clientId: process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID,
  },
};

// Validation function to check required environment variables
export function validateConfig() {
  const requiredVars = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'DISCORD_BOT_TOKEN',
    'WEBHOOK_API_KEY',
    'ADMIN_API_KEY',
  ];

  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return true;
}

// Helper function to get configuration with fallbacks
export function getConfig(path, fallback = null) {
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

export default config;

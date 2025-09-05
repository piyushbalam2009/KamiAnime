# KamiAnime Discord Bot - Production Deployment Guide 🚀

## 🌟 Overview

This guide covers the complete deployment process for the KamiAnime Discord Bot with advanced gamification, analytics, A/B testing, and cross-platform synchronization features.

## 📋 Prerequisites

- **Node.js 18+** installed on your system
- **Discord Application** created with bot token and proper permissions
- **Firebase project** with Firestore, Authentication, and Admin SDK enabled
- **KamiAnime website** deployed and accessible (for cross-platform sync)
- **Admin API keys** configured for monitoring and analytics

## 🔧 Complete Environment Setup

### Required Environment Variables
```env
# Discord Bot Configuration
DISCORD_BOT_TOKEN=your_discord_bot_token_here
DISCORD_CLIENT_ID=your_discord_client_id_here
DISCORD_CLIENT_SECRET=your_discord_client_secret_here

# Firebase Admin SDK Configuration
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY_ID=your_firebase_private_key_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour_complete_private_key_here\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your_project_id.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your_firebase_client_id
FIREBASE_CLIENT_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40your_project_id.iam.gserviceaccount.com
FIREBASE_DATABASE_URL=https://your_project_id-default-rtdb.firebaseio.com

# Website Integration & Cross-Platform Sync
WEBSITE_URL=https://kamianime.com
WEBHOOK_API_KEY=your_secure_webhook_api_key_here

# Analytics & Monitoring Configuration
ANALYTICS_RETENTION_DAYS=30
ANALYTICS_BATCH_SIZE=100
ANALYTICS_FLUSH_INTERVAL=60000

# Admin Dashboard & API Access
ADMIN_API_KEY=your_secure_admin_api_key_here

# Real-time Notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/your/slack/webhook
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/your/discord/webhook
ADMIN_EMAIL=admin@kamianime.com

# External API Keys (Optional but Recommended)
TENOR_API_KEY=your_tenor_api_key_for_gifs
REDDIT_CLIENT_ID=your_reddit_client_id
REDDIT_CLIENT_SECRET=your_reddit_client_secret

# Production Environment
NODE_ENV=production
```

## 🚀 Platform-Specific Deployment Options

### Railway (Recommended for Production)
Railway offers excellent Node.js support with automatic scaling and monitoring.

1. **Initial Setup**
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   
   # Login and connect repository
   railway login
   railway link
   
   # Deploy with environment variables
   railway up
   ```

2. **Environment Configuration**
   - Navigate to Railway dashboard → Variables
   - Add all environment variables from the complete list above
   - Ensure `NODE_ENV=production` is set
   - Configure webhook URLs for notifications

3. **Advanced Railway Configuration**
   ```json
   // railway.json
   {
     "$schema": "https://railway.app/railway.schema.json",
     "build": {
       "builder": "NIXPACKS"
     },
     "deploy": {
       "startCommand": "npm start",
       "restartPolicyType": "ON_FAILURE",
       "restartPolicyMaxRetries": 10,
       "healthcheckPath": "/health",
       "healthcheckTimeout": 300
     }
   }
   ```

4. **Railway Monitoring Setup**
   - Enable automatic deployments from GitHub
   - Configure custom domain (optional)
   - Set up log aggregation
   - Enable metrics collection

#### Render
1. **Create Web Service**
   - Connect GitHub repository
   - Build Command: `npm install`
   - Start Command: `npm start`

2. **Environment Variables**
   - Add all variables from `.env.example`
   - Set `NODE_ENV=production`

#### Heroku
1. **Create Application**
   ```bash
   heroku create kamianime-bot
   heroku config:set NODE_ENV=production
   # Add all other environment variables
   ```

2. **Deploy**
   ```bash
   git push heroku main
   heroku logs --tail
   ```

#### VPS Deployment with PM2
1. **Server Setup**
   ```bash
   # Install Node.js and PM2
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   sudo npm install -g pm2
   
   # Clone repository
   git clone https://github.com/your-username/KamiAnime.git
   cd KamiAnime/apps/bot
   npm install --production
   ```

2. **PM2 Configuration**
   ```javascript
   // ecosystem.config.js
   module.exports = {
     apps: [{
       name: 'kamianime-bot',
       script: 'index.js',
       instances: 1,
       autorestart: true,
       watch: false,
       max_memory_restart: '1G',
       env: {
         NODE_ENV: 'production'
       },
       error_file: './logs/err.log',
       out_file: './logs/out.log',
       log_file: './logs/combined.log',
       time: true
     }]
   };
   ```

3. **Start with PM2**
   ```bash
   # Create environment file
   cp .env.example .env
   # Edit .env with your actual values
   
   # Start bot
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

### 3. Docker Deployment

#### Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S kamianime -u 1001

# Change ownership
RUN chown -R kamianime:nodejs /app
USER kamianime

EXPOSE 3000

CMD ["npm", "start"]
```

#### Docker Compose
```yaml
version: '3.8'

services:
  kamianime-bot:
    build: .
    restart: unless-stopped
    environment:
      - NODE_ENV=production
    env_file:
      - .env
    volumes:
      - ./logs:/app/logs
    networks:
      - kamianime-network

networks:
  kamianime-network:
    driver: bridge
```

#### Deploy with Docker
```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f kamianime-bot

# Update deployment
docker-compose pull
docker-compose up -d
```

## 📊 Advanced Monitoring & Analytics

### Production Health Monitoring
The bot includes comprehensive health monitoring and real-time analytics.

#### Health Check Endpoints
```bash
# Basic health check
curl -X GET "https://your-website-url/api/health"

# Detailed admin health check
curl -X GET "https://your-website-url/api/admin/health" \
  -H "X-API-Key: your-admin-api-key"

# Bot-specific health monitoring
# Use Discord commands: /ping, /status
```

#### Real-Time Analytics Dashboard
Access the admin dashboard at `https://your-website-url/admin` with proper authentication:
- **User Activity Metrics**: Track XP awards, badge unlocks, command usage
- **A/B Test Results**: Monitor feature test performance and statistical significance
- **System Performance**: Response times, error rates, API health status
- **Cross-Platform Sync**: Monitor Discord ↔ Website synchronization events

#### Automated Monitoring Setup
```bash
# Start production monitoring (from project root)
node monitoring-setup.js start

# Generate daily reports
node monitoring-setup.js report

# Check monitoring status
node monitoring-setup.js status
```

#### Log Monitoring & Analysis
```bash
# Platform-specific log access
railway logs --follow                    # Railway
docker-compose logs -f kamianime-bot    # Docker
pm2 logs kamianime-bot                  # PM2/VPS
heroku logs --tail                      # Heroku

# Analytics event monitoring
# Check Firebase Console → Firestore → analytics_events collection
```

#### Performance Metrics & Alerts
- **Response Time Monitoring**: < 2 seconds average for commands
- **Error Rate Alerts**: Automatic notifications when error rate > 5%
- **API Health Tracking**: Multi-source API status with fallback monitoring
- **Memory Usage Alerts**: Notifications when memory usage > 85%
- **Cross-Platform Sync Status**: Real-time sync success/failure tracking

### 5. Scaling & Optimization

#### Horizontal Scaling
```javascript
// For multiple instances (PM2)
module.exports = {
  apps: [{
    name: 'kamianime-bot',
    script: 'index.js',
    instances: 'max', // Use all CPU cores
    exec_mode: 'cluster',
    // ... other config
  }]
};
```

#### Database Optimization
- **Firestore Indexes**: Create indexes for frequently queried fields
- **Cache Strategy**: Implement Redis for high-traffic scenarios
- **Connection Pooling**: Optimize Firebase connection management

#### API Rate Limiting
```javascript
// Adjust rate limits in enhanced-api.js
const rateLimits = {
  anilist: { requests: 90, window: 60000 },
  kitsu: { requests: 60, window: 60000 },
  jikan: { requests: 60, window: 60000 },
  // ... other APIs
};
```

### 6. Security Best Practices

#### Environment Security
- Never commit `.env` files to version control
- Use platform-specific secret management
- Rotate API keys regularly
- Implement proper CORS policies

#### Bot Security
- Validate all user inputs
- Implement command cooldowns
- Monitor for abuse patterns
- Use Discord's built-in permissions system

### 7. Backup & Recovery

#### Database Backup
```bash
# Firestore backup (using Firebase CLI)
firebase firestore:export gs://your-bucket/backups/$(date +%Y%m%d)
```

#### Configuration Backup
- Keep environment variables documented
- Backup Discord bot configuration
- Document API key sources and renewal dates

### 8. Troubleshooting

#### Common Issues
1. **Bot Not Responding**
   - Check bot token validity
   - Verify Discord permissions
   - Check application logs

2. **API Failures**
   - Use `/apistatus` command to check API health
   - Verify API keys are valid
   - Check rate limiting logs

3. **Database Issues**
   - Verify Firebase credentials
   - Check Firestore security rules
   - Monitor quota usage

#### Debug Mode
```bash
# Enable debug logging
NODE_ENV=development npm start

# Test enhanced APIs
node test-enhanced-api.js
```

### 9. Performance Benchmarks

#### Expected Performance
- **Command Response Time**: < 2 seconds (with cache)
- **API Fallback Time**: < 5 seconds (primary to backup)
- **Memory Usage**: 150-300 MB (depending on cache size)
- **CPU Usage**: < 10% (idle), < 50% (peak)

#### Optimization Targets
- **Cache Hit Rate**: > 80%
- **API Success Rate**: > 95%
- **Uptime**: > 99.9%
- **Error Rate**: < 1%

### 10. Maintenance Schedule

#### Daily
- Monitor error logs
- Check API status
- Verify bot responsiveness

#### Weekly
- Review performance metrics
- Update dependencies (if needed)
- Clean old cache entries

#### Monthly
- Rotate API keys
- Update documentation
- Performance optimization review
- Backup configuration and data

---

## 🔧 Quick Deployment Checklist

- [ ] Environment variables configured
- [ ] Discord bot permissions set
- [ ] Firebase project configured
- [ ] API keys obtained (optional)
- [ ] Platform deployment completed
- [ ] Health monitoring setup
- [ ] Logging configured
- [ ] Backup strategy implemented
- [ ] Performance monitoring active
- [ ] Security measures in place

## 📞 Support

For deployment issues:
1. Check the troubleshooting section
2. Review platform-specific documentation
3. Test with `test-enhanced-api.js`
4. Monitor logs for specific error messages
5. Join our Discord server for community support

---

**KamiAnime Discord Bot** - Enhanced, reliable, and production-ready! 🎌

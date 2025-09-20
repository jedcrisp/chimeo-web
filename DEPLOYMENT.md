# 🚀 Chimeo Server-Side Deployment Guide

This guide covers deploying the complete server-side scheduled alert processing system.

## 📋 Overview

The system includes:
1. **Firebase Cloud Functions** (Primary)
2. **External Cron Job** (Backup)
3. **Database Triggers** (Immediate processing)
4. **Health Monitoring** (Status checks)

## 🔧 Prerequisites

### Required Tools
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Install Node.js (18+)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 (for process management)
npm install -g pm2
```

### Firebase Setup
```bash
# Login to Firebase
firebase login

# Initialize project (if not already done)
firebase init functions

# Select your project: chimeo-96dfc
```

## 🚀 Deployment Steps

### 1. Deploy Firebase Functions

```bash
# From project root
./scripts/deploy-functions.sh

# Or manually
cd functions
npm install
npm run build
firebase deploy --only functions
```

### 2. Set Up External Cron Job

#### Option A: System Cron
```bash
# Edit crontab
crontab -e

# Add this line (runs every 2 minutes)
*/2 * * * * cd /path/to/chimeo-web && node scripts/cron-job.js >> /var/log/chimeo-cron.log 2>&1
```

#### Option B: PM2 (Recommended)
```bash
# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'chimeo-cron',
    script: 'scripts/cron-job.js',
    cron_restart: '*/2 * * * *',
    autorestart: false,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      BACKUP_URL: 'https://your-backup-server.com/process-alerts'
    }
  }]
}
EOF

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### Option C: Systemd Service
```bash
# Copy service file
sudo cp scripts/chimeo-cron.service /etc/systemd/system/

# Edit paths in the service file
sudo nano /etc/systemd/system/chimeo-cron.service

# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable chimeo-cron
sudo systemctl start chimeo-cron
```

### 3. Set Up Monitoring

#### Health Check Script
```bash
# Create health check script
cat > scripts/health-check.sh << 'EOF'
#!/bin/bash
HEALTH_URL="https://us-central1-chimeo-96dfc.cloudfunctions.net/healthCheck"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ $RESPONSE -eq 200 ]; then
    echo "✅ Health check passed"
    exit 0
else
    echo "❌ Health check failed (HTTP $RESPONSE)"
    exit 1
fi
EOF

chmod +x scripts/health-check.sh

# Add to crontab (runs every 5 minutes)
*/5 * * * * /path/to/chimeo-web/scripts/health-check.sh
```

#### Log Monitoring
```bash
# Monitor Firebase Functions logs
firebase functions:log --follow

# Monitor cron job logs
tail -f /var/log/chimeo-cron.log

# Monitor PM2 logs
pm2 logs chimeo-cron
```

## 🧪 Testing

### Test Firebase Functions
```bash
# Test manual processing
curl https://us-central1-chimeo-96dfc.cloudfunctions.net/processAlertsManually

# Test health check
curl https://us-central1-chimeo-96dfc.cloudfunctions.net/healthCheck

# Expected response:
# {
#   "status": "healthy",
#   "timestamp": "2024-01-01T00:00:00.000Z",
#   "functions": {
#     "scheduled": "processScheduledAlerts",
#     "database": "onScheduledAlertCreated",
#     "manual": "processAlertsManually",
#     "cron": "cronJobBackup"
#   }
# }
```

### Test Cron Job
```bash
# Run manually
node scripts/cron-job.js

# Check PM2 status
pm2 status

# Check systemd status
sudo systemctl status chimeo-cron
```

### Test Scheduled Alerts
1. Create a scheduled alert for 1 minute in the future
2. Wait and check if it appears in the alerts feed
3. Check Firebase Functions logs for processing

## 📊 Monitoring & Maintenance

### Firebase Console
- Go to [Firebase Console](https://console.firebase.google.com/project/chimeo-96dfc/functions)
- Monitor function executions, errors, and performance

### Log Files
```bash
# Firebase Functions logs
firebase functions:log

# Cron job logs
tail -f /var/log/chimeo-cron.log

# System logs
journalctl -u chimeo-cron -f
```

### Performance Metrics
- **Function Execution Time**: Should be < 30 seconds
- **Success Rate**: Should be > 99%
- **Error Rate**: Should be < 1%
- **Memory Usage**: Monitor for memory leaks

## 🚨 Troubleshooting

### Common Issues

#### Functions Not Deploying
```bash
# Check Firebase CLI version
firebase --version

# Check project configuration
firebase projects:list

# Check function logs
firebase functions:log
```

#### Cron Job Not Running
```bash
# Check crontab
crontab -l

# Check cron service
sudo systemctl status cron

# Check logs
grep CRON /var/log/syslog
```

#### PM2 Issues
```bash
# Check PM2 status
pm2 status

# Restart PM2
pm2 restart chimeo-cron

# Check PM2 logs
pm2 logs chimeo-cron
```

### Debug Mode
```bash
# Enable debug logging
export DEBUG=chimeo:*
node scripts/cron-job.js
```

## 🔄 Updates

### Update Functions
```bash
# Make changes to functions/src/index.ts
cd functions
npm run build
firebase deploy --only functions
```

### Update Cron Job
```bash
# Update script
git pull origin main

# Restart PM2
pm2 restart chimeo-cron

# Or restart systemd
sudo systemctl restart chimeo-cron
```

## 🛡️ Security

### Firestore Rules
Ensure these rules are in place:
```javascript
// Allow functions to read/write scheduled alerts
match /organizations/{orgId}/scheduledAlerts/{alertId} {
  allow read, write: if request.auth != null;
}

// Allow functions to create active alerts
match /organizationAlerts/{alertId} {
  allow create: if request.auth != null;
}
```

### Environment Variables
- Never commit sensitive data
- Use Firebase Functions config for secrets
- Rotate API keys regularly

## 📈 Scaling

### High Volume
- Increase Firebase Functions timeout
- Use batch processing
- Implement queue system

### Multiple Regions
- Deploy functions to multiple regions
- Use load balancing
- Implement failover

## 📞 Support

### Logs to Check
1. Firebase Functions logs
2. Cron job logs
3. System logs
4. Application logs

### Common Commands
```bash
# Check function status
firebase functions:log --only processScheduledAlerts

# Test manual processing
curl -X GET https://us-central1-chimeo-96dfc.cloudfunctions.net/processAlertsManually

# Check PM2 status
pm2 status chimeo-cron

# Restart everything
pm2 restart all
firebase deploy --only functions
```

# Chimeo Firebase Cloud Functions

This directory contains Firebase Cloud Functions for automatic scheduled alert processing.

## 🚀 Functions Overview

### 1. **processScheduledAlerts** (Scheduled Trigger)
- **Trigger**: Runs every 1 minute
- **Purpose**: Processes all scheduled alerts that are due
- **Type**: Pub/Sub scheduled function

### 2. **onScheduledAlertCreated** (Database Trigger)
- **Trigger**: When a new scheduled alert is created
- **Purpose**: Immediate processing for alerts due within 1 minute
- **Type**: Firestore document trigger

### 3. **processAlertsManually** (HTTP Trigger)
- **Trigger**: HTTP request
- **Purpose**: Manual processing and backup
- **URL**: `https://us-central1-chimeo-96dfc.cloudfunctions.net/processAlertsManually`

### 4. **cronJobBackup** (HTTP Trigger)
- **Trigger**: HTTP request from external cron
- **Purpose**: External cron job backup
- **URL**: `https://us-central1-chimeo-96dfc.cloudfunctions.net/cronJobBackup`

### 5. **healthCheck** (HTTP Trigger)
- **Trigger**: HTTP request
- **Purpose**: Health monitoring
- **URL**: `https://us-central1-chimeo-96dfc.cloudfunctions.net/healthCheck`

## 📋 What Each Function Does

1. **Finds scheduled alerts** that are due (scheduledDate <= now)
2. **Converts them to active alerts** in the feed
3. **Sends push notifications** to subscribed users
4. **Marks scheduled alerts as processed** to prevent duplicates
5. **Handles errors gracefully** with logging

## 🛠️ Deployment

### Prerequisites
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Install dependencies
cd functions
npm install
```

### Deploy Functions
```bash
# From project root
./scripts/deploy-functions.sh

# Or manually
cd functions
npm run build
firebase deploy --only functions
```

### Test Functions
```bash
# Test manual processing
curl https://us-central1-chimeo-96dfc.cloudfunctions.net/processAlertsManually

# Test health check
curl https://us-central1-chimeo-96dfc.cloudfunctions.net/healthCheck

# Test cron backup
curl https://us-central1-chimeo-96dfc.cloudfunctions.net/cronJobBackup
```

## 📊 Monitoring

### View Logs
```bash
# All functions
firebase functions:log

# Specific function
firebase functions:log --only processScheduledAlerts
```

### Firebase Console
- Go to [Firebase Console](https://console.firebase.google.com/project/chimeo-96dfc/functions)
- View function status, logs, and metrics

## 🔧 Configuration

### Environment Variables
Set in Firebase Console > Functions > Configuration:
- `FCM_SERVER_KEY`: For push notifications
- `BACKUP_URL`: External backup service URL

### Firestore Rules
Ensure these collections are accessible:
- `organizations/{orgId}/scheduledAlerts`
- `organizations/{orgId}/alerts`
- `organizationAlerts`
- `fcmTokens`

## 🚨 Error Handling

- **Retry Logic**: Functions retry failed operations
- **Logging**: Comprehensive logging for debugging
- **Graceful Degradation**: Continues processing even if some alerts fail
- **Monitoring**: Health check endpoint for monitoring

## 📈 Performance

- **Scheduled Function**: Processes every minute
- **Database Trigger**: Immediate processing for urgent alerts
- **Batch Processing**: Handles multiple alerts efficiently
- **Push Notifications**: Sends to all subscribed users

## 🔄 Backup Systems

1. **Primary**: Firebase Cloud Functions (scheduled + database triggers)
2. **Secondary**: External cron job calling HTTP functions
3. **Tertiary**: Client-side processing (existing system)

## 🛡️ Security

- **Authentication**: Firebase Admin SDK
- **Authorization**: Firestore security rules
- **Rate Limiting**: Built into Firebase Functions
- **Error Handling**: No sensitive data in logs

## 📝 Maintenance

### Update Functions
```bash
# Make changes to functions/src/index.ts
npm run build
firebase deploy --only functions
```

### Monitor Performance
- Check Firebase Console metrics
- Review function logs regularly
- Monitor error rates and response times

### Troubleshooting
1. Check function logs for errors
2. Verify Firestore permissions
3. Test with manual HTTP calls
4. Check Firebase Console for function status

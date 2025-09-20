#!/bin/bash

# Deploy Firebase Cloud Functions for Chimeo
# This script deploys the scheduled alert processing functions

set -e

echo "🚀 Starting Firebase Functions deployment..."

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI is not installed. Please install it first:"
    echo "npm install -g firebase-tools"
    exit 1
fi

# Check if user is logged in
if ! firebase projects:list &> /dev/null; then
    echo "❌ Not logged in to Firebase. Please run:"
    echo "firebase login"
    exit 1
fi

# Navigate to functions directory
cd functions

echo "📦 Installing dependencies..."
npm install

echo "🔨 Building TypeScript..."
npm run build

echo "🚀 Deploying functions..."
firebase deploy --only functions

echo "✅ Deployment completed successfully!"

echo ""
echo "📋 Deployed functions:"
echo "  - processScheduledAlerts (scheduled trigger - every 1 minute)"
echo "  - onScheduledAlertCreated (database trigger)"
echo "  - processAlertsManually (HTTP trigger)"
echo "  - cronJobBackup (HTTP trigger for cron jobs)"
echo "  - healthCheck (health check endpoint)"
echo ""
echo "🔗 Function URLs:"
echo "  - Manual processing: https://us-central1-chimeo-96dfc.cloudfunctions.net/processAlertsManually"
echo "  - Cron backup: https://us-central1-chimeo-96dfc.cloudfunctions.net/cronJobBackup"
echo "  - Health check: https://us-central1-chimeo-96dfc.cloudfunctions.net/healthCheck"
echo ""
echo "📝 Next steps:"
echo "  1. Test the functions using the URLs above"
echo "  2. Set up external cron job if needed: */2 * * * * node scripts/cron-job.js"
echo "  3. Monitor function logs: firebase functions:log"
echo "  4. Check Firebase Console for function status"

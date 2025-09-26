#!/bin/bash

# Deploy Email Functions with SendGrid
# This script deploys the Cloud Functions that handle email notifications

echo "🚀 Deploying Email Functions with SendGrid..."
echo "=============================================="

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI is not installed. Please install it first:"
    echo "   npm install -g firebase-tools"
    exit 1
fi

# Check if user is logged in
if ! firebase projects:list &> /dev/null; then
    echo "❌ Not logged in to Firebase. Please run:"
    echo "   firebase login"
    exit 1
fi

# Navigate to functions directory
cd functions

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

# Set SendGrid API key as environment variable
echo "🔑 Setting SendGrid API key..."
firebase functions:config:set sendgrid.api_key="[YOUR_SENDGRID_API_KEY]"

# Deploy functions
echo "🚀 Deploying Cloud Functions..."
firebase deploy --only functions

# Check deployment status
if [ $? -eq 0 ]; then
    echo "✅ Email functions deployed successfully!"
    echo ""
    echo "📧 Available email functions:"
    echo "  - sendOrganizationRequestEmail"
    echo "  - sendOrganizationApprovalEmail"
    echo "  - sendAdminAccessEmail"
    echo "  - sendTestEmail"
    echo ""
    echo "🧪 Test the email functionality:"
    echo "  1. Open browser console"
    echo "  2. Run: window.testEmail()"
    echo "  3. Check your email for the test message"
    echo ""
    echo "📚 Documentation:"
    echo "  - Cloud Functions: https://console.firebase.google.com/project/chimeo-96dfc/functions"
    echo "  - SendGrid Dashboard: https://app.sendgrid.com/"
else
    echo "❌ Deployment failed. Check the error messages above."
    exit 1
fi

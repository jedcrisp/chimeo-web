# Chimeo Subscription System Setup

This document explains how to set up and use the subscription system for Chimeo.

## 🏗️ Architecture Overview

The subscription system includes:

- **Frontend**: React components for subscription management and feature gating
- **Backend**: Firebase Functions for Stripe webhook handling
- **Database**: Firestore collections for subscriptions and usage tracking
- **Integration**: Real-time usage tracking and limit enforcement

## 📊 Pricing Tiers

| Plan | Price | Admins | Groups | Alerts/Month | Features |
|------|-------|--------|--------|--------------|----------|
| Free | $0 | 1 | 2 | 25 | Basic web access, Basic push notifications, Email support |
| Pro | $10 | 2 | 5 | 100 | Full web access, Advanced push notifications, Priority email support, Mobile app access |
| Premium | $25 | 10 | 25 | 500 | 10+ admins, 25 groups, 500 alerts, Premium push notifications, Priority phone & email support |
| Enterprise | $50 | Unlimited | Unlimited | Unlimited | All features, Custom integrations |

## 🚀 Setup Instructions

### 1. Stripe Configuration

1. **Create Stripe Account**: Sign up at [stripe.com](https://stripe.com)
2. **Get API Keys**: 
   - Go to Stripe Dashboard → Developers → API Keys
   - Copy your **Publishable Key** and **Secret Key**
3. **Create Products and Prices**:
   - Create products for each plan (Pro, Premium, Enterprise)
   - Set up monthly recurring prices
   - Note down the Price IDs (e.g., `price_pro_monthly`)

### 2. Environment Variables

Add these to your `.env` file:

```bash
# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Firebase Configuration (already set)
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
# ... other Firebase config
```

### 3. Firebase Functions Setup

1. **Install Stripe SDK**:
   ```bash
   cd functions
   npm install stripe
   ```

2. **Deploy Functions**:
   ```bash
   firebase deploy --only functions
   ```

3. **Set up Stripe Webhook**:
   - Go to Stripe Dashboard → Developers → Webhooks
   - Add endpoint: `https://your-project.cloudfunctions.net/stripeWebhook`
   - Select events: `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_*`
   - Copy the webhook secret to your environment variables

### 4. Database Structure

The system uses these Firestore collections:

```
/subscriptions/{userId}
  - userId: string
  - stripeCustomerId: string
  - stripeSubscriptionId: string
  - planType: 'free' | 'pro' | 'premium' | 'enterprise'
  - status: 'active' | 'cancelled' | 'past_due'
  - currentPeriodStart: timestamp
  - currentPeriodEnd: timestamp
  - cancelAtPeriodEnd: boolean
  - createdAt: timestamp
  - updatedAt: timestamp

/usage/{monthlyId}
  - userId: string (or organizationId)
  - month: '2025-01'
  - alerts: number
  - groups: number
  - admins: number
  - createdAt: timestamp
  - updatedAt: timestamp

/users/{userId}
  - ... existing fields
  - subscriptionId: string (optional)
  - planType: string (optional)
```

## 🎯 Usage Examples

### 1. Feature Gating

Wrap components with `FeatureGate`:

```jsx
import FeatureGate from '../components/FeatureGate'

function CreateAlertButton() {
  return (
    <FeatureGate action="createAlert" organizationId="org123">
      <button>Create Alert</button>
    </FeatureGate>
  )
}
```

### 2. Subscription Hooks

Use subscription hooks for custom logic:

```jsx
import { useSubscriptionLimits } from '../hooks/useSubscriptionLimits'

function MyComponent() {
  const { allowed, reason, limitInfo } = useSubscriptionLimits('createAlert', 'org123')
  
  if (!allowed) {
    return <div>Cannot create alert: {reason}</div>
  }
  
  return <button>Create Alert ({limitInfo.remaining} remaining)</button>
}
```

### 3. Usage Tracking

Automatically track usage when actions are performed:

```jsx
import { useSubscription } from '../contexts/SubscriptionContext'

function MyComponent() {
  const { incrementUsage } = useSubscription()
  
  const handleCreateAlert = async () => {
    // Create alert logic...
    await incrementUsage('alerts', 'org123')
  }
}
```

## 🔧 Customization

### 1. Adding New Features

To add a new feature with limits:

1. **Update pricing tiers** in `subscriptionService.js`:
   ```javascript
   const pricingTiers = {
     pro: {
       // ... existing fields
       maxNewFeature: 10, // Add new limit
     }
   }
   ```

2. **Add usage tracking**:
   ```javascript
   // In your service
   await subscriptionService.incrementUsage(userId, 'newFeature', orgId)
   ```

3. **Add feature gate**:
   ```jsx
   <FeatureGate action="createNewFeature" organizationId={orgId}>
     <NewFeatureComponent />
   </FeatureGate>
   ```

### 2. Customizing UI

- **Pricing Cards**: Modify `PricingCard.jsx`
- **Subscription Manager**: Update `SubscriptionManager.jsx`
- **Feature Gates**: Customize `FeatureGate.jsx`

### 3. Webhook Customization

Modify `subscriptionWebhooks.ts` to handle additional Stripe events or add custom logic.

## 📈 Monitoring

### 1. Usage Analytics

Track usage in your dashboard:

```javascript
const { usageStats } = useSubscription()
console.log('Alerts used:', usageStats.usage.alerts.used)
console.log('Groups created:', usageStats.usage.groups.used)
```

### 2. Subscription Events

Monitor subscription changes in Firebase Console:

- Go to Firestore → `subscriptions` collection
- Watch for status changes: `active` → `cancelled`
- Monitor usage patterns in `usage` collection

### 3. Stripe Dashboard

- View revenue and subscription metrics
- Monitor failed payments
- Track customer churn

## 🚨 Troubleshooting

### Common Issues

1. **Webhook not receiving events**:
   - Check webhook URL is correct
   - Verify webhook secret matches
   - Check Firebase Functions logs

2. **Usage not tracking**:
   - Ensure `incrementUsage` is called after successful actions
   - Check Firestore permissions
   - Verify organization ID is correct

3. **Feature gates not working**:
   - Check subscription status is 'active'
   - Verify plan type is correct
   - Check usage limits haven't been exceeded

### Debug Mode

Enable debug logging:

```javascript
// In subscriptionService.js
console.log('🔧 SubscriptionService: Debug mode enabled')
```

## 🔐 Security Considerations

1. **Server-side validation**: Always validate limits on the backend
2. **Webhook verification**: Verify Stripe webhook signatures
3. **User permissions**: Check user has access to organization
4. **Rate limiting**: Implement rate limiting for API calls

## 📚 API Reference

### SubscriptionService Methods

- `getUserSubscription(userId)` - Get user's subscription
- `canUserPerformAction(userId, action, orgId)` - Check if action is allowed
- `incrementUsage(userId, type, orgId)` - Track usage
- `getUsageStats(userId, orgId)` - Get comprehensive stats

### React Hooks

- `useSubscription()` - Access subscription context
- `useSubscriptionLimits(action, orgId)` - Check specific limits
- `FeatureGate` - Component for conditional rendering

## 🎉 Next Steps

1. **Set up Stripe account and get API keys**
2. **Configure environment variables**
3. **Deploy Firebase Functions**
4. **Test webhook integration**
5. **Customize pricing and features**
6. **Add payment UI components**
7. **Monitor usage and revenue**

For questions or support, contact the development team!

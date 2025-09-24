# 🧪 Subscription System Testing Guide

This guide will help you test the subscription system without needing a full Stripe setup.

## 🚀 Quick Start

### 1. **Start the Development Server**
```bash
npm run dev
```

### 2. **Run the Test Script**
```bash
node test-subscription.js test
```

### 3. **Open the Test Interface**
Go to: `http://localhost:5173/subscription-tester`

## 📋 Testing Scenarios

### **Scenario 1: Free Tier Testing**
1. Go to `/subscription-tester`
2. Click "Test" next to "Free Tier"
3. Verify:
   - Plan shows as "Free"
   - Alerts: 20/25 (80% usage)
   - Groups: 1/2 (50% usage)
   - Admins: 1/1 (100% usage)

### **Scenario 2: Pro Tier Testing**
1. Click "Test" next to "Pro Tier"
2. Verify:
   - Plan shows as "Pro"
   - Alerts: 80/100 (80% usage)
   - Groups: 3/5 (60% usage)
   - Admins: 2/2 (100% usage)

### **Scenario 3: Premium Tier Testing**
1. Click "Test" next to "Premium Tier"
2. Verify:
   - Plan shows as "Premium"
   - Alerts: 400/500 (80% usage)
   - Groups: 15/25 (60% usage)
   - Admins: 8/10 (80% usage)

### **Scenario 4: Enterprise Tier Testing**
1. Click "Test" next to "Enterprise Tier"
2. Verify:
   - Plan shows as "Enterprise"
   - All limits show as unlimited
   - No usage warnings

## 🔧 Feature Testing

### **Test Feature Gates**
1. Click "Test Feature Gates" button
2. Check the results:
   - `createAlert` - Should be allowed based on current tier
   - `createGroup` - Should be allowed based on current tier
   - `addAdmin` - Should be allowed based on current tier

### **Test Usage Increment**
1. Click "Test Usage Increment" button
2. Verify the alert count increases by 1
3. Check if you hit the limit (should show warning)

### **Test Calendar Alerts**
1. Go to `/calendar`
2. Try to create a new scheduled alert
3. Verify:
   - Free tier: Should work (20/25 alerts)
   - Pro tier: Should work (80/100 alerts)
   - Premium tier: Should work (400/500 alerts)

### **Test Groups**
1. Go to `/my-groups`
2. Try to create a new group
3. Verify:
   - Free tier: Should work (1/2 groups)
   - Pro tier: Should work (3/5 groups)
   - Premium tier: Should work (15/25 groups)

## 🎯 Manual Testing Steps

### **Step 1: Test Subscription Page**
1. Go to `/subscription`
2. Verify the page loads correctly
3. Check that usage statistics are displayed
4. Test the upgrade modal

### **Step 2: Test Feature Gating**
1. Go to `/calendar`
2. Try to create an alert when at limit
3. Verify you see the upgrade prompt
4. Check that the button is disabled

### **Step 3: Test Usage Tracking**
1. Create a new alert
2. Go to `/subscription`
3. Verify the usage count increased
4. Check the progress bars updated

### **Step 4: Test Different Tiers**
1. Use the tester to switch between tiers
2. Verify limits change appropriately
3. Test that features are enabled/disabled correctly

## 🐛 Troubleshooting

### **Issue: Subscription data not loading**
- Check browser console for errors
- Verify Firebase connection
- Run `node test-subscription.js test` again

### **Issue: Feature gates not working**
- Check that the subscription context is loaded
- Verify the organization ID is correct
- Check browser console for permission errors

### **Issue: Usage not tracking**
- Verify the `incrementUsage` function is called
- Check Firestore permissions
- Look for errors in the console

### **Issue: Test data not clearing**
- Run `node test-subscription.js cleanup`
- Refresh the page
- Check Firestore console

## 📊 Expected Results

### **Free Tier (25 alerts, 2 groups, 1 admin)**
- ✅ Can create alerts (up to 25)
- ✅ Can create groups (up to 2)
- ✅ Can add admins (up to 1)
- ❌ Blocked when limits reached

### **Pro Tier (100 alerts, 5 groups, 2 admins)**
- ✅ Can create alerts (up to 100)
- ✅ Can create groups (up to 5)
- ✅ Can add admins (up to 2)
- ❌ Blocked when limits reached

### **Premium Tier (500 alerts, 25 groups, 10 admins)**
- ✅ Can create alerts (up to 500)
- ✅ Can create groups (up to 25)
- ✅ Can add admins (up to 10)
- ❌ Blocked when limits reached

### **Enterprise Tier (Unlimited)**
- ✅ Can create unlimited alerts
- ✅ Can create unlimited groups
- ✅ Can add unlimited admins
- ✅ No limits enforced

## 🧹 Cleanup

After testing, clean up the test data:

```bash
node test-subscription.js cleanup
```

This will remove all test subscriptions, usage data, and organizations.

## 📝 Notes

- The test script creates mock data in Firestore
- All test data uses the user ID `test-user-123`
- Test organization ID is `test-org-123`
- Usage data is created for the current month
- You can run tests multiple times safely

## 🎉 Success Criteria

You know the system is working when:
1. ✅ Different subscription tiers load correctly
2. ✅ Usage statistics display accurately
3. ✅ Feature gates block actions at limits
4. ✅ Usage counters increment properly
5. ✅ Upgrade prompts appear when needed
6. ✅ All UI components render without errors

Happy testing! 🚀

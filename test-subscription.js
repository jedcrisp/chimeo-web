#!/usr/bin/env node

/**
 * Subscription System Test Script
 * 
 * This script helps you test the subscription system without a full Stripe setup.
 * Run with: node test-subscription.js
 */

const { initializeApp } = require('firebase/app')
const { getFirestore, collection, doc, setDoc, deleteDoc } = require('firebase/firestore')

// Firebase config (replace with your actual config)
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "your-api-key",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "your-project.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "your-project-id",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "your-project.appspot.com",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: process.env.VITE_FIREBASE_APP_ID || "your-app-id"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// Test data
const testUserId = 'test-user-123'
const testOrgId = 'test-org-123'

const pricingTiers = {
  free: {
    name: 'Free',
    price: 0,
    maxAdmins: 1,
    maxGroups: 2,
    maxAlertsPerMonth: 25,
    features: ['Basic web access', 'Basic push notifications', 'Email support']
  },
  pro: {
    name: 'Pro',
    price: 10,
    maxAdmins: 2,
    maxGroups: 5,
    maxAlertsPerMonth: 100,
    features: ['Full web browser access', 'Advanced push notifications', 'Priority email support', 'Mobile app access']
  },
  premium: {
    name: 'Premium',
    price: 25,
    maxAdmins: 10,
    maxGroups: 25,
    maxAlertsPerMonth: 500,
    features: ['10+ organization admins', '25 groups', '500 alerts per month', 'Full web browser access', 'Premium push notifications', 'Priority phone & email support']
  },
  enterprise: {
    name: 'Enterprise',
    price: 50,
    maxAdmins: 999999,
    maxGroups: 999999,
    maxAlertsPerMonth: 999999,
    features: ['Unlimited admins', 'Unlimited groups', 'Unlimited alerts', 'Full web browser access', 'Premium push notifications', 'Priority phone & email support', 'Custom integrations']
  }
}

async function createTestSubscription(planType) {
  try {
    console.log(`🧪 Creating test subscription: ${planType}`)
    
    const subscription = {
      userId: testUserId,
      planType,
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      cancelAtPeriodEnd: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await setDoc(doc(db, 'subscriptions', testUserId), subscription)
    console.log(`✅ Created ${planType} subscription for user ${testUserId}`)
    
    return subscription
  } catch (error) {
    console.error(`❌ Error creating ${planType} subscription:`, error)
    throw error
  }
}

async function createTestUsage(planType) {
  try {
    console.log(`📊 Creating test usage data: ${planType}`)
    
    const currentMonth = new Date().toISOString().slice(0, 7) // '2025-01'
    const usageId = `${testUserId}_${currentMonth}`
    
    const tier = pricingTiers[planType]
    const usage = {
      userId: testUserId,
      month: currentMonth,
      alerts: Math.floor(tier.maxAlertsPerMonth * 0.8), // 80% usage
      groups: Math.floor(tier.maxGroups * 0.5), // 50% usage
      admins: Math.floor(tier.maxAdmins * 0.5), // 50% usage
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await setDoc(doc(db, 'usage', usageId), usage)
    console.log(`✅ Created usage data for ${planType}:`, {
      alerts: `${usage.alerts}/${tier.maxAlertsPerMonth}`,
      groups: `${usage.groups}/${tier.maxGroups}`,
      admins: `${usage.admins}/${tier.maxAdmins}`
    })
    
    return usage
  } catch (error) {
    console.error(`❌ Error creating usage data:`, error)
    throw error
  }
}

async function createTestOrganization(planType) {
  try {
    console.log(`🏢 Creating test organization: ${planType}`)
    
    const tier = pricingTiers[planType]
    const organization = {
      name: `Test Organization (${planType})`,
      description: `Test organization for ${planType} tier`,
      subscriptionId: testUserId,
      planType,
      adminIds: { [testUserId]: true },
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await setDoc(doc(db, 'organizations', testOrgId), organization)
    console.log(`✅ Created test organization ${testOrgId}`)
    
    return organization
  } catch (error) {
    console.error(`❌ Error creating test organization:`, error)
    throw error
  }
}

async function cleanupTestData() {
  try {
    console.log('🧹 Cleaning up test data...')
    
    // Delete subscription
    await deleteDoc(doc(db, 'subscriptions', testUserId))
    
    // Delete usage data
    const currentMonth = new Date().toISOString().slice(0, 7)
    const usageId = `${testUserId}_${currentMonth}`
    await deleteDoc(doc(db, 'usage', usageId))
    
    // Delete organization
    await deleteDoc(doc(db, 'organizations', testOrgId))
    
    console.log('✅ Test data cleaned up')
  } catch (error) {
    console.error('❌ Error cleaning up test data:', error)
  }
}

async function runTests() {
  console.log('🚀 Starting subscription system tests...\n')
  
  try {
    // Test each pricing tier
    for (const [planType, tier] of Object.entries(pricingTiers)) {
      console.log(`\n📋 Testing ${tier.name} tier:`)
      console.log(`   Price: $${tier.price}/month`)
      console.log(`   Admins: ${tier.maxAdmins}`)
      console.log(`   Groups: ${tier.maxGroups}`)
      console.log(`   Alerts: ${tier.maxAlertsPerMonth}/month`)
      
      await createTestSubscription(planType)
      await createTestUsage(planType)
      await createTestOrganization(planType)
      
      console.log(`✅ ${tier.name} tier test completed\n`)
    }
    
    console.log('🎉 All tests completed successfully!')
    console.log('\n📝 Next steps:')
    console.log('1. Go to http://localhost:5173/subscription-tester')
    console.log('2. Test different subscription scenarios')
    console.log('3. Verify feature gates work correctly')
    console.log('4. Check usage tracking and limits')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Command line interface
const command = process.argv[2]

switch (command) {
  case 'test':
    runTests()
    break
  case 'cleanup':
    cleanupTestData()
    break
  case 'help':
  default:
    console.log(`
🧪 Subscription System Test Script

Usage:
  node test-subscription.js test     - Run all tests
  node test-subscription.js cleanup  - Clean up test data
  node test-subscription.js help     - Show this help

This script will:
1. Create test subscriptions for each pricing tier
2. Set up mock usage data
3. Create test organizations
4. Allow you to test the subscription system in the browser

Make sure your Firebase config is set up correctly!
    `)
    break
}

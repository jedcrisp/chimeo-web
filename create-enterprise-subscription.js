const { initializeApp } = require('firebase/app')
const { getFirestore, doc, setDoc, updateDoc, serverTimestamp } = require('firebase/firestore')

// Firebase config (you may need to adjust this based on your setup)
const firebaseConfig = {
  // Add your Firebase config here
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function createEnterpriseSubscription() {
  const userId = '07JNLCtBvYOnDAWxWR5rE7B41qm2'
  const subscriptionId = 'ent_anna_crisp_' + Date.now()
  
  const subscriptionData = {
    userId,
    stripeCustomerId: 'cus_anna_crisp_enterprise',
    stripeSubscriptionId: subscriptionId,
    planType: 'enterprise',
    status: 'active',
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
    cancelAtPeriodEnd: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }

  try {
    console.log('🚀 Creating enterprise subscription for Anna Crisp...')
    
    // Create subscription in user subcollection
    await setDoc(doc(db, 'users', userId, 'subscriptions', subscriptionId), subscriptionData)
    console.log('✅ Created subscription in subcollection')
    
    // Update user profile for quick access
    await updateDoc(doc(db, 'users', userId), {
      planType: 'enterprise',
      subscriptionId: subscriptionId,
      stripeCustomerId: 'cus_anna_crisp_enterprise',
      updatedAt: serverTimestamp()
    })
    console.log('✅ Updated user profile with enterprise plan')
    
    console.log('🎉 Enterprise subscription created successfully!')
    console.log('📊 Plan: Enterprise')
    console.log('💰 Price: $50/month')
    console.log('👥 Max Admins: Unlimited')
    console.log('📋 Max Groups: Unlimited')
    console.log('🔔 Max Alerts: Unlimited')
    
  } catch (error) {
    console.error('❌ Error creating subscription:', error)
  }
}

// Run the function
createEnterpriseSubscription()
  .then(() => {
    console.log('✅ Script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })

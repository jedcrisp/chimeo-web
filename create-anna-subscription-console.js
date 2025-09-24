// Run this in the browser console on your Chimeo app
// Make sure you're logged in as an admin user

async function createAnnaEnterpriseSubscription() {
  const userId = '07JNLCtBvYOnDAWxWR5rE7B41qm2'
  const subscriptionId = 'ent_anna_crisp_' + Date.now()
  
  // Import Firebase functions (assuming they're available globally)
  const { doc, setDoc, updateDoc, serverTimestamp } = window.firebase.firestore
  
  const subscriptionData = {
    userId,
    stripeCustomerId: 'cus_anna_crisp_enterprise',
    stripeSubscriptionId: subscriptionId,
    planType: 'enterprise',
    status: 'active',
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date('2099-12-31T23:59:59.999Z'), // Never expires
    cancelAtPeriodEnd: false,
    neverExpires: true,
    isLifetime: true,
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

// Call the function
createAnnaEnterpriseSubscription()

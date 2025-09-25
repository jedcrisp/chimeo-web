// Script to check Anna's subscription document
// Run this in the browser console on your Chimeo app

async function checkAnnaSubscription() {
  try {
    console.log('🔍 Checking Anna\'s subscription document...')
    
    // Import Firebase functions (assuming they're available globally)
    const { doc, getDoc } = window.firebase.firestore
    
    const userId = '07JNLCtBvYOnDAWxWR5rE7B41qm2'
    const subscriptionId = 'ent_anna_crisp_20241223'
    
    // Check the user subscription document
    const userSubscriptionRef = doc(db, 'users', userId, 'subscriptions', subscriptionId)
    const userSubscriptionDoc = await getDoc(userSubscriptionRef)
    
    if (userSubscriptionDoc.exists()) {
      const subscriptionData = userSubscriptionDoc.data()
      console.log('✅ Found Anna\'s subscription document:')
      console.log('📊 Subscription data:', subscriptionData)
      console.log('🎯 Plan type:', subscriptionData.planType)
      console.log('📅 Status:', subscriptionData.status)
      console.log('💰 Price:', subscriptionData.price)
      console.log('👥 Max admins:', subscriptionData.maxAdmins)
      
      // Check if it's not free
      if (subscriptionData.planType && subscriptionData.planType !== 'free') {
        console.log('✅ Anna has a paid subscription - should have admin management access!')
      } else {
        console.log('❌ Anna has free subscription - no admin management access')
      }
    } else {
      console.log('❌ Anna\'s subscription document not found')
    }
    
  } catch (error) {
    console.error('❌ Error checking Anna\'s subscription:', error)
  }
}

// Call the function
checkAnnaSubscription()

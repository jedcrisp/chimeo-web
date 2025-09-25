// Script to fix Velocity's organization subscription
// Run this in the browser console on your Chimeo app

async function fixVelocitySubscription() {
  try {
    console.log('🔧 Fixing Velocity organization subscription...')
    
    // Import Firebase functions (assuming they're available globally)
    const { collection, getDocs, doc, getDoc, setDoc, updateDoc, serverTimestamp, query } = window.firebase.firestore
    
    // First, let's find the Velocity organization
    const orgsQuery = query(collection(db, 'organizations'))
    const orgsSnapshot = await getDocs(orgsQuery)
    
    let velocityOrg = null
    for (const orgDoc of orgsSnapshot.docs) {
      const orgData = orgDoc.data()
      if (orgData.name === 'Velocity Physical Therapy North Denton') {
        velocityOrg = { id: orgDoc.id, ...orgData }
        break
      }
    }
    
    if (!velocityOrg) {
      console.error('❌ Velocity organization not found')
      return
    }
    
    console.log('✅ Found Velocity organization:', velocityOrg.id)
    console.log('Current organization data:', {
      name: velocityOrg.name,
      subscriptionId: velocityOrg.subscriptionId,
      planType: velocityOrg.planType,
      adminIds: velocityOrg.adminIds
    })
    
    const subscriptionId = velocityOrg.subscriptionId || 'ent_anna_crisp_20241223'
    const userId = '07JNLCtBvYOnDAWxWR5rE7B41qm2' // Anna's user ID
    
    // Check if the subscription document exists in the user's subcollection
    const userSubscriptionRef = doc(db, 'users', userId, 'subscriptions', subscriptionId)
    const userSubscriptionDoc = await getDoc(userSubscriptionRef)
    
    if (!userSubscriptionDoc.exists()) {
      console.log('🔧 User subscription document not found, creating it...')
      
      // Create the subscription document in user's subcollection
      const subscriptionData = {
        userId: userId,
        planType: 'enterprise',
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date('2099-12-31T23:59:59.999Z'), // Never expires
        cancelAtPeriodEnd: false,
        neverExpires: true,
        isLifetime: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        // Enterprise tier details
        name: 'Enterprise',
        price: 50,
        maxAdmins: 999999,
        maxGroups: 999999,
        maxAlertsPerMonth: 999999,
        features: [
          'Unlimited admins',
          'Unlimited groups', 
          'Unlimited alerts',
          'Full web browser access',
          'Premium push notifications',
          'Priority phone & email support',
          'Custom integrations'
        ]
      }
      
      await setDoc(userSubscriptionRef, subscriptionData)
      console.log('✅ Created user subscription document:', subscriptionId)
    } else {
      console.log('✅ User subscription document already exists:', subscriptionId)
      const existingData = userSubscriptionDoc.data()
      console.log('📊 Existing subscription data:', {
        planType: existingData.planType,
        status: existingData.status,
        maxAdmins: existingData.maxAdmins
      })
    }
    
    // Update the organization with enterprise plan
    const orgRef = doc(db, 'organizations', velocityOrg.id)
    await updateDoc(orgRef, {
      planType: 'enterprise',
      subscriptionId: subscriptionId,
      updatedAt: serverTimestamp()
    })
    
    console.log('✅ Updated Velocity organization with enterprise plan')
    console.log('📊 Plan: Enterprise')
    console.log('💰 Price: $50/month')
    console.log('👥 Max Admins: Unlimited')
    console.log('📋 Max Groups: Unlimited')
    console.log('🔔 Max Alerts: Unlimited')
    
  } catch (error) {
    console.error('❌ Error fixing Velocity subscription:', error)
  }
}

// Call the function
fixVelocitySubscription()

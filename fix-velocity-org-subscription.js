// Script to fix Velocity organization subscription linking
// Run this in the browser console on your Chimeo app

async function fixVelocityOrgSubscription() {
  try {
    console.log('🔧 Fixing Velocity organization subscription linking...')
    
    // Import Firebase functions (assuming they're available globally)
    const { collection, getDocs, doc, getDoc, setDoc, updateDoc, serverTimestamp, query } = window.firebase.firestore
    
    // Find Velocity organization
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
    
    const subscriptionId = 'ent_anna_crisp_20241223'
    const userId = '07JNLCtBvYOnDAWxWR5rE7B41qm2'
    
    // Check if the subscription document exists in the user's subcollection
    const userSubscriptionRef = doc(db, 'users', userId, 'subscriptions', subscriptionId)
    const userSubscriptionDoc = await getDoc(userSubscriptionRef)
    
    if (userSubscriptionDoc.exists()) {
      const subscriptionData = userSubscriptionDoc.data()
      console.log('✅ User subscription document exists:', subscriptionData.planType)
    } else {
      console.log('🔧 User subscription document not found, creating it...')
      
      const subscriptionData = {
        userId: userId,
        planType: 'enterprise',
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date('2099-12-31T23:59:59.999Z'),
        cancelAtPeriodEnd: false,
        neverExpires: true,
        isLifetime: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
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
    
    console.log('🎉 Fix complete! Try opening the admin management modal again.')
    
  } catch (error) {
    console.error('❌ Error fixing Velocity subscription:', error)
  }
}

// Call the function
fixVelocityOrgSubscription()

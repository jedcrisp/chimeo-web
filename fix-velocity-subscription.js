// Script to fix Velocity's organization subscription
// Run this in the browser console on your Chimeo app

import { db } from './src/services/firebase.js'
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'

async function fixVelocitySubscription() {
  try {
    console.log('🔧 Fixing Velocity organization subscription...')
    
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
    
    // Update the organization with enterprise plan
    const orgRef = doc(db, 'organizations', velocityOrg.id)
    await updateDoc(orgRef, {
      planType: 'enterprise',
      subscriptionId: '07JNLCtBvYOnDAWxWR5rE7B41qm2', // Anna's user ID
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

// Run the function
fixVelocitySubscription()

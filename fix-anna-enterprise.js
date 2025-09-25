// Simple script to fix Anna's enterprise subscription
// Run this in the browser console on your Chimeo app

async function fixAnnaEnterprise() {
  try {
    console.log('🔧 Fixing Anna\'s enterprise subscription...')
    
    // Import Firebase functions
    const { doc, getDoc, updateDoc, serverTimestamp, collection, getDocs, query } = window.firebase.firestore
    
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
    console.log('Current org data:', {
      name: velocityOrg.name,
      subscriptionId: velocityOrg.subscriptionId,
      planType: velocityOrg.planType
    })
    
    // Update the organization with enterprise plan
    const orgRef = doc(db, 'organizations', velocityOrg.id)
    await updateDoc(orgRef, {
      planType: 'enterprise',
      subscriptionId: 'ent_anna_crisp_20241223',
      updatedAt: serverTimestamp()
    })
    
    console.log('✅ Updated Velocity organization with enterprise plan')
    console.log('📊 Plan: Enterprise')
    console.log('🔗 Subscription ID: ent_anna_crisp_20241223')
    
    // Verify the update
    const updatedOrgDoc = await getDoc(orgRef)
    const updatedOrgData = updatedOrgDoc.data()
    console.log('✅ Verification - Updated org data:', {
      name: updatedOrgData.name,
      subscriptionId: updatedOrgData.subscriptionId,
      planType: updatedOrgData.planType
    })
    
    console.log('🎉 Fix complete! Anna should now have enterprise access.')
    console.log('💡 Try refreshing the page and opening the admin management modal.')
    
  } catch (error) {
    console.error('❌ Error fixing Anna\'s enterprise subscription:', error)
  }
}

// Call the function
fixAnnaEnterprise()

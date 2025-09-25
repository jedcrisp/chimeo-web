// Console script to grant Anna unlimited access
// Run this in the browser console while logged in as Jed

// First, you need to get the organization ID for Velocity Physical Therapy North Denton
// You can find this in the Firestore console or by looking at the admin organizations

const grantAnnaUnlimitedAccess = async () => {
  try {
    // Import Firebase (assuming it's available globally)
    const { getFirestore, doc, setDoc, serverTimestamp } = window.firebase.firestore
    
    const db = getFirestore()
    
    // Anna's user ID
    const annaUserId = '07JNLCtBvYOnDAWxWR5rE7B41qm2'
    
    // You'll need to replace this with the actual organization ID
    // You can find it by going to the Firestore console and looking at the organizations collection
    const organizationId = 'velocity_physical_therapy_north_denton' // Replace with actual org ID
    
    console.log('🔧 Granting unlimited access to Anna...')
    console.log('User ID:', annaUserId)
    console.log('Organization ID:', organizationId)
    
    // Create special access document
    const accessId = `${annaUserId}_${organizationId}`
    const accessRef = doc(db, 'special_access', accessId)
    
    const specialAccess = {
      userId: annaUserId,
      organizationId: organizationId,
      accessType: 'unlimited',
      limits: {
        alerts: -1,        // Unlimited alerts
        groups: -1,        // Unlimited groups
        admins: -1,        // Unlimited admins
        notifications: -1  // Unlimited notifications
      },
      grantedBy: 'jed@onetrack-consulting.com',
      grantedAt: serverTimestamp(),
      expiresAt: null, // No expiration
      reason: 'Special unlimited access for Anna - platform creator',
      isActive: true
    }
    
    await setDoc(accessRef, specialAccess)
    
    console.log('✅ Successfully granted unlimited access to Anna!')
    console.log('📊 Anna now has unlimited access to:')
    console.log('  - Alerts: Unlimited')
    console.log('  - Groups: Unlimited')
    console.log('  - Admins: Unlimited')
    console.log('  - Notifications: Unlimited')
    
    return specialAccess
    
  } catch (error) {
    console.error('❌ Error granting Anna unlimited access:', error)
    throw error
  }
}

// Run the function
console.log('🚀 Running grantAnnaUnlimitedAccess...')
grantAnnaUnlimitedAccess()
  .then(result => {
    console.log('🎉 Success!', result)
  })
  .catch(error => {
    console.error('💥 Failed:', error)
  })

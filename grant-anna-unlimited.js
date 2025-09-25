// Script to grant Anna unlimited access
// Run this in the browser console or as a Node.js script

import { initializeApp } from 'firebase/app'
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore'

// Your Firebase config
const firebaseConfig = {
  // Add your Firebase config here
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function grantAnnaUnlimitedAccess() {
  try {
    // Anna's user ID
    const annaUserId = '07JNLCtBvYOnDAWxWR5rE7B41qm2'
    const organizationId = 'velocity_physical_therapy_north_denton' // Replace with actual org ID
    
    console.log('🔧 Granting unlimited access to Anna...')
    
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
      grantedBy: 'system',
      grantedAt: serverTimestamp(),
      expiresAt: null, // No expiration
      reason: 'Special unlimited access for Anna',
      isActive: true
    }
    
    await setDoc(accessRef, specialAccess)
    
    console.log('✅ Successfully granted unlimited access to Anna!')
    console.log('📊 Anna now has unlimited access to:')
    console.log('  - Alerts: Unlimited')
    console.log('  - Groups: Unlimited')
    console.log('  - Admins: Unlimited')
    console.log('  - Notifications: Unlimited')
    
  } catch (error) {
    console.error('❌ Error granting Anna unlimited access:', error)
  }
}

// Run the function
grantAnnaUnlimitedAccess()

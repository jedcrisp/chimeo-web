import { initializeApp } from 'firebase/app'
import { getFirestore, doc, updateDoc, getDoc } from 'firebase/firestore'

// Firebase config (replace with your actual config)
const firebaseConfig = {
  // Your Firebase config here
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function setupAnnaUnlimited() {
  try {
    // Anna's user ID (replace with actual ID)
    const annaUserId = '07JNLCtBvYOnDAWxWR5rE7B41qm2' // Replace with Anna's actual UID
    
    console.log('🔧 Setting up unlimited alerts for Anna...')
    
    // Get Anna's current user document
    const userRef = doc(db, 'users', annaUserId)
    const userDoc = await getDoc(userRef)
    
    if (!userDoc.exists()) {
      console.error('❌ User document not found for Anna')
      return
    }
    
    const currentData = userDoc.data()
    console.log('📋 Current user data:', currentData)
    
    // Update with custom limits
    await updateDoc(userRef, {
      customLimits: {
        alerts: -1,        // Unlimited alerts
        groups: 50,        // Keep other limits reasonable
        admins: 10
      },
      hasCustomLimits: true,
      unlimitedAccess: true,
      updatedAt: new Date()
    })
    
    console.log('✅ Successfully set up unlimited alerts for Anna!')
    console.log('📊 Anna now has:')
    console.log('  - Unlimited alerts (-1)')
    console.log('  - 50 groups limit')
    console.log('  - 10 admins limit')
    
  } catch (error) {
    console.error('❌ Error setting up Anna unlimited access:', error)
  }
}

// Run the setup
setupAnnaUnlimited()

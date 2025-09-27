import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore'

// Firebase config (you'll need to add your config here)
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

async function updateStandardUsers() {
  try {
    console.log('🔍 Looking for users that need accessLevel: standard...')
    
    // Find users who don't have accessLevel set but should be standard
    const usersQuery = query(
      collection(db, 'users'),
      where('isOrganizationAdmin', '==', false)
    )
    
    const usersSnapshot = await getDocs(usersQuery)
    console.log(`📊 Found ${usersSnapshot.size} users to check`)
    
    let updatedCount = 0
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data()
      const userId = userDoc.id
      
      // Check if user should be standard (not org admin, not platform admin)
      const isPlatformAdmin = userId === 'z4a9tShrtmT5W88euqy92ihQiNB3' || 
                             userData.email === 'jed@chimeo.app'
      
      if (!isPlatformAdmin && !userData.accessLevel) {
        console.log(`🔄 Updating user ${userId} (${userData.email}) to standard access level`)
        
        await updateDoc(doc(db, 'users', userId), {
          accessLevel: 'standard',
          updatedAt: new Date()
        })
        
        updatedCount++
        console.log(`✅ Updated user ${userId}`)
      } else if (userData.accessLevel) {
        console.log(`ℹ️ User ${userId} already has accessLevel: ${userData.accessLevel}`)
      } else {
        console.log(`ℹ️ User ${userId} is platform admin, skipping`)
      }
    }
    
    console.log(`🎉 Updated ${updatedCount} users to standard access level`)
    
  } catch (error) {
    console.error('❌ Error updating users:', error)
  }
}

// Run the update
updateStandardUsers()

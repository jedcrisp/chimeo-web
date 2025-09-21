// Migration script to move notifications from root collection to user-specific subcollections
// Run this script to fix the notification storage structure

import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, setDoc, doc, deleteDoc } from 'firebase/firestore'

// Firebase configuration (use your actual config)
const firebaseConfig = {
  apiKey: "AIzaSyA96jGLzCUMVe9FHHS1lQ8vdbi8DFhAs6o",
  authDomain: "chimeo-96dfc.firebaseapp.com",
  databaseURL: "https://chimeo-96dfc-default-rtdb.firebaseio.com",
  projectId: "chimeo-96dfc",
  storageBucket: "chimeo-96dfc.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function migrateNotifications() {
  try {
    console.log('🔄 Starting notification migration...')
    
    // Get all notifications from the root collection
    const notificationsSnapshot = await getDocs(collection(db, 'notifications'))
    console.log(`📊 Found ${notificationsSnapshot.docs.length} notifications to migrate`)
    
    let migratedCount = 0
    let errorCount = 0
    
    for (const notificationDoc of notificationsSnapshot.docs) {
      try {
        const notificationData = notificationDoc.data()
        const notificationId = notificationDoc.id
        
        // Determine target user
        let targetUser = notificationData.targetUser || 'jed@onetrack-consulting.com'
        
        // Skip if already in subcollection structure
        if (notificationId.includes('_') && notificationId.length > 20) {
          console.log(`⏭️ Skipping notification ${notificationId} - appears to be in subcollection structure`)
          continue
        }
        
        // Sanitize email for document path
        const sanitizedEmail = targetUser.replace(/[^a-zA-Z0-9]/g, '_')
        
        // Create new notification ID with timestamp
        const newNotificationId = `migrated_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        
        // Save to user-specific subcollection
        await setDoc(
          doc(db, 'notifications', sanitizedEmail, 'user_notifications', newNotificationId),
          {
            ...notificationData,
            migratedAt: new Date(),
            originalId: notificationId
          }
        )
        
        // Delete from root collection
        await deleteDoc(doc(db, 'notifications', notificationId))
        
        console.log(`✅ Migrated notification ${notificationId} -> ${newNotificationId} for user ${targetUser}`)
        migratedCount++
        
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
        
      } catch (error) {
        console.error(`❌ Error migrating notification ${notificationDoc.id}:`, error)
        errorCount++
      }
    }
    
    console.log(`🎉 Migration completed!`)
    console.log(`✅ Successfully migrated: ${migratedCount} notifications`)
    console.log(`❌ Errors: ${errorCount} notifications`)
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
  }
}

// Run migration
migrateNotifications()

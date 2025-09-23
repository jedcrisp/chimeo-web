import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, deleteDoc, doc, query, orderBy } from 'firebase/firestore'

// Firebase config - you'll need to add your actual config
const firebaseConfig = {
  // Add your Firebase config here
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function deleteAllAlerts() {
  try {
    console.log('🗑️ Starting to delete all scheduled alerts...')
    
    const organizationId = 'velocity_physical_therapy_north_denton'
    const alertsRef = collection(db, 'organizations', organizationId, 'scheduledAlerts')
    const q = query(alertsRef, orderBy('scheduledDate', 'asc'))
    const snapshot = await getDocs(q)
    
    console.log(`📊 Found ${snapshot.size} scheduled alerts to delete`)
    
    if (snapshot.empty) {
      console.log('✅ No alerts found to delete')
      return
    }
    
    let deletedCount = 0
    for (const alertDoc of snapshot.docs) {
      try {
        await deleteDoc(doc(db, 'organizations', organizationId, 'scheduledAlerts', alertDoc.id))
        console.log(`✅ Deleted alert: ${alertDoc.data().title} (${alertDoc.id})`)
        deletedCount++
      } catch (error) {
        console.error(`❌ Failed to delete alert ${alertDoc.id}:`, error)
      }
    }
    
    console.log(`🎉 Successfully deleted ${deletedCount} out of ${snapshot.size} alerts`)
    
  } catch (error) {
    console.error('❌ Error deleting alerts:', error)
  }
}

deleteAllAlerts()

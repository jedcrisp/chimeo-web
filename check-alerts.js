import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, query, orderBy } from 'firebase/firestore'

// Firebase config (you'll need to add your actual config)
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

async function checkScheduledAlerts() {
  try {
    console.log('🔍 Checking scheduled alerts in velocity_physical_therapy_north_denton...')
    
    const alertsRef = collection(db, 'organizations', 'velocity_physical_therapy_north_denton', 'scheduledAlerts')
    const q = query(alertsRef, orderBy('scheduledDate', 'asc'))
    const snapshot = await getDocs(q)
    
    console.log(`📊 Found ${snapshot.size} scheduled alerts`)
    
    if (snapshot.empty) {
      console.log('❌ No alerts found in the collection')
      return
    }
    
    snapshot.forEach((doc, index) => {
      const data = doc.data()
      console.log(`\n📅 Alert ${index + 1}:`)
      console.log(`   ID: ${doc.id}`)
      console.log(`   Title: ${data.title}`)
      console.log(`   Scheduled Date: ${data.scheduledDate?.toDate?.()?.toDateString() || 'Invalid date'}`)
      console.log(`   Posted By: ${data.postedBy}`)
      console.log(`   Posted By User ID: ${data.postedByUserId}`)
      console.log(`   Organization: ${data.organizationName}`)
      console.log(`   Type: ${data.type}`)
      console.log(`   Severity: ${data.severity}`)
      console.log(`   Active: ${data.isActive}`)
    })
    
  } catch (error) {
    console.error('❌ Error checking alerts:', error)
  }
}

checkScheduledAlerts()

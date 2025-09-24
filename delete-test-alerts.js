import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc, query, orderBy } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBvQZvQZvQZvQZvQZvQZvQZvQZvQZvQZvQ",
  authDomain: "chimeo-web.firebaseapp.com",
  projectId: "chimeo-web",
  storageBucket: "chimeo-web.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456789"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function findAndDeleteTestAlerts() {
  try {
    console.log('🔍 Searching for test alerts...');
    
    // Check all organizations
    const orgsSnapshot = await getDocs(collection(db, 'organizations'));
    console.log('🔍 Found organizations:', orgsSnapshot.size);
    
    let totalDeleted = 0;
    
    for (const orgDoc of orgsSnapshot.docs) {
      const orgId = orgDoc.id;
      const orgData = orgDoc.data();
      console.log(`🔍 Checking organization: ${orgId} (${orgData.name || 'No name'})`);
      
      try {
        const alertsRef = collection(db, 'organizations', orgId, 'scheduledAlerts');
        const alertsSnapshot = await getDocs(alertsRef);
        console.log(`🔍 Organization ${orgId}: ${alertsSnapshot.size} alerts`);
        
        if (alertsSnapshot.size > 0) {
          for (const alertDoc of alertsSnapshot.docs) {
            const data = alertDoc.data();
            const title = data.title.toLowerCase();
            
            // Check if this is a test alert
            if (title.includes('test') || title.includes('debug') || title.includes('sample')) {
              console.log(`🗑️ Found test alert: ${data.title} (${alertDoc.id}) - Deleting...`);
              
              try {
                await deleteDoc(doc(db, 'organizations', orgId, 'scheduledAlerts', alertDoc.id));
                console.log(`✅ Successfully deleted test alert: ${data.title}`);
                totalDeleted++;
              } catch (deleteError) {
                console.error(`❌ Failed to delete alert ${alertDoc.id}:`, deleteError);
              }
            } else {
              console.log(`  - Keeping alert: ${data.title} (${alertDoc.id})`);
            }
          }
        }
      } catch (error) {
        console.log(`🔍 Error checking org ${orgId}:`, error.message);
      }
    }
    
    console.log(`🎉 Deleted ${totalDeleted} test alerts`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

findAndDeleteTestAlerts();

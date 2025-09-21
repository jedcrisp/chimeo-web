// Script to update existing organizations to have verified: true
// Run this in the Firebase console or as a Cloud Function

const admin = require('firebase-admin');

// Initialize Firebase Admin (if not already initialized)
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function updateExistingOrganizations() {
  console.log('🔄 Updating existing organizations to set verified: true...');
  
  try {
    // Get all organizations
    const snapshot = await db.collection('organizations').get();
    console.log(`📊 Found ${snapshot.docs.length} organizations`);
    
    const batch = db.batch();
    let updateCount = 0;
    
    for (const doc of snapshot.docs) {
      const data = doc.data();
      
      // Only update if verified field is missing or false
      if (data.verified !== true) {
        console.log(`📝 Updating organization: ${doc.id} (${data.name || 'Unknown'})`);
        batch.update(doc.ref, { 
          verified: true,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        updateCount++;
      } else {
        console.log(`✅ Organization already verified: ${doc.id} (${data.name || 'Unknown'})`);
      }
    }
    
    if (updateCount > 0) {
      await batch.commit();
      console.log(`✅ Successfully updated ${updateCount} organizations`);
    } else {
      console.log('✅ All organizations already have verified: true');
    }
    
  } catch (error) {
    console.error('❌ Error updating organizations:', error);
  }
}

// Run the update
updateExistingOrganizations();

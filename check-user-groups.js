import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyA96jGLzCUMVe9FHHS1lQ8vdbi8DFhAs6o",
  authDomain: "chimeo-96dfc.firebaseapp.com",
  databaseURL: "https://chimeo-96dfc-default-rtdb.firebaseio.com",
  projectId: "chimeo-96dfc",
  storageBucket: "chimeo-96dfc.firebasestorage.app",
  messagingSenderId: "280448574070",
  appId: "1:280448574070:web:9cb5298f2f0b10770a7557",
  measurementId: "G-GCSQ5KSTF0"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkUserGroups() {
  const userId = 'r02yOIEE2VWW1ZYv1qdnKUwWIqH2';
  const orgId = 'velocity_physical_therapy_north_denton';
  const groupId = 'Private Test';
  
  console.log('🔍 Checking user group following status...');
  console.log('User ID:', userId);
  console.log('Organization:', orgId);
  console.log('Group:', groupId);
  console.log('');

  try {
    // 1. Check user document for group preferences
    console.log('1️⃣ Checking user document...');
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      console.log('✅ User document found');
      console.log('📋 User data keys:', Object.keys(userData));
      console.log('📋 Group preferences:', userData.groupPreferences);
      console.log('📋 Followed groups array:', userData.followedGroups);
      console.log('📋 Followed organizations:', userData.followedOrganizations);
      
      // Check if user is following this specific group
      if (userData.groupPreferences && userData.groupPreferences[groupId]) {
        console.log(`✅ User IS following group "${groupId}" via groupPreferences`);
      } else {
        console.log(`❌ User is NOT following group "${groupId}" via groupPreferences`);
      }
      
      if (userData.followedGroups && userData.followedGroups.includes(groupId)) {
        console.log(`✅ User IS following group "${groupId}" via followedGroups array`);
      } else {
        console.log(`❌ User is NOT following group "${groupId}" via followedGroups array`);
      }
    } else {
      console.log('❌ User document not found');
    }
    
    console.log('');

    // 2. Check group membership
    console.log('2️⃣ Checking group membership...');
    const memberRef = doc(db, 'organizations', orgId, 'groups', groupId, 'members', userId);
    const memberDoc = await getDoc(memberRef);
    
    if (memberDoc.exists()) {
      const memberData = memberDoc.data();
      console.log('✅ User is a member of the group');
      console.log('📋 Member data:', memberData);
    } else {
      console.log('❌ User is NOT a member of the group');
    }
    
    console.log('');

    // 3. Check group document
    console.log('3️⃣ Checking group document...');
    const groupRef = doc(db, 'organizations', orgId, 'groups', groupId);
    const groupDoc = await getDoc(groupRef);
    
    if (groupDoc.exists()) {
      const groupData = groupDoc.data();
      console.log('✅ Group document found');
      console.log('📋 Group data:', groupData);
    } else {
      console.log('❌ Group document not found');
    }
    
    console.log('');

    // 4. Check all members of the group
    console.log('4️⃣ Checking all group members...');
    const membersRef = collection(db, 'organizations', orgId, 'groups', groupId, 'members');
    const membersSnapshot = await getDocs(membersRef);
    
    console.log(`📊 Total members in group: ${membersSnapshot.size}`);
    membersSnapshot.forEach(doc => {
      console.log(`   - Member ID: ${doc.id}`);
      console.log(`   - Member data:`, doc.data());
    });
    
    console.log('');

    // 5. Check if user has any subcollections
    console.log('5️⃣ Checking user subcollections...');
    
    // Check followedGroups subcollection
    const followedGroupsRef = collection(db, 'users', userId, 'followedGroups');
    const followedGroupsSnapshot = await getDocs(followedGroupsRef);
    console.log(`📊 Followed groups subcollection documents: ${followedGroupsSnapshot.size}`);
    followedGroupsSnapshot.forEach(doc => {
      console.log(`   - Document ID: ${doc.id}`);
      console.log(`   - Data:`, doc.data());
    });
    
    // Check followedOrganizations subcollection
    const followedOrgsRef = collection(db, 'users', userId, 'followedOrganizations');
    const followedOrgsSnapshot = await getDocs(followedOrgsRef);
    console.log(`📊 Followed organizations subcollection documents: ${followedOrgsSnapshot.size}`);
    followedOrgsSnapshot.forEach(doc => {
      console.log(`   - Document ID: ${doc.id}`);
      console.log(`   - Data:`, doc.data());
    });

  } catch (error) {
    console.error('❌ Error checking user groups:', error);
  }
}

// Run the check
checkUserGroups().then(() => {
  console.log('✅ Check completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});

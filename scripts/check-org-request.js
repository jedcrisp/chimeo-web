// Script to check organization requests and user accounts for acrisp@velocity-pt.com
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'

// Firebase configuration
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
const auth = getAuth(app)

const targetEmail = 'acrisp@velocity-pt.com'

async function checkOrganizationRequest() {
  try {
    console.log('🔍 Checking organization requests and user accounts...')
    console.log(`📧 Target email: ${targetEmail}`)
    
    // Check organization requests
    console.log('\n📋 Checking organization requests...')
    const requestsSnapshot = await getDocs(collection(db, 'organizationRequests'))
    
    let foundRequest = null
    for (const doc of requestsSnapshot.docs) {
      const data = doc.data()
      if (data.adminEmail === targetEmail) {
        foundRequest = { id: doc.id, ...data }
        break
      }
    }
    
    if (foundRequest) {
      console.log('✅ Found organization request:')
      console.log(`   ID: ${foundRequest.id}`)
      console.log(`   Organization: ${foundRequest.organizationName}`)
      console.log(`   Admin: ${foundRequest.adminFirstName} ${foundRequest.adminLastName}`)
      console.log(`   Email: ${foundRequest.adminEmail}`)
      console.log(`   Status: ${foundRequest.status}`)
      console.log(`   Admin Account Created: ${foundRequest.adminAccountCreated || false}`)
      console.log(`   Organization Created: ${foundRequest.organizationCreated || false}`)
      console.log(`   Created User ID: ${foundRequest.createdUserId || 'Not set'}`)
      console.log(`   Created Organization ID: ${foundRequest.createdOrganizationId || 'Not set'}`)
      console.log(`   Created At: ${foundRequest.createdAt?.toDate?.()?.toLocaleString() || 'Unknown'}`)
      console.log(`   Updated At: ${foundRequest.updatedAt?.toDate?.()?.toLocaleString() || 'Unknown'}`)
      
      if (foundRequest.adminMessage) {
        console.log(`   Admin Message: ${foundRequest.adminMessage}`)
      }
    } else {
      console.log('❌ No organization request found for this email')
    }
    
    // Check if user exists in Firebase Auth
    console.log('\n🔐 Checking Firebase Auth...')
    try {
      // Try to sign in with a dummy password to check if account exists
      await signInWithEmailAndPassword(auth, targetEmail, 'dummy-password')
      console.log('⚠️ Account exists but password is different')
    } catch (authError) {
      if (authError.code === 'auth/user-not-found') {
        console.log('❌ User account does not exist in Firebase Auth')
      } else if (authError.code === 'auth/wrong-password') {
        console.log('✅ User account exists in Firebase Auth (password is different)')
      } else {
        console.log(`⚠️ Auth check error: ${authError.message}`)
      }
    }
    
    // Check user profile in Firestore
    console.log('\n👤 Checking user profiles in Firestore...')
    const usersSnapshot = await getDocs(collection(db, 'users'))
    
    let foundUser = null
    for (const doc of usersSnapshot.docs) {
      const data = doc.data()
      if (data.email === targetEmail) {
        foundUser = { id: doc.id, ...data }
        break
      }
    }
    
    if (foundUser) {
      console.log('✅ Found user profile:')
      console.log(`   User ID: ${foundUser.id}`)
      console.log(`   Email: ${foundUser.email}`)
      console.log(`   Display Name: ${foundUser.displayName}`)
      console.log(`   Organization ID: ${foundUser.organizationId || 'Not set'}`)
      console.log(`   Is Organization Admin: ${foundUser.isOrganizationAdmin || false}`)
      console.log(`   Created At: ${foundUser.createdAt?.toDate?.()?.toLocaleString() || 'Unknown'}`)
    } else {
      console.log('❌ No user profile found in Firestore')
    }
    
    // Check organizations
    console.log('\n🏢 Checking organizations...')
    const orgsSnapshot = await getDocs(collection(db, 'organizations'))
    
    let foundOrg = null
    for (const doc of orgsSnapshot.docs) {
      const data = doc.data()
      if (data.adminEmail === targetEmail || data.email === targetEmail) {
        foundOrg = { id: doc.id, ...data }
        break
      }
    }
    
    if (foundOrg) {
      console.log('✅ Found organization:')
      console.log(`   Organization ID: ${foundOrg.id}`)
      console.log(`   Name: ${foundOrg.name}`)
      console.log(`   Admin Email: ${foundOrg.adminEmail}`)
      console.log(`   Admin ID: ${foundOrg.adminId || 'Not set'}`)
      console.log(`   Status: ${foundOrg.status || 'Unknown'}`)
      console.log(`   Verified: ${foundOrg.verified || false}`)
      console.log(`   Created At: ${foundOrg.createdAt?.toDate?.()?.toLocaleString() || 'Unknown'}`)
    } else {
      console.log('❌ No organization found for this email')
    }
    
    // Summary
    console.log('\n📊 Summary:')
    console.log(`   Organization Request: ${foundRequest ? 'Found' : 'Not found'}`)
    console.log(`   Firebase Auth User: ${foundUser ? 'Found' : 'Not found'}`)
    console.log(`   Firestore User Profile: ${foundUser ? 'Found' : 'Not found'}`)
    console.log(`   Organization: ${foundOrg ? 'Found' : 'Not found'}`)
    
    if (foundRequest && foundRequest.status === 'approved') {
      if (!foundUser) {
        console.log('\n🚨 ISSUE IDENTIFIED: Organization request was approved but user account was not created!')
        console.log('   This suggests the createAdminUserAccount function failed during approval.')
      } else if (!foundOrg) {
        console.log('\n🚨 ISSUE IDENTIFIED: User account was created but organization was not created!')
      } else {
        console.log('\n✅ Everything appears to be set up correctly!')
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking organization request:', error)
  }
}

// Run the check
checkOrganizationRequest()

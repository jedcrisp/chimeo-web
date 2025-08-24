import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getMessaging } from 'firebase/messaging'

// Firebase config from Firebase Console web app
const firebaseConfig = {
  apiKey: "AIzaSyA96jGLzCUMVe9FHHS1lQ8vdbi8DFhAs6o",
  authDomain: "chimeo-96dfc.firebaseapp.com",
  databaseURL: "https://chimeo-96dfc-default-rtdb.firebaseio.com",
  projectId: "chimeo-96dfc",
  storageBucket: "chimeo-96dfc.firebasestorage.app",
  messagingSenderId: "280448574070",
  appId: "1:280448574070:web:9cb5298f2f0b10770a7557",
  measurementId: "G-GCSQ5KSTF0"
}

// Initialize Firebase
console.log('🔧 Firebase: Initializing app...')
const app = initializeApp(firebaseConfig)
console.log('✅ Firebase: App initialized successfully')

// Initialize Firebase services
console.log('🔧 Firebase: Initializing auth...')
export const auth = getAuth(app)
console.log('✅ Firebase: Auth initialized successfully')
console.log('🔧 Firebase: Auth object:', auth)
console.log('🔧 Firebase: Auth app:', auth.app)

console.log('🔧 Firebase: Initializing firestore...')
export const db = getFirestore(app)
console.log('✅ Firebase: Firestore initialized successfully')

// Lazy messaging initialization
let messaging = null
let messagingInitialized = false

// Function to get messaging instance (lazy initialization)
export const getMessagingInstance = async () => {
  console.log('🔧 getMessagingInstance: Starting...')
  
  // If messaging is already initialized, return it
  if (messagingInitialized && messaging) {
    console.log('✅ getMessagingInstance: Returning existing messaging instance')
    return messaging
  }
  
  // Initialize messaging if not already done
  if (!messagingInitialized) {
    console.log('🔧 getMessagingInstance: Initializing messaging...')
    
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined') {
        console.log('❌ getMessagingInstance: Not in browser environment')
        return null
      }
      
      // Create messaging instance
      console.log('🔧 getMessagingInstance: Creating messaging instance...')
      messaging = getMessaging(app)
      messagingInitialized = true
      console.log('✅ getMessagingInstance: Messaging initialized successfully')
      
    } catch (error) {
      console.log('❌ getMessagingInstance: Error initializing messaging:', error)
      messagingInitialized = false
      return null
    }
  }
  
  return messaging
}

export { messaging }
export default app

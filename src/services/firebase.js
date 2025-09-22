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

// VAPID key for push notifications
export const VAPID_KEY = "BKj330egH_Do8wrOuLBqR8QqN00tMzJOTxU2XgqpPw2iH8cIvl-m73gYlkDMOwUiyCzr1puqZ_Gza8uEI3uxh9Q"

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

// Lazy messaging initialization with refresh handling
let messaging = null
let messagingInitialized = false
let initializationPromise = null

// Function to get messaging instance (lazy initialization with refresh handling)
export const getMessagingInstance = async () => {
  console.log('🔧 getMessagingInstance: Starting...')
  console.log('🔧 getMessagingInstance: Current state - messaging:', !!messaging, 'initialized:', messagingInitialized)
  
  // If messaging is already initialized and valid, return it
  if (messagingInitialized && messaging) {
    console.log('✅ getMessagingInstance: Returning existing messaging instance')
    return messaging
  }
  
  // If there's already an initialization in progress, wait for it
  if (initializationPromise) {
    console.log('🔧 getMessagingInstance: Waiting for existing initialization...')
    return await initializationPromise
  }
  
  // Initialize messaging if not already done
  if (!messagingInitialized) {
    console.log('🔧 getMessagingInstance: Initializing messaging...')
    
    initializationPromise = (async () => {
      try {
        // Reset state to handle page refreshes
        messaging = null
        messagingInitialized = false
        
        // Check if we're in a browser environment
        if (typeof window === 'undefined') {
          console.log('❌ getMessagingInstance: Not in browser environment')
          return null
        }
        
        // Check if messaging is supported
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
          console.log('❌ getMessagingInstance: Push messaging not supported')
          return null
        }
        
        // Check if we're in a secure context (required for messaging)
        if (!window.isSecureContext) {
          console.log('❌ getMessagingInstance: Not in secure context (HTTPS required)')
          return null
        }

        // Check if we're on localhost (allowed for development)
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        if (!isLocalhost && !window.isSecureContext) {
          console.log('❌ getMessagingInstance: HTTPS required for production')
          return null
        }
        
        // Wait a bit for the page to fully load after refresh
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Create messaging instance
        console.log('🔧 getMessagingInstance: Creating messaging instance...')
        console.log('🔧 getMessagingInstance: Firebase app:', app)
        console.log('🔧 getMessagingInstance: Firebase app name:', app?.name)
        console.log('🔧 getMessagingInstance: Firebase app options:', app?.options)
        console.log('🔧 getMessagingInstance: Firebase config:', firebaseConfig)
        
        // Check if app is properly initialized
        if (!app || !app.name) {
          console.log('❌ getMessagingInstance: Firebase app not properly initialized')
          return null
        }
        
        // Check if messaging is available in the current context
        if (typeof getMessaging !== 'function') {
          console.log('❌ getMessagingInstance: getMessaging function not available')
          console.log('🔍 getMessaging type:', typeof getMessaging)
          console.log('🔍 getMessaging value:', getMessaging)
          return null
        }
        
        console.log('🔧 getMessagingInstance: Creating messaging instance with app:', app)
        messaging = getMessaging(app)
        
        // Validate the messaging instance
        console.log('🔧 getMessagingInstance: Validating messaging instance...')
        console.log('🔧 getMessagingInstance: Messaging type:', typeof messaging)
        console.log('🔧 getMessagingInstance: Messaging constructor:', messaging?.constructor?.name)
        console.log('🔧 getMessagingInstance: Has getToken method:', typeof messaging?.getToken)
        console.log('🔧 getMessagingInstance: Has onMessage method:', typeof messaging?.onMessage)
        
        if (!messaging || typeof messaging.getToken !== 'function') {
          console.log('❌ getMessagingInstance: Invalid messaging instance created')
          messagingInitialized = false
          return null
        }
        
        messagingInitialized = true
        console.log('✅ getMessagingInstance: Messaging initialized successfully')
        console.log('🔧 getMessagingInstance: Messaging object:', messaging)
        
        return messaging
        
      } catch (error) {
        console.log('❌ getMessagingInstance: Error initializing messaging:', error)
        console.log('❌ getMessagingInstance: Error details:', error.message)
        console.log('❌ getMessagingInstance: Error stack:', error.stack)
        messagingInitialized = false
        messaging = null
        return null
      } finally {
        // Clear the promise so future calls can initialize again
        initializationPromise = null
      }
    })()
    
    return await initializationPromise
  }
  
  return messaging
}

export { messaging }
export default app

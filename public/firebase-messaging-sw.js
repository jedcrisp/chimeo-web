// Firebase messaging service worker for push notifications
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js')

// Firebase configuration
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
firebase.initializeApp(firebaseConfig)

// Initialize Firebase Messaging
const messaging = firebase.messaging()

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('📱 Received background message:', payload)

  const notificationTitle = payload.notification?.title || 'New Alert'
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new emergency alert',
    icon: '/logo192.png',
    badge: '/logo192.png',
    tag: 'alert-notification',
    requireInteraction: true,
    actions: [
      {
        action: 'view',
        title: 'View Alert'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ],
    data: payload.data
  }

  // Show the notification
  return self.registration.showNotification(notificationTitle, notificationOptions)
})

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notification clicked:', event)

  event.notification.close()

  if (event.action === 'view') {
    // Open the app when notification is clicked
    event.waitUntil(
      clients.openWindow('/')
    )
  }
})

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('🔔 Notification closed:', event)
})

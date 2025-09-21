import { getToken, onMessage, isSupported } from 'firebase/messaging'
import { doc, addDoc, collection, serverTimestamp, setDoc } from 'firebase/firestore'
import { db, getMessagingInstance, VAPID_KEY } from './firebase'
import toast from 'react-hot-toast'

class NotificationService {
  constructor() {
    this.messaging = null
    this.currentToken = null
    this.isSupported = false
    this.initialized = false
  }

  // Initialize FCM messaging
  async initialize() {
    try {
      console.log('🔧 Starting notification service initialization...')
      console.log('🔧 Current user agent:', navigator.userAgent)
      console.log('🔧 Current URL:', window.location.href)
      console.log('🔧 Is secure context:', window.isSecureContext)
      
      // Check if FCM is supported
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.log('❌ Push notifications not supported in this browser')
        this.initialized = true // Mark as initialized but not supported
        return false
      }

      // Check if Firebase messaging is available
      if (!getToken || !onMessage) {
        console.log('❌ Firebase messaging not available')
        this.initialized = true // Mark as initialized but not supported
        return false
      }

      // Check service worker registration
      console.log('🔧 Checking service worker registration...')
      try {
        const registration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js')
        if (registration) {
          console.log('✅ Service worker is registered:', registration)
        } else {
          console.log('⚠️ Service worker not found, trying to register...')
          try {
            const newRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
            console.log('✅ Service worker registered successfully:', newRegistration)
          } catch (swError) {
            console.log('❌ Failed to register service worker:', swError)
            this.initialized = true // Mark as initialized but not supported
            return false
          }
        }
      } catch (error) {
        console.log('⚠️ Could not check service worker registration:', error)
        this.initialized = true // Mark as initialized but not supported
        return false
      }

      // Get the messaging instance first
      console.log('🔧 Getting messaging instance...')
      this.messaging = await getMessagingInstance()
      
      if (!this.messaging) {
        console.log('❌ Failed to get messaging instance - messaging may not be supported in this environment')
        console.log('🔍 This could be due to:')
        console.log('  - Not running on HTTPS (required for production)')
        console.log('  - Browser not supporting push notifications')
        console.log('  - Firebase messaging service not available')
        console.log('  - Firebase Messaging not enabled in Firebase Console')
        this.initialized = true // Mark as initialized but not supported
        return false
      }
      console.log('✅ Got messaging instance')

      // Now check if messaging is supported in this environment
      console.log('🔍 Checking if messaging is supported...')
      try {
        const messagingSupported = await isSupported()
        if (!messagingSupported) {
          console.log('❌ Firebase messaging not supported in this environment')
          this.initialized = true // Mark as initialized but not supported
          return false
        }
        console.log('✅ Messaging is supported')
      } catch (error) {
        console.log('⚠️ Could not check messaging support, continuing anyway:', error)
      }

      this.isSupported = true
      this.initialized = true

      // Request permission
      console.log('🔧 Requesting notification permission...')
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        console.log('✅ Notification permission granted')
        await this.getToken()
        this.setupMessageListener()
        return true
      } else {
        console.log('❌ Notification permission denied')
        return false
      }
    } catch (error) {
      console.error('❌ Error initializing notifications:', error)
      this.initialized = true // Mark as initialized but not supported
      return false
    }
  }

  // Get FCM token
  async getToken() {
    try {
      if (!this.messaging) {
        console.log('❌ Messaging not initialized')
        return null
      }

      console.log('🔧 Getting FCM token...')
      console.log('🔧 Using VAPID key:', VAPID_KEY)
      // Get the registration token
      this.currentToken = await getToken(this.messaging, {
        vapidKey: VAPID_KEY
      })

      if (this.currentToken) {
        console.log('✅ FCM Token:', this.currentToken)
        
        // Save token to user's profile in Firestore
        await this.saveTokenToUser(this.currentToken)
        
        return this.currentToken
      } else {
        console.log('❌ No registration token available')
        return null
      }
    } catch (error) {
      console.error('❌ Error getting FCM token:', error)
      return null
    }
  }

  // Save FCM token to user's profile
  async saveTokenToUser(token) {
    try {
      // Get current user from auth
      const { getAuth } = await import('firebase/auth')
      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore')
      const { db } = await import('./firebase')
      
      const auth = getAuth()
      const currentUser = auth.currentUser
      
      if (!currentUser) {
        console.log('❌ No authenticated user to save FCM token')
        return
      }
      
      console.log('💾 Saving FCM token to user profile:', token)
      console.log('💾 User ID:', currentUser.uid)
      
      // Update user document with FCM token
      const userRef = doc(db, 'users', currentUser.uid)
      await updateDoc(userRef, {
        fcmToken: token,
        fcmTokenUpdatedAt: serverTimestamp()
      })
      
      console.log('✅ FCM token saved to user profile successfully')
    } catch (error) {
      console.error('❌ Error saving FCM token:', error)
    }
  }

  // Setup message listener for foreground notifications
  setupMessageListener() {
    if (!this.messaging) return

    onMessage(this.messaging, (payload) => {
      console.log('📱 Message received in foreground:', payload)
      
      // Show notification even when app is in foreground
      this.showLocalNotification(payload)
    })
  }

  // Show local notification with proper permission handling
  async showLocalNotification(payload) {
    const { title, body, icon } = payload.notification || {}
    
    try {
      // Check if notifications are supported
      if (!('Notification' in window)) {
        console.log('⚠️ This browser does not support notifications')
        return
      }

      // Check if we have permission
      if (Notification.permission === 'default') {
        // Request permission if not granted yet
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
          console.log('⚠️ Notification permission denied')
          return
        }
      } else if (Notification.permission !== 'granted') {
        console.log('⚠️ Notification permission not granted')
        return
      }

      // Now show the notification
      if ('serviceWorker' in navigator && 'showNotification' in ServiceWorkerRegistration.prototype) {
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification(title || 'New Alert', {
            body: body || 'You have a new emergency alert',
            icon: icon || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBmaWxsPSIjMzM2N0Y3Ii8+Cjwvc3ZnPgo=',
            badge: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBmaWxsPSIjMzM2N0Y3Ii8+Cjwvc3ZnPgo=',
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
            ]
          })
        })
      } else {
        // Fallback to native notifications if service worker not available
        new Notification(title || 'New Alert', {
          body: body || 'You have a new emergency alert',
          icon: icon || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTkyIiBoZWlnaHQ9IjE5MiIgdmlld0JveD0iMCAwIDE5MiAxOTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxOTIiIGhlaWdodD0iMTkyIiByeD0iMjQiIGZpbGw9IiM2MzY2RjEiLz4KPHRleHQgeD0iOTYiIHk9IjExMCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjI0IiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkM8L3RleHQ+Cjwvc3ZnPgo='
        })
      }
    } catch (error) {
      console.error('❌ Error showing notification:', error)
    }
  }

  // Send notification to platform admin when organization request is submitted
  async sendOrganizationRequestNotification(requestData) {
    try {
      console.log('🔔 sendOrganizationRequestNotification: Starting notification process for request:', requestData.organizationName)
      
      // Create a notification record in Firestore
      const notificationData = {
        type: 'organization_request_submitted',
        title: 'New Organization Request',
        message: `${requestData.organizationName} has submitted a request to create an organization`,
        organizationName: requestData.organizationName,
        adminName: `${requestData.adminFirstName} ${requestData.adminLastName}`,
        adminEmail: requestData.adminEmail,
        requestId: requestData.id || 'pending',
        createdAt: serverTimestamp(),
        sent: true,
        targetUser: 'jed@onetrack-consulting.com' // Only notify platform admin
      }

      // Add to notifications collection under the target user's email
      const sanitizedEmail = 'jed@onetrack-consulting.com'.replace(/[^a-zA-Z0-9]/g, '_')
      const notificationId = `org_request_${Date.now()}`
      const notificationPath = `notifications/${sanitizedEmail}/user_notifications/${notificationId}`
      console.log('🔍 Saving notification to path:', notificationPath)
      console.log('🔍 Notification data:', notificationData)
      
      await setDoc(doc(db, 'notifications', sanitizedEmail, 'user_notifications', notificationId), notificationData)
      console.log('✅ Organization request notification record saved to Firestore under user email')

      // Check if notification service is initialized and messaging is available
      console.log('🔍 Notification service status:', {
        initialized: this.initialized,
        messaging: !!this.messaging,
        isSupported: this.isSupported
      })
      
      if (this.initialized && this.messaging) {
        console.log('🔔 Notification service is initialized, showing local notification')
        // Show a local notification using the messaging service
        await this.showLocalNotification({
          notification: {
            title: 'New Organization Request',
            body: `${requestData.organizationName} - ${requestData.adminFirstName} ${requestData.adminLastName}`,
            icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTkyIiBoZWlnaHQ9IjE5MiIgdmlld0JveD0iMCAwIDE5MiAxOTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxOTIiIGhlaWdodD0iMTkyIiByeD0iMjQiIGZpbGw9IiM2MzY2RjEiLz4KPHRleHQgeD0iOTYiIHk9IjExMCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjI0IiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkM8L3RleHQ+Cjwvc3ZnPgo='
          }
        })
        console.log('✅ Local notification shown successfully')
      } else {
        console.log('⚠️ Notification service not initialized, showing fallback notification')
        
        // Fallback: Show a simple browser notification if available
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('New Organization Request', {
            body: `${requestData.organizationName} - ${requestData.adminFirstName} ${requestData.adminLastName}`,
            icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTkyIiBoZWlnaHQ9IjE5MiIgdmlld0JveD0iMCAwIDE5MiAxOTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxOTIiIGhlaWdodD0iMTkyIiByeD0iMjQiIGZpbGw9IiM2MzY2RjEiLz4KPHRleHQgeD0iOTYiIHk9IjExMCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjI0IiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkM8L3RleHQ+Cjwvc3ZnPgo='
          })
          console.log('✅ Fallback notification shown')
        } else {
          console.log('⚠️ Browser notifications not available, skipping notification display')
        }
      }

      console.log('✅ Organization request notification sent successfully')
      
    } catch (error) {
      console.error('❌ Error sending organization request notification:', error)
    }
  }

  // Send notification to platform admin when alert is created
  async sendAlertNotification(alertData) {
    try {
      console.log('🔔 sendAlertNotification: Starting notification process for alert:', alertData.title)
      console.log('🔔 sendAlertNotification: Full alert data received:', alertData)
      
      // Create a notification record in Firestore
      const notificationData = {
        type: 'alert_created',
        title: alertData.title,
        message: alertData.message,
        alertId: alertData.id,
        organizationId: alertData.organizationId,
        createdAt: serverTimestamp(),
        sent: true,
        targetUser: 'jed@onetrack-consulting.com' // Only notify platform admin
      }

      // Add to notifications collection under the target user's email
      const sanitizedEmail = 'jed@onetrack-consulting.com'.replace(/[^a-zA-Z0-9]/g, '_')
      const notificationId = `alert_${Date.now()}`
      await setDoc(doc(db, 'notifications', sanitizedEmail, 'user_notifications', notificationId), notificationData)
      console.log('✅ Alert notification record saved to Firestore under user email')

      // Check if notification service is initialized and messaging is available
      console.log('🔍 Notification service status:', {
        initialized: this.initialized,
        messaging: !!this.messaging,
        isSupported: this.isSupported
      })
      
      if (this.initialized && this.messaging) {
        console.log('🔔 Notification service is initialized, showing local notification')
        // Show a local notification using the messaging service
        await this.showLocalNotification({
          notification: {
            title: 'New Alert Created',
            body: `${alertData.title}: ${alertData.message}`,
            icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTkyIiBoZWlnaHQ9IjE5MiIgdmlld0JveD0iMCAwIDE5MiAxOTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxOTIiIGhlaWdodD0iMTkyIiByeD0iMjQiIGZpbGw9IiM2MzY2RjEiLz4KPHRleHQgeD0iOTYiIHk9IjExMCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjI0IiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkM8L3RleHQ+Cjwvc3ZnPgo='
          }
        })
        console.log('✅ Local notification shown successfully')
      } else {
        console.log('⚠️ Notification service not initialized, showing fallback notification')
        console.log('🔍 Fallback notification status:', {
          hasNotification: 'Notification' in window,
          permission: Notification.permission
        })
        
        // Fallback: Show a simple browser notification if available
        if ('Notification' in window) {
          if (Notification.permission === 'granted') {
            new Notification('New Alert Created', {
              body: `${alertData.title}: ${alertData.message}`,
              icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTkyIiBoZWlnaHQ9IjE5MiIgdmlld0JveD0iMCAwIDE5MiAxOTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxOTIiIGhlaWdodD0iMTkyIiByeD0iMjQiIGZpbGw9IiM2MzY2RjEiLz4KPHRleHQgeD0iOTYiIHk9IjExMCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjI0IiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkM8L3RleHQ+Cjwvc3ZnPgo='
            })
            console.log('✅ Fallback notification shown')
          } else if (Notification.permission === 'default') {
            // Request permission if not granted yet
            const permission = await Notification.requestPermission()
            if (permission === 'granted') {
              new Notification('New Alert Created', {
                body: `${alertData.title}: ${alertData.message}`,
                icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTkyIiBoZWlnaHQ9IjE5MiIgdmlld0JveD0iMCAwIDE5MiAxOTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxOTIiIGhlaWdodD0iMTkyIiByeD0iMjQiIGZpbGw9IiM2MzY2RjEiLz4KPHRleHQgeD0iOTYiIHk9IjExMCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjI0IiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkM8L3RleHQ+Cjwvc3ZnPgo='
              })
              console.log('✅ Fallback notification shown after permission granted')
            } else {
              console.log('⚠️ Notification permission denied, skipping notification display')
            }
          } else {
            console.log('⚠️ Notification permission denied, skipping notification display')
          }
        } else {
          console.log('⚠️ Browser notifications not available, skipping notification display')
        }
      }

      console.log('✅ Alert notification sent successfully')
      toast.success('Alert posted and notifications sent!')
      
    } catch (error) {
      console.error('❌ Error sending alert notification:', error)
      toast.error('Alert posted but notification failed')
    }
  }

  // Simple fallback notification method that doesn't require Firebase Messaging
  async showSimpleNotification(title, body, icon = null) {
    try {
      console.log('🔔 showSimpleNotification: Attempting to show notification:', { title, body })
      
      if (!('Notification' in window)) {
        console.log('❌ Browser notifications not supported')
        return false
      }

      if (Notification.permission === 'granted') {
        const notification = new Notification(title, {
          body: body,
          icon: icon || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTkyIiBoZWlnaHQ9IjE5MiIgdmlld0JveD0iMCAwIDE5MiAxOTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxOTIiIGhlaWdodD0iMTkyIiByeD0iMjQiIGZpbGw9IiM2MzY2RjEiLz4KPHRleHQgeD0iOTYiIHk9IjExMCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjI0IiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkM8L3RleHQ+Cjwvc3ZnPgo='
        })
        console.log('✅ Simple notification shown successfully')
        return true
      } else if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission()
        if (permission === 'granted') {
          const notification = new Notification(title, {
            body: body,
            icon: icon || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTkyIiBoZWlnaHQ9IjE5MiIgdmlld0JveD0iMCAwIDE5MiAxOTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxOTIiIGhlaWdodD0iMTkyIiByeD0iMjQiIGZpbGw9IiM2MzY2RjEiLz4KPHRleHQgeD0iOTYiIHk9IjExMCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjI0IiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkM8L3RleHQ+Cjwvc3ZnPgo='
          })
          console.log('✅ Simple notification shown after permission granted')
          return true
        } else {
          console.log('❌ Notification permission denied')
          return false
        }
      } else {
        console.log('❌ Notification permission denied')
        return false
      }
    } catch (error) {
      console.error('❌ Error showing simple notification:', error)
      return false
    }
  }

  // Trigger cloud function to send push notifications (commented out for now)
  // async triggerCloudFunction(alertData) {
  //   try {
  //     // This will call your Firebase Cloud Function
  //     // The function will send push notifications to all subscribed users
  //     const response = await fetch('/api/sendAlertNotifications', {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify(alertData)
  //     })

  //     if (!response.ok) {
  //       throw new Error('Failed to trigger notification service')
  //     }

  //     return await response.json()
  //   } catch (error) {
  //     console.error('❌ Error triggering cloud function:', error)
  //     throw error
  //   }
  // }

  // Get current token
  getCurrentToken() {
    return this.currentToken
  }

  // Check if notifications are supported
  isNotificationsSupported() {
    return this.isSupported
  }

  // Check if service is initialized
  isInitialized() {
    return this.initialized
  }
}

// Create singleton instance
const notificationService = new NotificationService()
export default notificationService

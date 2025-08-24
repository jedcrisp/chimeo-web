import { getToken, onMessage, isSupported } from 'firebase/messaging'
import { doc, addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db, getMessagingInstance } from './firebase'
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
      
      // Check if FCM is supported
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.log('❌ Push notifications not supported in this browser')
        return false
      }

      // Check if Firebase messaging is available
      if (!getToken || !onMessage) {
        console.log('❌ Firebase messaging not available')
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
          }
        }
      } catch (error) {
        console.log('⚠️ Could not check service worker registration:', error)
      }

      // Get the messaging instance first
      console.log('🔧 Getting messaging instance...')
      this.messaging = await getMessagingInstance()
      
      if (!this.messaging) {
        console.log('❌ Failed to get messaging instance')
        return false
      }
      console.log('✅ Got messaging instance')

      // Now check if messaging is supported in this environment
      console.log('🔍 Checking if messaging is supported...')
      try {
        const messagingSupported = await isSupported()
        if (!messagingSupported) {
          console.log('❌ Firebase messaging not supported in this environment')
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
      // Get the registration token
      this.currentToken = await getToken(this.messaging, {
        vapidKey: 'BKj330egH_Do8wrOuLBqR8QqN00tMzJOTxU2XgqpPw2iH8cIvl-m73gYlkDMOwUiyCzr1puqZ_Gza8uEI3uxh9Q'
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
      // This will be called when user is authenticated
      // You'll need to implement this based on your user structure
      console.log('💾 Saving FCM token to user profile:', token)
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
            icon: icon || '/bell-icon.png',
            badge: '/badge-icon.png',
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
          icon: icon || '/bell-icon.png'
        })
      }
    } catch (error) {
      console.error('❌ Error showing notification:', error)
    }
  }

  // Send notification to all users when alert is created
  async sendAlertNotification(alertData) {
    try {
      // Create a notification record in Firestore
      const notificationData = {
        type: 'alert_created',
        title: alertData.title,
        message: alertData.message,
        alertId: alertData.id,
        organizationId: alertData.organizationId,
        createdAt: serverTimestamp(),
        sent: true
      }

      // Add to notifications collection
      await addDoc(collection(db, 'notifications'), notificationData)

      // For now, just show a local notification instead of calling cloud function
      // TODO: Implement Firebase Cloud Function for push notifications later
      await this.showLocalNotification({
        notification: {
          title: 'New Alert Created',
          body: `${alertData.title}: ${alertData.message}`,
          icon: '/bell-icon.png'
        }
      })

      console.log('✅ Alert notification sent successfully')
      toast.success('Alert posted and notifications sent!')
      
    } catch (error) {
      console.error('❌ Error sending alert notification:', error)
      toast.error('Alert posted but notification failed')
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

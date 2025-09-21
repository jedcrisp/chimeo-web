import { useState, useEffect } from 'react'
import notificationService from '../services/notificationService'

export default function NotificationDebug() {
  const [status, setStatus] = useState('Checking...')
  const [logs, setLogs] = useState([])
  const [fcmToken, setFcmToken] = useState(null)
  const [permission, setPermission] = useState('unknown')

  useEffect(() => {
    checkNotificationStatus()
  }, [])

  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, `${timestamp}: ${message}`])
  }

  const checkNotificationStatus = async () => {
    addLog('🔍 Checking notification status...')
    
    // Check basic support
    if (!('Notification' in window)) {
      setStatus('Not supported')
      addLog('❌ Notifications not supported in this browser')
      return
    }

    // Check permission
    const currentPermission = Notification.permission
    setPermission(currentPermission)
    addLog(`📱 Current permission: ${currentPermission}`)

    // Check notification service
    const isInitialized = notificationService.isInitialized()
    const isSupported = notificationService.isNotificationsSupported()
    const currentToken = notificationService.getCurrentToken()

    addLog(`🔧 Service initialized: ${isInitialized}`)
    addLog(`🔧 Service supported: ${isSupported}`)
    addLog(`🔧 Current token: ${currentToken ? 'Present' : 'Missing'}`)

    if (currentToken) {
      setFcmToken(currentToken)
    }

    // Check HTTPS
    if (window.isSecureContext) {
      addLog('✅ Running in secure context (HTTPS)')
    } else {
      addLog('❌ Not in secure context - HTTPS required for push notifications')
    }

    // Check service worker
    try {
      const registration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js')
      if (registration) {
        addLog('✅ Service worker registered')
      } else {
        addLog('⚠️ Service worker not found')
      }
    } catch (error) {
      addLog('❌ Service worker check failed: ' + error.message)
    }

    // Overall status
    if (isInitialized && isSupported && currentPermission === 'granted') {
      setStatus('Working')
      addLog('🎉 Push notifications should be working!')
    } else if (currentPermission === 'denied') {
      setStatus('Permission denied')
      addLog('❌ Notification permission denied')
    } else if (currentPermission === 'default') {
      setStatus('Permission not requested')
      addLog('⚠️ Notification permission not yet requested')
    } else {
      setStatus('Not working')
      addLog('❌ Push notifications not working')
    }
  }

  const requestPermission = async () => {
    addLog('🔔 Requesting notification permission...')
    
    try {
      const newPermission = await Notification.requestPermission()
      setPermission(newPermission)
      addLog(`📱 Permission result: ${newPermission}`)
      
      if (newPermission === 'granted') {
        addLog('✅ Permission granted! Re-initializing notification service...')
        await notificationService.initialize()
        checkNotificationStatus()
      } else {
        addLog('❌ Permission denied')
      }
    } catch (error) {
      addLog('❌ Permission request failed: ' + error.message)
    }
  }

  const testNotification = () => {
    addLog('🔔 Testing local notification...')
    
    try {
      const notification = new Notification('Test Notification', {
        body: 'This is a test notification from Chimeo',
        icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTkyIiBoZWlnaHQ9IjE5MiIgdmlld0JveD0iMCAwIDE5MiAxOTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxOTIiIGhlaWdodD0iMTkyIiByeD0iMjQiIGZpbGw9IiM2MzY2RjEiLz4KPHRleHQgeD0iOTYiIHk9IjExMCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjI0IiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkM8L3RleHQ+Cjwvc3ZnPgo=',
        tag: 'test-notification'
      })
      
      addLog('✅ Test notification created')
      
      notification.onclick = () => {
        addLog('🔔 Test notification clicked')
        notification.close()
      }
      
    } catch (error) {
      addLog('❌ Test notification failed: ' + error.message)
    }
  }

  const testFCMToken = async () => {
    addLog('🔧 Testing FCM token generation...')
    
    // Check notification service status first
    addLog('🔧 Service status:')
    addLog('  - Initialized: ' + notificationService.isInitialized())
    addLog('  - Supported: ' + notificationService.isNotificationsSupported())
    addLog('  - Current token: ' + (notificationService.getCurrentToken() || 'None'))
    
    try {
      addLog('🔧 Calling notificationService.getToken()...')
      const token = await notificationService.getToken()
      addLog('🔧 getToken() returned: ' + (token || 'null'))
      
      if (token) {
        addLog('✅ FCM token generated: ' + token.substring(0, 50) + '...')
        setFcmToken(token)
      } else {
        addLog('❌ FCM token generation failed - getToken() returned null')
        addLog('🔧 This usually means:')
        addLog('  - Messaging instance is not properly initialized')
        addLog('  - Service worker is not registered correctly')
        addLog('  - VAPID key is incorrect or missing')
        addLog('  - Firebase Cloud Messaging is not enabled')
      }
    } catch (error) {
      addLog('❌ FCM token error: ' + error.message)
      addLog('❌ Error details: ' + JSON.stringify(error))
    }
  }

  const testFirebaseMessaging = async () => {
    addLog('🔧 Testing Firebase Messaging directly...')
    
    try {
      // Import Firebase messaging functions
      const { getMessaging, getToken, isSupported } = await import('firebase/messaging')
      const { getMessagingInstance } = await import('../services/firebase')
      
      addLog('🔧 Firebase imports successful')
      addLog('  - getMessaging: ' + typeof getMessaging)
      addLog('  - getToken: ' + typeof getToken)
      addLog('  - isSupported: ' + typeof isSupported)
      
      // Test isSupported
      const supported = await isSupported()
      addLog('🔧 isSupported() result: ' + supported)
      
      // Test getMessagingInstance
      addLog('🔧 Testing getMessagingInstance...')
      const messaging = await getMessagingInstance()
      addLog('🔧 getMessagingInstance result: ' + (messaging ? 'Success' : 'Failed'))
      addLog('🔧 Messaging type: ' + typeof messaging)
      addLog('🔧 Messaging constructor: ' + (messaging?.constructor?.name || 'Unknown'))
      addLog('🔧 Has getToken method: ' + (typeof messaging?.getToken || 'No'))
      addLog('🔧 Has onMessage method: ' + (typeof messaging?.onMessage || 'No'))
      
      // Try creating messaging instance directly
      addLog('🔧 Testing direct getMessaging() call...')
      try {
        const { initializeApp } = await import('firebase/app')
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
        
        const testApp = initializeApp(firebaseConfig, 'test-app')
        addLog('🔧 Test app created: ' + testApp.name)
        
        const directMessaging = getMessaging(testApp)
        addLog('🔧 Direct messaging type: ' + typeof directMessaging)
        addLog('🔧 Direct messaging constructor: ' + (directMessaging?.constructor?.name || 'Unknown'))
        addLog('🔧 Direct messaging has getToken: ' + (typeof directMessaging?.getToken || 'No'))
        
      } catch (directError) {
        addLog('❌ Direct messaging creation failed: ' + directError.message)
      }
      
      if (messaging) {
        addLog('🔧 Testing getToken with messaging instance...')
        const { VAPID_KEY } = await import('../services/firebase')
        addLog('🔧 VAPID_KEY: ' + VAPID_KEY)
        
        try {
          const token = await getToken(messaging, { vapidKey: VAPID_KEY })
          addLog('🔧 Direct getToken result: ' + (token || 'null'))
          if (token) {
            addLog('✅ Direct FCM token generation successful!')
          } else {
            addLog('❌ Direct FCM token generation returned null')
          }
        } catch (tokenError) {
          addLog('❌ Direct getToken error: ' + tokenError.message)
          addLog('❌ Token error code: ' + tokenError.code)
        }
      }
      
    } catch (error) {
      addLog('❌ Firebase Messaging test error: ' + error.message)
    }
  }

  const clearLogs = () => {
    setLogs([])
  }

  const getStatusColor = () => {
    switch (status) {
      case 'Working': return 'text-green-600'
      case 'Permission denied': return 'text-red-600'
      case 'Permission not requested': return 'text-yellow-600'
      case 'Not working': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">Push Notification Debug</h3>
      
      <div className="mb-4">
        <div className="flex items-center space-x-4 mb-2">
          <span className="font-medium">Status:</span>
          <span className={`font-bold ${getStatusColor()}`}>{status}</span>
        </div>
        
        <div className="flex items-center space-x-4 mb-2">
          <span className="font-medium">Permission:</span>
          <span className="font-mono">{permission}</span>
        </div>
        
        {fcmToken && (
          <div className="mb-2">
            <span className="font-medium">FCM Token:</span>
            <div className="font-mono text-xs bg-gray-100 p-2 rounded mt-1 break-all">
              {fcmToken.substring(0, 50)}...
            </div>
          </div>
        )}
      </div>

      <div className="flex space-x-2 mb-4">
        <button
          onClick={requestPermission}
          disabled={permission === 'granted'}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Request Permission
        </button>
        
        <button
          onClick={testNotification}
          disabled={permission !== 'granted'}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Test Notification
        </button>
        
        <button
          onClick={testFCMToken}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
        >
          Test FCM Token
        </button>
        
        <button
          onClick={testFirebaseMessaging}
          className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
        >
          Test Firebase Messaging
        </button>
        
        <button
          onClick={checkNotificationStatus}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Refresh Status
        </button>
        
        <button
          onClick={clearLogs}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Clear Logs
        </button>
      </div>

      {logs.length > 0 && (
        <div className="bg-gray-100 p-4 rounded max-h-64 overflow-y-auto">
          <h4 className="font-medium mb-2">Debug Log:</h4>
          <div className="font-mono text-sm whitespace-pre-wrap">
            {logs.join('\n')}
          </div>
        </div>
      )}
    </div>
  )
}

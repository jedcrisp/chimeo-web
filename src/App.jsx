import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { OrganizationsProvider } from './contexts/OrganizationsContext'
import { AlertProvider } from './contexts/AlertContext'
import { CalendarProvider } from './contexts/CalendarContext'
import { SubscriptionProvider } from './contexts/SubscriptionContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Alerts from './pages/Alerts'
import Organizations from './pages/Organizations'
import Groups from './pages/Groups'
import Calendar from './pages/Calendar'
import Profile from './pages/Profile'
import OrganizationRequest from './pages/OrganizationRequest'
// New user pages
import MyAlerts from './pages/MyAlerts'
import AdminMyAlerts from './pages/AdminMyAlerts'
import MyGroups from './pages/MyGroups'
import DiscoverOrganizations from './pages/DiscoverOrganizations'
import MyProfile from './pages/MyProfile'
import Subscription from './pages/Subscription'
import OrganizationAnalytics from './pages/OrganizationAnalytics'
import PlatformCreator from './pages/PlatformCreator'
import ProtectedRoute from './components/ProtectedRoute'
import emailService from './services/emailService'
import notificationService from './services/notificationService'
import globalScheduledAlertProcessor from './services/globalScheduledAlertProcessor'

function App() {
  useEffect(() => {
    // Initialize email service when app starts
    const initEmailService = async () => {
      try {
        console.log('🚀 Initializing email service...')
        const success = await emailService.initialize()
        
        if (success) {
          console.log('✅ Email service initialized successfully')
        } else {
          console.log('⚠️ Email service not available - continuing without email notifications')
          console.log('💡 To enable email notifications:')
          console.log('  - Set up EmailJS account and configure service IDs')
          console.log('  - Update emailService.js with your EmailJS credentials')
        }
      } catch (error) {
        console.error('❌ Failed to initialize email service:', error)
        console.log('⚠️ App will continue without email notifications')
      }
    }

    // Initialize notification service when app starts
    const initNotificationService = async () => {
      try {
        console.log('🚀 Initializing notification service...')
        const success = await notificationService.initialize()
        
        if (success) {
          console.log('✅ Notification service initialized successfully')
          
          // Check notification health after a delay
          setTimeout(async () => {
            const isHealthy = await notificationService.checkNotificationHealth()
            if (!isHealthy) {
              console.log('⚠️ Notification service health check failed, attempting reinitialization...')
              await notificationService.reinitialize()
            }
          }, 5000)
        } else {
          console.log('⚠️ Notification service not available - continuing without push notifications')
          console.log('💡 To enable push notifications:')
          console.log('  - Ensure you are running on HTTPS (required for production)')
          console.log('  - Check that Firebase Cloud Messaging is enabled in Firebase Console')
          console.log('  - Verify service worker is properly registered')
        }
      } catch (error) {
        console.error('❌ Failed to initialize notification service:', error)
        console.log('⚠️ App will continue without push notifications')
      }
    }

    // Wait longer for Firebase to fully initialize
    const timer = setTimeout(() => {
      initEmailService()
      initNotificationService()
      
      // Start global scheduled alert processor
      console.log('🚀 Starting global scheduled alert processor...')
      globalScheduledAlertProcessor.start()
    }, 3000) // Increased from 1000ms to 3000ms

    // Cleanup function
    return () => {
      clearTimeout(timer)
      globalScheduledAlertProcessor.stop()
    }
  }, [])

  return (
    <AuthProvider>
      <OrganizationsProvider>
        <AlertProvider>
          <CalendarProvider>
            <SubscriptionProvider>
              <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }>
                <Route index element={<Dashboard />} />
                <Route path="alerts" element={<Alerts />} />
                {/* <Route path="organizations" element={<Organizations />} /> */}
                <Route path="groups" element={<Groups />} />
                <Route path="calendar" element={<Calendar />} />
                <Route path="org-requests" element={<OrganizationRequest />} />
                <Route path="profile" element={<Profile />} />
                {/* New user pages */}
                <Route path="my-alerts" element={<MyAlerts />} />
                <Route path="admin-my-alerts" element={<AdminMyAlerts />} />
                <Route path="my-groups" element={<MyGroups />} />
                <Route path="discover" element={<DiscoverOrganizations />} />
                <Route path="my-profile" element={<MyProfile />} />
                <Route path="subscription" element={<Subscription />} />
                <Route path="analytics" element={<OrganizationAnalytics />} />
                <Route path="platform-creator" element={<PlatformCreator />} />
                <Route path="test-subscription" element={<Subscription />} />
              </Route>
              </Routes>
            </SubscriptionProvider>
          </CalendarProvider>
        </AlertProvider>
      </OrganizationsProvider>
    </AuthProvider>
  )
}

export default App
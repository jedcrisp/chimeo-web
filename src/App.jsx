import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { OrganizationsProvider } from './contexts/OrganizationsContext'
import { AlertProvider } from './contexts/AlertContext'
import { CalendarProvider } from './contexts/CalendarContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Alerts from './pages/Alerts'
import Organizations from './pages/Organizations'
import Groups from './pages/Groups'
import Calendar from './pages/Calendar'
import Profile from './pages/Profile'
import OrganizationRequest from './pages/OrganizationRequest'
import ProtectedRoute from './components/ProtectedRoute'
import notificationService from './services/notificationService'
import emailService from './services/emailService'
import globalScheduledAlertProcessor from './services/globalScheduledAlertProcessor'

function App() {
  useEffect(() => {
    // Initialize push notifications and email service when app starts
    const initNotifications = async () => {
      try {
        console.log('🚀 Initializing push notifications...')
        const success = await notificationService.initialize()
        
        if (success) {
          console.log('✅ Push notifications initialized successfully')
        } else {
          console.log('⚠️ Push notifications not available - continuing without them')
          console.log('💡 This is normal if:')
          console.log('  - Running on HTTP instead of HTTPS (in production)')
          console.log('  - Browser doesn\'t support push notifications')
          console.log('  - User denied notification permissions')
        }
      } catch (error) {
        console.error('❌ Failed to initialize push notifications:', error)
        console.log('⚠️ App will continue without push notifications')
      }
    }

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

    // Wait longer for Firebase to fully initialize
    const timer = setTimeout(() => {
      initNotifications()
      initEmailService()
      
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
              </Route>
            </Routes>
          </CalendarProvider>
        </AlertProvider>
      </OrganizationsProvider>
    </AuthProvider>
  )
}

export default App
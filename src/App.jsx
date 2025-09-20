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
import Calendar from './pages/Calendar'
import Map from './components/Map'
import Profile from './pages/Profile'
import ProtectedRoute from './components/ProtectedRoute'
import notificationService from './services/notificationService'
import globalScheduledAlertProcessor from './services/globalScheduledAlertProcessor'

function App() {
  useEffect(() => {
    // Initialize push notifications when app starts
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

    // Wait longer for Firebase to fully initialize
    const timer = setTimeout(() => {
      initNotifications()
      
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
                <Route path="calendar" element={<Calendar />} />
                <Route path="map" element={<Map />} />
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
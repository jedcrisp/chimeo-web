import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { AlertProvider } from './contexts/AlertContext'
import { OrganizationsProvider } from './contexts/OrganizationsContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Alerts from './pages/Alerts'
import Organizations from './pages/Organizations'
import Map from './components/Map'
import OrganizationRequest from './pages/OrganizationRequest'
import Profile from './pages/Profile'
import ProtectedRoute from './components/ProtectedRoute'
import notificationService from './services/notificationService'

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
        }
      } catch (error) {
        console.error('❌ Failed to initialize push notifications:', error)
        console.log('⚠️ App will continue without push notifications')
      }
    }

    // Wait longer for Firebase to fully initialize
    const timer = setTimeout(() => {
      initNotifications()
    }, 3000) // Increased from 1000ms to 3000ms

    return () => clearTimeout(timer)
  }, [])

  return (
    <AuthProvider>
      <OrganizationsProvider>
        <AlertProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="alerts" element={<Alerts />} />
              <Route path="organizations" element={<Organizations />} />
              <Route path="map" element={<Map />} />
              <Route path="request-org" element={<OrganizationRequest />} />
              <Route path="profile" element={<Profile />} />
            </Route>
          </Routes>
        </AlertProvider>
      </OrganizationsProvider>
    </AuthProvider>
  )
}

export default App

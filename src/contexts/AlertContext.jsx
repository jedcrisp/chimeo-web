import { createContext, useContext, useState, useEffect } from 'react'
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, deleteDoc, getDocs } from 'firebase/firestore'
import { db } from '../services/firebase'
import { useAuth } from './AuthContext'
import toast from 'react-hot-toast'

const AlertContext = createContext()

export function useAlerts() {
  return useContext(AlertContext)
}

export function AlertProvider({ children }) {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const { currentUser, userProfile } = useAuth()

  useEffect(() => {
    if (!currentUser) {
      setAlerts([])
      setLoading(false)
      return
    }

    // Listen to alerts from all organizations the user follows
    const unsubscribe = onSnapshot(
      query(collection(db, 'organizationAlerts'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        const alertsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        setAlerts(alertsData)
        setLoading(false)
      },
      (error) => {
        console.error('Error listening to alerts:', error)
        setLoading(false)
      }
    )

    return unsubscribe
  }, [currentUser])

  const createAlert = async (alertData) => {
    try {
      if (!currentUser || !userProfile) {
        throw new Error('User not authenticated or profile not loaded')
      }

      // Get user's organization info
      let organizationId = 'default'
      let organizationName = 'Default Organization'
      
      // Try to get the user's primary organization
      if (userProfile.organizationId) {
        organizationId = userProfile.organizationId
        organizationName = userProfile.organizationName || 'Unknown Organization'
      }

      // Create alert in the mobile app structure for cloud function compatibility
      const alertPayload = {
        title: alertData.title,
        description: alertData.message,
        organizationId: organizationId,
        organizationName: organizationName,
        type: alertData.type,
        severity: alertData.type === 'emergency' ? 'high' : 'medium',
        postedBy: userProfile.displayName || currentUser.email,
        postedByUserId: currentUser.uid,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        location: alertData.location || '',
        // Web app specific fields
        source: 'web',
        webAlertData: alertData
      }

      // Store in the main alerts collection (for web app display)
      const docRef = await addDoc(collection(db, 'organizationAlerts'), alertPayload)
      
      // Also store in the mobile app structure to trigger cloud function
      if (organizationId !== 'default') {
        try {
          await addDoc(collection(db, 'organizations', organizationId, 'alerts'), alertPayload)
        } catch (error) {
          console.warn('Could not create alert in mobile app structure:', error)
        }
      }

      toast.success('Alert created successfully! Phone notifications will be sent to followers.')
      return docRef
    } catch (error) {
      console.error('Error creating alert:', error)
      toast.error('Failed to create alert')
      throw error
    }
  }

  const updateAlert = async (alertId, updates) => {
    try {
      await updateDoc(doc(db, 'organizationAlerts', alertId), {
        ...updates,
        updatedAt: new Date()
      })
      toast.success('Alert updated successfully!')
    } catch (error) {
      console.error('Error updating alert:', error)
      toast.error('Failed to update alert')
      throw error
    }
  }

  const deleteAlert = async (alertId) => {
    try {
      await deleteDoc(doc(db, 'organizationAlerts', alertId))
      toast.success('Alert deleted successfully!')
    } catch (error) {
      console.error('Error deleting alert:', error)
      toast.error('Failed to delete alert')
      throw error
    }
  }

  const value = {
    alerts,
    loading,
    createAlert,
    updateAlert,
    deleteAlert
  }

  return (
    <AlertContext.Provider value={value}>
      {children}
    </AlertContext.Provider>
  )
}

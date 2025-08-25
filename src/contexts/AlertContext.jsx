import { createContext, useContext, useState, useEffect } from 'react'
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, deleteDoc, getDocs, getDoc } from 'firebase/firestore'
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

      console.log('🔧 AlertContext: Creating alert with data:', alertData)
      console.log('🔧 AlertContext: Current user:', currentUser.uid)
      console.log('🔧 AlertContext: User profile:', userProfile)

      // Refresh user profile to ensure we have the latest organization information
      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid))
        if (userDoc.exists()) {
          const freshProfile = userDoc.data()
          console.log('🔧 AlertContext: Fresh user profile:', freshProfile)
          
          // Update local userProfile if it has new organization info
          if (freshProfile.organizationId && freshProfile.organizationName) {
            console.log('🔧 AlertContext: Found fresh organization info:', {
              organizationId: freshProfile.organizationId,
              organizationName: freshProfile.organizationName
            })
          }
        }
      } catch (error) {
        console.warn('Could not refresh user profile:', error)
      }

      // Get user's organization info - we need to find which organization they're an admin of
      let organizationId = null
      let organizationName = null
      
      // Check if user is an admin of any organization
      if (userProfile.isOrganizationAdmin) {
        // Try to get the organization ID from userProfile or find it in organizations
        organizationId = userProfile.organizationId
        organizationName = userProfile.organizationName
        console.log('🔧 AlertContext: User is org admin, using profile org info:', { organizationId, organizationName })
      } else {
        console.log('🔧 AlertContext: User is not an org admin according to profile')
      }

      // If we don't have organization info, try to get it from adminService
      if (!organizationId) {
        try {
          console.log('🔧 AlertContext: Trying to get organization info from adminService...')
          const adminService = (await import('../services/adminService')).default
          adminService.setCurrentUser(currentUser)
          
          const hasAdminAccess = await adminService.hasOrganizationAdminAccess()
          if (hasAdminAccess) {
            const adminOrgs = await adminService.getAdminOrganizations()
            if (adminOrgs.length > 0) {
              const primaryOrg = adminOrgs[0]
              organizationId = primaryOrg.id
              organizationName = primaryOrg.name
              console.log('🔧 AlertContext: Found organization info via adminService:', { organizationId, organizationName })
            }
          }
        } catch (error) {
          console.warn('Could not get organization info from adminService:', error)
        }
      }

      // If we still don't have organization info, we can't send phone notifications
      if (!organizationId) {
        throw new Error('You must be an organization administrator to create alerts that send phone notifications. Please check your profile to ensure you have admin access.')
      }

      // Create alert in the mobile app structure for cloud function compatibility
      const alertPayload = {
        title: alertData.title,
        description: alertData.message,
        organizationId: organizationId,
        organizationName: organizationName,
        type: alertData.type,
        severity: alertData.type === 'emergency' ? 'high' : 'medium',
        postedBy: userProfile.creatorName || userProfile.displayName || currentUser.email,
        postedByUserId: currentUser.uid,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        location: alertData.location || '',
        // Web app specific fields
        source: 'web',
        webAlertData: alertData
      }

      console.log('🔧 Creating alert in mobile app structure:', {
        organizationId,
        organizationName,
        alertPayload
      })

      // Store in the mobile app structure to trigger cloud function for phone notifications
      console.log('🔧 AlertContext: About to create alert in mobile app structure at path: organizations/' + organizationId + '/alerts')
      const mobileAlertRef = await addDoc(collection(db, 'organizations', organizationId, 'alerts'), alertPayload)
      console.log('✅ Alert created in mobile app structure:', mobileAlertRef.id)
      console.log('✅ Full path:', 'organizations/' + organizationId + '/alerts/' + mobileAlertRef.id)
      console.log('✅ This should trigger the cloud function: sendAlertNotifications')
      
      // Also store in the main alerts collection (for web app display)
      const webAlertRef = await addDoc(collection(db, 'organizationAlerts'), alertPayload)
      console.log('✅ Alert created in web app structure:', webAlertRef.id)

      toast.success('Alert created successfully! Phone notifications will be sent to followers.')
      console.log('🎉 Alert creation complete! Check Firebase Functions logs for cloud function execution.')
      return webAlertRef
    } catch (error) {
      console.error('Error creating alert:', error)
      toast.error(error.message || 'Failed to create alert')
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

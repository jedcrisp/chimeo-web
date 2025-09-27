import { createContext, useContext, useState, useEffect } from 'react'
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, deleteDoc, getDocs, getDoc } from 'firebase/firestore'
import { db } from '../services/firebase'
import { AuthContext } from './AuthContext'
import emailService from '../services/emailService'
import analyticsService from '../services/analyticsService'
import toast from 'react-hot-toast'

const AlertContext = createContext()

export function useAlerts() {
  return useContext(AlertContext)
}

export function AlertProvider({ children }) {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Safely get auth context
  const authContext = useContext(AuthContext)
  const currentUser = authContext?.currentUser
  const userProfile = authContext?.userProfile

  useEffect(() => {
    if (!currentUser || !userProfile) {
      setAlerts([])
      setLoading(false)
      return
    }

    // Get organization ID with fallback logic
    let orgId = userProfile?.organizationId
    if (!orgId && userProfile?.organizations && userProfile.organizations.length > 0) {
      orgId = userProfile.organizations[0] // organizations is array of strings
    }

    // Ensure orgId is a string
    if (orgId && typeof orgId !== 'string') {
      orgId = String(orgId)
    }

    if (!orgId) {
      console.log('🔍 AlertContext: No organization ID found, setting empty alerts')
      setAlerts([])
      setLoading(false)
      return
    }

    // Listen to alerts from the user's organization
    console.log('🔍 AlertContext: Setting up alert listener for organization:', orgId)
    const unsubscribe = onSnapshot(
      query(collection(db, 'organizations', orgId, 'alerts'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        console.log('🔍 AlertContext: Received alert snapshot with', snapshot.docs.length, 'alerts')
        const alertsData = snapshot.docs.map(doc => {
          const data = doc.data()
          console.log('🔍 AlertContext: Alert data:', { id: doc.id, title: data.title, createdAt: data.createdAt })
          return {
            id: doc.id,
            ...data
          }
        })
        setAlerts(alertsData)
        setLoading(false)
        console.log('🔍 AlertContext: Set alerts state with', alertsData.length, 'alerts')
      },
      (error) => {
        console.error('❌ AlertContext: Error listening to alerts:', error)
        setLoading(false)
      }
    )

    return unsubscribe
  }, [currentUser, userProfile])

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
      
      console.log('🔧 AlertContext: Full userProfile:', userProfile)
      console.log('🔧 AlertContext: userProfile.isOrganizationAdmin:', userProfile.isOrganizationAdmin)
      console.log('🔧 AlertContext: userProfile.organizationId:', userProfile.organizationId)
      console.log('🔧 AlertContext: userProfile.organizationName:', userProfile.organizationName)
      
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
        console.error('❌ No organization ID found for alert creation')
        console.error('❌ User profile:', userProfile)
        console.error('❌ Current user:', currentUser)
        console.error('❌ Alert data:', alertData)
        throw new Error('You must be an organization administrator to create alerts that send phone notifications. Please check your profile to ensure you have admin access.')
      }
      
      console.log('✅ Organization info found:', { organizationId, organizationName })

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
        groupId: alertData.groupId || null, // Add group targeting
        // Web app specific fields
        source: 'web',
        webAlertData: alertData
      }

      console.log('🔧 Creating alert in mobile app structure:', {
        organizationId,
        organizationName,
        alertPayload
      })

      // Store in the organization's alerts subcollection (for web app display)
      const webAlertRef = await addDoc(collection(db, 'organizations', organizationId, 'alerts'), alertPayload)
      console.log('✅ Alert created in organization alerts subcollection:', webAlertRef.id)
      console.log('✅ Alert payload for web app:', alertPayload)

      // Track analytics event
      await analyticsService.trackAlertCreated({
        id: webAlertRef.id,
        type: alertData.type,
        severity: alertPayload.severity,
        groupId: alertData.groupId,
        location: alertData.location,
        postedByUserId: currentUser.uid
      }, organizationId)

      // Increment usage counter for subscription tracking
      try {
        const subscriptionService = (await import('../services/subscriptionService')).default
        await subscriptionService.incrementUsage(currentUser.uid, 'alerts', organizationId)
        console.log('✅ AlertContext: Incremented alert usage counter')
      } catch (usageError) {
        console.warn('⚠️ AlertContext: Could not increment usage counter:', usageError.message)
      }

      // Prepare notification payload for both push and email notifications
      const notificationPayload = {
        id: webAlertRef.id,
        title: alertData.title,
        message: alertData.message,
        organizationId: organizationId,
        organizationName: organizationName || 'Unknown Organization',
        createdBy: currentUser?.displayName || currentUser?.email || 'Unknown User',
        groupName: alertData.groupName || 'All Groups',
        location: alertData.location || 'Not specified',
        type: alertData.type || 'general',
        priority: alertData.priority || 'Normal'
      }

      // Note: Push notifications are handled by Cloud Functions
      // The web app only creates the alert in Firestore
      console.log('📝 Alert created in Firestore - Cloud Functions will handle push notifications')

      // Send email notification to platform admin
      try {
        await emailService.sendAlertEmail(notificationPayload, 'jed@chimeo.app')
        console.log('✅ Alert email notification sent to platform admin')
      } catch (emailError) {
        console.error('❌ Failed to send alert email notification:', emailError)
        // Don't fail the alert creation if email fails
      }

      // Send email notifications to group followers
      try {
        if (alertData.groupId) {
          console.log('📧 Sending alert emails to group followers...')
          
          // Get group data to find group name
          const groupRef = doc(db, 'organizations', organizationId, 'groups', alertData.groupId)
          const groupDoc = await getDoc(groupRef)
          
          if (groupDoc.exists()) {
            const groupData = groupDoc.data()
            const groupName = groupData.name
            
            console.log(`📧 Looking for followers of group: ${groupName}`)
            
            // Find all users who follow this group
            const usersQuery = query(collection(db, 'users'))
            const usersSnapshot = await getDocs(usersQuery)
            
            const groupFollowers = []
            
            for (const userDoc of usersSnapshot.docs) {
              const userData = userDoc.data()
              
              // Check if user follows this group via groupPreferences
              if (userData.groupPreferences && userData.groupPreferences[groupName] === true) {
                groupFollowers.push({
                  id: userDoc.id,
                  email: userData.email,
                  displayName: userData.displayName
                })
              }
              // Also check old followedGroups structure for backward compatibility
              else if (userData.followedGroups && userData.followedGroups.includes(alertData.groupId)) {
                groupFollowers.push({
                  id: userDoc.id,
                  email: userData.email,
                  displayName: userData.displayName
                })
              }
            }
            
            console.log(`📧 Found ${groupFollowers.length} group followers to notify`)
            
            // Send email to each group follower
            for (const follower of groupFollowers) {
              if (follower.email && follower.email !== currentUser.email) {
                try {
                  await emailService.sendAlertEmail(notificationPayload, follower.email)
                  console.log(`✅ Alert email sent to group follower: ${follower.email}`)
                } catch (memberEmailError) {
                  console.error(`❌ Failed to send alert email to ${follower.email}:`, memberEmailError)
                }
              }
            }
          } else {
            console.warn('⚠️ Group not found, skipping group follower email notifications')
          }
        } else {
          console.log('📧 No specific group targeted, skipping group follower email notifications')
        }
      } catch (groupEmailError) {
        console.error('❌ Failed to send group follower email notifications:', groupEmailError)
        // Don't fail the alert creation if group emails fail
      }

      toast.success('Alert created successfully! Push notifications sent to web users.')
      console.log('🎉 Alert creation complete!')
      return webAlertRef
    } catch (error) {
      console.error('Error creating alert:', error)
      toast.error(error.message || 'Failed to create alert')
      throw error
    }
  }

  const updateAlert = async (alertId, updates) => {
    try {
      // Get organization ID with fallback logic
      let orgId = userProfile?.organizationId
      if (!orgId && userProfile?.organizations && userProfile.organizations.length > 0) {
        orgId = userProfile.organizations[0] // organizations is array of strings
      }

      if (!orgId) {
        throw new Error('No organization ID found for updating alert')
      }

      await updateDoc(doc(db, 'organizations', orgId, 'alerts', alertId), {
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
      console.log('🗑️ Deleting alert:', alertId)
      
      // Get organization ID with fallback logic
      let orgId = userProfile?.organizationId
      if (!orgId && userProfile?.organizations && userProfile.organizations.length > 0) {
        orgId = userProfile.organizations[0] // organizations is array of strings
      }

      if (!orgId) {
        throw new Error('No organization ID found for deleting alert')
      }
      
      console.log('🗑️ Organization ID:', orgId)
      
      // Delete from the organization's alerts subcollection
      const deletePromises = [
        deleteDoc(doc(db, 'organizations', orgId, 'alerts', alertId))
      ]
      
      // Execute all deletions
      await Promise.all(deletePromises)
      
      console.log('✅ Alert deleted successfully from all collections')
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

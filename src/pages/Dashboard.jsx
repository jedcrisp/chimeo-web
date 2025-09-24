import { useAuth } from '../contexts/AuthContext'
import { useOrganizations } from '../contexts/OrganizationsContext'
import { useAlerts } from '../contexts/AlertContext'
import { 
  Crown, 
  Plus, 
  AlertTriangle, 
  Building, 
  Bell,
  TrendingUp,
  Shield,
  Users,
  Clock,
  User
} from 'lucide-react'
import { Link } from 'react-router-dom'
import adminService from '../services/adminService'
import groupService from '../services/groupService'
import emailService from '../services/emailService'
import NotificationDebug from '../components/NotificationDebug'
import AlertDetailsModal from '../components/AlertDetailsModal'
import { useState, useEffect } from 'react'
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore'
import { db } from '../services/firebase'

// Custom Bell Icon component
function BellIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2C13.1 2 14 2.9 14 4V5.5C17.5 6.5 20 9.5 20 13V16L22 18V19H2V18L4 16V13C4 9.5 6.5 6.5 10 5.5V4C10 2.9 10.9 2 12 2Z"
        fill="currentColor"
      />
      <path
        d="M12 22C13.1 22 14 21.1 14 20H10C10 21.1 10.9 22 12 22Z"
        fill="currentColor"
      />
    </svg>
  )
}

export default function Dashboard() {
  const { currentUser, userProfile } = useAuth()
  const { organizations } = useOrganizations()
  const { alerts } = useAlerts()
  const [hasAdminAccess, setHasAdminAccess] = useState(false)
  const [adminOrgs, setAdminOrgs] = useState([])
  const [totalGroups, setTotalGroups] = useState(0)
  const [notifications, setNotifications] = useState([])
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false)
  const [followedGroups, setFollowedGroups] = useState([])
  const [followedOrgs, setFollowedOrgs] = useState([])
  const [userAlerts, setUserAlerts] = useState([])
  const [selectedAlert, setSelectedAlert] = useState(null)
  const [showAlertDetails, setShowAlertDetails] = useState(false)
  
  // Check if user is organization admin
  const isOrganizationAdmin = userProfile?.isOrganizationAdmin || false

  // Check if user is platform admin
  useEffect(() => {
    if (currentUser) {
      const isPlatformAdminUser = currentUser.email === 'jed@onetrack-consulting.com'
      setIsPlatformAdmin(isPlatformAdminUser)
      
      if (isPlatformAdminUser) {
        fetchNotifications()
      }
    }
  }, [currentUser])

  const fetchNotifications = async () => {
    try {
      // Fetch notifications from the user-specific path
      const sanitizedEmail = 'jed@onetrack-consulting.com'.replace(/[^a-zA-Z0-9]/g, '_')
      const notificationPath = `notifications/${sanitizedEmail}/user_notifications`
      console.log('🔍 Dashboard: Fetching notifications from path:', notificationPath)
      
      const notificationsQuery = query(
        collection(db, 'notifications', sanitizedEmail, 'user_notifications'),
        orderBy('createdAt', 'desc'),
        limit(5)
      )
      const notificationsSnapshot = await getDocs(notificationsQuery)
      console.log('🔍 Dashboard: Found', notificationsSnapshot.docs.length, 'notifications')
      
      const notificationsData = notificationsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      console.log('🔍 Dashboard: Notifications data:', notificationsData)
      setNotifications(notificationsData)
    } catch (error) {
      console.error('❌ Dashboard: Error fetching notifications:', error)
    }
  }

  const handleTestEmail = async () => {
    try {
      console.log('📧 Dashboard: Sending test email...')
      const success = await emailService.sendTestEmail()
      if (success) {
        console.log('✅ Dashboard: Test email sent successfully')
        alert('Test email sent successfully! Check your inbox.')
      } else {
        console.log('❌ Dashboard: Test email failed')
        alert('Test email failed. Check console for details.')
      }
    } catch (error) {
      console.error('❌ Dashboard: Error sending test email:', error)
      alert('Error sending test email: ' + error.message)
    }
  }

  useEffect(() => {
    if (currentUser && organizations.length > 0) {
      // Check if user has admin access to any organizations
      adminService.getAdminOrganizations().then(adminOrgs => {
        setAdminOrgs(adminOrgs)
        setHasAdminAccess(adminOrgs.length > 0)
      })
    }
  }, [currentUser, organizations])

  // Load user's followed groups, organizations, and alerts
  useEffect(() => {
    if (currentUser && userProfile) {
      loadUserData()
    }
  }, [currentUser, userProfile])

  const loadUserData = async () => {
    try {
      console.log('🔍 Dashboard: Loading user data...')
      
      // Load followed groups
      const groups = await loadFollowedGroups()
      setFollowedGroups(groups)
      
      // Load followed organizations
      const orgs = await loadFollowedOrganizations()
      setFollowedOrgs(orgs)
      
      // Load user alerts
      const alerts = await loadUserAlerts(groups)
      setUserAlerts(alerts)
      
      console.log('✅ Dashboard: Loaded user data - Groups:', groups.length, 'Orgs:', orgs.length, 'Alerts:', alerts.length)
    } catch (error) {
      console.error('❌ Dashboard: Error loading user data:', error)
    }
  }

  // Fetch groups for user's organization
  useEffect(() => {
    const fetchGroups = async () => {
      if (userProfile?.organizations?.length > 0) {
        try {
          const organizationId = userProfile.organizations[0]
          const groups = await groupService.getGroupsForOrganization(organizationId)
          setTotalGroups(groups.length)
        } catch (error) {
          console.error('Error fetching groups:', error)
          setTotalGroups(0)
        }
      }
    }

    fetchGroups()
  }, [userProfile])

  // Get the user's display name with priority order
  const getDisplayName = () => {
    // First try to get from userProfile.name (the Name field in user profile)
    if (userProfile?.name && userProfile.name.trim() && userProfile.name !== 'Email User') {
      return userProfile.name.trim()
    } else if (userProfile?.creatorName && userProfile.creatorName.trim()) {
      return userProfile.creatorName.trim()
    } else if (userProfile?.displayName && userProfile.displayName.trim()) {
      return userProfile.displayName.trim()
    } else if (currentUser?.displayName && currentUser.displayName.trim()) {
      return currentUser.displayName.trim()
    } else {
      return currentUser?.email || 'User'
    }
  }

  // Load followed groups (similar to MyGroups page)
  const loadFollowedGroups = async () => {
    try {
      if (!currentUser) return []
      
      const userRef = doc(db, 'users', currentUser.uid)
      const userDoc = await getDoc(userRef)
      
      if (!userDoc.exists()) {
        console.log('User document not found')
        return []
      }
      
      const userData = userDoc.data()
      
      // Check for groupPreferences map (new structure) or followedGroups array (old structure)
      let followedGroupIds = []
      if (userData.groupPreferences && Object.keys(userData.groupPreferences).length > 0) {
        followedGroupIds = Object.keys(userData.groupPreferences).filter(
          groupName => userData.groupPreferences[groupName] === true
        )
      } else if (userData.followedGroups) {
        followedGroupIds = userData.followedGroups
      } else {
        // Try to load from subcollections (mobile app structure)
        followedGroupIds = await loadFollowedGroupsFromSubcollections()
      }
      
      if (followedGroupIds.length === 0) {
        return []
      }
      
      const groups = []
      for (const groupName of followedGroupIds) {
        try {
          const groupData = await findGroupByName(groupName)
          if (groupData) {
            groups.push(groupData)
          }
        } catch (error) {
          console.error('Error loading group:', groupName, error)
        }
      }
      
      return groups
    } catch (error) {
      console.error('Error loading followed groups:', error)
      return []
    }
  }

  // Load followed organizations (similar to DiscoverOrganizations page)
  const loadFollowedOrganizations = async () => {
    try {
      if (!currentUser) return []
      
      const userRef = doc(db, 'users', currentUser.uid)
      const userDoc = await getDoc(userRef)
      
      if (!userDoc.exists()) {
        console.log('User document not found')
        return []
      }
      
      const userData = userDoc.data()
      const followedOrgIds = userData.followedOrganizations || []
      
      if (followedOrgIds.length === 0) {
        return []
      }
      
      const orgs = []
      for (const orgId of followedOrgIds) {
        try {
          const orgData = await findOrganizationById(orgId)
          if (orgData) {
            orgs.push(orgData)
          }
        } catch (error) {
          console.error('Error loading organization:', orgId, error)
        }
      }
      
      return orgs
    } catch (error) {
      console.error('Error loading followed organizations:', error)
      return []
    }
  }

  // Load user alerts based on followed groups
  const loadUserAlerts = async (groups) => {
    try {
      if (!currentUser || !userProfile || groups.length === 0) {
        return []
      }
      
      // Get organization ID
      let orgId = userProfile?.organizationId
      if (!orgId && userProfile?.organizations && userProfile.organizations.length > 0) {
        orgId = userProfile.organizations[0]
      }
      if (!orgId && userProfile?.followedOrganizations && userProfile.followedOrganizations.length > 0) {
        orgId = userProfile.followedOrganizations[0]
      }
      
      if (!orgId) {
        return []
      }
      
      // Load alerts from organization
      const alertsQuery = query(
        collection(db, 'organizations', orgId, 'alerts'),
        orderBy('createdAt', 'desc'),
        limit(50)
      )
      
      const alertsSnapshot = await getDocs(alertsQuery)
      const allAlerts = alertsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      
      // Filter alerts to only show those from followed groups
      const groupNames = groups.map(g => g.name)
      const filteredAlerts = allAlerts.filter(alert => {
        return groupNames.includes(alert.groupId) || groupNames.includes(alert.groupName)
      })
      
      return filteredAlerts
    } catch (error) {
      console.error('Error loading user alerts:', error)
      return []
    }
  }

  // Helper function to find group by name
  const findGroupByName = async (groupName) => {
    try {
      const orgsQuery = query(collection(db, 'organizations'))
      const orgsSnapshot = await getDocs(orgsQuery)
      
      for (const orgDoc of orgsSnapshot.docs) {
        try {
          const groupsQuery = query(
            collection(db, 'organizations', orgDoc.id, 'groups'),
            where('isActive', '==', true)
          )
          const groupsSnapshot = await getDocs(groupsQuery)
          
          for (const groupDoc of groupsSnapshot.docs) {
            const groupData = groupDoc.data()
            if (groupData.name === groupName) {
              return {
                id: groupDoc.id,
                ...groupData,
                organizationId: orgDoc.id,
                organizationName: orgDoc.data().name
              }
            }
          }
        } catch (error) {
          console.error('Error searching groups in org:', orgDoc.id, error)
        }
      }
      
      return null
    } catch (error) {
      console.error('Error finding group by name:', error)
      return null
    }
  }

  // Helper function to find organization by ID
  const findOrganizationById = async (orgId) => {
    try {
      const orgDoc = await getDoc(doc(db, 'organizations', orgId))
      if (orgDoc.exists()) {
        return {
          id: orgDoc.id,
          ...orgDoc.data()
        }
      }
      return null
    } catch (error) {
      console.error('Error finding organization by ID:', error)
      return null
    }
  }

  // Helper function to load followed groups from subcollections
  const loadFollowedGroupsFromSubcollections = async () => {
    try {
      // Check for followedGroups subcollection
      const followedGroupsRef = collection(db, 'users', currentUser.uid, 'followedGroups')
      const followedGroupsSnapshot = await getDocs(followedGroupsRef)
      
      if (!followedGroupsSnapshot.empty) {
        const groupNames = []
        followedGroupsSnapshot.forEach(doc => {
          const data = doc.data()
          if (data.name) {
            groupNames.push(data.name)
          }
        })
        return groupNames
      }
      
      // Check for followedOrganizations subcollection (mobile app structure)
      const followedOrgsRef = collection(db, 'users', currentUser.uid, 'followedOrganizations')
      const followedOrgsSnapshot = await getDocs(followedOrgsRef)
      
      if (!followedOrgsSnapshot.empty) {
        const groupNames = []
        for (const orgDoc of followedOrgsSnapshot.docs) {
          const orgData = orgDoc.data()
          
          if (orgData.groupPreferences) {
            Object.keys(orgData.groupPreferences).forEach(groupName => {
              if (orgData.groupPreferences[groupName] === true) {
                groupNames.push(groupName)
              }
            })
          }
          
          if (orgData.groups) {
            Object.keys(orgData.groups).forEach(groupName => {
              if (orgData.groups[groupName] === true) {
                groupNames.push(groupName)
              }
            })
          }
        }
        return groupNames
      }
      
      return []
    } catch (error) {
      console.error('Error loading followed groups from subcollections:', error)
      return []
    }
  }

  const recentAlerts = alerts.slice(0, 5)
  const totalOrganizations = organizations.length
  const totalAlerts = alerts.length

  // Handle alert click to show details
  const handleAlertClick = (alert) => {
    console.log('🔍 Dashboard: Alert clicked:', alert)
    setSelectedAlert(alert)
    setShowAlertDetails(true)
  }

  // Handle closing alert details modal
  const handleCloseAlertDetails = () => {
    setShowAlertDetails(false)
    setSelectedAlert(null)
  }

  // Show different dashboard based on user role
  if (isOrganizationAdmin) {
    return (
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <div className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
                <p className="text-slate-600 mt-1">
                  Welcome back, {getDisplayName()}
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Last updated</p>
                  <p className="text-sm font-medium text-slate-900">{new Date().toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200 min-h-[100px]">
              <div className="flex items-center h-full">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                    <Bell className="h-6 w-6 text-red-600" />
                  </div>
                </div>
                <div className="ml-4 flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-600 truncate">Total Alerts</p>
                  <p className="text-2xl font-bold text-slate-900">{totalAlerts}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200 min-h-[100px]">
              <div className="flex items-center h-full">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Users className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
                <div className="ml-4 flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-600 truncate">Groups</p>
                  <p className="text-2xl font-bold text-slate-900">{totalGroups}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200 min-h-[100px]">
              <div className="flex items-center h-full">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <div className="ml-4 flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-600 truncate">Followers</p>
                  <p className="text-2xl font-bold text-blue-600">{userProfile?.organizations?.[0] ? organizations.find(org => org.id === userProfile.organizations[0])?.followerCount || 0 : 0}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Alerts */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Recent Alerts</h2>
                <Link
                  to="/alerts"
                  className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
                >
                  View all →
                </Link>
              </div>
            </div>
            
            <div className="p-6">
              {recentAlerts.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="h-6 w-6 text-slate-400" />
                  </div>
                  <h3 className="text-sm font-medium text-slate-900 mb-1">No alerts yet</h3>
                  <p className="text-sm text-slate-500">
                    Alerts will appear here when they're posted
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentAlerts.map((alert) => (
                    <div 
                      key={alert.id} 
                      onClick={() => handleAlertClick(alert)}
                      className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <div className="w-8 h-8 bg-slate-200 rounded-lg flex items-center justify-center flex-shrink-0">
                        <BellIcon className="h-4 w-4 text-slate-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900">{alert.title}</p>
                        <p className="text-sm text-slate-600 mt-1">{alert.message}</p>
                        <p className="text-xs text-slate-400 mt-2">
                          {alert.createdAt?.toDate?.()?.toLocaleDateString() || 'Recently'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Platform Admin Notifications */}
          {isPlatformAdmin && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900 flex items-center">
                  <Bell className="h-5 w-5 mr-2 text-blue-600" />
                  Recent Notifications
                </h2>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleTestEmail}
                    className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
                  >
                    Test Email
                  </button>
                  <Link 
                    to="/org-requests" 
                    className="text-sm text-blue-600 hover:text-blue-500"
                  >
                    View All
                  </Link>
                </div>
              </div>
              
              {notifications.length === 0 ? (
                <div className="text-center py-4">
                  <Bell className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">No recent notifications</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((notification) => (
                    <div key={notification.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-sm font-medium text-gray-900">
                            {notification.title}
                          </h3>
                          <p className="text-xs text-gray-600 mt-1">
                            {notification.message}
                          </p>
                          {notification.organizationName && (
                            <p className="text-xs text-blue-600 mt-1">
                              Organization: {notification.organizationName}
                            </p>
                          )}
                          {notification.adminName && (
                            <p className="text-xs text-gray-500 mt-1">
                              Admin: {notification.adminName} ({notification.adminEmail})
                            </p>
                          )}
                        </div>
                        <div className="text-xs text-gray-400 ml-2">
                          {notification.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Notification Debug Component - Only show for platform admin */}
          {isPlatformAdmin && (
            <div className="mt-8">
              <NotificationDebug />
            </div>
          )}

          {/* Alert Details Modal */}
          <AlertDetailsModal
            isOpen={showAlertDetails}
            onClose={handleCloseAlertDetails}
            alert={selectedAlert}
          />
        </div>
      </div>
    )
  } else {
    return (
    // Basic User Dashboard
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back, {getDisplayName()}!</h1>
          <p className="text-gray-600 mt-1">
            Stay updated with alerts from your followed groups and organizations
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <Bell className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">My Alerts</p>
              <p className="text-2xl font-bold text-gray-900">{userAlerts.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Groups Following</p>
              <p className="text-2xl font-bold text-gray-900">{followedGroups.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <Building className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Organizations</p>
              <p className="text-2xl font-bold text-gray-900">{followedOrgs.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Link
              to="/my-groups"
              className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Users className="h-5 w-5 text-blue-600 mr-3" />
              <div>
                <p className="font-medium text-gray-900">Manage My Groups</p>
                <p className="text-sm text-gray-600">Follow or unfollow groups</p>
              </div>
            </Link>
            
            <Link
              to="/discover"
              className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Building className="h-5 w-5 text-green-600 mr-3" />
              <div>
                <p className="font-medium text-gray-900">Discover Organizations</p>
                <p className="text-sm text-gray-600">Find new organizations to follow</p>
              </div>
            </Link>
            
            <Link
              to="/my-profile"
              className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <User className="h-5 w-5 text-purple-600 mr-3" />
              <div>
                <p className="font-medium text-gray-900">Update Profile</p>
                <p className="text-sm text-gray-600">Edit your personal information</p>
              </div>
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          {userAlerts.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No recent alerts</p>
              <p className="text-sm text-gray-500 mt-1">Follow some groups to start receiving alerts</p>
            </div>
          ) : (
            <div className="space-y-3">
              {userAlerts.slice(0, 3).map((alert) => (
                <div 
                  key={alert.id} 
                  onClick={() => handleAlertClick(alert)}
                  className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <p className="font-medium text-gray-900">{alert.title}</p>
                  <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {alert.createdAt?.toDate?.()?.toLocaleDateString() || 'Recently'}
                  </p>
                </div>
              ))}
              <Link
                to="/my-alerts"
                className="block text-center text-blue-600 hover:text-blue-500 text-sm"
              >
                View all alerts →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Alert Details Modal */}
      <AlertDetailsModal
        isOpen={showAlertDetails}
        onClose={handleCloseAlertDetails}
        alert={selectedAlert}
      />
    </div>
    )
  }
}

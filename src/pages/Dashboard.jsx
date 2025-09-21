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
  Clock
} from 'lucide-react'
import { Link } from 'react-router-dom'
import adminService from '../services/adminService'
import groupService from '../services/groupService'
import { useState, useEffect } from 'react'
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore'
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
      const notificationsQuery = query(
        collection(db, 'notifications'),
        where('targetUser', '==', 'jed@onetrack-consulting.com'),
        orderBy('createdAt', 'desc'),
        limit(5)
      )
      const notificationsSnapshot = await getDocs(notificationsQuery)
      const notificationsData = notificationsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setNotifications(notificationsData)
    } catch (error) {
      console.error('Error fetching notifications:', error)
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

  const recentAlerts = alerts.slice(0, 5)
  const totalOrganizations = organizations.length
  const totalAlerts = alerts.length

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
                  <div key={alert.id} className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
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
              <Link 
                to="/org-requests" 
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                View All
              </Link>
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
      </div>
    </div>
  )
}

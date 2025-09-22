import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { AlertTriangle, Bell, Users, Building, Clock, MapPin, Search } from 'lucide-react'
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore'
import { db } from '../services/firebase'
import adminService from '../services/adminService'

export default function MyAlerts() {
  const { currentUser, userProfile, forceUpdate } = useAuth()
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [followedGroups, setFollowedGroups] = useState([])
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (currentUser && userProfile) {
      loadUserAlerts()
    }
  }, [currentUser, userProfile, forceUpdate])

  const loadUserAlerts = async () => {
    try {
      setLoading(true)
      console.log('🔍 Loading user alerts...')
      
      // Get groups the user follows
      const groups = await loadFollowedGroups()
      setFollowedGroups(groups)
      
      if (groups.length === 0) {
        setAlerts([])
        setLoading(false)
        return
      }
      
      // Get organization ID (same logic as AlertContext)
      let orgId = userProfile?.organizationId
      if (!orgId && userProfile?.organizations && userProfile.organizations.length > 0) {
        orgId = userProfile.organizations[0]
      }
      if (!orgId && userProfile?.followedOrganizations && userProfile.followedOrganizations.length > 0) {
        orgId = userProfile.followedOrganizations[0]
      }
      
      if (!orgId) {
        console.log('🔍 MyAlerts: No organization ID found, setting empty alerts')
        setAlerts([])
        setLoading(false)
        return
      }
      
      console.log('🔍 MyAlerts: Loading alerts from organization:', orgId)
      
      // Load alerts from organization subcollection (same as AlertContext)
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
        // Check if alert is for a followed group
        return groupNames.includes(alert.groupId) || groupNames.includes(alert.groupName)
      })
      
      // Ensure alerts are sorted by creation date (newest first)
      const sortedAlerts = filteredAlerts.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0)
        const dateB = b.createdAt?.toDate?.() || new Date(0)
        return dateB - dateA // Newest first
      })
      
      setAlerts(sortedAlerts)
      console.log('✅ Loaded', filteredAlerts.length, 'alerts from', groups.length, 'followed groups (out of', allAlerts.length, 'total alerts)')
      
      // Debug: Log alert data structure
      if (filteredAlerts.length > 0) {
        console.log('🔍 Sample alert data structure:', filteredAlerts[0])
        console.log('🔍 Available fields:', Object.keys(filteredAlerts[0]))
      }
    } catch (error) {
      console.error('❌ Error loading user alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadFollowedGroupsFromSubcollectionsMyAlerts = async () => {
    try {
      console.log('🔍 MyAlerts - Checking subcollections for followed groups...')
      
      // Check for followedGroups subcollection
      const followedGroupsRef = collection(db, 'users', currentUser.uid, 'followedGroups')
      const followedGroupsSnapshot = await getDocs(followedGroupsRef)
      
      if (!followedGroupsSnapshot.empty) {
        console.log('🔍 MyAlerts - Found followedGroups subcollection with', followedGroupsSnapshot.size, 'documents')
        const groupNames = []
        followedGroupsSnapshot.forEach(doc => {
          const data = doc.data()
          console.log('🔍 MyAlerts - Followed group document:', doc.id, data)
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
        console.log('🔍 MyAlerts - Found followedOrganizations subcollection with', followedOrgsSnapshot.size, 'documents')
        const groupNames = []
        for (const orgDoc of followedOrgsSnapshot.docs) {
          const orgData = orgDoc.data()
          console.log('🔍 MyAlerts - Organization document:', orgDoc.id, orgData)
          
          // Check if this org document has groupPreferences (mobile app structure)
          if (orgData.groupPreferences) {
            console.log('🔍 MyAlerts - Found groupPreferences in organization:', orgData.groupPreferences)
            Object.keys(orgData.groupPreferences).forEach(groupName => {
              if (orgData.groupPreferences[groupName] === true) {
                groupNames.push(groupName)
                console.log('🔍 MyAlerts - Added group from org groupPreferences:', groupName)
              }
            })
          }
          
          // Also check the old groups structure for backward compatibility
          if (orgData.groups) {
            Object.keys(orgData.groups).forEach(groupName => {
              if (orgData.groups[groupName] === true) {
                groupNames.push(groupName)
                console.log('🔍 MyAlerts - Added group from org groups:', groupName)
              }
            })
          }
        }
        return groupNames
      }
      
      console.log('🔍 MyAlerts - No subcollections found with followed groups')
      return []
    } catch (error) {
      console.error('Error loading followed groups from subcollections:', error)
      return []
    }
  }


  const findGroupByName = async (groupName) => {
    try {
      // Get all organizations first
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

  const loadFollowedGroups = async () => {
    try {
      if (!currentUser) return []
      
      // Get user's followed groups directly from database
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
        // New structure: groupPreferences is a map of group names to boolean values
        followedGroupIds = Object.keys(userData.groupPreferences).filter(
          groupName => userData.groupPreferences[groupName] === true
        )
        console.log('🔍 MyAlerts - Using groupPreferences structure from main document')
      } else if (userData.followedGroups) {
        // Old structure: followedGroups is an array of group IDs
        followedGroupIds = userData.followedGroups
        console.log('🔍 MyAlerts - Using followedGroups structure')
      } else {
        // Try to load from subcollections (mobile app structure)
        console.log('🔍 MyAlerts - No groupPreferences or followedGroups found in main document, checking subcollections...')
        followedGroupIds = await loadFollowedGroupsFromSubcollectionsMyAlerts()
      }
      
      console.log('🔍 MyAlerts - User data from database:', userData)
      console.log('🔍 MyAlerts - Group preferences:', userData.groupPreferences)
      console.log('🔍 MyAlerts - Followed group names:', followedGroupIds)
      
      if (followedGroupIds.length === 0) {
        console.log('No followed groups found')
        return []
      }
      
      const groups = []
      for (const groupName of followedGroupIds) {
        try {
          console.log('🔍 MyAlerts - Loading group data for name:', groupName)
          // Search for group by name in all available groups
          const groupData = await findGroupByName(groupName)
          console.log('🔍 MyAlerts - Group data loaded:', groupData)
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

  const getAlertIcon = (type) => {
    switch (type) {
      case 'emergency':
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      default:
        return <Bell className="h-4 w-4 text-blue-600" />
    }
  }

  const getAlertColor = (type) => {
    switch (type) {
      case 'emergency':
        return 'bg-red-50 border-red-200'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200'
      default:
        return 'bg-blue-50 border-blue-200'
    }
  }

  const formatLocation = (location) => {
    if (!location) return null
    if (typeof location === 'string') return location
    if (typeof location === 'object') {
      return [location.address, location.city, location.state, location.zipCode]
        .filter(Boolean)
        .join(', ')
    }
    return null
  }

  // Filter alerts based on search term and maintain chronological order
  const filteredAlerts = alerts.filter(alert => {
    const searchLower = searchTerm.toLowerCase()
    return (
      alert.title?.toLowerCase().includes(searchLower) ||
      alert.message?.toLowerCase().includes(searchLower) ||
      alert.groupName?.toLowerCase().includes(searchLower) ||
      alert.organizationName?.toLowerCase().includes(searchLower) ||
      (alert.location && formatLocation(alert.location)?.toLowerCase().includes(searchLower))
    )
  }).sort((a, b) => {
    // Ensure search results are also sorted by creation date (newest first)
    const dateA = a.createdAt?.toDate?.() || new Date(0)
    const dateB = b.createdAt?.toDate?.() || new Date(0)
    return dateB - dateA // Newest first
  })

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">My Alerts</h1>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Alerts</h1>
          <p className="text-gray-600 mt-1">
            Alerts from {followedGroups.length} groups you follow
          </p>
        </div>
        <button
          onClick={loadUserAlerts}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Simple Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <Bell className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Alerts</p>
              <p className="text-2xl font-bold text-gray-900">{alerts.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Groups Following</p>
              <p className="text-2xl font-bold text-gray-900">{followedGroups.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search alerts by title, message, group, organization, or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Alerts List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {alerts.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No alerts yet</h3>
            <p className="text-gray-600 mb-4">
              {followedGroups.length === 0 
                ? "Follow some groups to start receiving alerts"
                : "Alerts from your followed groups will appear here"
              }
            </p>
            {followedGroups.length === 0 && (
              <button
                onClick={() => window.location.href = '/my-groups'}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Find Groups to Follow
              </button>
            )}
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="text-center py-12">
            <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No alerts found</h3>
            <p className="text-gray-600 mb-4">Try adjusting your search terms</p>
            <button
              onClick={() => setSearchTerm('')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Clear Search
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
            {filteredAlerts.map((alert) => (
              <div key={alert.id} className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow ${
                alert.type === 'emergency' ? 'border-l-4 border-l-red-500' :
                alert.type === 'warning' ? 'border-l-4 border-l-yellow-500' :
                'border-l-4 border-l-blue-500'
              }`}>
                <div className="space-y-3">
                  {/* Header with icon and type */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      {getAlertIcon(alert.type)}
                      <h3 className="text-lg font-semibold text-gray-900 leading-tight">{alert.title}</h3>
                    </div>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      alert.type === 'emergency' ? 'bg-red-100 text-red-800' :
                      alert.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {alert.type || 'info'}
                    </span>
                  </div>
                  
                  {/* Message */}
                  {(alert.message || alert.description || alert.content || alert.text) && (
                    <p className="text-gray-700 text-sm leading-relaxed">
                      {alert.message || alert.description || alert.content || alert.text}
                    </p>
                  )}
                  
                  {/* Organization and Group info */}
                  <div className="space-y-2">
                    <div className="flex items-center text-xs text-gray-600">
                      <Building className="h-3 w-3 mr-2 text-gray-400" />
                      <span className="font-medium truncate">{alert.organizationName || 'Unknown Organization'}</span>
                    </div>
                    
                    {alert.groupName && (
                      <div className="flex items-center text-xs text-gray-600">
                        <Users className="h-3 w-3 mr-2 text-gray-400" />
                        <span className="font-medium truncate">{alert.groupName}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Location and Date info */}
                  <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
                    <div className="flex items-center">
                      {formatLocation(alert.location) && (
                        <>
                          <MapPin className="h-3 w-3 mr-1 text-gray-400" />
                          <span className="truncate max-w-32">{formatLocation(alert.location)}</span>
                        </>
                      )}
                    </div>
                    
                    <div className="flex items-center">
                      <Clock className="h-3 w-3 mr-1 text-gray-400" />
                      <span>{alert.createdAt?.toDate?.()?.toLocaleDateString() || 'Recently'}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

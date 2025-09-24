import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { AlertTriangle, Bell, Users, Building, Clock, MapPin, Search, Trash2 } from 'lucide-react'
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore'
import { db } from '../services/firebase'
import adminService from '../services/adminService'
import AlertDetailsModal from '../components/AlertDetailsModal'
import { useCalendar } from '../contexts/CalendarContext'

export default function AdminMyAlerts() {
  const { currentUser, userProfile, forceUpdate } = useAuth()
  const { deleteScheduledAlert } = useCalendar()
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [followedGroups, setFollowedGroups] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedAlert, setSelectedAlert] = useState(null)
  const [showAlertDetails, setShowAlertDetails] = useState(false)

  useEffect(() => {
    if (currentUser && userProfile) {
      loadUserAlerts()
    }
  }, [currentUser, userProfile, forceUpdate])

  const loadUserAlerts = async () => {
    try {
      setLoading(true)
      console.log('🔍 AdminMyAlerts: Loading user alerts...')
      
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
        console.log('🔍 AdminMyAlerts: No organization ID found, setting empty alerts')
        setAlerts([])
        setLoading(false)
        return
      }
      
      console.log('🔍 AdminMyAlerts: Using organization ID:', orgId)
      
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
      
      console.log('🔍 AdminMyAlerts: Loaded', filteredAlerts.length, 'alerts from', groups.length, 'followed groups')
      setAlerts(filteredAlerts)
    } catch (error) {
      console.error('❌ AdminMyAlerts: Error loading user alerts:', error)
      setAlerts([])
    } finally {
      setLoading(false)
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

  const getAlertIcon = (type) => {
    switch (type) {
      case 'emergency':
        return <AlertTriangle className="h-6 w-6 text-red-600" />
      case 'warning':
        return <AlertTriangle className="h-6 w-6 text-yellow-600" />
      default:
        return <Bell className="h-6 w-6 text-blue-600" />
    }
  }

  const formatLocation = (location) => {
    if (!location) return null
    
    if (typeof location === 'string') {
      return location
    }
    
    if (typeof location === 'object') {
      const parts = [
        location.address,
        location.city,
        location.state,
        location.zipCode
      ].filter(Boolean)
      
      return parts.length > 0 ? parts.join(', ') : null
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

  // Handle alert click to show details
  const handleAlertClick = (alert) => {
    console.log('🔍 AdminMyAlerts: Alert clicked:', alert)
    setSelectedAlert(alert)
    setShowAlertDetails(true)
  }

  // Handle closing alert details modal
  const handleCloseAlertDetails = () => {
    setShowAlertDetails(false)
    setSelectedAlert(null)
  }

  // Handle alert deletion
  const handleDeleteAlert = async (alertId) => {
    if (window.confirm('Are you sure you want to delete this alert?')) {
      try {
        // Get organization ID for scheduled alert deletion
        let orgId = userProfile?.organizationId
        if (!orgId && userProfile?.organizations && userProfile.organizations.length > 0) {
          orgId = userProfile.organizations[0]
        }
        
        // Try to delete from both regular alerts and scheduled alerts
        const deletePromises = []
        
        if (orgId) {
          deletePromises.push(deleteScheduledAlert(alertId, orgId))
        }
        
        await Promise.allSettled(deletePromises)
        console.log('✅ Alert deletion completed')
        
        // Reload alerts to update the list
        await loadUserAlerts()
      } catch (error) {
        console.error('Error deleting alert:', error)
      }
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">My Alerts</h1>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Bell className="h-8 w-8 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">My Alerts</h1>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search alerts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Alerts List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {followedGroups.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Groups Followed</h3>
            <p className="text-gray-600 mb-4">Follow some groups to start receiving alerts</p>
            <button
              onClick={() => window.location.href = '/my-groups'}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Find Groups to Follow
            </button>
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
          <div className="space-y-4 p-6">
            {filteredAlerts.map((alert) => (
              <div 
                key={alert.id} 
                onClick={() => handleAlertClick(alert)}
                className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer ${
                  alert.type === 'emergency' ? 'border-l-4 border-l-red-500' :
                  alert.type === 'warning' ? 'border-l-4 border-l-yellow-500' :
                  'border-l-4 border-l-blue-500'
                }`}
              >
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 mt-1">
                    {getAlertIcon(alert.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900 leading-tight">{alert.title}</h3>
                      <div className="flex items-center space-x-2 ml-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          alert.type === 'emergency' ? 'bg-red-100 text-red-800' :
                          alert.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {alert.type || 'info'}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteAlert(alert.id)
                          }}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Delete alert"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    
                    {(alert.message || alert.description || alert.content || alert.text) && (
                      <p className="text-gray-700 mb-4 leading-relaxed text-base">
                        {alert.message || alert.description || alert.content || alert.text}
                      </p>
                    )}
                    
                    {/* Organization and Group info */}
                    <div className="flex items-center space-x-6 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <Building className="h-4 w-4 mr-2 text-gray-400" />
                        <span className="font-medium">{alert.organizationName || 'Unknown Organization'}</span>
                      </div>
                      
                      {alert.groupName && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Users className="h-4 w-4 mr-2 text-gray-400" />
                          <span className="font-medium">{alert.groupName}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Location and Date info */}
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center space-x-6">
                        {formatLocation(alert.location) && (
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                            <span className="truncate max-w-sm">{formatLocation(alert.location)}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center text-gray-500">
                        <Clock className="h-4 w-4 mr-2 text-gray-400" />
                        <span>{alert.createdAt?.toDate?.()?.toLocaleDateString() || 'Recently'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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

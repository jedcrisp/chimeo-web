import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { AlertTriangle, Bell, Users, Building, Clock, MapPin } from 'lucide-react'
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore'
import { db } from '../services/firebase'
import adminService from '../services/adminService'

export default function MyAlerts() {
  const { currentUser, userProfile } = useAuth()
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [followedGroups, setFollowedGroups] = useState([])

  useEffect(() => {
    if (currentUser && userProfile) {
      loadUserAlerts()
    }
  }, [currentUser, userProfile])

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
      
      // Load alerts from followed groups
      const groupIds = groups.map(g => g.id)
      const alertsQuery = query(
        collection(db, 'alerts'),
        where('groupId', 'in', groupIds),
        orderBy('createdAt', 'desc'),
        limit(50)
      )
      
      const alertsSnapshot = await getDocs(alertsQuery)
      const alertsData = alertsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      
      setAlerts(alertsData)
      console.log('✅ Loaded', alertsData.length, 'alerts from', groups.length, 'groups')
    } catch (error) {
      console.error('❌ Error loading user alerts:', error)
    } finally {
      setLoading(false)
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
      const followedGroupIds = userData.followedGroups || []
      
      console.log('🔍 MyAlerts - User data from database:', userData)
      console.log('🔍 MyAlerts - Followed group IDs:', followedGroupIds)
      
      if (followedGroupIds.length === 0) {
        console.log('No followed groups found')
        return []
      }
      
      const groups = []
      for (const groupId of followedGroupIds) {
        try {
          const groupData = await adminService.getGroupById(groupId)
          if (groupData) {
            groups.push(groupData)
          }
        } catch (error) {
          console.error('Error loading group:', groupId, error)
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
        return <AlertTriangle className="h-5 w-5 text-red-600" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />
      default:
        return <Bell className="h-5 w-5 text-blue-600" />
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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <Bell className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Alerts</p>
              <p className="text-2xl font-bold text-gray-900">{alerts.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Groups Following</p>
              <p className="text-2xl font-bold text-gray-900">{followedGroups.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <AlertTriangle className="h-8 w-8 text-red-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Emergency Alerts</p>
              <p className="text-2xl font-bold text-gray-900">
                {alerts.filter(a => a.type === 'emergency').length}
              </p>
            </div>
          </div>
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
        ) : (
          <div className="divide-y divide-gray-200">
            {alerts.map((alert) => (
              <div key={alert.id} className={`p-6 hover:bg-gray-50 transition-colors ${getAlertColor(alert.type)}`}>
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    {getAlertIcon(alert.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-gray-900">{alert.title}</h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        alert.type === 'emergency' ? 'bg-red-100 text-red-800' :
                        alert.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {alert.type || 'info'}
                      </span>
                    </div>
                    
                    <p className="text-gray-600 mt-1">{alert.message}</p>
                    
                    <div className="flex items-center space-x-4 mt-3 text-sm text-gray-500">
                      <div className="flex items-center">
                        <Building className="h-4 w-4 mr-1" />
                        <span>{alert.organizationName || 'Unknown Organization'}</span>
                      </div>
                      
                      {alert.groupName && (
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-1" />
                          <span>{alert.groupName}</span>
                        </div>
                      )}
                      
                      {formatLocation(alert.location) && (
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1" />
                          <span>{formatLocation(alert.location)}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
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
    </div>
  )
}

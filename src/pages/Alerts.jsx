import { useState, useEffect } from 'react'
import { useAlerts } from '../contexts/AlertContext'
import { useAuth } from '../contexts/AuthContext'
import { useCalendar } from '../contexts/CalendarContext'
import { collection, query, orderBy, getDocs } from 'firebase/firestore'
import { db } from '../services/firebase'
import { Plus, Edit, Trash2, X } from 'lucide-react'
import notificationService from '../services/notificationService'
import AlertDetailsModal from '../components/AlertDetailsModal'

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

export default function Alerts() {
  const { alerts, loading, deleteAlert, createAlert } = useAlerts()
  const { currentUser, userProfile } = useAuth()
  const { deleteScheduledAlert } = useCalendar()
  const [showNewAlertModal, setShowNewAlertModal] = useState(false)
  const [groups, setGroups] = useState([])
  const [groupsLoading, setGroupsLoading] = useState(true)
  const [selectedAlert, setSelectedAlert] = useState(null)
  const [showAlertDetails, setShowAlertDetails] = useState(false)
  const [newAlert, setNewAlert] = useState({
    title: '',
    message: '',
    type: 'info',
    location: '',
    groupId: '' // Add group selection
  })

  // Fetch groups for the user's organization
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        setGroupsLoading(true)
        
        // Get organization ID with fallback logic
        let orgId = userProfile?.organizationId
        if (!orgId && userProfile?.organizations && userProfile.organizations.length > 0) {
          orgId = userProfile.organizations[0] // organizations is array of strings
        }

        // Ensure orgId is a string
        if (orgId && typeof orgId !== 'string') {
          orgId = String(orgId)
        }

        if (!currentUser || !orgId) {
          setGroups([])
          return
        }

        console.log('🔍 Alerts: Fetching groups for organization:', orgId)

        // Get groups for the user's organization
        const groupsQuery = query(
          collection(db, 'organizations', orgId, 'groups'),
          orderBy('createdAt', 'desc')
        )

        const groupsSnapshot = await getDocs(groupsQuery)
        const groupsData = groupsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))

        setGroups(groupsData)
        console.log('✅ Loaded', groupsData.length, 'groups for organization:', orgId)
      } catch (error) {
        console.error('❌ Error fetching groups:', error)
      } finally {
        setGroupsLoading(false)
      }
    }

    if (currentUser && userProfile) {
      fetchGroups()
    }
  }, [currentUser, userProfile])

  const handleCreateAlert = async (e) => {
    e.preventDefault()
    
    // Validate that a group is selected
    if (!newAlert.groupId) {
      toast.error('Please select a target group for the alert')
      return
    }
    
    try {
      await createAlert(newAlert)
      
      // Cloud function will automatically send phone notifications to followers
      // No need to manually call notificationService here
      
      setNewAlert({ title: '', message: '', type: 'info', location: '', groupId: '' })
      setShowNewAlertModal(false)
    } catch (error) {
      console.error('Error creating alert:', error)
    }
  }

  const handleDeleteAlert = async (alertId) => {
    if (window.confirm('Are you sure you want to delete this alert?')) {
      try {
        // Get organization ID for scheduled alert deletion
        let orgId = userProfile?.organizationId
        if (!orgId && userProfile?.organizations && userProfile.organizations.length > 0) {
          orgId = userProfile.organizations[0]
        }
        
        // Try to delete from both regular alerts and scheduled alerts
        const deletePromises = [deleteAlert(alertId)]
        
        if (orgId) {
          deletePromises.push(deleteScheduledAlert(alertId, orgId))
        }
        
        await Promise.allSettled(deletePromises)
        console.log('✅ Alert deletion completed (some may have failed if alert type didn\'t match)')
      } catch (error) {
        console.error('Error deleting alert:', error)
      }
    }
  }

  // Handle alert click to show details
  const handleAlertClick = (alert) => {
    console.log('🔍 Alerts: Alert clicked:', alert)
    setSelectedAlert(alert)
    setShowAlertDetails(true)
  }

  // Handle closing alert details modal
  const handleCloseAlertDetails = () => {
    setShowAlertDetails(false)
    setSelectedAlert(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alerts</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage emergency alerts and notifications
          </p>
        </div>
        <button 
          onClick={() => setShowNewAlertModal(true)}
          className="bg-slate-900 hover:bg-slate-800 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>New Alert</span>
        </button>
      </div>

      {/* New Alert Modal */}
      {showNewAlertModal && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowNewAlertModal(false)
            }
          }}
        >
          <div className="relative w-full max-w-md mx-auto bg-white rounded-lg shadow-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">Create New Alert</h3>
                <button
                  onClick={() => setShowNewAlertModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <form onSubmit={handleCreateAlert} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    required
                    value={newAlert.title}
                    onChange={(e) => setNewAlert({ ...newAlert, title: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all duration-200"
                    placeholder="Alert title"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={newAlert.message}
                    onChange={(e) => setNewAlert({ ...newAlert, message: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all duration-200"
                    placeholder="Alert message"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {[
                      { value: 'info', label: '📢 Info', color: 'bg-blue-100 border-blue-300 text-blue-800' },
                      { value: 'warning', label: '⚠️ Warning', color: 'bg-yellow-100 border-yellow-300 text-yellow-800' },
                      { value: 'emergency', label: '🚨 Emergency', color: 'bg-red-100 border-red-300 text-red-800' }
                    ].map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setNewAlert({ ...newAlert, type: type.value })}
                        className={`p-3 border-2 rounded-lg font-medium transition-all ${
                          newAlert.type === type.value 
                            ? `${type.color} border-current` 
                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">
                    {newAlert.type === 'info' && 'General information for your community'}
                    {newAlert.type === 'warning' && 'Important notice requiring attention'}
                    {newAlert.type === 'emergency' && 'Critical situation requiring immediate action'}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={newAlert.location}
                    onChange={(e) => setNewAlert({ ...newAlert, location: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all duration-200"
                    placeholder="Location (optional)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Group <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newAlert.groupId}
                    onChange={(e) => setNewAlert({ ...newAlert, groupId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all duration-200"
                    required
                  >
                    <option value="">- Select a group -</option>
                    {groupsLoading ? (
                      <option disabled>Loading groups...</option>
                    ) : groups.length === 0 ? (
                      <option disabled>No groups available</option>
                    ) : (
                      groups.map(group => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))
                    )}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Select a specific group to target your alert
                  </p>
                </div>
                
                {/* Alert Preview */}
                {newAlert.title && newAlert.message && (
                  <div className="p-4 bg-gray-50 rounded-lg border">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Preview:</h4>
                    <div className={`p-3 rounded-lg border-2 ${
                      newAlert.type === 'info' ? 'bg-blue-50 border-blue-200' :
                      newAlert.type === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                      'bg-red-50 border-red-200'
                    }`}>
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`text-lg ${
                          newAlert.type === 'info' ? 'text-blue-600' :
                          newAlert.type === 'warning' ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {newAlert.type === 'info' ? '📢' : newAlert.type === 'warning' ? '⚠️' : '🚨'}
                        </span>
                        <h5 className="font-semibold text-gray-900">{newAlert.title}</h5>
                      </div>
                      <p className="text-gray-700">{newAlert.message}</p>
                      {newAlert.location && (
                        <p className="text-sm text-gray-500 mt-2">📍 {newAlert.location}</p>
                      )}
                      <div className="mt-2 text-xs text-gray-500">
                        This alert will be sent to all followers of your organization via phone notifications.
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowNewAlertModal(false)}
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-slate-900 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-slate-800 transition-colors duration-200"
                  >
                    Create Alert
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Alerts List */}
      {alerts.length === 0 ? (
        <div className="card text-center py-12">
          <BellIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No alerts yet</h3>
          <p className="text-gray-500 mb-4">
            Get started by creating your first alert to notify your community.
          </p>
          <button
            onClick={() => setShowNewAlertModal(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center space-x-2 mx-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Create Alert</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <div 
              key={alert.id} 
              onClick={() => handleAlertClick(alert)}
              className="card cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100">
                      <BellIcon className="h-4 w-4 text-primary-600" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900">
                      {alert.title || 'Alert'}
                    </h3>
                    <p className="text-gray-600 mt-1">
                      {alert.message || 'No message provided'}
                    </p>
                    <div className="flex items-center mt-2 text-sm text-gray-500">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        alert.type === 'emergency' ? 'bg-red-100 text-red-800' :
                        alert.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {alert.type || 'info'}
                      </span>
                      {alert.location && typeof alert.location === 'string' && (
                        <>
                          <span className="mx-2">•</span>
                          <span>{alert.location}</span>
                        </>
                      )}
                      {alert.location && typeof alert.location === 'object' && (
                        <>
                          <span className="mx-2">•</span>
                          <span>
                            {[alert.location.address, alert.location.city, alert.location.state, alert.location.zipCode]
                              .filter(Boolean)
                              .join(', ')}
                          </span>
                        </>
                      )}
                      {alert.groupId && (
                        <>
                          <span className="mx-2">•</span>
                          <span className="text-blue-600 font-medium">
                            Group: {groups.find(g => g.id === alert.groupId)?.name || 'Unknown Group'}
                          </span>
                        </>
                      )}
                      {alert.createdAt && (
                        <>
                          <span className="mx-2">•</span>
                          <span>{alert.createdAt.toDate().toLocaleDateString()}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleDeleteAlert(alert.id)}
                    className="text-red-600 hover:text-red-800"
                    title="Delete alert"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Alert Details Modal */}
      <AlertDetailsModal
        isOpen={showAlertDetails}
        onClose={handleCloseAlertDetails}
        alert={selectedAlert}
      />
    </div>
  )
}

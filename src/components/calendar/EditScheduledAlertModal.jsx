import { useState, useEffect } from 'react'
import { useCalendar } from '../../contexts/CalendarContext'
import { useAuth } from '../../contexts/AuthContext'
import { useOrganizations } from '../../contexts/OrganizationsContext'
import groupService from '../../services/groupService'
import { 
  IncidentType, 
  IncidentTypeLabels, 
  IncidentSeverity, 
  IncidentSeverityLabels, 
  IncidentSeverityColors,
  RecurrenceFrequency, 
  RecurrenceFrequencyLabels 
} from '../../models/calendarModels'
import { X, Bell, Clock, MapPin, Building, Users, Trash2 } from 'lucide-react'

export default function EditScheduledAlertModal({ isOpen, onClose, alert }) {
  const { updateScheduledAlert, deleteScheduledAlert } = useCalendar()
  const { currentUser, userProfile } = useAuth()
  const { organizations } = useOrganizations()
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: '',
    severity: '',
    scheduledDate: new Date(),
    organizationId: '',
    organizationName: '',
    groupId: '',
    groupName: '',
    isRecurring: false,
    recurrenceFrequency: RecurrenceFrequency.WEEKLY,
    recurrenceInterval: 1,
    recurrenceEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    expiresAt: null,
    hasExpiration: false
  })
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [availableGroups, setAvailableGroups] = useState([])
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Initialize form data when alert changes
  useEffect(() => {
    if (alert) {
      setFormData({
        title: alert.title || '',
        description: alert.description || '',
        type: alert.type || '',
        severity: alert.severity || '',
        scheduledDate: alert.scheduledDate ? new Date(alert.scheduledDate) : new Date(),
        organizationId: alert.organizationId || '',
        organizationName: alert.organizationName || '',
        groupId: alert.groupId || '',
        groupName: alert.groupName || '',
        isRecurring: alert.isRecurring || false,
        recurrenceFrequency: alert.recurrencePattern?.frequency || RecurrenceFrequency.WEEKLY,
        recurrenceInterval: alert.recurrencePattern?.interval || 1,
        recurrenceEndDate: alert.recurrencePattern?.endDate ? new Date(alert.recurrencePattern.endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        expiresAt: alert.expiresAt ? new Date(alert.expiresAt) : null,
        hasExpiration: !!alert.expiresAt
      })
      
      // Load groups for the alert's organization
      if (alert.organizationId) {
        loadGroupsForOrganization(alert.organizationId)
      }
    }
  }, [alert])

  // Auto-set user's organization and fetch groups when modal opens
  useEffect(() => {
    if (isOpen) {
      // If editing an existing alert, use its organization
      if (alert?.organizationId) {
        loadGroupsForOrganization(alert.organizationId)
      } 
      // If creating new alert and user is admin, use their organization
      else if (userProfile?.isOrganizationAdmin && userProfile?.organizations?.length > 0) {
        const userOrgId = userProfile.organizations[0]
        const userOrg = organizations.find(org => org.id === userOrgId)
        
        if (userOrg) {
          setFormData(prev => ({
            ...prev,
            organizationId: userOrgId,
            organizationName: userOrg.name
          }))
          
          loadGroupsForOrganization(userOrgId)
        }
      }
    }
  }, [isOpen, alert, userProfile, organizations])

  const loadGroupsForOrganization = async (orgId) => {
    try {
      console.log('Loading groups for organization:', orgId)
      const groups = await groupService.getGroupsForOrganization(orgId)
      console.log('Loaded groups:', groups)
      setAvailableGroups(groups)
    } catch (error) {
      console.error('Error loading groups:', error)
      setAvailableGroups([])
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.title.trim()) {
      setError('Title is required')
      return
    }
    
    if (!formData.description.trim()) {
      setError('Description is required')
      return
    }
    
    if (!formData.groupId) {
      setError('Target group is required')
      return
    }
    
    if (!formData.organizationId) {
      setError('Organization is required')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const selectedGroup = availableGroups.find(g => g.id === formData.groupId)
      
      const alertData = {
        title: formData.title,
        description: formData.description,
        organizationId: formData.organizationId,
        organizationName: formData.organizationName,
        groupId: formData.groupId || null,
        groupName: selectedGroup?.name || null,
        type: formData.type,
        severity: formData.severity,
        location: null,
        scheduledDate: formData.scheduledDate,
        isRecurring: formData.isRecurring,
        recurrencePattern: formData.isRecurring ? {
          frequency: formData.recurrenceFrequency,
          interval: formData.recurrenceInterval,
          endDate: formData.recurrenceEndDate
        } : null,
        postedBy: currentUser?.displayName || currentUser?.email || 'Unknown',
        postedByUserId: currentUser?.uid || 'unknown',
        expiresAt: formData.hasExpiration ? formData.expiresAt : null
      }

      await updateScheduledAlert(alert.id, alertData)
      onClose()
    } catch (err) {
      console.error('Error updating scheduled alert:', err)
      setError(err.message || 'Failed to update scheduled alert')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this scheduled alert? This action cannot be undone.')) {
      try {
        await deleteScheduledAlert(alert.id)
        onClose()
      } catch (err) {
        console.error('Error deleting scheduled alert:', err)
        setError(err.message || 'Failed to delete scheduled alert')
      }
    }
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (error) setError('')
  }

  const formatDateTimeForInput = (date) => {
    if (!date) return ''
    const d = new Date(date)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  if (!isOpen || !alert) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Bell className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Edit Scheduled Alert</h2>
                <p className="text-sm text-gray-500">Modify alert details and schedule</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="space-y-6">
            {/* Title and Description */}
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alert Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Enter alert title"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Enter alert description"
                  required
                />
              </div>
            </div>

            {/* Type and Severity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alert Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => handleInputChange('type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">Select Alert Type</option>
                  {Object.entries(IncidentTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Severity
                </label>
                <select
                  value={formData.severity}
                  onChange={(e) => handleInputChange('severity', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">Select Severity</option>
                  {Object.entries(IncidentSeverityLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Schedule */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Scheduled Date & Time
              </label>
              <input
                type="datetime-local"
                value={formatDateTimeForInput(formData.scheduledDate)}
                onChange={(e) => handleInputChange('scheduledDate', new Date(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              />
            </div>

            {/* Organization and Group */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organization *
                </label>
                <select
                  value={formData.organizationId}
                  onChange={(e) => {
                    const selectedOrg = organizations.find(org => org.id === e.target.value)
                    handleInputChange('organizationId', e.target.value)
                    handleInputChange('organizationName', selectedOrg?.name || '')
                    if (selectedOrg) {
                      loadGroupsForOrganization(selectedOrg.id)
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                >
                  <option value="">Select Organization</option>
                  {organizations.map(org => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Group *
                </label>
                <select
                  value={formData.groupId}
                  onChange={(e) => {
                    const selectedGroup = availableGroups.find(g => g.id === e.target.value)
                    handleInputChange('groupId', e.target.value)
                    handleInputChange('groupName', selectedGroup?.name || '')
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                >
                  <option value="">Select Group</option>
                  {availableGroups.map(group => (
                    <option key={group.id} value={group.id}>{group.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Recurrence */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-4">
                <input
                  type="checkbox"
                  id="isRecurring"
                  checked={formData.isRecurring}
                  onChange={(e) => handleInputChange('isRecurring', e.target.checked)}
                  className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                />
                <label htmlFor="isRecurring" className="text-sm font-medium text-gray-700">
                  Make this a recurring alert
                </label>
              </div>
              
              {formData.isRecurring && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Frequency
                    </label>
                    <select
                      value={formData.recurrenceFrequency}
                      onChange={(e) => handleInputChange('recurrenceFrequency', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      {Object.entries(RecurrenceFrequencyLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Every
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.recurrenceInterval}
                      onChange={(e) => handleInputChange('recurrenceInterval', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={formData.recurrenceEndDate ? formData.recurrenceEndDate.toISOString().split('T')[0] : ''}
                      onChange={(e) => handleInputChange('recurrenceEndDate', new Date(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleDelete}
              className="flex items-center space-x-2 px-4 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete Alert</span>
            </button>
            
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Updating...' : 'Update Alert'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

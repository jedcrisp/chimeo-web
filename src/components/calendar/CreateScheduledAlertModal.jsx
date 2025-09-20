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
import { X, Bell, Clock, MapPin, Building, Users, Calendar } from 'lucide-react'

export default function CreateScheduledAlertModal({ isOpen, onClose }) {
  const { createScheduledAlert } = useCalendar()
  const { currentUser, userProfile } = useAuth()
  const { organizations } = useOrganizations()
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: '',
    severity: '',
    scheduledDate: new Date(Date.now() + 60 * 60 * 1000), // 1 hour later
    organizationId: '',
    organizationName: '',
    groupId: '',
    groupName: '',
    isRecurring: false,
    recurrenceFrequency: RecurrenceFrequency.WEEKLY,
    recurrenceInterval: 1,
    recurrenceEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days later
    expiresAt: null,
    hasExpiration: false
  })
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [availableGroups, setAvailableGroups] = useState([])
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
  const [selectedDates, setSelectedDates] = useState([])
  const [isDuplicating, setIsDuplicating] = useState(false)

  // Auto-set user's organization and fetch groups when modal opens
  useEffect(() => {
    if (isOpen && userProfile?.isOrganizationAdmin && userProfile?.organizations?.length > 0) {
      const organizationId = userProfile.organizations[0] // Use first organization
      
      setFormData(prev => ({
        ...prev,
        organizationId: organizationId,
        organizationName: organizationId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) // Convert ID to readable name
      }))
      
      // Fetch groups for the user's organization
      fetchGroupsForOrganization(organizationId)
    }
  }, [isOpen, userProfile])

  // Fetch groups for a specific organization
  const fetchGroupsForOrganization = async (organizationId) => {
    try {
      const groups = await groupService.getGroupsForOrganization(organizationId)
      setAvailableGroups(groups)
    } catch (error) {
      console.error('Error fetching groups:', error)
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

      await createScheduledAlert(alertData)
      onClose()
    } catch (err) {
      console.error('Error creating scheduled alert:', err)
      setError(err.message || 'Failed to create scheduled alert')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (error) setError('')
  }

  const handleDuplicateAlert = async () => {
    if (selectedDates.length === 0) {
      setError('Please select at least one date to duplicate the alert to')
      return
    }

    setIsDuplicating(true)
    setError('')

    try {
      // First create the original alert
      const originalAlertData = {
        title: formData.title,
        description: formData.description,
        organizationId: formData.organizationId,
        organizationName: formData.organizationName,
        groupId: formData.groupId || null,
        groupName: formData.groupName || null,
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

      await createScheduledAlert(originalAlertData)

      // Then create duplicates for selected dates
      for (const date of selectedDates) {
        const alertData = {
          ...originalAlertData,
          scheduledDate: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 
            formData.scheduledDate.getHours(), formData.scheduledDate.getMinutes())
        }

        await createScheduledAlert(alertData)
      }

      alert(`Successfully created ${selectedDates.length + 1} alerts (1 original + ${selectedDates.length} duplicates)`)
      setShowDuplicateModal(false)
      setSelectedDates([])
      onClose()
    } catch (err) {
      console.error('Error duplicating alert:', err)
      setError(err.message || 'Failed to duplicate alert')
    } finally {
      setIsDuplicating(false)
    }
  }

  const toggleDateSelection = (date) => {
    const dateString = date.toDateString()
    setSelectedDates(prev => {
      if (prev.some(d => d.toDateString() === dateString)) {
        return prev.filter(d => d.toDateString() !== dateString)
      } else {
        return [...prev, new Date(date)]
      }
    })
  }



  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <Bell className="h-6 w-6 text-red-600" />
              <h2 className="text-xl font-semibold text-gray-900">Schedule Alert</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Scheduled Date
                </label>
                <input
                  type="date"
                  value={formData.scheduledDate.toISOString().slice(0, 10)}
                  onChange={(e) => {
                    const newDate = new Date(formData.scheduledDate)
                    const [year, month, day] = e.target.value.split('-')
                    newDate.setFullYear(parseInt(year), parseInt(month) - 1, parseInt(day))
                    handleInputChange('scheduledDate', newDate)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Scheduled Time
                </label>
                <input
                  type="time"
                  value={formData.scheduledDate.toTimeString().slice(0, 5)}
                  onChange={(e) => {
                    const newDate = new Date(formData.scheduledDate)
                    const [hours, minutes] = e.target.value.split(':')
                    newDate.setHours(parseInt(hours), parseInt(minutes))
                    handleInputChange('scheduledDate', newDate)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>
            </div>

            {/* Target Group */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Group *
              </label>
              <select
                value={formData.groupId}
                onChange={(e) => {
                  const selectedGroup = availableGroups.find(g => g.id === e.target.value)
                  setFormData(prev => ({
                    ...prev,
                    groupId: e.target.value,
                    groupName: selectedGroup?.name || ''
                  }))
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              >
                <option value="">-</option>
                {availableGroups.map(group => (
                  <option key={group.id} value={group.id}>{group.name}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {availableGroups.length > 0 
                  ? `Select a group to send the alert to (${availableGroups.length} groups available)`
                  : 'No groups available for this organization'
                }
              </p>
              {availableGroups.length > 0 && (
                <div className="text-xs text-gray-400 mt-1">
                  Available groups: {availableGroups.map(g => g.name).join(', ')}
                </div>
              )}
            </div>


            {/* Recurrence */}
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isRecurring"
                  checked={formData.isRecurring}
                  onChange={(e) => handleInputChange('isRecurring', e.target.checked)}
                  className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                />
                <label htmlFor="isRecurring" className="ml-2 text-sm text-gray-700">
                  Repeat Alert
                </label>
              </div>

              {formData.isRecurring && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-6">
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
                      max="99"
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
                      value={formData.recurrenceEndDate.toISOString().slice(0, 10)}
                      onChange={(e) => handleInputChange('recurrenceEndDate', new Date(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Expiration */}
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="hasExpiration"
                  checked={formData.hasExpiration}
                  onChange={(e) => handleInputChange('hasExpiration', e.target.checked)}
                  className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                />
                <label htmlFor="hasExpiration" className="ml-2 text-sm text-gray-700">
                  Set Expiration
                </label>
              </div>

              {formData.hasExpiration && (
                <div className="pl-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Expiration Date
                    </label>
                    <input
                      type="date"
                      value={formData.expiresAt ? formData.expiresAt.toISOString().slice(0, 10) : ''}
                      onChange={(e) => {
                        if (e.target.value) {
                          const newDate = new Date(formData.expiresAt || new Date())
                          const [year, month, day] = e.target.value.split('-')
                          newDate.setFullYear(parseInt(year), parseInt(month) - 1, parseInt(day))
                          handleInputChange('expiresAt', newDate)
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Expiration Time
                    </label>
                    <input
                      type="time"
                      value={formData.expiresAt ? formData.expiresAt.toTimeString().slice(0, 5) : ''}
                      onChange={(e) => {
                        if (e.target.value) {
                          const newDate = new Date(formData.expiresAt || new Date())
                          const [hours, minutes] = e.target.value.split(':')
                          newDate.setHours(parseInt(hours), parseInt(minutes))
                          handleInputChange('expiresAt', newDate)
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-gray-200">
              {/* Duplicate Button */}
              <button
                type="button"
                onClick={() => setShowDuplicateModal(true)}
                className="flex items-center justify-center space-x-2 px-3 py-2 text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:text-blue-800 hover:bg-blue-100 hover:border-blue-300 transition-all duration-200 shadow-sm whitespace-nowrap"
              >
                <Calendar className="h-3 w-3 flex-shrink-0" />
                <span>Duplicate to Multiple Days</span>
              </button>
              
              {/* Form Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 whitespace-nowrap"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 whitespace-nowrap"
                >
                  {isLoading ? 'Scheduling...' : 'Schedule Alert'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Duplicate Modal */}
      {showDuplicateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Calendar className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Create Alert for Multiple Days</h2>
                    <p className="text-sm text-gray-500">Select dates to create this alert for multiple days</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowDuplicateModal(false)
                    onClose()
                  }}
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

              {/* Date Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select Dates (Click to toggle selection)
                </label>
                <div className="grid grid-cols-7 gap-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-4">
                  {(() => {
                    const dates = []
                    const today = new Date()
                    for (let i = 0; i < 30; i++) {
                      const date = new Date(today)
                      date.setDate(today.getDate() + i)
                      dates.push(date)
                    }
                    return dates.map((date, index) => {
                      const isSelected = selectedDates.some(d => d.toDateString() === date.toDateString())
                      return (
                        <button
                          key={index}
                          type="button"
                          onClick={() => toggleDateSelection(date)}
                          className={`p-2 text-sm rounded-md border transition-colors ${
                            isSelected
                              ? 'bg-blue-100 border-blue-500 text-blue-700'
                              : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <div className="text-xs font-medium">
                            {date.toLocaleDateString('en-US', { weekday: 'short' })}
                          </div>
                          <div className="text-sm font-semibold">
                            {date.getDate()}
                          </div>
                          <div className="text-xs text-gray-500">
                            {date.toLocaleDateString('en-US', { month: 'short' })}
                          </div>
                        </button>
                      )
                    })
                  })()}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Selected {selectedDates.length} date{selectedDates.length !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowDuplicateModal(false)
                    onClose()
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDuplicateAlert}
                  disabled={isDuplicating || selectedDates.length === 0}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isDuplicating ? 'Creating...' : `Create ${selectedDates.length + 1} Alert${selectedDates.length !== 0 ? 's' : ''}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

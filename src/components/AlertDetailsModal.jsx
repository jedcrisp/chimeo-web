import { useState, useEffect } from 'react'
import { X, Bell, MapPin, Users, Building, Clock, AlertTriangle, Shield, Calendar } from 'lucide-react'
import { useOrganizations } from '../contexts/OrganizationsContext'

export default function AlertDetailsModal({ isOpen, onClose, alert }) {
  const { organizations } = useOrganizations()
  const [groupInfo, setGroupInfo] = useState(null)
  const [organizationInfo, setOrganizationInfo] = useState(null)

  // Load group and organization info when alert changes
  useEffect(() => {
    if (alert && isOpen) {
      loadAlertDetails()
    }
  }, [alert, isOpen])

  const loadAlertDetails = async () => {
    try {
      // Find organization info
      if (alert.organizationId) {
        const org = organizations.find(o => o.id === alert.organizationId)
        if (org) {
          setOrganizationInfo(org)
        }
      }

      // Find group info if we have organization info
      if (alert.groupId && organizationInfo) {
        // This would need to be implemented based on your group service
        // For now, we'll just use the group name from the alert
        setGroupInfo({
          id: alert.groupId,
          name: alert.groupName || 'Unknown Group'
        })
      }
    } catch (error) {
      console.error('Error loading alert details:', error)
    }
  }

  const getAlertIcon = (type) => {
    switch (type) {
      case 'emergency':
        return <AlertTriangle className="h-6 w-6 text-red-600" />
      case 'warning':
        return <Shield className="h-6 w-6 text-yellow-600" />
      default:
        return <Bell className="h-6 w-6 text-blue-600" />
    }
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatDate = (date) => {
    if (!date) return 'Unknown'
    if (date.toDate) {
      return date.toDate().toLocaleString()
    }
    if (date instanceof Date) {
      return date.toLocaleString()
    }
    return new Date(date).toLocaleString()
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

  if (!isOpen || !alert) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              {getAlertIcon(alert.type)}
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Alert Details</h2>
                <p className="text-sm text-gray-500">
                  {alert.type ? alert.type.charAt(0).toUpperCase() + alert.type.slice(1) : 'Alert'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Title and Description */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{alert.title}</h3>
              {(alert.message || alert.description || alert.content || alert.text) && (
                <p className="text-gray-700 leading-relaxed">
                  {alert.message || alert.description || alert.content || alert.text}
                </p>
              )}
            </div>

            {/* Alert Type and Severity */}
            <div className="flex flex-wrap gap-3">
              {alert.type && (
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  alert.type === 'emergency' ? 'bg-red-100 text-red-800' :
                  alert.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {alert.type.charAt(0).toUpperCase() + alert.type.slice(1)}
                </span>
              )}
              
              {alert.severity && (
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getSeverityColor(alert.severity)}`}>
                  {alert.severity.charAt(0).toUpperCase() + alert.severity.slice(1)} Severity
                </span>
              )}
            </div>

            {/* Organization and Group Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {organizationInfo && (
                <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Building className="h-5 w-5 text-gray-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Organization</p>
                    <p className="text-sm text-gray-600">{organizationInfo.name}</p>
                  </div>
                </div>
              )}

              {groupInfo && (
                <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Users className="h-5 w-5 text-gray-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Target Group</p>
                    <p className="text-sm text-gray-600">{groupInfo.name}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Location */}
            {formatLocation(alert.location) && (
              <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <MapPin className="h-5 w-5 text-gray-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Location</p>
                  <p className="text-sm text-gray-600">{formatLocation(alert.location)}</p>
                </div>
              </div>
            )}

            {/* Timestamps */}
            <div className="space-y-3">
              {alert.createdAt && (
                <div className="flex items-center space-x-3 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>Created: {formatDate(alert.createdAt)}</span>
                </div>
              )}

              {alert.scheduledDate && (
                <div className="flex items-center space-x-3 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>Scheduled: {formatDate(alert.scheduledDate)}</span>
                </div>
              )}

              {alert.expiresAt && (
                <div className="flex items-center space-x-3 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>Expires: {formatDate(alert.expiresAt)}</span>
                </div>
              )}
            </div>

            {/* Posted By */}
            {(alert.postedBy || alert.postedByUserId) && (
              <div className="border-t border-gray-200 pt-4">
                <p className="text-sm text-gray-500">
                  Posted by: {alert.postedBy || 'Unknown User'}
                  {alert.postedByUserId && alert.postedByUserId !== 'unknown' && (
                    <span className="ml-2 text-xs text-gray-400">({alert.postedByUserId})</span>
                  )}
                </p>
              </div>
            )}

            {/* Additional Details */}
            {alert.isRecurring && (
              <div className="border-t border-gray-200 pt-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Recurrence Pattern</p>
                <div className="text-sm text-gray-600">
                  {alert.recurrencePattern?.frequency && (
                    <p>Frequency: {alert.recurrencePattern.frequency}</p>
                  )}
                  {alert.recurrencePattern?.interval && (
                    <p>Interval: Every {alert.recurrencePattern.interval}</p>
                  )}
                  {alert.recurrencePattern?.endDate && (
                    <p>Ends: {formatDate(alert.recurrencePattern.endDate)}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end p-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

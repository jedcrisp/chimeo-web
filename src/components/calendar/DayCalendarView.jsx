import { useState } from 'react'
import { useCalendar } from '../../contexts/CalendarContext'
import { IncidentSeverityColors } from '../../models/calendarModels'
import { Trash2 } from 'lucide-react'
import EditScheduledAlertModal from './EditScheduledAlertModal'

export default function DayCalendarView() {
  const { selectedDate, getEventsForDate, getScheduledAlertsForDate, filter, deleteScheduledAlert } = useCalendar()
  const [selectedAlert, setSelectedAlert] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)

  const getEventsForDay = () => {
    const dayEvents = getEventsForDate(selectedDate).filter(event => filter.showEvents)
    const dayAlerts = getScheduledAlertsForDate(selectedDate).filter(alert => {
      if (!filter.showAlerts) return false
      
      // If no types are selected, show all types
      const typeMatch = filter.selectedTypes.size === 0 || filter.selectedTypes.has(alert.type)
      // If no severities are selected, show all severities
      const severityMatch = filter.selectedSeverities.size === 0 || filter.selectedSeverities.has(alert.severity)
      
      return typeMatch && severityMatch
    })
    
    return { events: dayEvents, alerts: dayAlerts }
  }

  const isToday = () => {
    const today = new Date()
    return selectedDate.toDateString() === today.toDateString()
  }

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })
  }

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const handleDeleteScheduledAlert = async (alertId) => {
    if (window.confirm('Are you sure you want to delete this scheduled alert?')) {
      try {
        await deleteScheduledAlert(alertId)
      } catch (error) {
        console.error('Error deleting scheduled alert:', error)
        alert('Failed to delete scheduled alert. Please try again.')
      }
    }
  }

  const handleAlertClick = (alert) => {
    console.log('🔍 DayCalendarView: Alert clicked:', alert)
    console.log('🔍 DayCalendarView: Alert data:', JSON.stringify(alert, null, 2))
    setSelectedAlert(alert)
    setShowEditModal(true)
  }

  const handleCloseEditModal = () => {
    setShowEditModal(false)
    setSelectedAlert(null)
  }

  const { events: dayEvents, alerts: dayAlerts } = getEventsForDay()
  const allItems = [...dayEvents, ...dayAlerts].sort((a, b) => {
    const aTime = a.startDate || a.scheduledDate
    const bTime = b.startDate || b.scheduledDate
    return aTime - bTime
  })

  return (
    <div className="space-y-6">
      {/* Date header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">
          {formatDate(selectedDate)}
        </h2>
        {isToday() && (
          <span className="mt-2 inline-block px-3 py-1 text-sm font-medium text-blue-600 bg-blue-100 rounded-full">
            Today
          </span>
        )}
      </div>

      {/* Events and alerts list */}
      {allItems.length > 0 ? (
        <div className="space-y-4">
          {allItems.map((item, index) => {
            const isEvent = 'startDate' in item
            const time = isEvent ? item.startDate : item.scheduledDate
            
            return (
              <div
                key={isEvent ? `event-${item.id}` : `alert-${item.id}`}
                className={`flex items-start space-x-4 p-4 rounded-lg border ${
                  isEvent 
                    ? 'bg-gray-50 border-gray-200 hover:bg-gray-100' 
                    : 'bg-red-50 border-red-200 hover:bg-red-100'
                }`}
              >
                {/* Time */}
                <div className="flex-shrink-0 w-20 text-right">
                  <span className="text-sm font-medium text-gray-900">
                    {formatTime(time)}
                  </span>
                </div>

                {/* Color indicator */}
                <div
                  className="w-4 h-4 rounded-full mt-1 flex-shrink-0"
                  style={{ 
                    backgroundColor: isEvent 
                      ? item.color 
                      : IncidentSeverityColors[item.severity] 
                  }}
                />

                {/* Content */}
                <div 
                  className={`flex-1 min-w-0 ${!isEvent ? 'cursor-pointer' : ''}`}
                  onClick={!isEvent ? () => handleAlertClick(item) : undefined}
                >
                  <h3 className="text-lg font-medium text-gray-900">
                    {item.title}
                  </h3>
                  
                  <p className="mt-1 text-sm text-gray-600">
                    {item.description}
                  </p>

                  {/* Metadata */}
                  <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                    {isEvent ? (
                      <>
                        {item.isAllDay && (
                          <span>All Day</span>
                        )}
                        {item.location && (
                          <span>📍 {item.location}</span>
                        )}
                        <span>📅 Event</span>
                      </>
                    ) : (
                      <>
                        <span>🚨 {item.type}</span>
                        <span 
                          className="font-medium"
                          style={{ color: IncidentSeverityColors[item.severity] }}
                        >
                          {item.severity}
                        </span>
                        <span>👥 {item.organizationName}</span>
                        {item.groupName && (
                          <span>• {item.groupName}</span>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {!isEvent && (
                  <div className="flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteScheduledAlert(item.id)
                      }}
                      className="text-red-600 hover:text-red-800 p-1 rounded-md hover:bg-red-100"
                      title="Delete scheduled alert"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No events or alerts</h3>
          <p className="text-gray-500">
            {isToday() ? "Nothing scheduled for today" : "Nothing scheduled for this day"}
          </p>
        </div>
      )}

      {/* Edit Modal */}
      <EditScheduledAlertModal
        isOpen={showEditModal}
        onClose={handleCloseEditModal}
        alert={selectedAlert}
      />
    </div>
  )
}

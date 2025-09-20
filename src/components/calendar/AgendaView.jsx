import { useState } from 'react'
import { useCalendar } from '../../contexts/CalendarContext'
import { IncidentSeverityColors } from '../../models/calendarModels'
import { Trash2 } from 'lucide-react'
import EditScheduledAlertModal from './EditScheduledAlertModal'

export default function AgendaView() {
  const { events, scheduledAlerts, filter, getUpcomingAlerts, deleteScheduledAlert } = useCalendar()
  const [selectedAlert, setSelectedAlert] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)

  const getUpcomingItems = () => {
    const upcomingEvents = events
      .filter(event => event.isUpcoming && filter.showEvents)
      .map(event => ({ ...event, type: 'event' }))
    
    const upcomingAlerts = scheduledAlerts
      .filter(alert => 
        alert.isUpcoming && 
        alert.isActive && 
        filter.showAlerts &&
        filter.selectedTypes.has(alert.type) &&
        filter.selectedSeverities.has(alert.severity)
      )
      .map(alert => ({ ...alert, type: 'alert' }))
    
    return [...upcomingEvents, ...upcomingAlerts]
      .sort((a, b) => {
        const aTime = a.startDate || a.scheduledDate
        const bTime = b.startDate || b.scheduledDate
        return aTime - bTime
      })
  }

  const formatDate = (date) => {
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow'
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'long',
        month: 'short',
        day: 'numeric'
      })
    }
  }

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
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
    setSelectedAlert(alert)
    setShowEditModal(true)
  }

  const handleCloseEditModal = () => {
    setShowEditModal(false)
    setSelectedAlert(null)
  }

  const groupItemsByDate = (items) => {
    const groups = {}
    
    items.forEach(item => {
      const date = item.startDate || item.scheduledDate
      const dateKey = date.toDateString()
      
      if (!groups[dateKey]) {
        groups[dateKey] = {
          date: date,
          items: []
        }
      }
      
      groups[dateKey].items.push(item)
    })
    
    return Object.values(groups).sort((a, b) => a.date - b.date)
  }

  const upcomingItems = getUpcomingItems()
  const groupedItems = groupItemsByDate(upcomingItems)

  return (
    <div className="space-y-6">
      {groupedItems.length > 0 ? (
        groupedItems.map((group, groupIndex) => (
          <div key={groupIndex} className="space-y-4">
            {/* Date header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 pb-2">
              <h3 className="text-lg font-semibold text-gray-900">
                {formatDate(group.date)}
              </h3>
            </div>

            {/* Items for this date */}
            <div className="space-y-3">
              {group.items.map((item, itemIndex) => {
                const isEvent = item.type === 'event'
                const time = isEvent ? item.startDate : item.scheduledDate
                
                return (
                  <div
                    key={`${item.type}-${item.id}`}
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
                      <h4 className="text-base font-medium text-gray-900">
                        {item.title}
                      </h4>
                      
                      <p className="mt-1 text-sm text-gray-600 line-clamp-2">
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
          </div>
        ))
      ) : (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No upcoming events or alerts</h3>
          <p className="text-gray-500">
            Nothing scheduled for the upcoming days
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

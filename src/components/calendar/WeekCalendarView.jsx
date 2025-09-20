import { useState } from 'react'
import { useCalendar } from '../../contexts/CalendarContext'
import { IncidentSeverityColors } from '../../models/calendarModels'
import { Trash2 } from 'lucide-react'
import EditScheduledAlertModal from './EditScheduledAlertModal'

export default function WeekCalendarView() {
  const { selectedDate, getEventsForDate, getScheduledAlertsForDate, filter, deleteScheduledAlert } = useCalendar()
  const [selectedAlert, setSelectedAlert] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)

  const getWeekDays = () => {
    const startOfWeek = new Date(selectedDate)
    startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay())
    
    const days = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek)
      day.setDate(startOfWeek.getDate() + i)
      days.push(day)
    }
    
    return days
  }

  const getEventsForDay = (date) => {
    const dayEvents = getEventsForDate(date).filter(event => filter.showEvents)
    const dayAlerts = getScheduledAlertsForDate(date).filter(alert => 
      filter.showAlerts &&
      filter.selectedTypes.has(alert.type) &&
      filter.selectedSeverities.has(alert.severity)
    )
    
    return { events: dayEvents, alerts: dayAlerts }
  }

  const isToday = (date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
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

  const weekDays = getWeekDays()

  return (
    <div className="space-y-4">
      {weekDays.map((date) => {
        const { events: dayEvents, alerts: dayAlerts } = getEventsForDay(date)
        const hasContent = dayEvents.length > 0 || dayAlerts.length > 0
        
        return (
          <div
            key={date.toISOString()}
            className={`bg-white border border-gray-200 rounded-lg p-4 ${
              isToday(date) ? 'border-blue-200 bg-blue-50' : ''
            }`}
          >
            {/* Date header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-semibold text-gray-900">
                  {date.toLocaleDateString('en-US', { 
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric'
                  })}
                </h3>
                {isToday(date) && (
                  <span className="px-2 py-1 text-xs font-medium text-blue-600 bg-blue-100 rounded-full">
                    Today
                  </span>
                )}
              </div>
            </div>

            {/* Events and alerts */}
            {hasContent ? (
              <div className="space-y-2">
                {/* Events */}
                {dayEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start space-x-3 p-2 bg-gray-50 rounded-md hover:bg-gray-100"
                  >
                    <div
                      className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
                      style={{ backgroundColor: event.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {event.title}
                      </p>
                      {event.description && (
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {event.description}
                        </p>
                      )}
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs text-gray-500">
                          {event.isAllDay ? 'All Day' : formatTime(event.startDate)}
                        </span>
                        {event.location && (
                          <span className="text-xs text-gray-500">
                            • {event.location}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Alerts */}
                {dayAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-start space-x-3 p-2 bg-red-50 rounded-md hover:bg-red-100"
                  >
                    <div
                      className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
                      style={{ backgroundColor: IncidentSeverityColors[alert.severity] }}
                    />
                    <div 
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => handleAlertClick(alert)}
                    >
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {alert.title}
                      </p>
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                        {alert.description}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs text-gray-500">
                          {formatTime(alert.scheduledDate)}
                        </span>
                        <span className="text-xs text-gray-500">
                          • {alert.type}
                        </span>
                        <span 
                          className="text-xs font-medium"
                          style={{ color: IncidentSeverityColors[alert.severity] }}
                        >
                          • {alert.severity}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteScheduledAlert(alert.id)
                      }}
                      className="text-red-600 hover:text-red-800 p-1 rounded-md hover:bg-red-200 flex-shrink-0"
                      title="Delete scheduled alert"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No events or alerts scheduled</p>
            )}
          </div>
        )
      })}

      {/* Edit Modal */}
      <EditScheduledAlertModal
        isOpen={showEditModal}
        onClose={handleCloseEditModal}
        alert={selectedAlert}
      />
    </div>
  )
}

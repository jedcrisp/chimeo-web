import { useState, useEffect } from 'react'
import { useCalendar } from '../../contexts/CalendarContext'
import { CalendarEventColors, IncidentSeverityColors } from '../../models/calendarModels'
import { Trash2 } from 'lucide-react'
import EditScheduledAlertModal from './EditScheduledAlertModal'

export default function MonthCalendarView() {
  const { selectedDate, events, scheduledAlerts, filter, getEventsForDate, getScheduledAlertsForDate, setSelectedDate, deleteScheduledAlert } = useCalendar()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedAlert, setSelectedAlert] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)

  // Update current month when selectedDate changes
  useEffect(() => {
    setCurrentMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1))
  }, [selectedDate])

  const getCalendarDays = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    
    // Get first day of month and last day of month
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    
    // Get first day of week for the first day of month (0 = Sunday)
    const firstDayOfWeek = firstDay.getDay()
    
    // Get last day of week for the last day of month
    const lastDayOfWeek = lastDay.getDay()
    
    // Calculate start date (might be from previous month)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDayOfWeek)
    
    // Calculate end date (might be from next month)
    const endDate = new Date(lastDay)
    endDate.setDate(endDate.getDate() + (6 - lastDayOfWeek))
    
    const days = []
    const currentDate = new Date(startDate)
    
    while (currentDate <= endDate) {
      days.push(new Date(currentDate))
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    return days
  }

  const getEventsForDay = (date) => {
    const dayEvents = getEventsForDate(date).filter(event => filter.showEvents)
    const allDayAlerts = getScheduledAlertsForDate(date)
    const dayAlerts = allDayAlerts.filter(alert => {
      if (!filter.showAlerts) return false
      
      // If no types are selected, show all types
      const typeMatch = filter.selectedTypes.size === 0 || filter.selectedTypes.has(alert.type)
      
      // If no severities are selected, show all severities  
      const severityMatch = filter.selectedSeverities.size === 0 || filter.selectedSeverities.has(alert.severity)
      
      return typeMatch && severityMatch
    })
    
    // Debug logging
    if (allDayAlerts.length > 0) {
      console.log(`📅 Date ${date.toDateString()}: Found ${allDayAlerts.length} scheduled alerts, showing ${dayAlerts.length}`)
    }
    
    return { events: dayEvents, alerts: dayAlerts }
  }

  const isToday = (date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isCurrentMonth = (date) => {
    return date.getMonth() === currentMonth.getMonth()
  }

  const isSelected = (date) => {
    return date.toDateString() === selectedDate.toDateString()
  }

  const handleDateClick = (date) => {
    console.log('📅 MonthCalendarView: Date clicked:', date.toDateString())
    console.log('📅 MonthCalendarView: Current selectedDate:', selectedDate.toDateString())
    console.log('📅 MonthCalendarView: Setting selectedDate to:', date.toDateString())
    setSelectedDate(date)
  }

  const navigateMonth = (direction) => {
    const newMonth = new Date(currentMonth)
    newMonth.setMonth(newMonth.getMonth() + direction)
    setCurrentMonth(newMonth)
  }

  const goToToday = () => {
    const today = new Date()
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1))
    setSelectedDate(today)
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

  const calendarDays = getCalendarDays()
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  return (
    <div className="space-y-4">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
        {weekDays.map((day) => (
          <div key={day} className="bg-gray-100 p-3 text-center">
            <div className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              {day}
            </div>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
        {calendarDays.map((date, index) => {
          const { events: dayEvents, alerts: dayAlerts } = getEventsForDay(date)
          const hasContent = dayEvents.length > 0 || dayAlerts.length > 0
          const isCurrentMonthDay = isCurrentMonth(date)
          const isTodayDate = isToday(date)
          const isSelectedDate = isSelected(date)
          
          return (
            <div
              key={index}
              className={`min-h-[120px] bg-white p-2 hover:bg-gray-50 cursor-pointer transition-colors ${
                !isCurrentMonthDay ? 'text-gray-400 bg-gray-50' : ''
              } ${isTodayDate ? 'bg-blue-50 border-l-4 border-blue-500' : ''} ${
                isSelectedDate ? 'bg-blue-100 ring-2 ring-blue-500' : ''
              }`}
              onClick={() => handleDateClick(date)}
            >
              {/* Date number */}
              <div className={`text-sm font-medium mb-2 ${
                isTodayDate ? 'text-blue-600 font-bold' : 
                isCurrentMonthDay ? 'text-gray-900' : 'text-gray-400'
              }`}>
                {date.getDate()}
              </div>

              {/* Event indicators */}
              {hasContent && (
                <div className="space-y-1">
                  {/* Events */}
                  {dayEvents.slice(0, 2).map((event, eventIndex) => (
                    <div
                      key={`event-${eventIndex}`}
                      className="flex items-center space-x-1 text-xs"
                    >
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: event.color }}
                      />
                      <span className="text-gray-700 truncate">
                        {event.title}
                      </span>
                    </div>
                  ))}
                  
                  {/* Alerts */}
                  {dayAlerts.slice(0, 2 - dayEvents.length).map((alert, alertIndex) => (
                    <div
                      key={`alert-${alertIndex}`}
                      className="flex items-center space-x-1 text-xs group"
                    >
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: IncidentSeverityColors[alert.severity] }}
                      />
                      <span 
                        className="text-gray-700 truncate cursor-pointer hover:text-blue-600 flex-1"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleAlertClick(alert)
                        }}
                        title="Click to edit alert"
                      >
                        {alert.title}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteScheduledAlert(alert.id)
                        }}
                        className="text-red-600 hover:text-red-800 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-red-200 flex-shrink-0"
                        title="Delete scheduled alert"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  
                  {/* More indicator */}
                  {(dayEvents.length + dayAlerts.length) > 2 && (
                    <div className="text-xs text-gray-500 font-medium">
                      +{(dayEvents.length + dayAlerts.length) - 2} more
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center space-x-6 text-sm text-gray-600">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span>Events</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span>Alerts</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-blue-100 border border-blue-500"></div>
          <span>Today</span>
        </div>
      </div>

      {/* Edit Scheduled Alert Modal */}
      {showEditModal && selectedAlert && (
        <EditScheduledAlertModal
          isOpen={showEditModal}
          alert={selectedAlert}
          onClose={handleCloseEditModal}
        />
      )}
    </div>
  )
}
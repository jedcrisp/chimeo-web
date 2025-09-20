import { useCalendar } from '../../contexts/CalendarContext'
import { IncidentSeverityColors } from '../../models/calendarModels'

export default function WeekCalendarView() {
  const { selectedDate, getEventsForDate, getScheduledAlertsForDate, filter } = useCalendar()

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
                    <div className="flex-1 min-w-0">
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
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No events or alerts scheduled</p>
            )}
          </div>
        )
      })}
    </div>
  )
}

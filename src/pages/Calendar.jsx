import { useState, useEffect } from 'react'
import { useCalendar } from '../contexts/CalendarContext'
import globalScheduledAlertProcessor from '../services/globalScheduledAlertProcessor'
import { CalendarViewMode, CalendarViewModeLabels } from '../models/calendarModels'
import { Calendar, Plus, Filter, ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import MonthCalendarView from '../components/calendar/MonthCalendarView'
import WeekCalendarView from '../components/calendar/WeekCalendarView'
import DayCalendarView from '../components/calendar/DayCalendarView'
import AgendaView from '../components/calendar/AgendaView'
import CreateScheduledAlertModal from '../components/calendar/CreateScheduledAlertModal'
import CalendarFilterModal from '../components/calendar/CalendarFilterModal'

export default function CalendarPage() {
  const {
    selectedDate,
    viewMode,
    filter,
    isLoading,
    setSelectedDate,
    setViewMode,
    setFilter,
    loadCalendarData,
    clearLoading,
    processScheduledAlerts
  } = useCalendar()

  const [showCreateAlert, setShowCreateAlert] = useState(false)
  const [showFilter, setShowFilter] = useState(false)
  const [isProcessingAlerts, setIsProcessingAlerts] = useState(false)
  const [autoProcessorStatus, setAutoProcessorStatus] = useState({ isRunning: false })

  useEffect(() => {
    loadCalendarData()
    
    // Safety mechanism: clear loading state if it gets stuck for more than 10 seconds
    const timeout = setTimeout(() => {
      if (isLoading) {
        console.warn('Calendar loading timeout - clearing loading state')
        clearLoading()
      }
    }, 10000)
    
    return () => clearTimeout(timeout)
  }, [])

  // Check auto-processor status
  useEffect(() => {
    const checkStatus = () => {
      setAutoProcessorStatus(globalScheduledAlertProcessor.getStatus())
    }

    checkStatus()
    const interval = setInterval(checkStatus, 5000) // Check every 5 seconds

    return () => clearInterval(interval)
  }, [])

  const handlePreviousPeriod = () => {
    const newDate = new Date(selectedDate)
    switch (viewMode) {
      case CalendarViewMode.MONTH:
        newDate.setMonth(newDate.getMonth() - 1)
        break
      case CalendarViewMode.WEEK:
        newDate.setDate(newDate.getDate() - 7)
        break
      case CalendarViewMode.DAY:
        newDate.setDate(newDate.getDate() - 1)
        break
      case CalendarViewMode.AGENDA:
        newDate.setDate(newDate.getDate() - 7)
        break
    }
    setSelectedDate(newDate)
  }

  const handleNextPeriod = () => {
    const newDate = new Date(selectedDate)
    switch (viewMode) {
      case CalendarViewMode.MONTH:
        newDate.setMonth(newDate.getMonth() + 1)
        break
      case CalendarViewMode.WEEK:
        newDate.setDate(newDate.getDate() + 7)
        break
      case CalendarViewMode.DAY:
        newDate.setDate(newDate.getDate() + 1)
        break
      case CalendarViewMode.AGENDA:
        newDate.setDate(newDate.getDate() + 7)
        break
    }
    setSelectedDate(newDate)
  }

  const handleToday = () => {
    setSelectedDate(new Date())
  }

  const handleProcessScheduledAlerts = async () => {
    setIsProcessingAlerts(true)
    try {
      const processedAlerts = await processScheduledAlerts()
      if (processedAlerts.length > 0) {
        alert(`Processed ${processedAlerts.length} scheduled alerts: ${processedAlerts.join(', ')}`)
      } else {
        alert('No scheduled alerts were due for processing.')
      }
    } catch (error) {
      console.error('Error processing scheduled alerts:', error)
      alert('Error processing scheduled alerts. Check console for details.')
    } finally {
      setIsProcessingAlerts(false)
    }
  }

  const formatDateTitle = () => {
    const options = { 
      year: 'numeric', 
      month: 'long' 
    }
    
    switch (viewMode) {
      case CalendarViewMode.MONTH:
        return selectedDate.toLocaleDateString('en-US', options)
      case CalendarViewMode.WEEK:
        const weekStart = new Date(selectedDate)
        weekStart.setDate(selectedDate.getDate() - selectedDate.getDay())
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)
        
        if (weekStart.getMonth() === weekEnd.getMonth()) {
          return `${weekStart.toLocaleDateString('en-US', { month: 'long' })} ${weekStart.getDate()}-${weekEnd.getDate()}, ${weekStart.getFullYear()}`
        } else {
          return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${weekStart.getFullYear()}`
        }
      case CalendarViewMode.DAY:
        return selectedDate.toLocaleDateString('en-US', { 
          weekday: 'long',
          year: 'numeric', 
          month: 'long',
          day: 'numeric'
        })
      case CalendarViewMode.AGENDA:
        return 'Upcoming Events & Alerts'
      default:
        return selectedDate.toLocaleDateString('en-US', options)
    }
  }

  const renderCalendarContent = () => {
    switch (viewMode) {
      case CalendarViewMode.MONTH:
        return <MonthCalendarView />
      case CalendarViewMode.WEEK:
        return <WeekCalendarView />
      case CalendarViewMode.DAY:
        return <DayCalendarView />
      case CalendarViewMode.AGENDA:
        return <AgendaView />
      default:
        return <MonthCalendarView />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Calendar className="h-8 w-8 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowFilter(true)}
            className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
              filter.isFiltered
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </button>
          
          <button
            onClick={handleProcessScheduledAlerts}
            disabled={isProcessingAlerts}
            className="flex items-center px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Clock className="h-4 w-4 mr-2" />
            {isProcessingAlerts ? 'Processing...' : 'Process Alerts'}
          </button>

          {/* Auto-processor status indicator */}
          <div className="flex items-center px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-md">
            <div className={`w-2 h-2 rounded-full mr-2 ${autoProcessorStatus.isRunning ? 'bg-green-500' : 'bg-red-500'}`}></div>
            Auto: {autoProcessorStatus.isRunning ? 'ON' : 'OFF'}
          </div>
          
          <div className="relative">
            <button
              onClick={() => setShowCreateAlert(true)}
              className="flex items-center px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Schedule Alert
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          {/* Navigation */}
          <div className="flex items-center space-x-4">
            <button
              onClick={handlePreviousPeriod}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            
            <h2 className="text-lg font-semibold text-gray-900">
              {formatDateTitle()}
            </h2>
            
            <button
              onClick={handleNextPeriod}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* View Mode Picker */}
          <div className="flex items-center space-x-2">
            <div className="flex bg-gray-100 rounded-md p-1">
              {Object.values(CalendarViewMode).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                    viewMode === mode
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {CalendarViewModeLabels[mode]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Calendar Content */}
        <div className="min-h-[600px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            renderCalendarContent()
          )}
        </div>
      </div>

      {/* Modals */}
      {showCreateAlert && (
        <CreateScheduledAlertModal
          isOpen={showCreateAlert}
          onClose={() => setShowCreateAlert(false)}
        />
      )}
      
      {showFilter && (
        <CalendarFilterModal
          isOpen={showFilter}
          onClose={() => setShowFilter(false)}
        />
      )}
    </div>
  )
}
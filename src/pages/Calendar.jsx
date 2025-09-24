import { useState, useEffect } from 'react'
import { useCalendar, CALENDAR_ACTIONS } from '../contexts/CalendarContext'
import { CalendarViewMode, CalendarViewModeLabels } from '../models/calendarModels'
import { Calendar, Plus, ChevronLeft, ChevronRight, Filter } from 'lucide-react'
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
    processScheduledAlerts,
    dispatch
  } = useCalendar()

  const [showCreateAlert, setShowCreateAlert] = useState(false)
  const [prefilledDate, setPrefilledDate] = useState(null)
  const [showFilterModal, setShowFilterModal] = useState(false)

  // Safety mechanism: Clear loading if it gets stuck for too long
  useEffect(() => {
    if (isLoading) {
      const safetyTimeout = setTimeout(() => {
        console.warn('🚨 Calendar: Safety timeout - clearing stuck loading state')
        clearLoading()
      }, 3000) // 3 seconds safety net
      
      return () => clearTimeout(safetyTimeout)
    }
  }, [isLoading])

  // Listen for double-click events from calendar views
  useEffect(() => {
    const handleOpenCreateAlertModal = (event) => {
      console.log('🔍 Calendar: Received openCreateAlertModal event:', event.detail)
      const { scheduledDate, selectedDate } = event.detail
      
      // Set the selected date
      setSelectedDate(selectedDate)
      
      // Set the prefilled date for the modal
      setPrefilledDate(scheduledDate)
      
      // Open the create alert modal
      setShowCreateAlert(true)
    }

    window.addEventListener('openCreateAlertModal', handleOpenCreateAlertModal)
    
    return () => {
      window.removeEventListener('openCreateAlertModal', handleOpenCreateAlertModal)
    }
  }, [])

  useEffect(() => {
    console.log('🔄 Calendar: Starting loadCalendarData, isLoading:', isLoading)
    
    // Immediately clear any existing loading state
    clearLoading()
    
    // Start loading data
    loadCalendarData()
    
    // Multiple aggressive timeouts to ensure loading stops
    const timeout1 = setTimeout(() => {
      console.warn('⏰ Calendar timeout 1 - forcing loading to stop')
      clearLoading()
    }, 500) // 0.5 seconds
    
    const timeout2 = setTimeout(() => {
      console.warn('⏰ Calendar timeout 2 - forcing loading to stop')
      clearLoading()
    }, 1000) // 1 second
    
    const timeout3 = setTimeout(() => {
      console.warn('⏰ Calendar timeout 3 - forcing loading to stop')
      clearLoading()
    }, 2000) // 2 seconds
    
    return () => {
      clearTimeout(timeout1)
      clearTimeout(timeout2)
      clearTimeout(timeout3)
      // Clear loading when component unmounts
      clearLoading()
    }
  }, [])

  // Check auto-processor status

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
            onClick={() => setShowFilterModal(true)}
            className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </button>
          
          <button
            onClick={() => {
              console.log('🔄 Manual refresh triggered')
              loadCalendarData()
            }}
            className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Refresh Calendar
          </button>
          
          <button
            onClick={() => {
              console.log('🔍 Calendar: Schedule Alert button clicked')
              setShowCreateAlert(true)
            }}
            className="flex items-center px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Schedule Alert
          </button>
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
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <div className="text-gray-600">Loading calendar...</div>
              <div className="text-sm text-gray-500">This should load automatically...</div>
              <button
                onClick={() => {
                  console.warn('🚨 Manual loading clear triggered')
                  clearLoading()
                }}
                className="px-4 py-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors"
              >
                Force Stop Loading
              </button>
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
          onClose={() => {
            setShowCreateAlert(false)
            setPrefilledDate(null)
          }}
          prefilledDate={prefilledDate}
        />
      )}

      {showFilterModal && (
        <CalendarFilterModal
          isOpen={showFilterModal}
          onClose={() => setShowFilterModal(false)}
        />
      )}
      
    </div>
  )
}
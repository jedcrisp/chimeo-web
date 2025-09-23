import { createContext, useContext, useReducer, useEffect } from 'react'
import { useAuth } from './AuthContext'
import calendarService from '../services/calendarService'
import scheduledAlertProcessor from '../services/scheduledAlertProcessor'

// Calendar Context
const CalendarContext = createContext()

// Calendar Actions
export const CALENDAR_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  SET_EVENTS: 'SET_EVENTS',
  SET_SCHEDULED_ALERTS: 'SET_SCHEDULED_ALERTS',
  ADD_EVENT: 'ADD_EVENT',
  UPDATE_EVENT: 'UPDATE_EVENT',
  DELETE_EVENT: 'DELETE_EVENT',
  ADD_SCHEDULED_ALERT: 'ADD_SCHEDULED_ALERT',
  UPDATE_SCHEDULED_ALERT: 'UPDATE_SCHEDULED_ALERT',
  DELETE_SCHEDULED_ALERT: 'DELETE_SCHEDULED_ALERT',
  SET_FILTER: 'SET_FILTER',
  SET_SELECTED_DATE: 'SET_SELECTED_DATE',
  SET_VIEW_MODE: 'SET_VIEW_MODE',
  CLEAR_ALL_DATA: 'CLEAR_ALL_DATA'
}

// Initial State
const initialState = {
  events: [],
  scheduledAlerts: [],
  isLoading: false,
  error: null,
  filter: {
    showAlerts: true,
    showEvents: true,
    selectedTypes: new Set(),
    selectedSeverities: new Set(),
    selectedGroups: new Set(),
    dateRange: null
  },
  selectedDate: new Date(),
  viewMode: 'month'
}

// Calendar Reducer
function calendarReducer(state, action) {
  switch (action.type) {
    case CALENDAR_ACTIONS.SET_LOADING:
      return { ...state, isLoading: action.payload }
    
    case CALENDAR_ACTIONS.SET_ERROR:
      return { ...state, error: action.payload, isLoading: false }
    
    case CALENDAR_ACTIONS.SET_EVENTS:
      return { ...state, events: action.payload, isLoading: false }
    
    case CALENDAR_ACTIONS.SET_SCHEDULED_ALERTS:
      return { ...state, scheduledAlerts: action.payload, isLoading: false }
    
    case CALENDAR_ACTIONS.ADD_EVENT:
      return { ...state, events: [...state.events, action.payload] }
    
    case CALENDAR_ACTIONS.UPDATE_EVENT:
      return {
        ...state,
        events: state.events.map(event =>
          event.id === action.payload.id ? action.payload : event
        )
      }
    
    case CALENDAR_ACTIONS.DELETE_EVENT:
      return {
        ...state,
        events: state.events.filter(event => event.id !== action.payload)
      }
    
    case CALENDAR_ACTIONS.ADD_SCHEDULED_ALERT:
      return { ...state, scheduledAlerts: [...state.scheduledAlerts, action.payload] }
    
    case CALENDAR_ACTIONS.UPDATE_SCHEDULED_ALERT:
      return {
        ...state,
        scheduledAlerts: state.scheduledAlerts.map(alert =>
          alert.id === action.payload.id ? action.payload : alert
        )
      }
    
    case CALENDAR_ACTIONS.DELETE_SCHEDULED_ALERT:
      return {
        ...state,
        scheduledAlerts: state.scheduledAlerts.filter(alert => alert.id !== action.payload)
      }
    
    case CALENDAR_ACTIONS.SET_FILTER:
      return { ...state, filter: action.payload }
    
    case CALENDAR_ACTIONS.SET_SELECTED_DATE:
      return { ...state, selectedDate: action.payload }
    
    case CALENDAR_ACTIONS.SET_VIEW_MODE:
      return { ...state, viewMode: action.payload }
    
    case CALENDAR_ACTIONS.CLEAR_ALL_DATA:
      console.log('🗑️ CLEAR_ALL_DATA reducer called - clearing all calendar data')
      return { 
        ...state, 
        events: [], 
        scheduledAlerts: [], 
        isLoading: false, 
        error: null 
      }
    
    default:
      return state
  }
}

// Calendar Provider
export function CalendarProvider({ children }) {
  const [state, dispatch] = useReducer(calendarReducer, initialState)
  const { currentUser, userProfile } = useAuth()

  // Load calendar data on mount
  useEffect(() => {
    if (userProfile) {
      loadCalendarData()
    }
  }, [userProfile])

  // Listen for globally processed alerts and refresh calendar data
  useEffect(() => {
    const handleScheduledAlertsProcessed = async (event) => {
      console.log('📅 Calendar: Received scheduled alerts processed event:', event.detail)
      // Only refresh if alerts were actually processed (not just created)
      if (event.detail?.processedAlerts?.length > 0) {
        console.log('📅 Calendar: Refreshing calendar data due to processed alerts')
        try {
          await loadCalendarData()
        } catch (error) {
          console.error('Error refreshing calendar data after alert processing:', error)
        }
      } else {
        console.log('📅 Calendar: No alerts were processed, skipping refresh')
      }
    }

    window.addEventListener('scheduledAlertsProcessed', handleScheduledAlertsProcessed)

    return () => {
      window.removeEventListener('scheduledAlertsProcessed', handleScheduledAlertsProcessed)
    }
  }, [])

  const loadCalendarData = async (dateRange = null) => {
    console.log('🚀 CalendarContext: loadCalendarData called!')
    try {
      dispatch({ type: CALENDAR_ACTIONS.SET_LOADING, payload: true })
      
      // Clear any existing data first
      dispatch({ type: CALENDAR_ACTIONS.SET_SCHEDULED_ALERTS, payload: [] })
      console.log('🗑️ CalendarContext: Cleared existing scheduled alerts')
      
      // Get organization ID from user profile
      const rawOrgId = userProfile?.organizations?.[0] || null
      const organizationId = rawOrgId && typeof rawOrgId === 'string' ? rawOrgId : null
      
      console.log('🔍 CalendarContext: Current user info:', {
        currentUser: currentUser?.uid || 'null',
        userProfile: userProfile ? 'exists' : 'null',
        organizationId: organizationId || 'null'
      })
      
      // Log the full user profile to see what organizations are available
      if (userProfile) {
        console.log('🔍 Full user profile:', userProfile)
        console.log('🔍 User organizations:', userProfile.organizations)
      }
      
      // For now, let's try to fetch from the specific organization where the alert was posted
      const targetOrgId = 'velocity_physical_therapy_north_denton'
      console.log('🔍 CalendarContext: Using target organization ID:', targetOrgId)
      
      // Check if currentUser is properly set
      if (currentUser) {
        console.log('🔍 Current user details:', {
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName
        })
      } else {
        console.log('⚠️ No current user found!')
      }
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Calendar data fetch timeout')), 2000) // 2 second timeout
      })
      
      const fetchPromise = calendarService.fetchCalendarData(dateRange, targetOrgId)
      
      await Promise.race([fetchPromise, timeoutPromise])
      
      console.log('📅 Calendar data loaded:', {
        events: calendarService.events.length,
        scheduledAlerts: calendarService.scheduledAlerts.length,
        organizationId
      })
      
      // Log the actual scheduled alerts data
      if (calendarService.scheduledAlerts.length > 0) {
        console.log('📅 CalendarContext: Scheduled alerts loaded:', calendarService.scheduledAlerts.map(alert => ({
          id: alert.id,
          title: alert.title,
          scheduledDate: alert.scheduledDate,
          parsedDate: new Date(alert.scheduledDate).toDateString()
        })))
      } else {
        console.log('📅 CalendarContext: No scheduled alerts loaded')
      }
      
      dispatch({ type: CALENDAR_ACTIONS.SET_EVENTS, payload: calendarService.events })
      dispatch({ type: CALENDAR_ACTIONS.SET_SCHEDULED_ALERTS, payload: calendarService.scheduledAlerts })
      dispatch({ type: CALENDAR_ACTIONS.SET_LOADING, payload: false })
    } catch (error) {
      console.error('CalendarContext: Error loading calendar data:', error)
      dispatch({ type: CALENDAR_ACTIONS.SET_ERROR, payload: error.message })
      dispatch({ type: CALENDAR_ACTIONS.SET_LOADING, payload: false })
    }
  }

  const createEvent = async (eventData) => {
    try {
      dispatch({ type: CALENDAR_ACTIONS.SET_LOADING, payload: true })
      const event = await calendarService.createEvent(eventData)
      // Don't automatically add to calendar state - let user manually refresh if needed
      // dispatch({ type: CALENDAR_ACTIONS.ADD_EVENT, payload: event })
      return event
    } catch (error) {
      dispatch({ type: CALENDAR_ACTIONS.SET_ERROR, payload: error.message })
      throw error
    }
  }

  const updateEvent = async (eventId, eventData) => {
    try {
      dispatch({ type: CALENDAR_ACTIONS.SET_LOADING, payload: true })
      const event = await calendarService.updateEvent(eventId, eventData)
      dispatch({ type: CALENDAR_ACTIONS.UPDATE_EVENT, payload: event })
      return event
    } catch (error) {
      dispatch({ type: CALENDAR_ACTIONS.SET_ERROR, payload: error.message })
      throw error
    }
  }

  const deleteEvent = async (eventId) => {
    try {
      dispatch({ type: CALENDAR_ACTIONS.SET_LOADING, payload: true })
      await calendarService.deleteEvent(eventId)
      dispatch({ type: CALENDAR_ACTIONS.DELETE_EVENT, payload: eventId })
    } catch (error) {
      dispatch({ type: CALENDAR_ACTIONS.SET_ERROR, payload: error.message })
      throw error
    }
  }

  const createScheduledAlert = async (alertData) => {
    try {
      dispatch({ type: CALENDAR_ACTIONS.SET_LOADING, payload: true })
      const alert = await calendarService.createScheduledAlert(alertData)
      // Add the new scheduled alert to calendar state immediately
      dispatch({ type: CALENDAR_ACTIONS.ADD_SCHEDULED_ALERT, payload: alert })
      return alert
    } catch (error) {
      console.error('CalendarContext: Error creating scheduled alert:', error)
      dispatch({ type: CALENDAR_ACTIONS.SET_ERROR, payload: error.message })
      throw error
    }
  }

  const updateScheduledAlert = async (alertId, alertData) => {
    try {
      dispatch({ type: CALENDAR_ACTIONS.SET_LOADING, payload: true })
      const alert = await calendarService.updateScheduledAlert(alertId, alertData)
      dispatch({ type: CALENDAR_ACTIONS.UPDATE_SCHEDULED_ALERT, payload: alert })
      return alert
    } catch (error) {
      dispatch({ type: CALENDAR_ACTIONS.SET_ERROR, payload: error.message })
      throw error
    }
  }

  const deleteScheduledAlert = async (alertId) => {
    try {
      dispatch({ type: CALENDAR_ACTIONS.SET_LOADING, payload: true })
      
      // Get organization ID from user profile
      const rawOrgId = userProfile?.organizations?.[0] || null
      const organizationId = rawOrgId && typeof rawOrgId === 'string' ? rawOrgId : null
      
      await calendarService.deleteScheduledAlert(alertId, organizationId)
      dispatch({ type: CALENDAR_ACTIONS.DELETE_SCHEDULED_ALERT, payload: alertId })
    } catch (error) {
      dispatch({ type: CALENDAR_ACTIONS.SET_ERROR, payload: error.message })
      throw error
    }
  }

  const setFilter = (filter) => {
    dispatch({ type: CALENDAR_ACTIONS.SET_FILTER, payload: filter })
  }

  const setSelectedDate = (date) => {
    dispatch({ type: CALENDAR_ACTIONS.SET_SELECTED_DATE, payload: date })
  }

  const setViewMode = (mode) => {
    dispatch({ type: CALENDAR_ACTIONS.SET_VIEW_MODE, payload: mode })
  }

  const clearLoading = () => {
    dispatch({ type: CALENDAR_ACTIONS.SET_LOADING, payload: false })
  }

  const processScheduledAlerts = async () => {
    try {
      console.log('⏰ Processing scheduled alerts...')
      const processedAlerts = await scheduledAlertProcessor.processScheduledAlerts()
      
      if (processedAlerts.length > 0) {
        console.log(`✅ Processed ${processedAlerts.length} scheduled alerts`)
        // Reload calendar data to show new alerts
        await loadCalendarData()
      }
      
      return processedAlerts
    } catch (error) {
      console.error('❌ Error processing scheduled alerts:', error)
      throw error
    }
  }

  const processScheduledAlertsForOrganization = async (organizationId) => {
    try {
      console.log(`⏰ Processing scheduled alerts for organization: ${organizationId}`)
      const processedAlerts = await scheduledAlertProcessor.processScheduledAlertsForOrganization(organizationId)
      
      if (processedAlerts.length > 0) {
        console.log(`✅ Processed ${processedAlerts.length} scheduled alerts for organization`)
        // Reload calendar data to show new alerts
        await loadCalendarData()
      }
      
      return processedAlerts
    } catch (error) {
      console.error('❌ Error processing scheduled alerts for organization:', error)
      throw error
    }
  }

  // Helper functions
  const getEventsForDate = (date) => {
    return calendarService.getEventsForDate(date)
  }

  const getScheduledAlertsForDate = (date) => {
    return calendarService.getScheduledAlertsForDate(date)
  }

  const getUpcomingAlerts = (limit = 10) => {
    return calendarService.getUpcomingAlerts(limit)
  }

  const getTodaysEvents = () => {
    return calendarService.getTodaysEvents()
  }

  const getTodaysAlerts = () => {
    return calendarService.getTodaysAlerts()
  }

  const deleteAllScheduledAlerts = async () => {
    try {
      // Get organization ID from user profile
      const rawOrgId = userProfile?.organizations?.[0] || null
      const organizationId = rawOrgId && typeof rawOrgId === 'string' ? rawOrgId : 'velocity_physical_therapy_north_denton'
      
      console.log('🗑️ CalendarContext: Deleting all alerts for organization:', organizationId)
      const result = await calendarService.deleteAllScheduledAlerts(organizationId)
      
      // Clear the local state immediately
      dispatch({ type: CALENDAR_ACTIONS.SET_SCHEDULED_ALERTS, payload: [] })
      
      // Reload calendar data to reflect changes
      await loadCalendarData()
      
      return result
    } catch (error) {
      console.error('❌ CalendarContext: Error deleting all alerts:', error)
      throw error
    }
  }

  const value = {
    // State
    ...state,
    
    // Actions
    loadCalendarData,
    createEvent,
    updateEvent,
    deleteEvent,
    createScheduledAlert,
    updateScheduledAlert,
    deleteScheduledAlert,
    setFilter,
    setSelectedDate,
    setViewMode,
    clearLoading,
    processScheduledAlerts,
    processScheduledAlertsForOrganization,
    
    // Helper functions
    getEventsForDate,
    getScheduledAlertsForDate,
    getUpcomingAlerts,
    getTodaysEvents,
    getTodaysAlerts,
    deleteAllScheduledAlerts,
    
    // Direct dispatch access
    dispatch
  }

  return (
    <CalendarContext.Provider value={value}>
      {children}
    </CalendarContext.Provider>
  )
}

// Custom hook to use calendar context
export function useCalendar() {
  const context = useContext(CalendarContext)
  if (!context) {
    throw new Error('useCalendar must be used within a CalendarProvider')
  }
  return context
}

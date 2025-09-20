import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  doc,
  serverTimestamp 
} from 'firebase/firestore'
import { db } from './firebase'
import { CalendarEvent, ScheduledAlert, RecurrencePattern } from '../models/calendarModels'

class CalendarService {
  constructor() {
    this.events = []
    this.scheduledAlerts = []
    this.isLoading = false
    this.errorMessage = null
  }

  // Calendar Event Management

  async createEvent(eventData) {
    console.log('📅 Creating calendar event:', eventData.title)
    
    try {
      const event = new CalendarEvent(eventData)
      
      const docData = {
        title: event.title,
        description: event.description,
        startDate: event.startDate,
        endDate: event.endDate,
        isAllDay: event.isAllDay,
        location: event.location,
        alertId: event.alertId || '',
        createdBy: event.createdBy,
        createdByUserId: event.createdByUserId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isRecurring: event.isRecurring,
        recurrencePattern: event.recurrencePattern?.toDictionary() || {},
        color: event.color
      }

      const docRef = await addDoc(collection(db, 'calendarEvents'), docData)
      
      // Update local state
      this.events.push({ ...event, id: docRef.id })
      
      console.log('✅ Calendar event created successfully')
      return { ...event, id: docRef.id }
    } catch (error) {
      console.error('❌ Error creating calendar event:', error)
      this.errorMessage = error.message
      throw error
    }
  }

  async updateEvent(eventId, eventData) {
    console.log('📅 Updating calendar event:', eventId)
    
    try {
      const event = new CalendarEvent({ ...eventData, id: eventId })
      
      const docData = {
        title: event.title,
        description: event.description,
        startDate: event.startDate,
        endDate: event.endDate,
        isAllDay: event.isAllDay,
        location: event.location,
        alertId: event.alertId || '',
        createdBy: event.createdBy,
        createdByUserId: event.createdByUserId,
        createdAt: event.createdAt,
        updatedAt: serverTimestamp(),
        isRecurring: event.isRecurring,
        recurrencePattern: event.recurrencePattern?.toDictionary() || {},
        color: event.color
      }

      await updateDoc(doc(db, 'calendarEvents', eventId), docData)
      
      // Update local state
      const index = this.events.findIndex(e => e.id === eventId)
      if (index !== -1) {
        this.events[index] = { ...event, id: eventId }
      }
      
      console.log('✅ Calendar event updated successfully')
      return { ...event, id: eventId }
    } catch (error) {
      console.error('❌ Error updating calendar event:', error)
      this.errorMessage = error.message
      throw error
    }
  }

  async deleteEvent(eventId) {
    console.log('📅 Deleting calendar event:', eventId)
    
    try {
      await deleteDoc(doc(db, 'calendarEvents', eventId))
      
      // Update local state
      this.events = this.events.filter(e => e.id !== eventId)
      
      console.log('✅ Calendar event deleted successfully')
    } catch (error) {
      console.error('❌ Error deleting calendar event:', error)
      this.errorMessage = error.message
      throw error
    }
  }

  async fetchEvents(dateRange = null) {
    console.log('📅 Fetching calendar events...')
    
    this.isLoading = true
    this.errorMessage = null
    
    try {
      let q = query(collection(db, 'calendarEvents'), orderBy('startDate', 'asc'))
      
      if (dateRange) {
        q = query(
          collection(db, 'calendarEvents'),
          where('startDate', '>=', dateRange.start),
          where('startDate', '<=', dateRange.end),
          orderBy('startDate', 'asc')
        )
      }
      
      const snapshot = await getDocs(q)
      const events = []
      
      snapshot.forEach(doc => {
        const data = doc.data()
        events.push(new CalendarEvent({
          id: doc.id,
          ...data,
          startDate: data.startDate?.toDate() || new Date(),
          endDate: data.endDate?.toDate() || new Date(),
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          recurrencePattern: data.recurrencePattern ? 
            RecurrencePattern.fromDictionary(data.recurrencePattern) : null
        }))
      })
      
      this.events = events
      this.isLoading = false
      
      console.log(`✅ Fetched ${events.length} calendar events`)
      return events
    } catch (error) {
      console.error('❌ Error fetching calendar events:', error)
      this.errorMessage = error.message
      this.isLoading = false
      throw error
    }
  }

  // Scheduled Alert Management

  async createScheduledAlert(alertData) {
    try {
      const alert = new ScheduledAlert(alertData)
      
      const docData = {
        title: alert.title,
        description: alert.description,
        organizationId: alert.organizationId,
        organizationName: alert.organizationName,
        groupId: alert.groupId || '',
        groupName: alert.groupName || '',
        type: alert.type,
        severity: alert.severity,
        location: {
          latitude: alert.location?.latitude || 0.0,
          longitude: alert.location?.longitude || 0.0,
          address: alert.location?.address || '',
          city: alert.location?.city || '',
          state: alert.location?.state || '',
          zipCode: alert.location?.zipCode || ''
        },
        scheduledDate: alert.scheduledDate,
        isRecurring: alert.isRecurring,
        recurrencePattern: alert.recurrencePattern?.toDictionary() || {},
        postedBy: alert.postedBy,
        postedByUserId: alert.postedByUserId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isActive: alert.isActive,
        imageURLs: alert.imageURLs,
        expiresAt: alert.expiresAt || serverTimestamp(),
        calendarEventId: alert.calendarEventId || ''
      }

      // Save to organization's scheduledAlerts subcollection
      const docRef = await addDoc(
        collection(db, 'organizations', alert.organizationId, 'scheduledAlerts'), 
        docData
      )
      
      // Update local state
      this.scheduledAlerts.push({ ...alert, id: docRef.id })
      
      return { ...alert, id: docRef.id }
    } catch (error) {
      console.error('Error creating scheduled alert:', error)
      this.errorMessage = error.message
      throw error
    }
  }

  async updateScheduledAlert(alertId, alertData) {
    console.log('⏰ Updating scheduled alert:', alertId)
    
    try {
      const alert = new ScheduledAlert({ ...alertData, id: alertId })
      
      const docData = {
        title: alert.title,
        description: alert.description,
        organizationId: alert.organizationId,
        organizationName: alert.organizationName,
        groupId: alert.groupId || '',
        groupName: alert.groupName || '',
        type: alert.type,
        severity: alert.severity,
        location: {
          latitude: alert.location?.latitude || 0.0,
          longitude: alert.location?.longitude || 0.0,
          address: alert.location?.address || '',
          city: alert.location?.city || '',
          state: alert.location?.state || '',
          zipCode: alert.location?.zipCode || ''
        },
        scheduledDate: alert.scheduledDate,
        isRecurring: alert.isRecurring,
        recurrencePattern: alert.recurrencePattern?.toDictionary() || {},
        postedBy: alert.postedBy,
        postedByUserId: alert.postedByUserId,
        createdAt: alert.createdAt,
        updatedAt: serverTimestamp(),
        isActive: alert.isActive,
        imageURLs: alert.imageURLs,
        expiresAt: alert.expiresAt || serverTimestamp(),
        calendarEventId: alert.calendarEventId || ''
      }

      // Update in organization's scheduledAlerts subcollection
      await updateDoc(doc(db, 'organizations', alert.organizationId, 'scheduledAlerts', alertId), docData)
      
      // Update local state
      const index = this.scheduledAlerts.findIndex(a => a.id === alertId)
      if (index !== -1) {
        this.scheduledAlerts[index] = { ...alert, id: alertId }
      }
      
      console.log('✅ Scheduled alert updated successfully')
      return { ...alert, id: alertId }
    } catch (error) {
      console.error('❌ Error updating scheduled alert:', error)
      this.errorMessage = error.message
      throw error
    }
  }

  async deleteScheduledAlert(alertId, organizationId) {
    console.log('⏰ Deleting scheduled alert:', alertId)
    
    try {
      // Delete from organization's scheduledAlerts subcollection
      await deleteDoc(doc(db, 'organizations', organizationId, 'scheduledAlerts', alertId))
      
      // Update local state
      this.scheduledAlerts = this.scheduledAlerts.filter(a => a.id !== alertId)
      
      console.log('✅ Scheduled alert deleted successfully')
    } catch (error) {
      console.error('❌ Error deleting scheduled alert:', error)
      this.errorMessage = error.message
      throw error
    }
  }

  async fetchScheduledAlerts(dateRange = null, organizationId = null) {
    console.log('⏰ Fetching scheduled alerts...')
    
    this.isLoading = true
    this.errorMessage = null
    
    try {
      let alerts = []
      
      if (organizationId) {
        // Fetch scheduled alerts for specific organization
        let q = query(collection(db, 'organizations', organizationId, 'scheduledAlerts'), orderBy('scheduledDate', 'asc'))
        
        if (dateRange) {
          q = query(
            collection(db, 'organizations', organizationId, 'scheduledAlerts'),
            where('scheduledDate', '>=', dateRange.start),
            where('scheduledDate', '<=', dateRange.end),
            orderBy('scheduledDate', 'asc')
          )
        }
        
        const snapshot = await getDocs(q)
        snapshot.forEach(doc => {
          const data = doc.data()
          alerts.push(new ScheduledAlert({
            id: doc.id,
            ...data,
            scheduledDate: data.scheduledDate?.toDate() || new Date(),
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            expiresAt: data.expiresAt?.toDate() || null,
            recurrencePattern: data.recurrencePattern ? 
              RecurrencePattern.fromDictionary(data.recurrencePattern) : null,
            location: data.location ? {
              latitude: data.location.latitude,
              longitude: data.location.longitude,
              address: data.location.address,
              city: data.location.city,
              state: data.location.state,
              zipCode: data.location.zipCode
            } : null
          }))
        })
      } else {
        // Fetch alerts from all organizations
        const organizationsSnapshot = await getDocs(collection(db, 'organizations'))
        
        for (const orgDoc of organizationsSnapshot.docs) {
          const orgId = orgDoc.id
          let q = query(collection(db, 'organizations', orgId, 'scheduledAlerts'), orderBy('scheduledDate', 'asc'))
          
          if (dateRange) {
            q = query(
              collection(db, 'organizations', orgId, 'scheduledAlerts'),
              where('scheduledDate', '>=', dateRange.start),
              where('scheduledDate', '<=', dateRange.end),
              orderBy('scheduledDate', 'asc')
            )
          }
          
          const alertsSnapshot = await getDocs(q)
          alertsSnapshot.forEach(doc => {
            const data = doc.data()
            alerts.push(new ScheduledAlert({
              id: doc.id,
              ...data,
              scheduledDate: data.scheduledDate?.toDate() || new Date(),
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date(),
              expiresAt: data.expiresAt?.toDate() || null,
              recurrencePattern: data.recurrencePattern ? 
                RecurrencePattern.fromDictionary(data.recurrencePattern) : null,
              location: data.location ? {
                latitude: data.location.latitude,
                longitude: data.location.longitude,
                address: data.location.address,
                city: data.location.city,
                state: data.location.state,
                zipCode: data.location.zipCode
              } : null
            }))
          })
        }
      }
      
      // Sort all alerts by scheduled date
      alerts.sort((a, b) => a.scheduledDate - b.scheduledDate)
      
      this.scheduledAlerts = alerts
      this.isLoading = false
      
      console.log(`✅ Fetched ${alerts.length} scheduled alerts`)
      if (alerts.length > 0) {
        console.log('📅 Scheduled alerts:', alerts.map(alert => ({
          id: alert.id,
          title: alert.title,
          scheduledDate: alert.scheduledDate,
          organizationId: alert.organizationId
        })))
      }
      return alerts
    } catch (error) {
      console.error('❌ Error fetching scheduled alerts:', error)
      this.errorMessage = error.message
      this.isLoading = false
      throw error
    }
  }

  // Combined Calendar Data

  async fetchCalendarData(dateRange = null, organizationId = null) {
    console.log('📅 Fetching calendar data...')
    
    this.isLoading = true
    this.errorMessage = null
    
    try {
      await Promise.all([
        this.fetchEvents(dateRange),
        this.fetchScheduledAlerts(dateRange, organizationId)
      ])
      
      console.log('✅ Calendar data fetched successfully')
    } catch (error) {
      console.error('❌ Error fetching calendar data:', error)
      this.errorMessage = error.message
      this.isLoading = false
      throw error
    }
  }

  // Helper Methods

  getEventsForDate(date) {
    const targetDate = new Date(date)
    return this.events.filter(event => {
      const eventStart = new Date(event.startDate)
      const eventEnd = new Date(event.endDate)
      
      return eventStart.toDateString() === targetDate.toDateString() ||
             eventEnd.toDateString() === targetDate.toDateString() ||
             (eventStart <= targetDate && eventEnd >= targetDate)
    })
  }

  getScheduledAlertsForDate(date) {
    const targetDate = new Date(date)
    return this.scheduledAlerts.filter(alert => {
      const alertDate = new Date(alert.scheduledDate)
      return alertDate.toDateString() === targetDate.toDateString()
    })
  }

  getUpcomingAlerts(limit = 10) {
    return this.scheduledAlerts
      .filter(alert => alert.isUpcoming && alert.isActive)
      .sort((a, b) => a.scheduledDate - b.scheduledDate)
      .slice(0, limit)
  }

  getTodaysEvents() {
    return this.getEventsForDate(new Date())
  }

  getTodaysAlerts() {
    return this.getScheduledAlertsForDate(new Date())
  }
}

export default new CalendarService()

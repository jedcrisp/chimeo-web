import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
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
    console.log('⏰ Alert data:', alertData)
    console.log('⏰ Organization ID:', alertData.organizationId)
    
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
      const docPath = `organizations/${alert.organizationId}/scheduledAlerts/${alertId}`
      console.log('⏰ Updating document at path:', docPath)
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
    console.log('🔍 CalendarService: organizationId type:', typeof organizationId, 'value:', organizationId)
    console.log('🔍 CalendarService: dateRange:', dateRange)
    console.log('🔍 CalendarService: Current local alerts count:', this.scheduledAlerts.length)
    
    this.isLoading = true
    this.errorMessage = null
    
    try {
      let alerts = []
      
      if (organizationId && typeof organizationId === 'string') {
        console.log('🔍 CalendarService: Fetching alerts for specific organization:', organizationId)
        // Fetch scheduled alerts for specific organization
        const orgPath = `organizations/${organizationId}/scheduledAlerts`
        console.log('🔍 CalendarService: Querying path:', orgPath)
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
        console.log('🔍 CalendarService: Snapshot size for organization:', snapshot.size)
        console.log('🔍 CalendarService: Query executed successfully for path:', orgPath)
        
        if (snapshot.empty) {
          console.log('⚠️ CalendarService: No documents found in the collection')
          console.log('🔍 CalendarService: Let me try to check if the organization exists...')
          
          // Try to check if the organization document exists
          try {
            const orgRef = doc(db, 'organizations', organizationId)
            const orgDoc = await getDoc(orgRef)
            if (orgDoc.exists()) {
              console.log('✅ Organization exists:', orgDoc.data().name || organizationId)
            } else {
              console.log('❌ Organization does not exist:', organizationId)
            }
          } catch (orgError) {
            console.log('❌ Error checking organization:', orgError)
          }
        }
        
        snapshot.forEach(doc => {
          const data = doc.data()
          console.log('🔍 CalendarService: Found alert in organization:', doc.id, data.title)
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
        console.log('🔍 CalendarService: Fetching alerts from all organizations')
        const organizationsSnapshot = await getDocs(collection(db, 'organizations'))
        console.log('🔍 CalendarService: Found organizations:', organizationsSnapshot.size)
        
        // Log all organizations found
        organizationsSnapshot.docs.forEach(orgDoc => {
          console.log('🔍 Organization found:', orgDoc.id, orgDoc.data().name || 'No name')
        })
        
        for (const orgDoc of organizationsSnapshot.docs) {
          console.log('🔍 CalendarService: Checking organization:', orgDoc.id)
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
          console.log('🔍 CalendarService: Found alerts in org', orgId, ':', alertsSnapshot.size)
          alertsSnapshot.forEach(doc => {
            const data = doc.data()
            console.log('🔍 CalendarService: Found alert in all orgs:', doc.id, data.title, 'in org:', orgId)
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
      
      // Remove duplicates based on ID and title combination
      const uniqueAlerts = alerts.filter((alert, index, self) => 
        index === self.findIndex(a => a.id === alert.id && a.title === alert.title)
      )
      
      if (alerts.length !== uniqueAlerts.length) {
        console.log(`🔄 Removed ${alerts.length - uniqueAlerts.length} duplicate alerts`)
        console.log(`📊 Original count: ${alerts.length}, Unique count: ${uniqueAlerts.length}`)
      }
      
      // Always clear and set the alerts array to ensure fresh data
      this.scheduledAlerts = []
      this.scheduledAlerts = uniqueAlerts
      this.isLoading = false
      
      console.log(`✅ Fetched ${alerts.length} scheduled alerts`)
      console.log(`✅ Updated local scheduledAlerts array to ${this.scheduledAlerts.length} alerts`)
      
      // Check for duplicates
      const alertTitles = uniqueAlerts.map(alert => alert.title)
      const uniqueTitles = [...new Set(alertTitles)]
      if (alertTitles.length !== uniqueTitles.length) {
        console.log('⚠️ DUPLICATE ALERTS DETECTED!')
        console.log('📋 All alert titles:', alertTitles)
        console.log('📋 Unique titles:', uniqueTitles)
        
        // Find duplicates
        const duplicates = alertTitles.filter((title, index) => alertTitles.indexOf(title) !== index)
        console.log('📋 Duplicate titles:', [...new Set(duplicates)])
      }
      
      if (uniqueAlerts.length > 0) {
        console.log('📅 Scheduled alerts:', uniqueAlerts.map(alert => ({
          id: alert.id,
          title: alert.title,
          scheduledDate: alert.scheduledDate,
          organizationId: alert.organizationId
        })))
        // Log each alert's scheduled date in detail
        uniqueAlerts.forEach((alert, index) => {
          const alertDate = new Date(alert.scheduledDate)
          console.log(`📅 Alert ${index + 1}: "${alert.title}" - Raw date: ${alert.scheduledDate}, Parsed date: ${alertDate.toDateString()}, postedByUserId: ${alert.postedByUserId}`)
        })
      } else {
        console.log('⚠️ No scheduled alerts found in database')
      }
      return uniqueAlerts
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
      
      this.isLoading = false
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
    console.log('🔍 getScheduledAlertsForDate FUNCTION CALLED')
    const targetDate = new Date(date)
    console.log('🔍 getScheduledAlertsForDate called with date:', targetDate.toDateString())
    console.log('🔍 Total scheduled alerts:', this.scheduledAlerts.length)
    
    // Log all scheduled alerts and their dates
    this.scheduledAlerts.forEach((alert, index) => {
      const alertDate = new Date(alert.scheduledDate)
      console.log(`🔍 Alert ${index + 1}: "${alert.title}" scheduled for: ${alertDate.toDateString()}`)
    })
    
    const filteredAlerts = this.scheduledAlerts.filter(alert => {
      const alertDate = new Date(alert.scheduledDate)
      const matches = alertDate.toDateString() === targetDate.toDateString()
      if (matches) {
        console.log('🔍 Found matching alert:', alert.title, 'for date:', alertDate.toDateString())
      }
      return matches
    })
    
    console.log('🔍 Returning', filteredAlerts.length, 'alerts for date:', targetDate.toDateString())
    return filteredAlerts
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

  // Nuclear option - completely clear all data
  clearAllData() {
    console.log('💥 Nuclear clear: Clearing all calendar data')
    this.events = []
    this.scheduledAlerts = []
    this.isLoading = false
    this.errorMessage = null
    console.log('💥 Nuclear clear: All data cleared')
  }

  // Debug function to search for alerts in all possible locations
  async debugFindAllAlerts() {
    console.log('🔍 DEBUG: Searching for alerts in all possible locations...')
    
    try {
      // Check main scheduledAlerts collection
      try {
        const mainAlertsRef = collection(db, 'scheduledAlerts')
        const mainSnapshot = await getDocs(mainAlertsRef)
        console.log('🔍 Main scheduledAlerts collection:', mainSnapshot.size, 'alerts')
        
        if (mainSnapshot.size > 0) {
          mainSnapshot.docs.forEach(alertDoc => {
            const data = alertDoc.data()
            console.log(`  - Main Alert: ${data.title} (${alertDoc.id})`)
          })
        }
      } catch (error) {
        console.log('🔍 Main scheduledAlerts collection does not exist or error:', error.message)
      }
      
      // Check all organizations
      const orgsSnapshot = await getDocs(collection(db, 'organizations'))
      console.log('🔍 Found organizations:', orgsSnapshot.size)
      
      for (const orgDoc of orgsSnapshot.docs) {
        const orgId = orgDoc.id
        const orgData = orgDoc.data()
        console.log(`🔍 Checking organization: ${orgId} (${orgData.name || 'No name'})`)
        
        try {
          const alertsRef = collection(db, 'organizations', orgId, 'scheduledAlerts')
          const alertsSnapshot = await getDocs(alertsRef)
          console.log(`🔍 Organization ${orgId}: ${alertsSnapshot.size} alerts`)
          
          if (alertsSnapshot.size > 0) {
            alertsSnapshot.docs.forEach(alertDoc => {
              const data = alertDoc.data()
              console.log(`  - Org Alert: ${data.title} (${alertDoc.id})`)
            })
          }
        } catch (error) {
          console.log(`🔍 Error checking org ${orgId}:`, error.message)
        }
      }
      
      // Check if alerts are in local state
      console.log('🔍 Local scheduledAlerts array:', this.scheduledAlerts.length, 'alerts')
      if (this.scheduledAlerts.length > 0) {
        this.scheduledAlerts.forEach((alert, index) => {
          console.log(`  - Local Alert ${index + 1}: ${alert.title} (${alert.id})`)
        })
      }
      
    } catch (error) {
      console.error('❌ Error in debug search:', error)
    }
  }

  // Delete all scheduled alerts from the main collection
  async deleteAllScheduledAlerts(organizationId) {
    console.log('🗑️ Deleting all scheduled alerts from main collection')
    
    try {
      // Delete from main scheduledAlerts collection
      const mainAlertsRef = collection(db, 'scheduledAlerts')
      const mainQuery = query(mainAlertsRef, orderBy('scheduledDate', 'asc'))
      const mainSnapshot = await getDocs(mainQuery)
      
      console.log(`📊 Found ${mainSnapshot.size} alerts in main collection to delete`)
      
      let deletedCount = 0
      
      // Delete from main collection
      for (const alertDoc of mainSnapshot.docs) {
        try {
          const docPath = `scheduledAlerts/${alertDoc.id}`
          console.log(`🗑️ Deleting from main collection: ${docPath}`)
          
          await deleteDoc(doc(db, 'scheduledAlerts', alertDoc.id))
          console.log(`✅ Successfully deleted alert: ${alertDoc.data().title} (${alertDoc.id})`)
          deletedCount++
        } catch (error) {
          console.error(`❌ Failed to delete alert ${alertDoc.id}:`, error)
        }
      }
      
      // Also try to delete from organization subcollection (in case there are any)
      const orgAlertsRef = collection(db, 'organizations', organizationId, 'scheduledAlerts')
      const orgQuery = query(orgAlertsRef, orderBy('scheduledDate', 'asc'))
      const orgSnapshot = await getDocs(orgQuery)
      
      console.log(`📊 Found ${orgSnapshot.size} alerts in organization collection to delete`)
      
      for (const alertDoc of orgSnapshot.docs) {
        try {
          const docPath = `organizations/${organizationId}/scheduledAlerts/${alertDoc.id}`
          console.log(`🗑️ Deleting from organization collection: ${docPath}`)
          
          await deleteDoc(doc(db, 'organizations', organizationId, 'scheduledAlerts', alertDoc.id))
          console.log(`✅ Successfully deleted org alert: ${alertDoc.data().title} (${alertDoc.id})`)
          deletedCount++
        } catch (error) {
          console.error(`❌ Failed to delete org alert ${alertDoc.id}:`, error)
        }
      }
      
      // Clear local state
      this.scheduledAlerts = []
      console.log('🗑️ Cleared local scheduledAlerts array')
      
      const totalAlerts = mainSnapshot.size + orgSnapshot.size
      console.log(`🎉 Successfully deleted ${deletedCount} out of ${totalAlerts} alerts`)
      return { deletedCount, totalCount: totalAlerts }
      
    } catch (error) {
      console.error('❌ Error deleting all alerts:', error)
      throw error
    }
  }
}

export default new CalendarService()

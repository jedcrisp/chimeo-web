import { 
  collection, 
  addDoc, 
  doc, 
  updateDoc, 
  getDoc, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit,
  serverTimestamp,
  increment
} from 'firebase/firestore'
import { db } from './firebase'

class AnalyticsService {
  constructor() {
    this.events = []
    this.batchSize = 10
    this.flushInterval = 30000 // 30 seconds
    this.startBatchFlush()
  }

  // Track an analytics event
  async trackEvent(eventType, data = {}, organizationId = null) {
    try {
      const event = {
        eventType,
        data,
        organizationId,
        timestamp: new Date(),
        userId: data.userId || null,
        sessionId: this.getSessionId(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        createdAt: serverTimestamp()
      }

      // Add to batch
      this.events.push(event)

      // Flush if batch is full
      if (this.events.length >= this.batchSize) {
        await this.flushEvents()
      }

      console.log(`📊 Analytics: Tracked ${eventType}`, data)
    } catch (error) {
      console.error('❌ Analytics: Error tracking event:', error)
    }
  }

  // Track alert events
  async trackAlertCreated(alertData, organizationId) {
    await this.trackEvent('alert_created', {
      alertId: alertData.id,
      alertType: alertData.type,
      severity: alertData.severity,
      groupId: alertData.groupId,
      location: alertData.location,
      userId: alertData.postedByUserId
    }, organizationId)
  }

  async trackAlertViewed(alertId, userId, organizationId) {
    await this.trackEvent('alert_viewed', {
      alertId,
      userId
    }, organizationId)
  }

  async trackAlertAcknowledged(alertId, userId, organizationId) {
    await this.trackEvent('alert_acknowledged', {
      alertId,
      userId
    }, organizationId)
  }

  // Track user events
  async trackUserLogin(userId, organizationId) {
    await this.trackEvent('user_login', {
      userId
    }, organizationId)
  }

  async trackUserRegistration(userId, organizationId) {
    await this.trackEvent('user_registration', {
      userId
    }, organizationId)
  }

  async trackUserActivity(userId, activityType, organizationId) {
    await this.trackEvent('user_activity', {
      userId,
      activityType
    }, organizationId)
  }

  // Track group events
  async trackGroupCreated(groupData, organizationId) {
    await this.trackEvent('group_created', {
      groupId: groupData.id,
      groupName: groupData.name,
      userId: groupData.createdBy
    }, organizationId)
  }

  async trackGroupJoined(groupId, userId, organizationId) {
    await this.trackEvent('group_joined', {
      groupId,
      userId
    }, organizationId)
  }

  // Track notification events
  async trackNotificationSent(notificationData, organizationId) {
    await this.trackEvent('notification_sent', {
      notificationId: notificationData.id,
      type: notificationData.type,
      channel: notificationData.channel,
      userId: notificationData.userId
    }, organizationId)
  }

  async trackNotificationDelivered(notificationId, userId, organizationId) {
    await this.trackEvent('notification_delivered', {
      notificationId,
      userId
    }, organizationId)
  }

  async trackNotificationClicked(notificationId, userId, organizationId) {
    await this.trackEvent('notification_clicked', {
      notificationId,
      userId
    }, organizationId)
  }

  // Track admin events
  async trackAdminAction(action, data, organizationId) {
    await this.trackEvent('admin_action', {
      action,
      ...data
    }, organizationId)
  }

  // Get analytics data for organization
  async getOrganizationAnalytics(organizationId, startDate, endDate) {
    try {
      const eventsQuery = query(
        collection(db, 'analytics_events'),
        where('organizationId', '==', organizationId),
        where('timestamp', '>=', startDate),
        where('timestamp', '<=', endDate),
        orderBy('timestamp', 'desc')
      )

      const eventsSnapshot = await getDocs(eventsQuery)
      const events = eventsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))

      return this.processAnalyticsData(events)
    } catch (error) {
      console.error('❌ Analytics: Error getting organization analytics:', error)
      return null
    }
  }

  // Process raw events into analytics data
  processAnalyticsData(events) {
    const analytics = {
      totalEvents: events.length,
      eventTypes: {},
      userActivity: {},
      alertMetrics: {
        created: 0,
        viewed: 0,
        acknowledged: 0
      },
      userMetrics: {
        logins: 0,
        registrations: 0,
        activeUsers: new Set()
      },
      groupMetrics: {
        created: 0,
        joined: 0
      },
      notificationMetrics: {
        sent: 0,
        delivered: 0,
        clicked: 0
      },
      timeSeries: {}
    }

    events.forEach(event => {
      // Count event types
      analytics.eventTypes[event.eventType] = (analytics.eventTypes[event.eventType] || 0) + 1

      // Track user activity
      if (event.userId) {
        analytics.userMetrics.activeUsers.add(event.userId)
      }

      // Process specific event types
      switch (event.eventType) {
        case 'alert_created':
          analytics.alertMetrics.created++
          break
        case 'alert_viewed':
          analytics.alertMetrics.viewed++
          break
        case 'alert_acknowledged':
          analytics.alertMetrics.acknowledged++
          break
        case 'user_login':
          analytics.userMetrics.logins++
          break
        case 'user_registration':
          analytics.userMetrics.registrations++
          break
        case 'group_created':
          analytics.groupMetrics.created++
          break
        case 'group_joined':
          analytics.groupMetrics.joined++
          break
        case 'notification_sent':
          analytics.notificationMetrics.sent++
          break
        case 'notification_delivered':
          analytics.notificationMetrics.delivered++
          break
        case 'notification_clicked':
          analytics.notificationMetrics.clicked++
          break
      }

      // Build time series data
      const date = event.timestamp.toDate().toISOString().split('T')[0]
      if (!analytics.timeSeries[date]) {
        analytics.timeSeries[date] = {}
      }
      analytics.timeSeries[date][event.eventType] = (analytics.timeSeries[date][event.eventType] || 0) + 1
    })

    // Convert Set to number
    analytics.userMetrics.activeUsers = analytics.userMetrics.activeUsers.size

    return analytics
  }

  // Flush events to Firestore
  async flushEvents() {
    if (this.events.length === 0) return

    try {
      const eventsToFlush = [...this.events]
      this.events = []

      // Batch write events to Firestore
      const batch = eventsToFlush.map(event => 
        addDoc(collection(db, 'analytics_events'), event)
      )

      await Promise.all(batch)
      console.log(`📊 Analytics: Flushed ${eventsToFlush.length} events to Firestore`)
    } catch (error) {
      console.error('❌ Analytics: Error flushing events:', error)
      // Re-add events to batch if flush failed
      this.events.unshift(...this.events)
    }
  }

  // Start periodic flush
  startBatchFlush() {
    setInterval(() => {
      this.flushEvents()
    }, this.flushInterval)
  }

  // Get session ID
  getSessionId() {
    let sessionId = sessionStorage.getItem('analytics_session_id')
    if (!sessionId) {
      sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
      sessionStorage.setItem('analytics_session_id', sessionId)
    }
    return sessionId
  }

  // Track page views
  async trackPageView(page, organizationId) {
    await this.trackEvent('page_view', {
      page,
      userId: this.getCurrentUserId()
    }, organizationId)
  }

  // Get current user ID (you'll need to implement this based on your auth system)
  getCurrentUserId() {
    // This should return the current user's ID
    // You might need to pass this from your auth context
    return null
  }

  // Track feature usage
  async trackFeatureUsage(feature, data, organizationId) {
    await this.trackEvent('feature_usage', {
      feature,
      ...data
    }, organizationId)
  }

  // Track errors
  async trackError(error, context, organizationId) {
    await this.trackEvent('error', {
      error: error.message,
      stack: error.stack,
      context
    }, organizationId)
  }
}

// Create singleton instance
const analyticsService = new AnalyticsService()

export default analyticsService

import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  addDoc, 
  updateDoc, 
  doc,
  serverTimestamp 
} from 'firebase/firestore'
import { db } from './firebase'
import notificationService from './notificationService'

class ScheduledAlertProcessor {
  constructor() {
    this.isProcessing = false
  }

  // Process all scheduled alerts that are due
  async processScheduledAlerts() {
    if (this.isProcessing) {
      console.log('⏰ Scheduled alert processor already running, skipping...')
      return
    }

    this.isProcessing = true
    console.log('⏰ Processing scheduled alerts...')

    try {
      const now = new Date()
      const processedAlerts = []

      // Get all organizations
      const organizationsSnapshot = await getDocs(collection(db, 'organizations'))
      
      for (const orgDoc of organizationsSnapshot.docs) {
        const orgId = orgDoc.id
        const orgData = orgDoc.data()
        
        // Get scheduled alerts for this organization that are due
        // Use a simpler query to avoid index requirements
        const scheduledAlertsQuery = query(
          collection(db, 'organizations', orgId, 'scheduledAlerts'),
          where('isActive', '==', true)
        )

        const scheduledAlertsSnapshot = await getDocs(scheduledAlertsQuery)
        
        for (const alertDoc of scheduledAlertsSnapshot.docs) {
          const alertData = alertDoc.data()
          
          // Check if alert is due (filter in JavaScript to avoid index requirements)
          const scheduledDate = alertData.scheduledDate?.toDate() || new Date()
          if (scheduledDate <= now) {
            try {
              // Convert scheduled alert to active alert
              await this.convertScheduledAlertToActiveAlert(orgId, orgData.name, alertData, alertDoc.id)
              processedAlerts.push(alertData.title)
              
              console.log(`✅ Processed scheduled alert: ${alertData.title}`)
            } catch (error) {
              console.error(`❌ Error processing alert ${alertData.title}:`, error)
            }
          }
        }
      }

      console.log(`✅ Processed ${processedAlerts.length} scheduled alerts:`, processedAlerts)
      return processedAlerts
    } catch (error) {
      console.error('❌ Error processing scheduled alerts:', error)
      throw error
    } finally {
      this.isProcessing = false
    }
  }

  // Convert a scheduled alert to an active alert
  async convertScheduledAlertToActiveAlert(organizationId, organizationName, alertData, scheduledAlertId) {
    try {
      // Create active alert data
      const activeAlertData = {
        title: alertData.title,
        description: alertData.description,
        organizationId: organizationId,
        organizationName: organizationName,
        groupId: alertData.groupId || null,
        groupName: alertData.groupName || null,
        type: alertData.type,
        severity: alertData.severity,
        location: alertData.location || null,
        postedBy: alertData.postedBy,
        postedByUserId: alertData.postedByUserId,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        expiresAt: alertData.expiresAt || null,
        imageURLs: alertData.imageURLs || [],
        // Mark as processed from scheduled alert
        source: 'scheduled',
        originalScheduledAlertId: scheduledAlertId,
        processedAt: serverTimestamp()
      }

      // Add to active alerts collection (for web app display)
      const activeAlertRef = await addDoc(collection(db, 'organizationAlerts'), activeAlertData)
      console.log(`✅ Created active alert: ${activeAlertRef.id}`)

      // Add to mobile app structure (for push notifications)
      const mobileAlertRef = await addDoc(collection(db, 'organizations', organizationId, 'alerts'), activeAlertData)
      console.log(`✅ Created mobile alert: ${mobileAlertRef.id}`)

      // Mark scheduled alert as processed
      await updateDoc(doc(db, 'organizations', organizationId, 'scheduledAlerts', scheduledAlertId), {
        isActive: false,
        processedAt: serverTimestamp(),
        processedAlertId: activeAlertRef.id
      })

      // Send push notification
      try {
        await notificationService.sendAlertNotification({
          id: activeAlertRef.id,
          title: alertData.title,
          message: alertData.description,
          organizationId: organizationId
        })
        console.log(`✅ Sent notification for alert: ${alertData.title}`)
      } catch (notificationError) {
        console.error('❌ Error sending notification:', notificationError)
        // Don't throw here, alert was created successfully
      }

      return activeAlertRef.id
    } catch (error) {
      console.error('❌ Error converting scheduled alert to active alert:', error)
      throw error
    }
  }

  // Process alerts for a specific organization
  async processScheduledAlertsForOrganization(organizationId) {
    console.log(`⏰ Processing scheduled alerts for organization: ${organizationId}`)
    
    try {
      const now = new Date()
      const processedAlerts = []

      // Get organization data
      const orgDoc = await getDocs(query(collection(db, 'organizations'), where('__name__', '==', organizationId)))
      if (orgDoc.empty) {
        throw new Error('Organization not found')
      }
      
      const orgData = orgDoc.docs[0].data()

      // Get scheduled alerts for this organization that are due
      // Use a simpler query to avoid index requirements
      const scheduledAlertsQuery = query(
        collection(db, 'organizations', organizationId, 'scheduledAlerts'),
        where('isActive', '==', true)
      )

      const scheduledAlertsSnapshot = await getDocs(scheduledAlertsQuery)
      
      for (const alertDoc of scheduledAlertsSnapshot.docs) {
        const alertData = alertDoc.data()
        
        // Check if alert is due (filter in JavaScript to avoid index requirements)
        const scheduledDate = alertData.scheduledDate?.toDate() || new Date()
        if (scheduledDate <= now) {
          try {
            await this.convertScheduledAlertToActiveAlert(organizationId, orgData.name, alertData, alertDoc.id)
            processedAlerts.push(alertData.title)
          } catch (error) {
            console.error(`❌ Error processing alert ${alertData.title}:`, error)
          }
        }
      }

      console.log(`✅ Processed ${processedAlerts.length} scheduled alerts for organization ${organizationId}`)
      return processedAlerts
    } catch (error) {
      console.error('❌ Error processing scheduled alerts for organization:', error)
      throw error
    }
  }

  // Get scheduled alerts that are due (for testing)
  async getDueScheduledAlerts(organizationId = null) {
    try {
      const now = new Date()
      const dueAlerts = []

      if (organizationId) {
        // Get alerts for specific organization
        const scheduledAlertsQuery = query(
          collection(db, 'organizations', organizationId, 'scheduledAlerts'),
          where('isActive', '==', true)
        )

        const snapshot = await getDocs(scheduledAlertsQuery)
        snapshot.forEach(doc => {
          const alertData = doc.data()
          const scheduledDate = alertData.scheduledDate?.toDate() || new Date()
          
          // Only include alerts that are due
          if (scheduledDate <= now) {
            dueAlerts.push({
              id: doc.id,
              ...alertData,
              scheduledDate: scheduledDate
            })
          }
        })
      } else {
        // Get alerts for all organizations
        const organizationsSnapshot = await getDocs(collection(db, 'organizations'))
        
        for (const orgDoc of organizationsSnapshot.docs) {
          const orgId = orgDoc.id
          const scheduledAlertsQuery = query(
            collection(db, 'organizations', orgId, 'scheduledAlerts'),
            where('isActive', '==', true)
          )

          const snapshot = await getDocs(scheduledAlertsQuery)
          snapshot.forEach(doc => {
            const alertData = doc.data()
            const scheduledDate = alertData.scheduledDate?.toDate() || new Date()
            
            // Only include alerts that are due
            if (scheduledDate <= now) {
              dueAlerts.push({
                id: doc.id,
                ...alertData,
                scheduledDate: scheduledDate,
                organizationId: orgId
              })
            }
          })
        }
      }

      return dueAlerts
    } catch (error) {
      console.error('❌ Error getting due scheduled alerts:', error)
      return []
    }
  }
}

export default new ScheduledAlertProcessor()

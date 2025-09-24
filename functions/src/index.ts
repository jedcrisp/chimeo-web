import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'

// Initialize Firebase Admin
admin.initializeApp()

const db = admin.firestore()

// Export subscription webhooks
export { stripeWebhook, onUserSubscriptionChange } from './subscriptionWebhooks'

// Scheduled function that runs every minute
export const processScheduledAlerts = functions.pubsub
  .schedule('every 1 minutes')
  .timeZone('UTC')
  .onRun(async (context) => {
    console.log('⏰ Scheduled function: Processing scheduled alerts...')
    
    try {
      const processedAlerts = await processScheduledAlertsInternal()
      console.log(`✅ Scheduled function: Processed ${processedAlerts.length} alerts`)
      return { success: true, processedCount: processedAlerts.length }
    } catch (error) {
      console.error('❌ Scheduled function error:', error)
      throw error
    }
  })

// Database trigger for immediate processing when scheduled alerts are created
export const onScheduledAlertCreated = functions.firestore
  .document('organizations/{organizationId}/scheduledAlerts/{alertId}')
  .onCreate(async (snap, context) => {
    const alertData = snap.data()
    const organizationId = context.params.organizationId
    const alertId = context.params.alertId
    
    console.log(`🔔 Database trigger: New scheduled alert created: ${alertData.title}`)
    
    // Check if alert is due immediately (within 1 minute)
    const scheduledDate = alertData.scheduledDate?.toDate() || new Date()
    const now = new Date()
    const timeDiff = scheduledDate.getTime() - now.getTime()
    
    if (timeDiff <= 60000) { // 1 minute
      console.log(`⚡ Database trigger: Alert is due immediately, processing now...`)
      try {
        await processSingleScheduledAlert(organizationId, alertId, alertData)
        console.log(`✅ Database trigger: Processed immediate alert: ${alertData.title}`)
      } catch (error) {
        console.error(`❌ Database trigger error:`, error)
      }
    } else {
      console.log(`⏳ Database trigger: Alert scheduled for future, will be processed by scheduled function`)
    }
  })

// Database trigger for regular alerts created from web app
export const onAlertCreated = functions.firestore
  .document('organizations/{organizationId}/alerts/{alertId}')
  .onCreate(async (snap, context) => {
    const alertData = snap.data()
    const organizationId = context.params.organizationId
    
    console.log(`🔔 Database trigger: New alert created: ${alertData.title}`)
    console.log(`🔔 Alert data:`, alertData)
    
    try {
      // Get organization data
      const orgDoc = await db.collection('organizations').doc(organizationId).get()
      const orgData = orgDoc.data()
      const organizationName = orgData?.name || 'Unknown Organization'
      
      // Send push notification
      await sendPushNotification({
        ...alertData,
        organizationName: organizationName
      })
      
      console.log(`✅ Successfully processed alert: ${alertData.title}`)
    } catch (error) {
      console.error(`❌ Error processing alert ${alertData.title}:`, error)
      // Don't throw here, alert was created successfully
    }
  })

// HTTP function for manual processing (backup)
export const processAlertsManually = functions.https.onRequest(async (req, res) => {
  console.log('🔧 Manual processing triggered via HTTP')
  
  try {
    const processedAlerts = await processScheduledAlertsInternal()
    res.status(200).json({
      success: true,
      message: `Processed ${processedAlerts.length} scheduled alerts`,
      processedAlerts: processedAlerts
    })
    } catch (error) {
      console.error('❌ Manual processing error:', error)
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
})

// Internal function to process all scheduled alerts
async function processScheduledAlertsInternal(): Promise<string[]> {
  const processedAlerts: string[] = []
  const now = new Date()
  
  try {
    // Get all organizations
    const organizationsSnapshot = await db.collection('organizations').get()
    
    for (const orgDoc of organizationsSnapshot.docs) {
      const orgId = orgDoc.id
      const orgData = orgDoc.data()
      
      // Get scheduled alerts for this organization that are due
      const scheduledAlertsQuery = db
        .collection('organizations')
        .doc(orgId)
        .collection('scheduledAlerts')
        .where('isActive', '==', true)
        .where('scheduledDate', '<=', now)
      
      const scheduledAlertsSnapshot = await scheduledAlertsQuery.get()
      
      for (const alertDoc of scheduledAlertsSnapshot.docs) {
        const alertData = alertDoc.data()
        
        try {
          await processSingleScheduledAlert(orgId, alertDoc.id, alertData, orgData.name)
          processedAlerts.push(alertData.title)
          console.log(`✅ Processed scheduled alert: ${alertData.title}`)
        } catch (error) {
          console.error(`❌ Error processing alert ${alertData.title}:`, error)
        }
      }
    }
    
    return processedAlerts
  } catch (error) {
    console.error('❌ Error in processScheduledAlertsInternal:', error)
    throw error
  }
}

// Process a single scheduled alert
async function processSingleScheduledAlert(
  organizationId: string, 
  scheduledAlertId: string, 
  alertData: any, 
  organizationName?: string
): Promise<string> {
  try {
    // Create active alert data
    const activeAlertData = {
      title: alertData.title,
      description: alertData.description,
      organizationId: organizationId,
      organizationName: organizationName || 'Unknown Organization',
      groupId: alertData.groupId || null,
      groupName: alertData.groupName || null,
      type: alertData.type,
      severity: alertData.severity,
      location: alertData.location || null,
      postedBy: alertData.postedBy,
      postedByUserId: alertData.postedByUserId,
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: alertData.expiresAt || null,
      imageURLs: alertData.imageURLs || [],
      // Mark as processed from scheduled alert
      source: 'scheduled',
      originalScheduledAlertId: scheduledAlertId,
      processedAt: admin.firestore.FieldValue.serverTimestamp()
    }

    // Add to active alerts collection (for web app display)
    const activeAlertRef = await db.collection('organizationAlerts').add(activeAlertData)
    console.log(`✅ Created active alert: ${activeAlertRef.id}`)

    // Add to mobile app structure (for push notifications)
    const mobileAlertRef = await db
      .collection('organizations')
      .doc(organizationId)
      .collection('alerts')
      .add(activeAlertData)
    console.log(`✅ Created mobile alert: ${mobileAlertRef.id}`)

    // Mark scheduled alert as processed
    await db
      .collection('organizations')
      .doc(organizationId)
      .collection('scheduledAlerts')
      .doc(scheduledAlertId)
      .update({
        isActive: false,
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
        processedAlertId: activeAlertRef.id
      })

    // Send push notification
    try {
      await sendPushNotification(activeAlertData)
      console.log(`✅ Sent push notification for alert: ${alertData.title}`)
    } catch (notificationError) {
      console.error('❌ Error sending push notification:', notificationError)
      // Don't throw here, alert was created successfully
    }

    return activeAlertRef.id
  } catch (error) {
    console.error('❌ Error converting scheduled alert to active alert:', error)
    throw error
  }
}

// Send push notification
async function sendPushNotification(alertData: any): Promise<void> {
  try {
    // First, let's get all users and check their FCM tokens
    // We'll look for users who might be associated with this organization
    const usersSnapshot = await db
      .collection('users')
      .get()

    if (usersSnapshot.empty) {
      console.log('No users found in database')
      return
    }

    console.log(`Checking ${usersSnapshot.docs.length} users for FCM tokens`)

    // Extract FCM tokens from all user documents
    const tokens = usersSnapshot.docs
      .map(doc => {
        const userData = doc.data()
        const hasToken = userData.fcmToken && userData.fcmToken.trim() !== ''
        console.log(`User ${doc.id} FCM token:`, hasToken ? 'Present' : 'Missing')
        if (hasToken) {
          console.log(`  - Token: ${userData.fcmToken.substring(0, 20)}...`)
        }
        return hasToken ? userData.fcmToken : null
      })
      .filter(token => token !== null)
    
    if (tokens.length === 0) {
      console.log('No valid FCM tokens found in any user documents')
      return
    }

    console.log(`Found ${tokens.length} FCM tokens total`)

    const message = {
      notification: {
        title: alertData.title,
        body: alertData.description
      },
      data: {
        alertId: alertData.id || '',
        organizationId: alertData.organizationId,
        type: alertData.type || '',
        severity: alertData.severity || ''
      },
      tokens: tokens
    }

    const response = await admin.messaging().sendMulticast(message)
    console.log(`✅ Successfully sent notification to ${response.successCount} devices`)
    
    if (response.failureCount > 0) {
      console.log(`⚠️ Failed to send to ${response.failureCount} devices`)
    }
  } catch (error) {
    console.error('❌ Error sending push notification:', error)
    throw error
  }
}

// Cron job function (backup method)
export const cronJobBackup = functions.https.onRequest(async (req, res) => {
  console.log('🔄 Cron job backup triggered')
  
  // This would be called by an external cron service
  try {
    const processedAlerts = await processScheduledAlertsInternal()
    res.status(200).json({
      success: true,
      message: `Cron job processed ${processedAlerts.length} scheduled alerts`,
      processedAlerts: processedAlerts
    })
  } catch (error) {
    console.error('❌ Cron job error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Health check function
export const healthCheck = functions.https.onRequest(async (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    functions: {
      scheduled: 'processScheduledAlerts',
      scheduledDatabase: 'onScheduledAlertCreated',
      regularDatabase: 'onAlertCreated',
      manual: 'processAlertsManually',
      cron: 'cronJobBackup'
    }
  })
})

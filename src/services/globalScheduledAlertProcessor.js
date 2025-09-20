import scheduledAlertProcessor from './scheduledAlertProcessor'

class GlobalScheduledAlertProcessor {
  constructor() {
    this.isRunning = false
    this.interval = null
    this.visibilityHandler = null
  }

  // Start automatic processing
  start() {
    if (this.isRunning) {
      console.log('⏰ Global scheduled alert processor already running')
      return
    }

    this.isRunning = true
    console.log('🚀 Starting global scheduled alert processor...')

    // Process alerts immediately
    this.processAlerts()

    // Set up interval to process alerts every 2 minutes
    this.interval = setInterval(async () => {
      try {
        console.log('⏰ Global auto-processing scheduled alerts...')
        await this.processAlerts()
      } catch (error) {
        console.error('❌ Error in global auto-processing:', error)
      }
    }, 2 * 60 * 1000) // 2 minutes

    // Process alerts when page becomes visible
    this.visibilityHandler = () => {
      if (!document.hidden) {
        console.log('⏰ Global processing alerts on page visibility change...')
        this.processAlerts()
      }
    }

    document.addEventListener('visibilitychange', this.visibilityHandler)

    // Process alerts when window regains focus
    const focusHandler = () => {
      console.log('⏰ Global processing alerts on window focus...')
      this.processAlerts()
    }

    window.addEventListener('focus', focusHandler)

    console.log('✅ Global scheduled alert processor started')
  }

  // Stop automatic processing
  stop() {
    if (!this.isRunning) {
      return
    }

    this.isRunning = false
    console.log('🛑 Stopping global scheduled alert processor...')

    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }

    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler)
      this.visibilityHandler = null
    }

    console.log('✅ Global scheduled alert processor stopped')
  }

  // Process alerts
  async processAlerts() {
    try {
      const processedAlerts = await scheduledAlertProcessor.processScheduledAlerts()
      
      if (processedAlerts.length > 0) {
        console.log(`✅ Global processor: Processed ${processedAlerts.length} scheduled alerts:`, processedAlerts)
        
        // Dispatch a custom event to notify other parts of the app
        window.dispatchEvent(new CustomEvent('scheduledAlertsProcessed', {
          detail: { processedAlerts }
        }))
      }
      
      return processedAlerts
    } catch (error) {
      console.error('❌ Error in global alert processing:', error)
      throw error
    }
  }

  // Check if processor is running
  getStatus() {
    return {
      isRunning: this.isRunning,
      hasInterval: !!this.interval,
      hasVisibilityHandler: !!this.visibilityHandler
    }
  }
}

export default new GlobalScheduledAlertProcessor()

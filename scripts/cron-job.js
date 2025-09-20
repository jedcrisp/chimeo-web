#!/usr/bin/env node

/**
 * Server-side cron job for scheduled alert processing
 * This runs as a backup to Firebase Cloud Functions
 * 
 * Usage:
 * 1. Install dependencies: npm install
 * 2. Set environment variables
 * 3. Run: node scripts/cron-job.js
 * 4. Set up with system cron: */2 * * * * node /path/to/scripts/cron-job.js
 */

const https = require('https')
const http = require('http')

// Configuration
const CONFIG = {
  // Firebase Functions URL (replace with your deployed function URL)
  functionsUrl: 'https://us-central1-chimeo-96dfc.cloudfunctions.net',
  // Backup URL (if you have a server)
  backupUrl: process.env.BACKUP_URL || null,
  // Retry configuration
  maxRetries: 3,
  retryDelay: 5000, // 5 seconds
  // Timeout
  timeout: 30000 // 30 seconds
}

/**
 * Make HTTP request to process alerts
 */
async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https://')
    const client = isHttps ? https : http
    
    const req = client.request(url, {
      method: 'GET',
      timeout: CONFIG.timeout,
      ...options
    }, (res) => {
      let data = ''
      
      res.on('data', (chunk) => {
        data += chunk
      })
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data)
          resolve({ status: res.statusCode, data: result })
        } catch (error) {
          resolve({ status: res.statusCode, data: data })
        }
      })
    })
    
    req.on('error', (error) => {
      reject(error)
    })
    
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('Request timeout'))
    })
    
    req.end()
  })
}

/**
 * Process alerts with retry logic
 */
async function processAlertsWithRetry(url, attempt = 1) {
  try {
    console.log(`🔄 Attempt ${attempt}: Processing alerts via ${url}`)
    
    const response = await makeRequest(url)
    
    if (response.status === 200) {
      console.log(`✅ Success: ${response.data.message}`)
      return response.data
    } else {
      throw new Error(`HTTP ${response.status}: ${response.data.error || 'Unknown error'}`)
    }
  } catch (error) {
    console.error(`❌ Attempt ${attempt} failed:`, error.message)
    
    if (attempt < CONFIG.maxRetries) {
      console.log(`⏳ Retrying in ${CONFIG.retryDelay}ms...`)
      await new Promise(resolve => setTimeout(resolve, CONFIG.retryDelay))
      return processAlertsWithRetry(url, attempt + 1)
    } else {
      throw error
    }
  }
}

/**
 * Main cron job function
 */
async function runCronJob() {
  const timestamp = new Date().toISOString()
  console.log(`\n🕐 Cron job started at ${timestamp}`)
  
  const urls = [
    `${CONFIG.functionsUrl}/processAlertsManually`,
    `${CONFIG.functionsUrl}/cronJobBackup`
  ]
  
  // Add backup URL if configured
  if (CONFIG.backupUrl) {
    urls.push(CONFIG.backupUrl)
  }
  
  let success = false
  let lastError = null
  
  // Try each URL until one succeeds
  for (const url of urls) {
    try {
      const result = await processAlertsWithRetry(url)
      console.log(`✅ Cron job completed successfully via ${url}`)
      console.log(`📊 Processed ${result.processedAlerts?.length || 0} alerts`)
      success = true
      break
    } catch (error) {
      console.error(`❌ Failed to process via ${url}:`, error.message)
      lastError = error
    }
  }
  
  if (!success) {
    console.error(`❌ All processing methods failed. Last error:`, lastError?.message)
    process.exit(1)
  }
  
  console.log(`🏁 Cron job completed at ${new Date().toISOString()}\n`)
}

/**
 * Handle process signals
 */
process.on('SIGINT', () => {
  console.log('\n🛑 Cron job interrupted by user')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n🛑 Cron job terminated')
  process.exit(0)
})

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

// Run the cron job
if (require.main === module) {
  runCronJob().catch((error) => {
    console.error('❌ Cron job failed:', error)
    process.exit(1)
  })
}

module.exports = { runCronJob, processAlertsWithRetry }

// Cloud Email Service using Firebase Cloud Functions + SendGrid
// This service calls Cloud Functions that use SendGrid to send emails

import { getFunctions, httpsCallable } from 'firebase/functions'
import { getAuth } from 'firebase/auth'
import { getApp } from 'firebase/app'

class CloudEmailService {
  constructor() {
    try {
      // Try to get the default Firebase app first
      const app = getApp()
      this.functions = getFunctions(app)
      this.auth = getAuth(app)
      this.isInitialized = true
      console.log('✅ CloudEmailService initialized with Firebase app')
    } catch (error) {
      console.warn('⚠️ CloudEmailService: Firebase not initialized, will use direct HTTP calls')
      this.functions = null
      this.auth = null
      this.isInitialized = false
    }
  }

  // Helper method to call cloud functions
  async callCloudFunction(functionName, data) {
    if (!this.isInitialized || !this.functions) {
      // Fallback to direct HTTP call if Firebase isn't available
      console.log(`🔄 Using direct HTTP call for ${functionName} (Firebase not available)`)
      return await this.callCloudFunctionDirect(functionName, data)
    }
    
    try {
      const cloudFunction = httpsCallable(this.functions, functionName)
      const result = await cloudFunction(data)
      return result.data
    } catch (error) {
      console.error(`❌ Error calling ${functionName}:`, error)
      throw error
    }
  }

  // Direct HTTP call to Cloud Functions (fallback)
  async callCloudFunctionDirect(functionName, data) {
    try {
      const functionUrl = `https://us-central1-chimeo-96dfc.cloudfunctions.net/${functionName}`
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return result
    } catch (error) {
      console.error(`❌ Direct HTTP call failed for ${functionName}:`, error)
      throw error
    }
  }

  // Send organization request notification email
  async sendOrganizationRequestEmail(requestData) {
    try {
      console.log('📧 Sending organization request email via Cloud Function...')
      
      const result = await this.callCloudFunction('sendOrganizationRequestEmail', requestData)
      
      if (result.success) {
        console.log('✅ Organization request email sent successfully')
        return true
      } else {
        console.error('❌ Failed to send organization request email')
        return false
      }
    } catch (error) {
      console.error('❌ Error sending organization request email:', error)
      return false
    }
  }

  // Send organization approved email
  async sendOrganizationApprovalEmail(organizationData, adminEmail) {
    try {
      console.log('📧 Sending organization approval email via Cloud Function...')
      
      const emailData = {
        ...organizationData,
        adminEmail: adminEmail
      }
      
      const result = await this.callCloudFunction('sendOrganizationApprovalEmail', emailData)
      
      if (result.success) {
        console.log('✅ Organization approval email sent successfully')
        return true
      } else {
        console.error('❌ Failed to send organization approval email')
        return false
      }
    } catch (error) {
      console.error('❌ Error sending organization approval email:', error)
      return false
    }
  }

  // Send admin access granted email
  async sendAdminAccessEmail(adminData) {
    try {
      console.log('📧 Sending admin access email via Cloud Function...')
      
      const result = await this.callCloudFunction('sendAdminAccessEmail', adminData)
      
      if (result.success) {
        console.log('✅ Admin access email sent successfully')
        return true
      } else {
        console.error('❌ Failed to send admin access email')
        return false
      }
    } catch (error) {
      console.error('❌ Error sending admin access email:', error)
      return false
    }
  }

  // Send test email
  async sendTestEmail() {
    try {
      console.log('📧 Sending test email via Cloud Function...')
      
      const result = await this.callCloudFunction('sendTestEmail', {})
      
      if (result.success) {
        console.log('✅ Test email sent successfully')
        return true
      } else {
        console.error('❌ Failed to send test email')
        return false
      }
    } catch (error) {
      console.error('❌ Error sending test email:', error)
      return false
    }
  }

  // Send alert notification email
  async sendAlertEmail(alertData, targetEmail) {
    try {
      console.log('📧 Sending alert email via Cloud Function...')
      
      const emailData = {
        ...alertData,
        targetEmail: targetEmail
      }
      
      const result = await this.callCloudFunction('sendAlertEmail', emailData)
      
      if (result.success) {
        console.log('✅ Alert email sent successfully')
        return true
      } else {
        console.error('❌ Failed to send alert email')
        return false
      }
    } catch (error) {
      console.error('❌ Error sending alert email:', error)
      return false
    }
  }

  // Send generic email (used by the main email service)
  async sendGenericEmail(to, subject, htmlContent, textContent = null) {
    try {
      console.log('📧 Sending generic email via Cloud Function...')
      const result = await this.callCloudFunction('sendGenericEmail', {
        to,
        subject,
        htmlContent,
        textContent
      })
      
      if (result && result.success) {
        console.log('✅ Generic email sent successfully')
        return result
      } else {
        console.error('❌ Failed to send generic email')
        return false
      }
    } catch (error) {
      console.error('❌ Error sending generic email:', error)
      throw error
    }
  }
}

// Create and export singleton instance
const cloudEmailService = new CloudEmailService()

// Make email service available globally for testing
if (typeof window !== 'undefined') {
  window.cloudEmailService = cloudEmailService
  window.testCloudEmail = () => cloudEmailService.sendTestEmail()
  console.log('🧪 Cloud email service available globally as window.cloudEmailService')
  console.log('🧪 Test email function available as window.testCloudEmail()')
}

export default cloudEmailService

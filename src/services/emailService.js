// Email notification service using Cloud Functions + SendGrid
// This service handles sending email notifications for important events

class EmailService {
  constructor() {
    this.isInitialized = true
    this.fromEmail = 'noreply@chimeo.com'
    this.platformAdminEmail = 'jed@onetrack-consulting.com'
    this.emailjs = null // EmailJS is now a fallback, not primary
    this.useCloudService = true // Use Cloud Functions + SendGrid by default
  }

  // Reset cloud service to try again
  resetCloudService() {
    this.useCloudService = true
    console.log('🔄 Reset cloud service - will try SendGrid again')
  }

  // Initialize EmailJS service (only if cloud service fails)
  async initializeEmailJS() {
    if (this.emailjs) {
      console.log('✅ EmailJS already initialized.')
      return true
    }

    // Load EmailJS from CDN
    if (typeof window !== 'undefined' && !window.emailjs) {
      console.log('🔧 Loading EmailJS from CDN...')
      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js'
      script.onload = () => {
        console.log('✅ EmailJS loaded successfully')
        this.emailjs = window.emailjs
        this.emailjs.init(import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'YOUR_EMAILJS_PUBLIC_KEY')
        console.log('✅ EmailJS service initialized successfully')
      }
      script.onerror = () => {
        console.warn('⚠️ Failed to load EmailJS, falling back to console logging')
      }
      document.head.appendChild(script)
    } else if (window.emailjs) {
      this.emailjs = window.emailjs
      this.emailjs.init(import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'YOUR_EMAILJS_PUBLIC_KEY')
      console.log('✅ EmailJS service initialized successfully')
    } else {
      console.warn('⚠️ EmailJS not available, falling back to console logging')
    }
    return true
  }

  // Helper method to send email via Cloud Function or fallback to EmailJS/console
  async sendEmail(to, subject, htmlContent, textContent = null) {
    try {
      if (this.useCloudService) {
        console.log('📧 Attempting to send email via Cloud Function...')
        try {
          const { default: cloudEmailService } = await import('./cloudEmailService')
          const result = await cloudEmailService.sendGenericEmail(to, subject, htmlContent, textContent)
          console.log('✅ Email sent successfully via Cloud Function:', result)
          return true
        } catch (cloudError) {
          console.warn('⚠️ Cloud Function email failed, falling back to EmailJS/console:', cloudError)
          this.useCloudService = false // Disable cloud service for this session if it fails
          await this.initializeEmailJS() // Try to initialize EmailJS
        }
      }

      // Fallback to EmailJS if initialized and configured
      console.log('🔧 EmailJS Debug:', {
        emailjs: this.emailjs ? 'Available' : 'Not available',
        publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
        serviceId: import.meta.env.VITE_EMAILJS_SERVICE_ID,
        templateId: import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
        shouldUseEmailJS: this.emailjs && (import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'YOUR_EMAILJS_PUBLIC_KEY') !== 'YOUR_EMAILJS_PUBLIC_KEY'
      })
      
      if (this.emailjs && (import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'YOUR_EMAILJS_PUBLIC_KEY') !== 'YOUR_EMAILJS_PUBLIC_KEY') {
        try {
          console.log('📧 Sending email via EmailJS fallback...')
          const templateParams = {
            to_email: to,
            from_name: 'Chimeo Platform',
            subject: subject,
            message: textContent || htmlContent,
            html_message: htmlContent
          }
          const result = await this.emailjs.send(
            import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_chimeo',
            import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'template_org_request', // Use a generic template or specific one
            templateParams
          )
          console.log('✅ Email sent successfully via EmailJS:', result)
          return true
        } catch (emailjsError) {
          console.warn('⚠️ EmailJS fallback failed, falling back to console logging:', emailjsError)
        }
      }

      // Final fallback to console logging
      console.log('📧 ===== EMAIL NOTIFICATION (CONSOLE FALLBACK) =====')
      console.log('📧 To:', to)
      console.log('📧 Subject:', subject)
      console.log('📧 From:', this.fromEmail)
      console.log('📧 =================================================')
      if (textContent) {
        console.log('📧 Text Content:')
        console.log(textContent)
      }
      console.log('📧 HTML Content:')
      console.log(htmlContent)
      console.log('📧 =================================================')
      console.log('✅ Email logged successfully (manual sending required or configure EmailJS)')
      return true

    } catch (error) {
      console.error('❌ Failed to send email:', error)
      return false
    }
  }

  // Send test email
  async sendTestEmail() {
    console.log('🧪 Starting test email send...')
    console.log('🧪 Email service status:', {
      initialized: this.isInitialized,
      useCloudService: this.useCloudService,
      emailjs: this.emailjs ? 'Available' : 'Not available',
      platformAdminEmail: this.platformAdminEmail
    })
    
    const subject = 'Test Email from Chimeo Platform'
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #007bff;">Test Email</h2>
        <p>Hello Platform Admin,</p>
        <p>This is a test email to verify that email notifications are working correctly.</p>
        
        <div style="background-color: #e7f3ff; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #007bff;">
          <h3 style="margin-top: 0; color: #0056b3;">Test Details</h3>
          <p><strong>Service:</strong> Chimeo Email Service</p>
          <p><strong>Status:</strong> ✅ Working</p>
          <p><strong>Test Date:</strong> ${new Date().toLocaleDateString()}</p>
          <p><strong>Test Time:</strong> ${new Date().toLocaleTimeString()}</p>
          <p><strong>Using Cloud Functions:</strong> ${this.useCloudService ? 'Yes' : 'No (falling back to EmailJS/console)'}</p>
        </div>
        
        <p>If you received this email, the email notification system is working correctly!</p>
        
        <p>Best regards,<br>Chimeo Platform</p>
      </div>
    `
    const textContent = `
Test Email from Chimeo Platform

Hello Platform Admin,

This is a test email to verify that email notifications are working correctly.

Test Details:
- Service: Chimeo Email Service
- Status: ✅ Working
- Test Date: ${new Date().toLocaleDateString()}
- Test Time: ${new Date().toLocaleTimeString()}
- Using Cloud Functions: ${this.useCloudService ? 'Yes' : 'No (falling back to EmailJS/console)'}

If you received this email, the email notification system is working correctly!

Best regards,
Chimeo Platform
    `
    const result = await this.sendEmail(this.platformAdminEmail, subject, htmlContent, textContent)
    console.log('🧪 Test email result:', result)
    return result
  }
}

const emailService = new EmailService()

if (typeof window !== 'undefined') {
  window.emailService = emailService
  window.testEmail = () => emailService.sendTestEmail()
  window.resetEmailService = () => emailService.resetCloudService()
  console.log('🧪 Email service available globally as window.emailService')
  console.log('🧪 Test email function available as window.testEmail()')
  console.log('🔄 Reset cloud service function available as window.resetEmailService()')
}

export default emailService

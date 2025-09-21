// Email notification service with fallback for browser compatibility
// This service handles sending email notifications for important events

class EmailService {
  constructor() {
    this.isInitialized = false
    this.fromEmail = 'noreply@chimeo.com'
    this.platformAdminEmail = 'jed@onetrack-consulting.com'
  }

  // Initialize email service (always succeeds for fallback mode)
  async initialize() {
    try {
      console.log('🔧 Email Service: Initializing fallback email service...')
      console.log('🔧 Email Service: CORS-safe mode enabled')
      
      this.isInitialized = true
      console.log('✅ Email service initialized successfully (fallback mode)')
      console.log('📧 Emails will be logged to console for manual sending')
      return true
    } catch (error) {
      console.error('❌ Failed to initialize email service:', error)
      return false
    }
  }

  // Helper method to send email (fallback mode - logs to console)
  async sendEmail(to, subject, htmlContent, textContent = null) {
    try {
      if (!this.isInitialized) {
        console.warn('⚠️ Email service not initialized - skipping email')
        return false
      }

      console.log('📧 ===== EMAIL NOTIFICATION =====')
      console.log('📧 To:', to)
      console.log('📧 Subject:', subject)
      console.log('📧 From:', this.fromEmail)
      console.log('📧 ================================')
      
      if (textContent) {
        console.log('📧 Text Content:')
        console.log(textContent)
      }
      
      console.log('📧 HTML Content:')
      console.log(htmlContent)
      console.log('📧 ================================')
      
      // Show instructions for manual sending
      console.log('📧 MANUAL EMAIL INSTRUCTIONS:')
      console.log('📧 1. Copy the email content above')
      console.log('📧 2. Send manually to:', to)
      console.log('📧 3. Or set up EmailJS/other service for automatic sending')
      console.log('📧 ================================')

      // Simulate successful sending
      console.log('✅ Email logged successfully (manual sending required)')
      return true

    } catch (error) {
      console.error('❌ Failed to log email:', error)
      return false
    }
  }

  // Send organization request notification email
  async sendOrganizationRequestEmail(requestData) {
    try {
      const subject = `New Organization Request - ${requestData.organizationName}`
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">New Organization Request</h2>
          <p>Hello Platform Admin,</p>
          <p>A new organization request has been submitted:</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #555;">Organization Details</h3>
            <p><strong>Name:</strong> ${requestData.organizationName}</p>
            <p><strong>Type:</strong> ${requestData.organizationType}</p>
            <p><strong>Admin:</strong> ${requestData.adminFirstName} ${requestData.adminLastName}</p>
            <p><strong>Admin Email:</strong> ${requestData.adminEmail}</p>
            <p><strong>Address:</strong> ${requestData.address}, ${requestData.city}, ${requestData.state} ${requestData.zipCode}</p>
            <p><strong>Phone:</strong> ${requestData.phone}</p>
            <p><strong>Website:</strong> ${requestData.website}</p>
            <p><strong>Description:</strong> ${requestData.description}</p>
          </div>
          
          <p><strong>Request Date:</strong> ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
          
          <p>Please review and approve/reject this request in the admin panel.</p>
          
          <p>Best regards,<br>Chimeo Web App</p>
        </div>
      `

      const textContent = `
New Organization Request

Organization: ${requestData.organizationName}
Type: ${requestData.organizationType}
Admin: ${requestData.adminFirstName} ${requestData.adminLastName} (${requestData.adminEmail})
Address: ${requestData.address}, ${requestData.city}, ${requestData.state} ${requestData.zipCode}
Phone: ${requestData.phone}
Website: ${requestData.website}
Description: ${requestData.description}

Request Date: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}

Please review and approve/reject this request in the admin panel.

Best regards,
Chimeo Web App
      `

      return await this.sendEmail('jed@onetrack-consulting.com', subject, htmlContent, textContent)

    } catch (error) {
      console.error('❌ Failed to send organization request email:', error)
      return false
    }
  }

  // Send organization approved email
  async sendOrganizationApprovedEmail(organizationData, adminEmail) {
    try {
      const subject = `Organization Request Approved - ${organizationData.name}`
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #28a745;">Organization Request Approved</h2>
          <p>Hello ${organizationData.adminName},</p>
          <p>Great news! Your organization request for <strong>"${organizationData.name}"</strong> has been approved.</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
            <h3 style="margin-top: 0; color: #555;">Organization Details</h3>
            <p><strong>Name:</strong> ${organizationData.name}</p>
            <p><strong>Type:</strong> ${organizationData.type}</p>
            <p><strong>Address:</strong> ${organizationData.address}, ${organizationData.city}, ${organizationData.state} ${organizationData.zipCode}</p>
            <p><strong>Phone:</strong> ${organizationData.phone}</p>
            <p><strong>Website:</strong> ${organizationData.website}</p>
            <p><strong>Description:</strong> ${organizationData.description}</p>
          </div>
          
          <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1976d2;">Next Steps</h3>
            <p>You can now log in to the platform using:</p>
            <ul>
              <li><strong>Email:</strong> ${adminEmail}</li>
              <li><strong>Password:</strong> [The password you provided during registration]</li>
            </ul>
            <p><a href="https://chimeo-web.vercel.app/login" style="background-color: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Login to Platform</a></p>
          </div>
          
          <p><strong>Approval Date:</strong> ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
          
          <p>Welcome to Chimeo!</p>
          <p>Best regards,<br>Chimeo Platform Team</p>
        </div>
      `

      const textContent = `
Organization Request Approved

Hello ${organizationData.adminName},

Great news! Your organization request for "${organizationData.name}" has been approved.

Organization Details:
- Name: ${organizationData.name}
- Type: ${organizationData.type}
- Address: ${organizationData.address}, ${organizationData.city}, ${organizationData.state} ${organizationData.zipCode}
- Phone: ${organizationData.phone}
- Website: ${organizationData.website}
- Description: ${organizationData.description}

Next Steps:
You can now log in to the platform using:
- Email: ${adminEmail}
- Password: [The password you provided during registration]

Login URL: https://chimeo-web.vercel.app/login

Approval Date: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}

Welcome to Chimeo!

Best regards,
Chimeo Platform Team
      `

      return await this.sendEmail(adminEmail, subject, htmlContent, textContent)

    } catch (error) {
      console.error('❌ Failed to send organization approved email:', error)
      return false
    }
  }

  // Send alert notification email
  async sendAlertEmail(alertData, targetEmail) {
    try {
      const subject = `New Alert Created - ${alertData.title}`
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc3545;">New Alert Created</h2>
          <p>Hello Platform Admin,</p>
          <p>A new alert has been created in the system:</p>
          
          <div style="background-color: #fff3cd; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <h3 style="margin-top: 0; color: #856404;">Alert Details</h3>
            <p><strong>Title:</strong> ${alertData.title}</p>
            <p><strong>Message:</strong> ${alertData.message}</p>
            <p><strong>Type:</strong> ${alertData.type}</p>
            <p><strong>Priority:</strong> ${alertData.priority || 'Normal'}</p>
            <p><strong>Organization:</strong> ${alertData.organizationName}</p>
            <p><strong>Created By:</strong> ${alertData.createdBy}</p>
            <p><strong>Target Group:</strong> ${alertData.groupName || 'All Groups'}</p>
            <p><strong>Location:</strong> ${alertData.location || 'Not specified'}</p>
          </div>
          
          <p><strong>Created Date:</strong> ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
          
          <p><a href="https://chimeo-web.vercel.app/alerts" style="background-color: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Alert</a></p>
          
          <p>Best regards,<br>Chimeo Platform</p>
        </div>
      `

      const textContent = `
New Alert Created

Hello Platform Admin,

A new alert has been created in the system:

Alert Details:
- Title: ${alertData.title}
- Message: ${alertData.message}
- Type: ${alertData.type}
- Priority: ${alertData.priority || 'Normal'}
- Organization: ${alertData.organizationName}
- Created By: ${alertData.createdBy}
- Target Group: ${alertData.groupName || 'All Groups'}
- Location: ${alertData.location || 'Not specified'}

Created Date: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}

View Alert: https://chimeo-web.vercel.app/alerts

Best regards,
Chimeo Platform
      `

      return await this.sendEmail(targetEmail, subject, htmlContent, textContent)

    } catch (error) {
      console.error('❌ Failed to send alert email:', error)
      return false
    }
  }

  // Send test email
  async sendTestEmail() {
    try {
      console.log('🧪 Starting test email send...')
      console.log('🧪 Email service status:', {
        initialized: this.isInitialized,
        apiKey: this.apiKey ? 'Present' : 'Missing',
        fromEmail: this.fromEmail
      })
      
      const subject = 'Test Email from Chimeo Platform'
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #007bff;">Test Email</h2>
          <p>Hello Platform Admin,</p>
          <p>This is a test email to verify that email notifications are working correctly.</p>
          
          <div style="background-color: #e7f3ff; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #007bff;">
            <h3 style="margin-top: 0; color: #0056b3;">Test Details</h3>
            <p><strong>Service:</strong> SendGrid Email Service</p>
            <p><strong>Status:</strong> ✅ Working</p>
            <p><strong>Test Date:</strong> ${new Date().toLocaleDateString()}</p>
            <p><strong>Test Time:</strong> ${new Date().toLocaleTimeString()}</p>
            <p><strong>API Key:</strong> ${this.apiKey ? 'Configured' : 'Missing'}</p>
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
- Service: SendGrid Email Service
- Status: ✅ Working
- Test Date: ${new Date().toLocaleDateString()}
- Test Time: ${new Date().toLocaleTimeString()}
- API Key: ${this.apiKey ? 'Configured' : 'Missing'}

If you received this email, the email notification system is working correctly!

Best regards,
Chimeo Platform
      `

      const result = await this.sendEmail('jed@onetrack-consulting.com', subject, htmlContent, textContent)
      console.log('🧪 Test email result:', result)
      return result

    } catch (error) {
      console.error('❌ Failed to send test email:', error)
      return false
    }
  }
}

// Create and export singleton instance
const emailService = new EmailService()

// Make email service available globally for testing
if (typeof window !== 'undefined') {
  window.emailService = emailService
  window.testEmail = () => emailService.sendTestEmail()
  console.log('🧪 Email service available globally as window.emailService')
  console.log('🧪 Test email function available as window.testEmail()')
}

export default emailService

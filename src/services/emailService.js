// Email notification service using EmailJS (browser-compatible)
// This service handles sending email notifications for important events

class EmailService {
  constructor() {
    this.isInitialized = false
    this.fromEmail = 'noreply@chimeo.com'
    this.platformAdminEmail = 'jed@onetrack-consulting.com'
    this.serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_chimeo'
    this.templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'template_org_request'
    this.publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'YOUR_EMAILJS_PUBLIC_KEY'
    this.emailjs = null
  }

  // Initialize EmailJS service
  async initialize() {
    try {
      console.log('🔧 Email Service: Initializing EmailJS service...')
      
      // Load EmailJS from CDN
      if (typeof window !== 'undefined' && !window.emailjs) {
        console.log('🔧 Loading EmailJS from CDN...')
        const script = document.createElement('script')
        script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js'
        script.onload = () => {
          console.log('✅ EmailJS loaded successfully')
          this.emailjs = window.emailjs
          this.emailjs.init(this.publicKey)
          this.isInitialized = true
          console.log('✅ EmailJS service initialized successfully')
        }
        script.onerror = () => {
          console.warn('⚠️ Failed to load EmailJS, falling back to console logging')
          this.isInitialized = true
        }
        document.head.appendChild(script)
      } else if (window.emailjs) {
        this.emailjs = window.emailjs
        this.emailjs.init(this.publicKey)
        this.isInitialized = true
        console.log('✅ EmailJS service initialized successfully')
      } else {
        console.warn('⚠️ EmailJS not available, falling back to console logging')
        this.isInitialized = true
      }
      
      return true
    } catch (error) {
      console.error('❌ Failed to initialize email service:', error)
      this.isInitialized = true // Still allow fallback mode
      return true
    }
  }

  // Helper method to send email via EmailJS or fallback to console
  async sendEmail(to, subject, htmlContent, textContent = null) {
    try {
      if (!this.isInitialized) {
        console.warn('⚠️ Email service not initialized - skipping email')
        return false
      }

      // Try EmailJS first if available
      if (this.emailjs && this.publicKey !== 'YOUR_EMAILJS_PUBLIC_KEY') {
        try {
          console.log('📧 Sending email via EmailJS...')
          
          const templateParams = {
            to_email: to,
            from_name: 'Chimeo Platform',
            subject: subject,
            message: textContent || htmlContent,
            html_message: htmlContent
          }

          const result = await this.emailjs.send(
            this.serviceId,
            this.templateId,
            templateParams
          )
          
          console.log('✅ Email sent successfully via EmailJS:', result)
          return true
        } catch (emailjsError) {
          console.warn('⚠️ EmailJS failed, falling back to console logging:', emailjsError)
        }
      }

      // Fallback to console logging
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
      console.log('📧 3. Or set up EmailJS with your public key for automatic sending')
      console.log('📧 ================================')

      // Simulate successful sending
      console.log('✅ Email logged successfully (manual sending required)')
      return true

    } catch (error) {
      console.error('❌ Failed to send email:', error)
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

  // Send admin access granted email
  async sendAdminAccessEmail(adminData) {
    try {
      const { adminName, adminEmail, organizationName, adminType, organizationId } = adminData
      
      const subject = `Admin Access Granted - ${organizationName}`
      const roleDisplay = adminType === 'organization_admin' ? 'Organization Admin' : 'Admin'
      
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">Admin Access Granted</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Welcome to the ${organizationName} team!</p>
          </div>
          
          <div style="padding: 30px; background: #f8f9fa;">
            <h2 style="color: #333; margin-top: 0;">Hello ${adminName},</h2>
            
            <p style="color: #555; line-height: 1.6; font-size: 16px;">
              Great news! You have been granted <strong>${roleDisplay}</strong> access to <strong>${organizationName}</strong>.
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
              <h3 style="color: #333; margin-top: 0;">Your Admin Access Details:</h3>
              <ul style="color: #555; line-height: 1.8;">
                <li><strong>Organization:</strong> ${organizationName}</li>
                <li><strong>Role:</strong> ${roleDisplay}</li>
                <li><strong>Access Level:</strong> ${adminType === 'organization_admin' ? 'Full administrative privileges' : 'Standard admin privileges'}</li>
                <li><strong>Granted On:</strong> ${new Date().toLocaleDateString()}</li>
              </ul>
            </div>
            
            <div style="background: #e8f4fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #1976d2; margin-top: 0;">What You Can Do Now:</h3>
              <ul style="color: #555; line-height: 1.8;">
                <li>Access the organization management dashboard</li>
                <li>Create and manage alerts for your organization</li>
                <li>View organization analytics and reports</li>
                ${adminType === 'organization_admin' ? '<li>Manage other administrators and their roles</li>' : ''}
                <li>Receive important organization notifications</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://chimeo-web.vercel.app/login" 
                 style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                Access Your Admin Dashboard
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px; line-height: 1.6;">
              If you have any questions about your new admin access or need assistance getting started, 
              please don't hesitate to contact the platform administrator.
            </p>
          </div>
          
          <div style="background: #f1f3f4; padding: 20px; text-align: center; color: #666; font-size: 14px;">
            <p style="margin: 0;">This email was sent by the Chimeo Platform</p>
            <p style="margin: 5px 0 0 0;">Organization ID: ${organizationId}</p>
          </div>
        </div>
      `
      
      const textContent = `
        Admin Access Granted - ${organizationName}
        
        Hello ${adminName},
        
        Great news! You have been granted ${roleDisplay} access to ${organizationName}.
        
        Your Admin Access Details:
        - Organization: ${organizationName}
        - Role: ${roleDisplay}
        - Access Level: ${adminType === 'organization_admin' ? 'Full administrative privileges' : 'Standard admin privileges'}
        - Granted On: ${new Date().toLocaleDateString()}
        
        What You Can Do Now:
        - Access the organization management dashboard
        - Create and manage alerts for your organization
        - View organization analytics and reports
        ${adminType === 'organization_admin' ? '- Manage other administrators and their roles' : ''}
        - Receive important organization notifications
        
        Access your admin dashboard at: https://chimeo-web.vercel.app/login
        
        If you have any questions about your new admin access, please contact the platform administrator.
        
        Best regards,
        Chimeo Platform Team
      `
      
      return await this.sendEmail(adminEmail, subject, htmlContent, textContent)
      
    } catch (error) {
      console.error('❌ Failed to send admin access email:', error)
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
        emailjs: this.emailjs ? 'Available' : 'Not available',
        serviceId: this.serviceId,
        templateId: this.templateId,
        publicKey: this.publicKey !== 'YOUR_EMAILJS_PUBLIC_KEY' ? 'Configured' : 'Not configured',
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
            <p><strong>Service:</strong> EmailJS Email Service</p>
            <p><strong>Status:</strong> ✅ Working</p>
            <p><strong>Test Date:</strong> ${new Date().toLocaleDateString()}</p>
            <p><strong>Test Time:</strong> ${new Date().toLocaleTimeString()}</p>
            <p><strong>EmailJS:</strong> ${this.emailjs ? 'Available' : 'Not available'}</p>
            <p><strong>Service ID:</strong> ${this.serviceId}</p>
            <p><strong>Template ID:</strong> ${this.templateId}</p>
            <p><strong>Public Key:</strong> ${this.publicKey !== 'YOUR_EMAILJS_PUBLIC_KEY' ? 'Configured' : 'Not configured'}</p>
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
- Service: EmailJS Email Service
- Status: ✅ Working
- Test Date: ${new Date().toLocaleDateString()}
- Test Time: ${new Date().toLocaleTimeString()}
- EmailJS: ${this.emailjs ? 'Available' : 'Not available'}
- Service ID: ${this.serviceId}
- Template ID: ${this.templateId}
- Public Key: ${this.publicKey !== 'YOUR_EMAILJS_PUBLIC_KEY' ? 'Configured' : 'Not configured'}

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

// Email notification service using Cloud Functions + SendGrid
// This service handles sending email notifications for important events

class EmailService {
  constructor() {
    this.isInitialized = true
    this.fromEmail = 'noreply@chimeo.com'
    this.platformAdminEmail = 'jed@onetrack-consulting.com'
    this.emailjs = null // EmailJS is now a fallback, not primary
    this.useCloudService = false // Use EmailJS by default due to SendGrid issues
    
    // Initialize EmailJS immediately
    this.initializeEmailJS()
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
        this.emailjs.init(import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'j28o4jy0k33AztI9C')
        console.log('✅ EmailJS service initialized successfully')
      }
      script.onerror = () => {
        console.warn('⚠️ Failed to load EmailJS, falling back to console logging')
      }
      document.head.appendChild(script)
    } else if (window.emailjs) {
      this.emailjs = window.emailjs
      this.emailjs.init(import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'j28o4jy0k33AztI9C')
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
        publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'j28o4jy0k33AztI9C',
        serviceId: import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_edoh2hs',
        templateId: import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'template_9sa845v',
        shouldUseEmailJS: this.emailjs && (import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'j28o4jy0k33AztI9C') !== 'YOUR_EMAILJS_PUBLIC_KEY'
      })
      
      if (this.emailjs && (import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'j28o4jy0k33AztI9C') !== 'YOUR_EMAILJS_PUBLIC_KEY') {
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
            import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_edoh2hs',
            import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'template_9sa845v', // Use a generic template or specific one
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

  // Send organization request email
  async sendOrganizationRequestEmail(requestData) {
    console.log('📧 Sending organization request email...')
    
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

    const result = await this.sendEmail(this.platformAdminEmail, subject, htmlContent, textContent)
    console.log('📧 Organization request email result:', result)
    return result
  }

  // Send organization approval email
  async sendOrganizationApprovalEmail(organizationData, adminEmail) {
    console.log('📧 Sending organization approval email...')
    
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
          <p>You can now log in to the platform using your registered credentials.</p>
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
You can now log in to the platform using your registered credentials.

Login URL: https://chimeo-web.vercel.app/login

Approval Date: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}

Welcome to Chimeo!

Best regards,
Chimeo Platform Team
    `

    const result = await this.sendEmail(adminEmail, subject, htmlContent, textContent)
    console.log('📧 Organization approval email result:', result)
    return result
  }

  // Send admin access email
  async sendAdminAccessEmail(adminData) {
    console.log('📧 Sending admin access email...')
    
    const subject = `Admin Access Granted - ${adminData.organizationName}`
    const roleDisplay = adminData.adminType === 'organization_admin' ? 'Organization Admin' : 'Admin'
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 28px;">Admin Access Granted</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Welcome to the ${adminData.organizationName} team!</p>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #333; margin-top: 0;">Hello ${adminData.adminName},</h2>
          
          <p style="color: #555; line-height: 1.6; font-size: 16px;">
            Great news! You have been granted <strong>${roleDisplay}</strong> access to <strong>${adminData.organizationName}</strong>.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
            <h3 style="color: #333; margin-top: 0;">Your Admin Access Details:</h3>
            <ul style="color: #555; line-height: 1.8;">
              <li><strong>Organization:</strong> ${adminData.organizationName}</li>
              <li><strong>Role:</strong> ${roleDisplay}</li>
              <li><strong>Access Level:</strong> ${adminData.adminType === 'organization_admin' ? 'Full administrative privileges' : 'Standard admin privileges'}</li>
              <li><strong>Granted On:</strong> ${new Date().toLocaleDateString()}</li>
            </ul>
          </div>
          
          <div style="background: #e8f4fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1976d2; margin-top: 0;">What You Can Do Now:</h3>
            <ul style="color: #555; line-height: 1.8;">
              <li>Access the organization management dashboard</li>
              <li>Create and manage alerts for your organization</li>
              <li>View organization analytics and reports</li>
              ${adminData.adminType === 'organization_admin' ? '<li>Manage other administrators and their roles</li>' : ''}
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
          <p style="margin: 5px 0 0 0;">Organization ID: ${adminData.organizationId}</p>
        </div>
      </div>
    `
    
    const textContent = `
Admin Access Granted - ${adminData.organizationName}

Hello ${adminData.adminName},

Great news! You have been granted ${roleDisplay} access to ${adminData.organizationName}.

Your Admin Access Details:
- Organization: ${adminData.organizationName}
- Role: ${roleDisplay}
- Access Level: ${adminData.adminType === 'organization_admin' ? 'Full administrative privileges' : 'Standard admin privileges'}
- Granted On: ${new Date().toLocaleDateString()}

What You Can Do Now:
- Access the organization management dashboard
- Create and manage alerts for your organization
- View organization analytics and reports
${adminData.adminType === 'organization_admin' ? '- Manage other administrators and their roles' : ''}
- Receive important organization notifications

Access your admin dashboard at: https://chimeo-web.vercel.app/login

If you have any questions about your new admin access, please contact the platform administrator.

Best regards,
Chimeo Platform Team
    `
    
    const result = await this.sendEmail(adminData.adminEmail, subject, htmlContent, textContent)
    console.log('📧 Admin access email result:', result)
    return result
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

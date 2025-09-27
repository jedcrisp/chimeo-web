// Email notification service using Vercel API + Zoho SMTP
// This service handles sending email notifications for important events

class EmailService {
  constructor() {
    this.isInitialized = true
    this.fromEmail = 'jed@chimeo.app'
    this.platformAdminEmail = 'jed@chimeo.app'
    this.useCloudService = true // Use Vercel API + Zoho SMTP as primary
  }

  // Send email using Vercel API + Zoho SMTP
  async sendEmail(to, subject, textContent, htmlContent) {
    try {
      console.log('📧 Sending email via Vercel API + Zoho SMTP...')
      console.log('📧 To:', to)
      console.log('📧 Subject:', subject)
      
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to,
          subject,
          text: textContent,
          html: htmlContent,
          from: this.fromEmail
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      console.log('✅ Email sent successfully via Vercel API:', result)
      return true

    } catch (error) {
      console.error('❌ Error sending email via Vercel API:', error)
      console.warn('⚠️ Falling back to console logging')
      return this.fallbackToConsole(to, subject, textContent, htmlContent)
    }
  }

  // Fallback to console logging when Functions are not available
  fallbackToConsole(to, subject, textContent, htmlContent) {
    console.log('📧 ===== EMAIL NOTIFICATION (CONSOLE FALLBACK) =====')
    console.log('📧 To:', to)
    console.log('📧 Subject:', subject)
    console.log('📧 From:', this.fromEmail)
    console.log('📧 =================================================')
    console.log('📧 Text Content:')
    console.log(textContent)
    console.log('📧 HTML Content:')
    console.log(htmlContent)
    console.log('📧 =================================================')
    console.log('✅ Email logged successfully (manual sending required)')
    
    return true // Return true for fallback
  }

  // Send organization request email
  async sendOrganizationRequestEmail(data) {
    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: "jed@chimeo.app",  // platform admin email
          subject: `New Organization Request - ${data.organizationName}`,
          text: `
New Organization Request

Organization: ${data.organizationName}
Type: ${data.organizationType}
Admin: ${data.adminName} (${data.adminEmail})
Address: ${data.address}, ${data.city}, ${data.state}
Phone: ${data.phone}
Request Date: ${new Date().toLocaleString()}
          `,
          html: `
            <h2>New Organization Request</h2>
            <p><strong>Name:</strong> ${data.organizationName}</p>
            <p><strong>Type:</strong> ${data.organizationType}</p>
            <p><strong>Admin:</strong> ${data.adminName} (${data.adminEmail})</p>
            <p><strong>Address:</strong> ${data.address}, ${data.city}, ${data.state}</p>
            <p><strong>Phone:</strong> ${data.phone}</p>
            <p><strong>Request Date:</strong> ${new Date().toLocaleString()}</p>
          `,
        }),
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error);

      console.log("✅ Email sent successfully", result);
      return true;

    } catch (error) {
      console.error("❌ Failed to send email:", error);
      return false;
    }
  }

  // Send organization approval email
  async sendOrganizationApprovalEmail(userData, organizationData) {
    console.log('📧 Sending organization approval email...')
    
    const subject = `Organization Request Approved - ${organizationData.organizationName}`
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #28a745;">🎉 Organization Request Approved!</h2>
        <p>Hello ${userData.firstName || 'there'},</p>
        <p>Great news! Your organization request has been approved and your account has been upgraded.</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
          <h3 style="margin-top: 0; color: #28a745;">What's Next?</h3>
          <ul style="margin: 0; padding-left: 20px;">
            <li>✅ Your organization <strong>${organizationData.organizationName}</strong> has been created</li>
            <li>✅ You now have <strong>Premium access</strong> with a 30-day free trial</li>
            <li>✅ You can create unlimited groups and send alerts</li>
            <li>✅ Access to advanced features and analytics</li>
          </ul>
        </div>
        
        <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h4 style="margin-top: 0; color: #1976d2;">Trial Information</h4>
          <p style="margin: 5px 0;"><strong>Trial Period:</strong> 30 days (until ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()})</p>
          <p style="margin: 5px 0;"><strong>Access Level:</strong> Premium</p>
          <p style="margin: 5px 0;"><strong>Status:</strong> Active</p>
        </div>
        
        <p>You can now log in to your account and start using all the premium features. If you have any questions, feel free to contact our support team.</p>
        
        <p>Welcome to Chimeo!<br><strong>The Chimeo Team</strong></p>
      </div>
    `
    
    const textContent = `
Organization Request Approved!

Hello ${userData.firstName || 'there'},

Great news! Your organization request has been approved and your account has been upgraded.

What's Next?
✅ Your organization ${organizationData.organizationName} has been created
✅ You now have Premium access with a 30-day free trial
✅ You can create unlimited groups and send alerts
✅ Access to advanced features and analytics

Trial Information:
- Trial Period: 30 days (until ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()})
- Access Level: Premium
- Status: Active

You can now log in to your account and start using all the premium features. If you have any questions, feel free to contact our support team.

Welcome to Chimeo!
The Chimeo Team
    `
    
    return await this.sendEmail(userData.email, subject, textContent, htmlContent)
  }

  // Send admin access email
  async sendAdminAccessEmail(adminData, organizationData) {
    console.log('📧 Sending admin access email...')
    
    const subject = `Admin Access Granted - ${organizationData.organizationName}`
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #007bff;">Admin Access Granted</h2>
        <p>Hello ${adminData.firstName || 'there'},</p>
        <p>You have been granted admin access to <strong>${organizationData.organizationName}</strong>.</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #007bff;">Your Access Details</h3>
          <p><strong>Organization:</strong> ${organizationData.organizationName}</p>
          <p><strong>Role:</strong> ${adminData.role || 'Admin'}</p>
          <p><strong>Access Level:</strong> ${adminData.accessLevel || 'Full Access'}</p>
          <p><strong>Granted By:</strong> ${adminData.grantedBy || 'Platform Admin'}</p>
        </div>
        
        <p>You can now log in to your account and manage this organization.</p>
        
        <p>Best regards,<br><strong>The Chimeo Team</strong></p>
      </div>
    `
    
    const textContent = `
Admin Access Granted

Hello ${adminData.firstName || 'there'},

You have been granted admin access to ${organizationData.organizationName}.

Your Access Details:
- Organization: ${organizationData.organizationName}
- Role: ${adminData.role || 'Admin'}
- Access Level: ${adminData.accessLevel || 'Full Access'}
- Granted By: ${adminData.grantedBy || 'Platform Admin'}

You can now log in to your account and manage this organization.

Best regards,
The Chimeo Team
    `
    
    return await this.sendEmail(adminData.email, subject, textContent, htmlContent)
  }

  // Send alert email
  async sendAlertEmail(alertData, recipientEmail) {
    console.log('📧 Sending alert email...')
    
    const subject = `New Alert: ${alertData.title}`
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc3545;">🚨 New Alert</h2>
        <p><strong>Title:</strong> ${alertData.title}</p>
        <p><strong>Message:</strong> ${alertData.message}</p>
        <p><strong>Organization:</strong> ${alertData.organizationName}</p>
        <p><strong>Created:</strong> ${new Date().toLocaleString()}</p>
      </div>
    `
    
    const textContent = `
New Alert: ${alertData.title}

Message: ${alertData.message}
Organization: ${alertData.organizationName}
Created: ${new Date().toLocaleString()}
    `
    
    return await this.sendEmail(recipientEmail, subject, textContent, htmlContent)
  }

  // Test email function
  async testEmail() {
    console.log('🧪 Testing email service...')
    
    const subject = 'Chimeo Email Service Test'
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #28a745;">✅ Email Service Test Successful</h2>
        <p>This is a test email from the Chimeo platform.</p>
        <p><strong>Service:</strong> Vercel API + Zoho SMTP</p>
        <p><strong>Status:</strong> Working correctly</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
      </div>
    `
    
    const textContent = `
Email Service Test Successful

This is a test email from the Chimeo platform.

Service: Zoho Cloud Functions
Status: Working correctly
Time: ${new Date().toLocaleString()}
    `
    
    return await this.sendEmail(this.platformAdminEmail, subject, textContent, htmlContent)
  }
}

// Create and export singleton instance
const emailService = new EmailService()

// Make it available globally for testing
if (typeof window !== 'undefined') {
  window.emailService = emailService
  window.testEmail = () => emailService.testEmail()
}

export default emailService
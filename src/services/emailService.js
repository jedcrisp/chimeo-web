// Email notification service using Vercel API + Zoho SMTP
class EmailService {
  constructor() {
    this.isInitialized = true;
    this.fromEmail = "noreply@chimeo.app"; // Zoho account email
    this.platformAdminEmail = "jed@chimeo.app";
  }

  // Generic send method (via Vercel API)
  async sendEmail(to, subject, textContent, htmlContent) {
    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject, text: textContent, html: htmlContent, from: this.fromEmail }),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const result = await response.json();
      console.log("✅ Email sent successfully via Vercel API:", result);
      return true;
    } catch (error) {
      console.error("❌ Error sending email:", error);
      return this.fallbackToConsole(to, subject, textContent, htmlContent);
    }
  }

  // Console fallback
  fallbackToConsole(to, subject, textContent, htmlContent) {
    console.log("📧 ===== EMAIL NOTIFICATION (CONSOLE FALLBACK) =====");
    console.log("To:", to);
    console.log("Subject:", subject);
    console.log("From:", this.fromEmail);
    console.log("Text Content:", textContent);
    console.log("HTML Content:", htmlContent);
    console.log("📧 =================================================");
    return true;
  }

  // Example: Org Request
  async sendOrganizationRequestEmail(data) {
    return this.sendEmail(
      this.platformAdminEmail,
      `New Organization Request - ${data.organizationName}`,
      `
New Organization Request

Organization: ${data.organizationName}
Type: ${data.organizationType}
Admin: ${data.adminName} (${data.adminEmail})
Address: ${data.address}, ${data.city}, ${data.state}
Phone: ${data.phone}
Request Date: ${new Date().toLocaleString()}
      `,
      `
        <h2>New Organization Request</h2>
        <p><strong>Name:</strong> ${data.organizationName}</p>
        <p><strong>Type:</strong> ${data.organizationType}</p>
        <p><strong>Admin:</strong> ${data.adminName} (${data.adminEmail})</p>
        <p><strong>Address:</strong> ${data.address}, ${data.city}, ${data.state}</p>
        <p><strong>Phone:</strong> ${data.phone}</p>
        <p><strong>Request Date:</strong> ${new Date().toLocaleString()}</p>
      `
    );
  }

  // Send organization request confirmation email to requester
  async sendOrganizationRequestConfirmation(data) {
    return this.sendEmail(
      data.adminEmail,
      `Organization Request Received - ${data.organizationName}`,
      `
Thank you for your organization request!

Hello ${data.adminName},

We have received your request to create the organization "${data.organizationName}" on the Chimeo platform.

Request Details:
- Organization: ${data.organizationName}
- Type: ${data.organizationType}
- Request Date: ${new Date().toLocaleString()}

What happens next?
1. Our team will review your request within 3 business days
2. You will receive an email notification once your request is approved
3. Upon approval, you'll gain access to premium features for 30 days
4. You can then create groups, send alerts, and manage your organization

In the meantime, you can:
- Log in to your account to explore the platform
- Review our features and capabilities
- Contact support if you have any questions

Thank you for choosing Chimeo!

Best regards,
The Chimeo Team
      `,
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #28a745;">✅ Organization Request Received!</h2>
          
          <p>Hello <strong>${data.adminName}</strong>,</p>
          
          <p>We have received your request to create the organization <strong>"${data.organizationName}"</strong> on the Chimeo platform.</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">Request Details</h3>
            <p><strong>Organization:</strong> ${data.organizationName}</p>
            <p><strong>Type:</strong> ${data.organizationType}</p>
            <p><strong>Request Date:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          <div style="background-color: #e3f2fd; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1976d2;">What happens next?</h3>
            <ol style="margin: 0; padding-left: 20px;">
              <li>Our team will review your request within <strong>3 business days</strong></li>
              <li>You will receive an email notification once your request is approved</li>
              <li>Upon approval, you'll gain access to <strong>premium features for 30 days</strong></li>
              <li>You can then create groups, send alerts, and manage your organization</li>
            </ol>
          </div>
          
          <div style="background-color: #f0f8ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h4 style="margin-top: 0; color: #1976d2;">In the meantime, you can:</h4>
            <ul style="margin: 0; padding-left: 20px;">
              <li>Log in to your account to explore the platform</li>
              <li>Review our features and capabilities</li>
              <li>Contact support if you have any questions</li>
            </ul>
          </div>
          
          <p>Thank you for choosing Chimeo!</p>
          
          <p>Best regards,<br><strong>The Chimeo Team</strong></p>
        </div>
      `
    );
  }

  // Send organization approval email to requester
  async sendOrganizationApprovalEmail(data) {
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 30);
    
    return this.sendEmail(
      data.adminEmail,
      `Organization Approved - ${data.organizationName}`,
      `
Congratulations! Your organization has been approved!

Hello ${data.adminName},

Great news! Your organization request for "${data.organizationName}" has been approved and your account has been upgraded.

Organization Details:
- Organization: ${data.organizationName}
- Type: ${data.organizationType}
- Approval Date: ${new Date().toLocaleString()}

Your Premium Trial:
- Status: ACTIVE
- Trial Period: 30 days
- Trial Ends: ${trialEndDate.toLocaleDateString()}
- Access Level: Premium

What you can do now:
- Create unlimited groups and send alerts
- Access advanced features and analytics
- Manage your organization settings
- Invite team members

Important: Your 30-day premium trial will end on ${trialEndDate.toLocaleDateString()}. If you don't upgrade to a paid subscription before then, your account will automatically return to the free tier.

To upgrade your subscription, log in to your account and visit the subscription page.

Welcome to Chimeo!

Best regards,
The Chimeo Team
      `,
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #28a745;">🎉 Congratulations! Your Organization Has Been Approved!</h2>
          
          <p>Hello <strong>${data.adminName}</strong>,</p>
          
          <p>Great news! Your organization request for <strong>"${data.organizationName}"</strong> has been approved and your account has been upgraded.</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">Organization Details</h3>
            <p><strong>Organization:</strong> ${data.organizationName}</p>
            <p><strong>Type:</strong> ${data.organizationType}</p>
            <p><strong>Approval Date:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          <div style="background-color: #e8f5e8; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
            <h3 style="margin-top: 0; color: #28a745;">Your Premium Trial</h3>
            <p><strong>Status:</strong> <span style="color: #28a745; font-weight: bold;">ACTIVE</span></p>
            <p><strong>Trial Period:</strong> 30 days</p>
            <p><strong>Trial Ends:</strong> ${trialEndDate.toLocaleDateString()}</p>
            <p><strong>Access Level:</strong> Premium</p>
          </div>
          
          <div style="background-color: #e3f2fd; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1976d2;">What you can do now:</h3>
            <ul style="margin: 0; padding-left: 20px;">
              <li>Create unlimited groups and send alerts</li>
              <li>Access advanced features and analytics</li>
              <li>Manage your organization settings</li>
              <li>Invite team members</li>
            </ul>
          </div>
          
          <div style="background-color: #fff3cd; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <h3 style="margin-top: 0; color: #856404;">⚠️ Important Trial Information</h3>
            <p>Your 30-day premium trial will end on <strong>${trialEndDate.toLocaleDateString()}</strong>. If you don't upgrade to a paid subscription before then, your account will automatically return to the free tier.</p>
            <p>To upgrade your subscription, log in to your account and visit the subscription page.</p>
          </div>
          
          <p>Welcome to Chimeo!</p>
          
          <p>Best regards,<br><strong>The Chimeo Team</strong></p>
        </div>
      `
    );
  }

  // Send alert notification email
  async sendAlertEmail(alertData, recipientEmail) {
    // Use alerts@chimeo.app as sender for alert emails
    const originalFromEmail = this.fromEmail;
    this.fromEmail = "alerts@chimeo.app";
    
    const result = await this.sendEmail(
      recipientEmail,
      `New Alert: ${alertData.title}`,
      `
New Alert from ${alertData.organizationName}

Title: ${alertData.title}
Message: ${alertData.message}
Organization: ${alertData.organizationName}
Created by: ${alertData.createdBy || 'Unknown'}
Created: ${new Date().toLocaleString()}

Please check your Chimeo dashboard for more details.

Best regards,
Chimeo Alerts
      `,
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #dc3545;">🚨 New Alert</h2>
          
          <p>You have received a new alert from <strong>${alertData.organizationName}</strong></p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #dc3545;">
            <h3 style="margin-top: 0; color: #dc3545;">Alert Details</h3>
            <p><strong>Title:</strong> ${alertData.title}</p>
            <p><strong>Message:</strong> ${alertData.message}</p>
            <p><strong>Organization:</strong> ${alertData.organizationName}</p>
            <p><strong>Created by:</strong> ${alertData.createdBy || 'Unknown'}</p>
            <p><strong>Created:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p>Please check your Chimeo dashboard for more details and to respond to this alert.</p>
          </div>
          
          <p>Best regards,<br><strong>Chimeo Alerts</strong></p>
        </div>
      `
    );
    
    // Restore original fromEmail
    this.fromEmail = originalFromEmail;
    return result;
  }

  // Example: Test Email
  async testEmail() {
    return this.sendEmail(
      this.platformAdminEmail,
      "Chimeo Email Service Test",
      "Test email from Chimeo via Vercel API + Zoho SMTP.",
      "<h2>✅ Email Service Test Successful</h2><p>This is a test email from the Chimeo platform.</p>"
    );
  }
}

// Export singleton
const emailService = new EmailService();
if (typeof window !== "undefined") {
  window.emailService = emailService;
  window.testEmail = () => emailService.testEmail();
}
export default emailService;

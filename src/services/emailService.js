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

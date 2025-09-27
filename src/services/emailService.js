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

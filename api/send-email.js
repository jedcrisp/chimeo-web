import nodemailer from "nodemailer";

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { to, subject, text, html, from } = req.body;

  // Validate required fields
  if (!to || !subject) {
    return res.status(400).json({ error: "Missing required fields: to, subject" });
  }

  try {
    console.log('📧 Vercel API: Sending email via Zoho SMTP...');
    console.log('📧 To:', to);
    console.log('📧 Subject:', subject);
    console.log('📧 From:', from || process.env.ZOHO_EMAIL);

    // Create transporter with Zoho SMTP
    let transporter = nodemailer.createTransport({
      host: "smtp.zoho.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.ZOHO_EMAIL,         // e.g. jed@chimeo.app
        pass: process.env.ZOHO_APP_PASSWORD, // app-specific password
      },
    });

    // Send email
    const info = await transporter.sendMail({
      from: `"Chimeo" <${from || process.env.ZOHO_EMAIL}>`,
      to,
      subject,
      text: text || 'No text content provided',
      html: html || text || 'No content provided',
    });

    console.log('✅ Email sent successfully:', info.messageId);
    res.status(200).json({ 
      success: true, 
      messageId: info.messageId,
      message: 'Email sent successfully via Zoho SMTP'
    });

  } catch (err) {
    console.error("❌ Email error:", err);
    res.status(500).json({ 
      error: "Failed to send email", 
      details: err.message 
    });
  }
}

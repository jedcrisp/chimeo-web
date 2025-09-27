import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Zoho OAuth Configuration
const zohoClientId = functions.config().zoho?.client_id || process.env.ZOHO_CLIENT_ID;
const zohoClientSecret = functions.config().zoho?.client_secret || process.env.ZOHO_CLIENT_SECRET;

// Zoho OAuth token storage (in production, use a secure database)
let zohoAccessToken: string | null = null;
let zohoTokenExpiry: number = 0;

// Function to get Zoho OAuth access token
async function getZohoAccessToken(): Promise<string | null> {
  if (!zohoClientId || !zohoClientSecret) {
    console.log('⚠️ Zoho credentials not configured, using SendGrid only');
    return null;
  }

  // Check if we have a valid token
  if (zohoAccessToken && Date.now() < zohoTokenExpiry) {
    return zohoAccessToken;
  }

  try {
    console.log('🔑 Requesting Zoho OAuth token...');
    
    const response = await fetch('https://accounts.zoho.com/oauth/v2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: zohoClientId,
        client_secret: zohoClientSecret,
        scope: 'ZohoMail.messages.CREATE'
      })
    });

    const data = await response.json();
    
    if (data.access_token) {
      zohoAccessToken = data.access_token;
      zohoTokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // 1 minute buffer
      console.log('✅ Zoho OAuth token obtained successfully');
      return zohoAccessToken;
    } else {
      console.error('❌ Failed to get Zoho token:', data);
      return null;
    }
  } catch (error) {
    console.error('❌ Error getting Zoho token:', error);
    return null;
  }
}

interface EmailData {
  to: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  fromEmail?: string;
  fromName?: string;
}

interface OrganizationRequestData {
  organizationName: string;
  organizationType: string;
  adminFirstName: string;
  adminLastName: string;
  adminEmail: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  website: string;
  description: string;
}

interface OrganizationApprovalData {
  name: string;
  type: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  website: string;
  description: string;
  adminName: string;
  adminEmail: string;
}

interface AdminAccessData {
  adminName: string;
  adminEmail: string;
  organizationName: string;
  adminType: string;
  organizationId: string;
}

// Function to send email via Zoho
async function sendEmailViaZoho(emailData: EmailData): Promise<boolean> {
  try {
    const accessToken = await getZohoAccessToken();
    if (!accessToken) {
      console.log('⚠️ No Zoho access token available');
      return false;
    }

    console.log('📧 Sending email via Zoho...');
    console.log('📧 To:', emailData.to);
    console.log('📧 Subject:', emailData.subject);

    const response = await fetch('https://mail.zoho.com/api/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fromAddress: emailData.fromEmail || 'jed@chimeo.app',
        toAddress: emailData.to,
        subject: emailData.subject,
        content: emailData.htmlContent,
        mailFormat: 'html'
      })
    });

    if (response.ok) {
      console.log('✅ Email sent successfully via Zoho');
      return true;
    } else {
      const errorData = await response.text();
      console.error('❌ Zoho error:', response.status, errorData);
      return false;
    }
  } catch (error) {
    console.error('❌ Zoho error:', error);
    return false;
  }
}


// Main email sending function using Zoho only
async function sendEmail(emailData: EmailData): Promise<boolean> {
  console.log('📧 Attempting to send email via Zoho...');
  
  // Check if Zoho credentials are configured
  if (!zohoClientId || !zohoClientSecret) {
    console.error('❌ Zoho credentials not configured. Please set ZOHO_CLIENT_ID and ZOHO_CLIENT_SECRET');
    return false;
  }

  // Send via Zoho
  const zohoSuccess = await sendEmailViaZoho(emailData);
  if (zohoSuccess) {
    return true;
  }

  console.error('❌ Zoho email sending failed');
  return false;
}

// Cloud Function: Send organization request email
export const sendOrganizationRequestEmail = functions.https.onCall(async (data: OrganizationRequestData, context) => {
  try {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const subject = `New Organization Request - ${data.organizationName}`;
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">New Organization Request</h2>
        <p>Hello Platform Admin,</p>
        <p>A new organization request has been submitted:</p>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #555;">Organization Details</h3>
          <p><strong>Name:</strong> ${data.organizationName}</p>
          <p><strong>Type:</strong> ${data.organizationType}</p>
          <p><strong>Admin:</strong> ${data.adminFirstName} ${data.adminLastName}</p>
          <p><strong>Admin Email:</strong> ${data.adminEmail}</p>
          <p><strong>Address:</strong> ${data.address}, ${data.city}, ${data.state} ${data.zipCode}</p>
          <p><strong>Phone:</strong> ${data.phone}</p>
          <p><strong>Website:</strong> ${data.website}</p>
          <p><strong>Description:</strong> ${data.description}</p>
        </div>
        
        <p><strong>Request Date:</strong> ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
        
        <p>Please review and approve/reject this request in the admin panel.</p>
        
        <p>Best regards,<br>Chimeo Web App</p>
      </div>
    `;

    const textContent = `
New Organization Request

Organization: ${data.organizationName}
Type: ${data.organizationType}
Admin: ${data.adminFirstName} ${data.adminLastName} (${data.adminEmail})
Address: ${data.address}, ${data.city}, ${data.state} ${data.zipCode}
Phone: ${data.phone}
Website: ${data.website}
Description: ${data.description}

Request Date: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}

Please review and approve/reject this request in the admin panel.

Best regards,
Chimeo Web App
    `;

    const result = await sendEmail({
      to: 'jed@chimeo.app',
      subject,
      htmlContent,
      textContent
    });

    return { success: result };
  } catch (error) {
    console.error('❌ Error in sendOrganizationRequestEmail:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send organization request email');
  }
});

// Cloud Function: Send organization approval email
export const sendOrganizationApprovalEmail = functions.https.onCall(async (data: OrganizationApprovalData, context) => {
  try {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const subject = `Organization Request Approved - ${data.name}`;
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #28a745;">Organization Request Approved</h2>
        <p>Hello ${data.adminName},</p>
        <p>Great news! Your organization request for <strong>"${data.name}"</strong> has been approved.</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
          <h3 style="margin-top: 0; color: #555;">Organization Details</h3>
          <p><strong>Name:</strong> ${data.name}</p>
          <p><strong>Type:</strong> ${data.type}</p>
          <p><strong>Address:</strong> ${data.address}, ${data.city}, ${data.state} ${data.zipCode}</p>
          <p><strong>Phone:</strong> ${data.phone}</p>
          <p><strong>Website:</strong> ${data.website}</p>
          <p><strong>Description:</strong> ${data.description}</p>
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
    `;

    const textContent = `
Organization Request Approved

Hello ${data.adminName},

Great news! Your organization request for "${data.name}" has been approved.

Organization Details:
- Name: ${data.name}
- Type: ${data.type}
- Address: ${data.address}, ${data.city}, ${data.state} ${data.zipCode}
- Phone: ${data.phone}
- Website: ${data.website}
- Description: ${data.description}

Next Steps:
You can now log in to the platform using your registered credentials.

Login URL: https://chimeo-web.vercel.app/login

Approval Date: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}

Welcome to Chimeo!

Best regards,
Chimeo Platform Team
    `;

    const result = await sendEmail({
      to: data.adminEmail || 'jed@chimeo.app',
      subject,
      htmlContent,
      textContent
    });

    return { success: result };
  } catch (error) {
    console.error('❌ Error in sendOrganizationApprovalEmail:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send organization approval email');
  }
});

// Cloud Function: Send admin access email
export const sendAdminAccessEmail = functions.https.onCall(async (data: AdminAccessData, context) => {
  try {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const subject = `Admin Access Granted - ${data.organizationName}`;
    const roleDisplay = data.adminType === 'organization_admin' ? 'Organization Admin' : 'Admin';
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 28px;">Admin Access Granted</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Welcome to the ${data.organizationName} team!</p>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #333; margin-top: 0;">Hello ${data.adminName},</h2>
          
          <p style="color: #555; line-height: 1.6; font-size: 16px;">
            Great news! You have been granted <strong>${roleDisplay}</strong> access to <strong>${data.organizationName}</strong>.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
            <h3 style="color: #333; margin-top: 0;">Your Admin Access Details:</h3>
            <ul style="color: #555; line-height: 1.8;">
              <li><strong>Organization:</strong> ${data.organizationName}</li>
              <li><strong>Role:</strong> ${roleDisplay}</li>
              <li><strong>Access Level:</strong> ${data.adminType === 'organization_admin' ? 'Full administrative privileges' : 'Standard admin privileges'}</li>
              <li><strong>Granted On:</strong> ${new Date().toLocaleDateString()}</li>
            </ul>
          </div>
          
          <div style="background: #e8f4fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1976d2; margin-top: 0;">What You Can Do Now:</h3>
            <ul style="color: #555; line-height: 1.8;">
              <li>Access the organization management dashboard</li>
              <li>Create and manage alerts for your organization</li>
              <li>View organization analytics and reports</li>
              ${data.adminType === 'organization_admin' ? '<li>Manage other administrators and their roles</li>' : ''}
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
          <p style="margin: 5px 0 0 0;">Organization ID: ${data.organizationId}</p>
        </div>
      </div>
    `;
    
    const textContent = `
Admin Access Granted - ${data.organizationName}

Hello ${data.adminName},

Great news! You have been granted ${roleDisplay} access to ${data.organizationName}.

Your Admin Access Details:
- Organization: ${data.organizationName}
- Role: ${roleDisplay}
- Access Level: ${data.adminType === 'organization_admin' ? 'Full administrative privileges' : 'Standard admin privileges'}
- Granted On: ${new Date().toLocaleDateString()}

What You Can Do Now:
- Access the organization management dashboard
- Create and manage alerts for your organization
- View organization analytics and reports
${data.adminType === 'organization_admin' ? '- Manage other administrators and their roles' : ''}
- Receive important organization notifications

Access your admin dashboard at: https://chimeo-web.vercel.app/login

If you have any questions about your new admin access, please contact the platform administrator.

Best regards,
Chimeo Platform Team
    `;
    
    const result = await sendEmail({
      to: data.adminEmail,
      subject,
      htmlContent,
      textContent
    });

    return { success: result };
  } catch (error) {
    console.error('❌ Error in sendAdminAccessEmail:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send admin access email');
  }
});

// Cloud Function: Send generic email
export const sendGenericEmail = functions.https.onCall(async (data: EmailData, context) => {
  try {
    // Note: Authentication is optional for email sending to allow unauthenticated requests
    // This is needed for organization requests and other public-facing email notifications
    
    const result = await sendEmail(data);
    return { success: result };
  } catch (error) {
    console.error('❌ Error in sendGenericEmail:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send generic email');
  }
});

// Cloud Function: Send test email
export const sendTestEmail = functions.https.onCall(async (data, context) => {
  try {
    // Note: Authentication is optional for test emails to allow easy testing

    const subject = 'Test Email from Chimeo Platform';
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
          <p><strong>Sent From:</strong> Cloud Function</p>
        </div>
        
        <p>If you received this email, the email notification system is working correctly!</p>
        
        <p>Best regards,<br>Chimeo Platform</p>
      </div>
    `;

    const textContent = `
Test Email from Chimeo Platform

Hello Platform Admin,

This is a test email to verify that email notifications are working correctly.

Test Details:
- Service: SendGrid Email Service
- Status: ✅ Working
- Test Date: ${new Date().toLocaleDateString()}
- Test Time: ${new Date().toLocaleTimeString()}
- Sent From: Cloud Function

If you received this email, the email notification system is working correctly!

Best regards,
Chimeo Platform
    `;

    const result = await sendEmail({
      to: 'jed@chimeo.app',
      subject,
      htmlContent,
      textContent
    });

    return { success: result };
  } catch (error) {
    console.error('❌ Error in sendTestEmail:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send test email');
  }
});

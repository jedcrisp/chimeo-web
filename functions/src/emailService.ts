import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as sgMail from '@sendgrid/mail';

// Initialize SendGrid
sgMail.setApiKey(functions.config().sendgrid?.api_key || process.env.SENDGRID_API_KEY);

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

// Send email using SendGrid
async function sendEmail(emailData: EmailData): Promise<boolean> {
  try {
    const msg = {
      to: emailData.to,
      from: {
        email: emailData.fromEmail || 'jed@onetrack-consulting.com', // Use verified email
        name: emailData.fromName || 'Chimeo Platform'
      },
      subject: emailData.subject,
      text: emailData.textContent,
      html: emailData.htmlContent,
    };

    await sgMail.send(msg);
    console.log('✅ Email sent successfully via SendGrid');
    return true;
  } catch (error) {
    console.error('❌ Failed to send email via SendGrid:', error);
    return false;
  }
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
      to: 'jed@onetrack-consulting.com',
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
      to: data.adminEmail || 'jed@onetrack-consulting.com',
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
      to: 'jed@onetrack-consulting.com',
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

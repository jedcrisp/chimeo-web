# EmailJS Quick Setup Guide

## 🚀 Quick Start

### 1. Create EmailJS Account
1. Go to [EmailJS.com](https://www.emailjs.com/)
2. Sign up for free (200 emails/month)
3. Verify your email

### 2. Create Email Service
1. Dashboard → "Email Services" → "Add New Service"
2. Choose Gmail/Outlook/etc.
3. Follow provider setup
4. **Copy the Service ID** (e.g., `service_abc123`)

### 3. Create Email Templates

#### Template 1: Organization Request
- **Template ID**: `template_org_request`
- **Subject**: `New Organization Request - {{organization_name}}`
- **Content**:
```
Hello Platform Admin,

A new organization request has been submitted:

Organization: {{organization_name}}
Type: {{organization_type}}
Admin: {{admin_name}} ({{admin_email}})
Address: {{address}}
Phone: {{phone}}
Website: {{website}}
Description: {{description}}

Request Date: {{request_date}}

Please review and approve/reject this request in the admin panel.

Best regards,
Chimeo Platform
```

#### Template 2: Organization Approval
- **Template ID**: `template_org_approval`
- **Subject**: `Organization Request Approved - {{organization_name}}`
- **Content**:
```
Hello {{admin_name}},

Great news! Your organization request for "{{organization_name}}" has been approved.

Organization Details:
- Name: {{organization_name}}
- Type: {{organization_type}}
- Address: {{address}}
- Phone: {{phone}}
- Website: {{website}}

You can now log in to the platform using:
- Email: {{admin_email}}
- Password: [The password you provided during registration]

Login URL: https://chimeo-web.vercel.app/login

Welcome to Chimeo!

Best regards,
Chimeo Platform Team
```

#### Template 3: Admin Access Granted
- **Template ID**: `template_admin_access`
- **Subject**: `Admin Access Granted - {{organization_name}}`
- **Content**:
```
Hello {{admin_name}},

Great news! You have been granted {{admin_role}} access to {{organization_name}}.

Your Admin Access Details:
- Organization: {{organization_name}}
- Role: {{admin_role}}
- Access Level: {{access_level}}
- Granted On: {{granted_date}}

What You Can Do Now:
- Access the organization management dashboard
- Create and manage alerts for your organization
- View organization analytics and reports
{{admin_management}}
- Receive important organization notifications

Access your admin dashboard at: https://chimeo-web.vercel.app/login

If you have any questions about your new admin access, please contact the platform administrator.

Best regards,
Chimeo Platform Team
```

### 4. Get Public Key
1. Dashboard → "Account" → "General"
2. **Copy the Public Key** (e.g., `user_abc123def456`)

### 5. Configure Application

#### Option A: Use Setup Script
```bash
node setup-emailjs.js
```

#### Option B: Manual Configuration
Create `.env` file:
```bash
VITE_EMAILJS_SERVICE_ID=your_service_id_here
VITE_EMAILJS_TEMPLATE_ID=template_org_request
VITE_EMAILJS_PUBLIC_KEY=your_public_key_here
VITE_PLATFORM_ADMIN_EMAIL=jed@onetrack-consulting.com
```

### 6. Test Email Functionality

#### Browser Console Test
```javascript
// Open browser console and run:
window.testEmail()
```

#### Check Service Status
```javascript
// Check if EmailJS is loaded:
console.log(window.emailjs ? 'EmailJS loaded' : 'EmailJS not loaded')
console.log(window.emailService ? 'Email service available' : 'Email service not available')
```

## 🔧 Troubleshooting

### Common Issues

1. **"EmailJS not loaded"**
   - Check if EmailJS CDN is accessible
   - Verify public key is correct
   - Check browser console for errors

2. **"Template not found"**
   - Verify template ID matches exactly
   - Check template exists in EmailJS dashboard
   - Ensure template is published

3. **"Service not found"**
   - Verify service ID is correct
   - Check service is active in EmailJS dashboard
   - Ensure service has proper permissions

4. **"Emails not sending"**
   - Check email service configuration
   - Verify sender email is authorized
   - Check EmailJS usage limits

### Debug Mode
The email service includes detailed logging:
- Look for "📧 Sending email via EmailJS..." in console
- Check for "✅ Email sent successfully" confirmations
- Review EmailJS dashboard logs

## 📊 Monitoring

### EmailJS Dashboard
- **Logs**: View sent emails and delivery status
- **Statistics**: Monitor delivery rates and usage
- **Templates**: Manage email templates
- **Services**: Configure email providers

### Application Logs
- Browser console shows detailed email sending logs
- Fallback mode logs emails to console for manual sending
- Test function available: `window.testEmail()`

## 🎯 Email Types Supported

1. **Organization Request Notifications**
   - Sent to platform admin when new org requests are submitted
   - Includes all organization details and admin information

2. **Organization Approval Notifications**
   - Sent to organization admin when request is approved
   - Includes login instructions and welcome message

3. **Admin Access Notifications**
   - Sent when new admins are added to organizations
   - Includes role details and access information

4. **Alert Notifications**
   - Sent when new alerts are created
   - Includes alert details and organization information

5. **Test Emails**
   - Available for testing email functionality
   - Shows service status and configuration details

## 🔒 Security Notes

- Public key is safe to expose in client-side code
- EmailJS handles authentication securely
- Monitor email sending limits and usage
- Regularly review service permissions
- Use HTTPS in production

## 📞 Support

- **EmailJS Issues**: [EmailJS Documentation](https://www.emailjs.com/docs/)
- **Application Issues**: Check browser console and service configuration
- **Setup Help**: Run `node setup-emailjs.js` for guided configuration

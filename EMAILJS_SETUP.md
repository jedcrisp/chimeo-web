# EmailJS Setup Guide

This guide explains how to set up EmailJS for automatic email sending in the Chimeo web application.

## Overview

EmailJS allows you to send emails directly from the browser without a backend server, avoiding CORS issues. It's perfect for client-side applications.

## Setup Steps

### 1. Create EmailJS Account

1. Go to [EmailJS.com](https://www.emailjs.com/)
2. Sign up for a free account (200 emails/month free)
3. Verify your email address

### 2. Create Email Service

1. In EmailJS dashboard, go to "Email Services"
2. Click "Add New Service"
3. Choose your email provider (Gmail, Outlook, etc.)
4. Follow the setup instructions for your provider
5. Note down the **Service ID** (e.g., `service_abc123`)

### 3. Create Email Templates

1. Go to "Email Templates"
2. Click "Create New Template"
3. Create templates for:

#### Organization Request Template
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

#### Organization Approval Template
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

### 4. Get Public Key

1. Go to "Account" > "General"
2. Copy your **Public Key** (e.g., `user_abc123def456`)

### 5. Update Configuration

Update the email service configuration in `src/services/emailService.js`:

```javascript
this.serviceId = 'your_service_id_here'
this.templateId = 'template_org_request'
this.publicKey = 'your_public_key_here'
```

Or set environment variables:
```bash
VITE_EMAILJS_SERVICE_ID=your_service_id_here
VITE_EMAILJS_TEMPLATE_ID=template_org_request
VITE_EMAILJS_PUBLIC_KEY=your_public_key_here
```

## Template Variables

The following variables are available in your templates:

### Organization Request Template
- `{{organization_name}}` - Organization name
- `{{organization_type}}` - Organization type
- `{{admin_name}}` - Admin full name
- `{{admin_email}}` - Admin email
- `{{address}}` - Full address
- `{{phone}}` - Phone number
- `{{website}}` - Website URL
- `{{description}}` - Organization description
- `{{request_date}}` - Request submission date

### Organization Approval Template
- `{{organization_name}}` - Organization name
- `{{organization_type}}` - Organization type
- `{{admin_name}}` - Admin full name
- `{{admin_email}}` - Admin email
- `{{address}}` - Full address
- `{{phone}}` - Phone number
- `{{website}}` - Website URL

## Testing

1. Start your development server
2. Submit an organization request
3. Check that emails are sent automatically
4. Verify email content and formatting

## Troubleshooting

### Common Issues

1. **Emails not sending**
   - Check service ID and template ID are correct
   - Verify public key is valid
   - Check browser console for errors
   - Ensure email service is properly configured

2. **Template variables not working**
   - Make sure variable names match exactly
   - Check template syntax in EmailJS dashboard
   - Verify data is being passed correctly

3. **CORS errors**
   - EmailJS handles CORS automatically
   - No additional configuration needed

### Debug Mode

The service includes detailed logging:
- Check browser console for EmailJS initialization
- Look for "📧 Sending email via EmailJS..." messages
- Check for "✅ Email sent successfully via EmailJS" confirmations

## Security Notes

- Public key is safe to expose in client-side code
- EmailJS handles authentication securely
- Monitor email sending limits and usage
- Regularly review service permissions

## EmailJS Dashboard

Monitor your email activity:
- Go to "Logs" to see sent emails
- Check "Statistics" for delivery rates
- Review "Templates" for template management

## Support

For EmailJS-specific issues:
- [EmailJS Documentation](https://www.emailjs.com/docs/)
- [EmailJS Support](https://www.emailjs.com/support/)

For application-specific issues:
- Check browser console for errors
- Verify service configuration
- Test with simple email first

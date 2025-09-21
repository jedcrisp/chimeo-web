# Email Notification Setup Guide

This guide explains how to set up email notifications for the Chimeo web application using SendGrid.

## Overview

The email service is configured to send notifications for:
- New organization requests (to platform admin)
- Organization approval notifications (to new admin)
- New alert notifications (to platform admin)

## Setup Steps

### 1. Create SendGrid Account

1. Go to [SendGrid.com](https://sendgrid.com/)
2. Sign up for a free account (100 emails/day free)
3. Verify your email address

### 2. Create API Key

1. In SendGrid dashboard, go to "Settings" > "API Keys"
2. Click "Create API Key"
3. Choose "Restricted Access" for security
4. Grant permissions for "Mail Send"
5. Copy the API key (starts with `SG.`)

### 3. Verify Sender Email

1. Go to "Settings" > "Sender Authentication"
2. Choose "Single Sender Verification"
3. Add and verify your sender email address
4. Update `fromEmail` in the service if needed

### 4. Update Configuration

The API key needs to be configured in `src/services/emailService.js`:

```javascript
// Replace with your actual SendGrid API key
this.apiKey = 'YOUR_SENDGRID_API_KEY'
```

### 5. Environment Variables (Optional)

For production, you can use environment variables:

1. Create `.env` file in project root:
```
VITE_SENDGRID_API_KEY=YOUR_SENDGRID_API_KEY
```

2. The service is already configured to use environment variable:
```javascript
this.apiKey = import.meta.env.VITE_SENDGRID_API_KEY || 'YOUR_SENDGRID_API_KEY'
```

## Email Templates

The service includes built-in HTML and text templates for:

### Organization Request Email
- Sent to platform admin when new organization requests are submitted
- Includes organization details, admin info, contact information

### Organization Approval Email
- Sent to new admin when organization is approved
- Includes approval confirmation and login instructions

### Alert Notification Email
- Sent to platform admin when new alerts are created
- Includes alert details, organization info, and priority

## Testing

1. Start the application
2. Submit an organization request
3. Check that emails are sent to the configured addresses
4. Verify email content and formatting

## Troubleshooting

### Common Issues

1. **Emails not sending**
   - Check API key is correct and active
   - Verify sender email is verified in SendGrid
   - Check browser console for errors
   - Ensure API key has "Mail Send" permissions

2. **CORS errors**
   - SendGrid API supports CORS
   - Check if domain is properly configured

3. **Rate limiting**
   - Free tier: 100 emails/day
   - Check SendGrid dashboard for usage

### Debug Mode

The service includes detailed logging:
- Check browser console for email sending attempts
- Look for "📧 Sending email via SendGrid" messages
- Check for "✅ Email sent successfully" confirmations

## Security Notes

- API key is currently hardcoded (consider using environment variables for production)
- SendGrid API key has restricted permissions
- Monitor email sending limits and usage
- Regularly review API key permissions

## SendGrid Dashboard

Monitor your email activity:
- Go to "Activity" > "Email Activity" to see sent emails
- Check "Statistics" for delivery rates
- Review "Suppressions" for bounced emails

## Support

For SendGrid-specific issues:
- [SendGrid Documentation](https://docs.sendgrid.com/)
- [SendGrid Support](https://support.sendgrid.com/)

For application-specific issues:
- Check browser console for errors
- Verify service configuration
- Test with simple email first
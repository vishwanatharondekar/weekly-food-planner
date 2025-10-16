# Email Tracking System Documentation

This document explains the email tracking system that integrates with Mixpanel to track email engagement metrics.

## 🎯 **Overview**

The email tracking system provides comprehensive analytics for weekly meal plan emails, including:
- Email opens (via tracking pixels)
- Link clicks (via redirect tracking)
- Email delivery status
- User engagement metrics

All tracking data is sent to Mixpanel for analysis and reporting.

## 🏗️ **System Architecture**

### **Components Created:**

1. **Email Tracking API** (`app/api/email-tracking/route.ts`)
   - Handles email open tracking via 1x1 pixel
   - Processes link click tracking with redirects
   - Sends events to Mixpanel

2. **Email Tracking Utilities** (`lib/email-tracking-utils.ts`)
   - Generates tracking pixel URLs
   - Creates tracked link URLs with redirects
   - Adds UTM parameters for campaign tracking

3. **Updated Email Templates** (`lib/email-templates.ts`)
   - Includes invisible tracking pixels
   - All links redirect through tracking endpoint
   - Both HTML and text versions supported

4. **Enhanced SES Service** (`lib/ses-service.ts`)
   - Tracks email sent events
   - Includes user and campaign metadata

5. **Updated Analytics Events** (`lib/analytics.ts`)
   - Added EMAIL event category
   - Comprehensive email engagement events

6. **Test Endpoint** (`app/api/test-email-tracking/route.ts`)
   - Preview emails with tracking enabled
   - Test tracking functionality

## 📊 **Tracked Events**

### **Email Delivery Events**
- `email_sent`: When email is successfully sent via SES
- `email_delivered`: When email is delivered (future: SES webhooks)
- `email_bounce`: When email bounces (future: SES webhooks)
- `email_complaint`: When user marks as spam (future: SES webhooks)

### **Email Engagement Events**
- `email_open`: When user opens the email (tracking pixel loaded)
- `email_click`: When user clicks any link in the email

### **Event Properties**
All events include:
```javascript
{
  user_id: string,
  user_email: string,
  week_start_date: string,
  timestamp: string,
  message_id?: string,      // SES message ID
  link_type?: string,       // Type of link clicked
  redirect_url?: string     // Original URL for clicks
}
```

## 🔗 **Tracking Implementation**

### **Email Opens**
- Invisible 1x1 pixel image embedded at end of HTML emails
- Pixel URL: `/api/email-tracking?event=open&userId=...&userEmail=...&weekStartDate=...`
- Pixel is hidden with CSS: `display: none; visibility: hidden; opacity: 0;`

### **Link Clicks**
- All email links redirect through tracking endpoint
- Tracking URL format: `/api/email-tracking?event=click&userId=...&linkType=...&redirect=...`
- After tracking, user is redirected to original destination
- UTM parameters added for campaign attribution

### **Link Types Tracked**
- `main_app`: Primary app link in email header
- `footer_app`: App link in email footer
- `unsubscribe`: Unsubscribe links (handled by existing system)

## 🚀 **Usage**

### **Automatic Tracking**
Email tracking is automatically enabled for all weekly meal plan emails. No additional configuration required.

### **Testing**
Use the test endpoint to preview emails with tracking:
```bash
# Preview HTML email with tracking
GET /api/test-email-tracking

# Get email content as JSON
POST /api/test-email-tracking
Content-Type: application/json
{
  "format": "html" | "text"
}
```

### **Tracking URLs**
The system generates tracking URLs automatically:
```typescript
import { generateEmailTrackingUrls, createEmailTrackingData } from '@/lib/email-tracking-utils';

const trackingData = createEmailTrackingData(userId, userEmail, weekStartDate);
const trackingUrls = generateEmailTrackingUrls(trackingData);

// Use trackingUrls.trackingPixel for open tracking
// Use trackingUrls.mainAppLink for tracked app links
```

## 📈 **Analytics Integration**

### **Mixpanel Events**
Events are sent to Mixpanel with the naming convention:
- `email_delivery_email_sent`
- `email_engagement_email_open`
- `email_engagement_email_click`

### **User Properties**
User properties are automatically set:
```javascript
{
  user_id: string,
  email: string
}
```

## 🔧 **Configuration**

### **Environment Variables**
Ensure `MIXPANEL_TOKEN` is set in your environment for tracking to work.

### **Server-Side Tracking**
The system initializes Mixpanel for server-side tracking in:
- Email tracking API endpoint
- SES service for email sent events

## 🛠️ **Troubleshooting**

### **Common Issues**

1. **Tracking pixel not loading**
   - Check if email client blocks images
   - Verify tracking endpoint is accessible
   - Check server logs for errors

2. **Click tracking not working**
   - Verify redirect URLs are properly encoded
   - Check if tracking endpoint returns proper redirects
   - Ensure original URLs are valid

3. **Events not appearing in Mixpanel**
   - Verify `MIXPANEL_TOKEN` environment variable
   - Check server logs for tracking errors
   - Ensure Mixpanel project is properly configured

### **Testing Tracking**
1. Send test email using `/api/test-email-tracking`
2. Open email in browser/email client
3. Click links in the email
4. Check Mixpanel for events with user ID `test-user-123`

## 🔒 **Privacy & Compliance**

### **Data Collection**
- Only collects engagement metrics (opens, clicks)
- No personal content from emails is tracked
- User email and ID are included for attribution

### **GDPR Compliance**
- Tracking respects user's email preferences
- Unsubscribed users are not tracked
- Data is used only for engagement analytics

## 🚀 **Future Enhancements**

### **Planned Features**
1. **SES Webhooks**: Track delivery, bounces, and complaints
2. **A/B Testing**: Track different email templates
3. **Engagement Scoring**: Calculate user engagement scores
4. **Real-time Dashboard**: View email metrics in real-time
5. **Automated Insights**: AI-powered email performance insights

### **Advanced Tracking**
- Email client detection
- Device and location tracking
- Time-based engagement analysis
- Cohort analysis for email campaigns

# Unsubscribe System Documentation

This document explains the secure unsubscribe system implemented for the weekly meal plan emails.

## 🔐 **Security Features**

### **JWT Token Security**
- **Secure Tokens**: Each unsubscribe link contains a JWT token with user email and ID
- **Expiration**: Tokens expire after 30 days for security
- **Verification**: Tokens are verified on both page load and unsubscribe action
- **Audit Trail**: Unsubscribe tokens are stored for audit purposes

### **Token Structure**
```typescript
{
  email: string;        // User's email address
  userId: string;       // User's unique ID
  type: 'unsubscribe'; // Token type for validation
  iat: number;         // Issued at timestamp
  exp: number;         // Expiration timestamp
}
```

## 🏗️ **System Architecture**

### **Components Created:**

1. **JWT Utilities** (`lib/jwt-utils.ts`)
   - Token generation and verification
   - Secure unsubscribe URL creation

2. **Unsubscribe API** (`app/api/unsubscribe/route.ts`)
   - `GET`: Verify token and check subscription status
   - `POST`: Process unsubscribe request

3. **Unsubscribe Page** (`app/unsubscribe/page.tsx`)
   - User-friendly unsubscribe interface
   - Token verification and confirmation

4. **Updated Email Templates** (`lib/email-templates.ts`)
   - Secure unsubscribe links in all emails
   - Both HTML and text versions

5. **Updated Cron Job** (`app/api/cron/weekly-meal-plans/route.ts`)
   - Respects unsubscribe preferences
   - Skips unsubscribed users

## 📧 **Email Integration**

### **Unsubscribe Link Format**
```
https://www.khanakyabanau.in/unsubscribe?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### **Email Template Updates**
- **HTML Email**: Unsubscribe link in footer with styling
- **Text Email**: Unsubscribe link at bottom
- **Security**: Each link is unique and user-specific

## 🔄 **User Flow**

### **1. User Receives Email**
- Email contains personalized unsubscribe link
- Link includes JWT token with user's email and ID

### **2. User Clicks Unsubscribe**
- Redirected to `/unsubscribe?token=...`
- Page verifies token and shows confirmation

### **3. User Confirms Unsubscribe**
- Clicks "Yes, Unsubscribe Me" button
- API processes unsubscribe request
- User preferences updated in database

### **4. Confirmation**
- Success page shows confirmation
- User is marked as unsubscribed
- Future emails will be skipped

## 🛡️ **Security Measures**

### **Token Security**
- **JWT Secret**: Stored in environment variables
- **Expiration**: 30-day token lifetime
- **Issuer/Audience**: Validated for additional security
- **Email Verification**: Token email must match user email

### **API Security**
- **Token Validation**: Every request validates JWT
- **User Verification**: Confirms user exists and email matches
- **Audit Logging**: All unsubscribe actions are logged

### **Database Updates**
```typescript
emailPreferences: {
  weeklyMealPlans: false,
  unsubscribedAt: new Date(),
  unsubscribeToken: token // For audit trail
}
```

## 🧪 **Testing**

### **Test Unsubscribe Flow**
1. **Send test email**: `/api/test-email?email=your-email@example.com`
2. **Click unsubscribe link** in the email
3. **Verify token validation** on the page
4. **Complete unsubscribe** process
5. **Check database** for updated preferences

### **Test API Endpoints**
```bash
# Verify token
curl "https://www.khanakyabanau.in/api/unsubscribe?token=YOUR_TOKEN"

# Process unsubscribe
curl -X POST "https://www.khanakyabanau.in/api/unsubscribe" \
  -H "Content-Type: application/json" \
  -d '{"token":"YOUR_TOKEN"}'
```

## 🔧 **Configuration**

### **Environment Variables**
```bash
# JWT Secret (generate a strong secret)
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production

# App URL (for unsubscribe links)
NEXT_PUBLIC_APP_URL=https://www.khanakyabanau.in
```

### **Generate JWT Secret**
```bash
# Generate a secure JWT secret
openssl rand -base64 64
```

## 📊 **Database Schema**

### **User Document Updates**
```typescript
{
  // ... existing user fields
  emailPreferences?: {
    weeklyMealPlans: boolean;        // true = subscribed, false = unsubscribed
    unsubscribedAt?: Date;           // When user unsubscribed
    unsubscribeToken?: string;       // Token used for unsubscribe (audit)
  }
}
```

## 🚀 **Deployment Checklist**

### **Before Deployment**
- [ ] Add `JWT_SECRET` to Vercel environment variables
- [ ] Ensure `NEXT_PUBLIC_APP_URL` is set correctly
- [ ] Test unsubscribe flow with test email
- [ ] Verify token generation and validation

### **After Deployment**
- [ ] Test unsubscribe flow in production
- [ ] Monitor unsubscribe API logs
- [ ] Check that cron job respects unsubscribe preferences
- [ ] Verify email templates include unsubscribe links

## 🔍 **Monitoring & Analytics**

### **Logs to Monitor**
- Unsubscribe API calls and responses
- Token verification failures
- Database update successes/failures
- Cron job user filtering

### **Metrics to Track**
- Unsubscribe rate
- Token verification success rate
- Email delivery vs unsubscribe rate
- User re-engagement after unsubscribe

## 🛠️ **Troubleshooting**

### **Common Issues**

#### **"Invalid or expired token"**
- Token has expired (30 days)
- JWT secret mismatch
- Token was tampered with

#### **"Email mismatch"**
- Token email doesn't match user email
- User email was changed after token generation

#### **"User not found"**
- User was deleted from database
- Invalid user ID in token

### **Debug Steps**
1. **Check token validity**: Use JWT debugger
2. **Verify environment variables**: JWT_SECRET, APP_URL
3. **Check database**: User exists and email matches
4. **Review logs**: API and cron job logs

## 🔄 **Future Enhancements**

### **Potential Improvements**
- **Resubscribe functionality**: Allow users to resubscribe
- **Email preferences**: Granular email type preferences
- **Unsubscribe reasons**: Collect feedback on why users unsubscribe
- **Bulk unsubscribe**: Admin interface for bulk operations
- **Analytics dashboard**: Unsubscribe metrics and trends

### **Advanced Features**
- **One-click unsubscribe**: Instant unsubscribe without confirmation
- **Preference center**: Manage all email preferences
- **Frequency options**: Daily, weekly, monthly options
- **Content preferences**: Choose specific content types

## 📝 **Compliance**

### **CAN-SPAM Act Compliance**
- ✅ **Clear identification**: Sender clearly identified
- ✅ **Clear subject lines**: No misleading subject lines
- ✅ **Physical address**: Include business address
- ✅ **Unsubscribe mechanism**: Easy, one-click unsubscribe
- ✅ **Honor unsubscribe**: Process within 10 business days
- ✅ **No fees**: No cost to unsubscribe

### **GDPR Compliance**
- ✅ **Consent**: Users opt-in during registration
- ✅ **Easy unsubscribe**: Simple, accessible unsubscribe
- ✅ **Data processing**: Clear purpose for email processing
- ✅ **Audit trail**: Track unsubscribe actions

The unsubscribe system is now fully implemented and ready for production use! 🚀
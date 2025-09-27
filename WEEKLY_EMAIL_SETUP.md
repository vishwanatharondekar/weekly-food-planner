# Weekly Meal Plan Email Setup

This document explains how to set up the weekly meal plan email system using Amazon SES and Vercel Cron.

## Overview

The system automatically generates and sends weekly meal plans to users every Saturday at 6:00 AM UTC. It includes:

- **Cron Job**: Runs every Saturday at 6:00 AM UTC
- **AI Generation**: Uses Google Gemini to generate personalized meal plans
- **Email Delivery**: Sends beautiful HTML emails via Amazon SES
- **Data Storage**: Stores generated meal plans in Firebase

## Prerequisites

1. **Vercel Account** with Pro plan (required for cron jobs)
2. **Amazon SES Account** with verified domain/email
3. **Firebase Project** (already configured)
4. **Google AI API** (already configured)

## Amazon SES Setup

### 1. Create AWS Account and Access Keys

1. Go to [AWS Console](https://console.aws.amazon.com)
2. Create a new IAM user with SES permissions
3. Attach the `AmazonSESFullAccess` policy to the user
4. Create access keys for the user
5. Note down the `Access Key ID` and `Secret Access Key`

### 2. Verify Email Address or Domain

#### Option A: Verify Email Address (Easier for testing)
1. Go to [SES Console](https://console.aws.amazon.com/ses/)
2. Click "Verified identities" → "Create identity"
3. Select "Email address"
4. Enter your email (e.g., `noreply@yourdomain.com`)
5. Click "Create identity"
6. Check your email and click the verification link

#### Option B: Verify Domain (Recommended for production)
1. Go to [SES Console](https://console.aws.amazon.com/ses/)
2. Click "Verified identities" → "Create identity"
3. Select "Domain"
4. Enter your domain (e.g., `yourdomain.com`)
5. Follow the DNS verification steps
6. Add the required DNS records to your domain

### 3. Request Production Access (Important!)

By default, SES is in sandbox mode and can only send to verified email addresses.

1. Go to [SES Console](https://console.aws.amazon.com/ses/)
2. Click "Account dashboard"
3. Click "Request production access"
4. Fill out the form with:
   - **Mail type**: Transactional
   - **Website URL**: Your app URL
   - **Use case description**: "Sending weekly meal plan emails to registered users"
   - **Expected sending volume**: Estimate based on your user base
5. Submit the request (usually approved within 24-48 hours)

### 4. Choose AWS Region

SES is region-specific. Choose a region close to your users:
- **US East (N. Virginia)**: `us-east-1` (default)
- **US West (Oregon)**: `us-west-2`
- **Europe (Ireland)**: `eu-west-1`
- **Asia Pacific (Singapore)**: `ap-southeast-1`

## Environment Variables Setup

Add these environment variables to your Vercel project:

```bash
# Amazon SES Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key_id_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key_here
SES_FROM_EMAIL=noreply@yourdomain.com

# Cron Security (generate a random string)
CRON_SECRET=your_secure_random_string_here

# App URL (for email links)
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### Generate CRON_SECRET

```bash
# Generate a secure random string
openssl rand -base64 32
```

## Vercel Configuration

The cron job is already configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/weekly-meal-plans",
      "schedule": "0 6 * * 6"
    }
  ]
}
```

This runs every Saturday at 6:00 AM UTC.

### Cron Schedule Format

The schedule uses standard cron format: `minute hour day month weekday`

- `0 6 * * 6` = Every Saturday at 6:00 AM UTC
- `0 8 * * 1` = Every Monday at 8:00 AM UTC
- `0 9 * * 0` = Every Sunday at 9:00 AM UTC

## Testing the Setup

### 1. Test Email Sending

Create a test endpoint to verify SES configuration:

```typescript
// app/api/test-email/route.ts
import { sendEmail } from '@/lib/ses-service';

export async function GET() {
  const result = await sendEmail({
    to: 'your-email@example.com',
    subject: 'Test Email',
    htmlBody: '<h1>Test Email</h1><p>This is a test email from your meal planner.</p>',
    textBody: 'Test Email\n\nThis is a test email from your meal planner.'
  });
  
  return Response.json({ success: result });
}
```

### 2. Test Cron Job Manually

You can trigger the cron job manually by calling the endpoint:

```bash
curl -X GET "https://your-app.vercel.app/api/cron/weekly-meal-plans" \
  -H "Authorization: Bearer your_cron_secret_here"
```

### 3. Check Vercel Cron Logs

1. Go to your Vercel dashboard
2. Select your project
3. Go to "Functions" tab
4. Click on the cron function
5. View execution logs

## Email Template Customization

The email templates are in `lib/email-templates.ts`. You can customize:

- **HTML Template**: `generateMealPlanEmail()`
- **Text Template**: `generateMealPlanTextEmail()`
- **Styling**: CSS in the HTML template
- **Content**: Add your branding, links, etc.

## Monitoring and Troubleshooting

### 1. Check SES Sending Statistics

1. Go to [SES Console](https://console.aws.amazon.com/ses/)
2. Click "Sending statistics"
3. Monitor bounce rates, complaints, and delivery rates

### 2. Common Issues

#### "Email address not verified"
- Make sure the sender email is verified in SES
- Check that `SES_FROM_EMAIL` matches a verified email

#### "User is not authorized to perform ses:SendEmail"
- Check IAM permissions for the AWS user
- Ensure the user has `ses:SendEmail` permission

#### "Cron job not running"
- Verify Vercel Pro plan is active
- Check that `vercel.json` is properly configured
- Ensure the cron endpoint is accessible

#### "Rate limit exceeded"
- SES has sending limits (200 emails/day in sandbox, higher in production)
- Implement rate limiting in the cron job
- Consider sending emails in batches

### 3. Logs and Debugging

The cron function logs important information:

```typescript
console.log('Starting weekly meal plan generation...');
console.log(`Found ${usersSnapshot.docs.length} users to process`);
console.log(`Generated meal plan for user: ${userData.email}`);
console.log(`Weekly meal plan process completed. Processed: ${processed}`);
```

Check Vercel function logs for debugging information.

## Security Considerations

1. **Cron Secret**: Always use a strong, random `CRON_SECRET`
2. **AWS Credentials**: Store securely in Vercel environment variables
3. **Rate Limiting**: Implement to prevent abuse
4. **Error Handling**: Graceful failure for individual users
5. **Data Privacy**: Only send emails to users who opted in

## Cost Considerations

### Vercel
- **Cron Jobs**: Included in Pro plan ($20/month)
- **Function Execution**: 100GB-hours included

### Amazon SES
- **First 62,000 emails/month**: Free
- **After that**: $0.10 per 1,000 emails
- **Data transfer**: $0.09 per GB

### Example Monthly Costs
- 1,000 users = ~4,000 emails/month = **$0**
- 10,000 users = ~40,000 emails/month = **$0**
- 100,000 users = ~400,000 emails/month = **~$34**

## Next Steps

1. Set up Amazon SES account and verify email/domain
2. Add environment variables to Vercel
3. Deploy the updated code
4. Test the email functionality
5. Monitor the first few cron executions
6. Customize email templates as needed

The system will automatically start sending weekly meal plans to users who have completed onboarding!
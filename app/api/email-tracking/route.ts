import { NextRequest, NextResponse } from 'next/server';
import { analyticsServer } from '@/lib/analytics-server';

// Initialize analytics with server-side Mixpanel token
if (process.env.MIXPANEL_TOKEN) {
  analyticsServer.initServer(process.env.MIXPANEL_TOKEN);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const eventType = searchParams.get('event');
  const userId = searchParams.get('userId');
  const userEmail = searchParams.get('userEmail');
  const weekStartDate = searchParams.get('weekStartDate');
  const linkType = searchParams.get('linkType');
  const redirectUrl = searchParams.get('redirect');

  // Track the email event
  if (eventType && userId) {
    try {
      // Set user properties for better tracking
      if (userEmail) {
        analyticsServer.setUserProperties({
          user_id: userId,
          email: userEmail,
        });
      }

      // Track the event based on type
      switch (eventType) {
        case 'open':
          analyticsServer.trackEvent({
            action: 'email_open',
            category: 'email_engagement',
            label: 'weekly_meal_plan',
            custom_parameters: {
              user_id: userId,
              user_email: userEmail,
              week_start_date: weekStartDate,
              timestamp: new Date().toISOString(),
            }
          });
          break;

        case 'click':
          analyticsServer.trackEvent({
            action: 'email_click',
            category: 'email_engagement',
            label: linkType || 'unknown_link',
            value: 1,
            custom_parameters: {
              user_id: userId,
              user_email: userEmail,
              week_start_date: weekStartDate,
              link_type: linkType,
              redirect_url: redirectUrl,
              timestamp: new Date().toISOString(),
            }
          });
          break;

        default:
          console.log(`Unknown email tracking event: ${eventType}`);
      }
    } catch (error) {
      console.error('Error tracking email event:', error);
    }
  }

  // Handle different response types
  if (eventType === 'open') {
    // Return a 1x1 transparent pixel for email opens
    const pixel = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64'
    );
    
    return new NextResponse(pixel, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': pixel.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } else if (eventType === 'click' && redirectUrl) {
    // Redirect to the original URL for clicks
    return NextResponse.redirect(decodeURIComponent(redirectUrl));
  }

  // Default response
  return NextResponse.json({ status: 'tracked' }, { status: 200 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventType, userId, userEmail, weekStartDate, linkType, customData } = body;

    // Track the email event
    if (eventType && userId) {
      // Set user properties for better tracking
      if (userEmail) {
        analyticsServer.setUserProperties({
          user_id: userId,
          email: userEmail,
        });
      }

      // Track the event
      analyticsServer.trackEvent({
        action: `email_${eventType}`,
        category: 'email_engagement',
        label: linkType || 'weekly_meal_plan',
        custom_parameters: {
          user_id: userId,
          user_email: userEmail,
          week_start_date: weekStartDate,
          link_type: linkType,
          timestamp: new Date().toISOString(),
          ...customData,
        }
      });
    }

    return NextResponse.json({ status: 'tracked' }, { status: 200 });
  } catch (error) {
    console.error('Error tracking email event via POST:', error);
    return NextResponse.json({ error: 'Failed to track event' }, { status: 500 });
  }
}

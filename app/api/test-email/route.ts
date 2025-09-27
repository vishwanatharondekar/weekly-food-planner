import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/ses-service';
import { generateMealPlanEmail, generateMealPlanTextEmail } from '@/lib/email-templates';

export async function GET(request: NextRequest) {
  try {
    // Get test email from query parameter
    const { searchParams } = new URL(request.url);
    const testEmail = searchParams.get('email');
    
    if (!testEmail) {
      return NextResponse.json(
        { error: 'Please provide an email parameter: /api/test-email?email=your-email@example.com' },
        { status: 400 }
      );
    }

    // Create sample meal plan data for testing
    const sampleMealPlan = {
      userName: 'Test User',
      weekStartDate: '2024-01-15',
      userEmail: testEmail,
      userId: 'aEOsnQC5nJYafVCCMw1C',
      meals: {
        monday: {
          breakfast: 'Oatmeal with berries',
          morningSnack: 'Apple slices',
          lunch: 'Grilled chicken salad',
          eveningSnack: 'Greek yogurt',
          dinner: 'Vegetable stir-fry'
        },
        tuesday: {
          breakfast: 'Scrambled eggs with toast',
          morningSnack: 'Banana',
          lunch: 'Quinoa bowl with vegetables',
          eveningSnack: 'Mixed nuts',
          dinner: 'Baked salmon with rice'
        },
        wednesday: {
          breakfast: 'Smoothie bowl',
          morningSnack: 'Orange slices',
          lunch: 'Turkey wrap',
          eveningSnack: 'Cheese and crackers',
          dinner: 'Pasta with marinara sauce'
        },
        thursday: {
          breakfast: 'Pancakes with syrup',
          morningSnack: 'Grapes',
          lunch: 'Caesar salad',
          eveningSnack: 'Trail mix',
          dinner: 'Grilled chicken with vegetables'
        },
        friday: {
          breakfast: 'Avocado toast',
          morningSnack: 'Pear',
          lunch: 'Sushi bowl',
          eveningSnack: 'Dark chocolate',
          dinner: 'Pizza night'
        },
        saturday: {
          breakfast: 'French toast',
          morningSnack: 'Strawberries',
          lunch: 'Burger and fries',
          eveningSnack: 'Popcorn',
          dinner: 'BBQ ribs with coleslaw'
        },
        sunday: {
          breakfast: 'Waffles with fruit',
          morningSnack: 'Mango',
          lunch: 'Roast beef sandwich',
          eveningSnack: 'Ice cream',
          dinner: 'Family dinner - lasagna'
        }
      },
      mealSettings: {
        enabledMealTypes: ['breakfast', 'morningSnack', 'lunch', 'eveningSnack', 'dinner']
      }
    };

    // Generate email content
    const htmlBody = generateMealPlanEmail(sampleMealPlan);
    const textBody = generateMealPlanTextEmail(sampleMealPlan);

    // Send test email
    const result = await sendEmail({
      to: testEmail,
      subject: '🍽️ Test Email - Your Weekly Meal Plan',
      htmlBody,
      textBody
    });

    if (result) {
      return NextResponse.json({
        success: true,
        message: `Test email sent successfully to ${testEmail}`,
        note: 'Check your inbox and spam folder'
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Failed to send test email',
        error: 'Check your SES configuration and logs'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Test email error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to send test email',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
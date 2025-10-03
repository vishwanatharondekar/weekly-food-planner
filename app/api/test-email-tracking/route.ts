import { NextRequest, NextResponse } from 'next/server';
import { generateMealPlanEmail, generateMealPlanTextEmail } from '@/lib/email-templates';

export async function GET(request: NextRequest) {
  try {
    // Sample data for testing
    const testEmailData = {
      userName: 'Test User',
      weekStartDate: '2024-01-01',
      userEmail: 'test@example.com',
      userId: 'test-user-123',
      meals: {
        monday: {
          breakfast: 'Oatmeal with fruits',
          lunch: 'Grilled chicken salad',
          dinner: 'Pasta with vegetables'
        },
        tuesday: {
          breakfast: 'Toast with avocado',
          lunch: 'Quinoa bowl',
          dinner: 'Fish curry with rice'
        },
        wednesday: {
          breakfast: 'Smoothie bowl',
          lunch: 'Lentil soup',
          dinner: 'Stir-fried vegetables'
        },
        thursday: {
          breakfast: 'Pancakes',
          lunch: 'Chicken wrap',
          dinner: 'Beef stew'
        },
        friday: {
          breakfast: 'Yogurt parfait',
          lunch: 'Salad bowl',
          dinner: 'Pizza'
        },
        saturday: {
          breakfast: 'French toast',
          lunch: 'Burger',
          dinner: 'Grilled salmon'
        },
        sunday: {
          breakfast: 'Eggs Benedict',
          lunch: 'Pasta salad',
          dinner: 'Roast chicken'
        }
      },
      mealSettings: {
        enabledMealTypes: ['breakfast', 'lunch', 'dinner']
      }
    };

    const htmlEmail = generateMealPlanEmail(testEmailData);
    const textEmail = generateMealPlanTextEmail(testEmailData);

    // Return HTML email for preview
    return new NextResponse(htmlEmail, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error) {
    console.error('Error generating test email:', error);
    return NextResponse.json({ error: 'Failed to generate test email' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { format } = await request.json();
    
    // Sample data for testing
    const testEmailData = {
      userName: 'Test User',
      weekStartDate: '2024-01-01',
      userEmail: 'test@example.com',
      userId: 'test-user-123',
      meals: {
        monday: {
          breakfast: 'Oatmeal with fruits',
          lunch: 'Grilled chicken salad',
          dinner: 'Pasta with vegetables'
        },
        tuesday: {
          breakfast: 'Toast with avocado',
          lunch: 'Quinoa bowl',
          dinner: 'Fish curry with rice'
        },
        wednesday: {
          breakfast: 'Smoothie bowl',
          lunch: 'Lentil soup',
          dinner: 'Stir-fried vegetables'
        },
        thursday: {
          breakfast: 'Pancakes',
          lunch: 'Chicken wrap',
          dinner: 'Beef stew'
        },
        friday: {
          breakfast: 'Yogurt parfait',
          lunch: 'Salad bowl',
          dinner: 'Pizza'
        },
        saturday: {
          breakfast: 'French toast',
          lunch: 'Burger',
          dinner: 'Grilled salmon'
        },
        sunday: {
          breakfast: 'Eggs Benedict',
          lunch: 'Pasta salad',
          dinner: 'Roast chicken'
        }
      },
      mealSettings: {
        enabledMealTypes: ['breakfast', 'lunch', 'dinner']
      }
    };

    if (format === 'text') {
      const textEmail = generateMealPlanTextEmail(testEmailData);
      return NextResponse.json({ 
        format: 'text',
        content: textEmail 
      });
    } else {
      const htmlEmail = generateMealPlanEmail(testEmailData);
      return NextResponse.json({ 
        format: 'html',
        content: htmlEmail 
      });
    }
  } catch (error) {
    console.error('Error generating test email:', error);
    return NextResponse.json({ error: 'Failed to generate test email' }, { status: 500 });
  }
}

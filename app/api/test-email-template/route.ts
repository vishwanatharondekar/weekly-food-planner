import { NextRequest, NextResponse } from 'next/server';
import { generateMealPlanEmail } from '@/lib/email-templates';

export async function GET(request: NextRequest) {
  // Sample data for testing
  const sampleData = {
    userName: 'John Doe',
    weekStartDate: '2024-01-15',
    userEmail: 'john.doe@example.com',
    userId: 'test-user-123',
    mealSettings: {
      enabledMealTypes: ['breakfast', 'morningSnack', 'lunch', 'eveningSnack', 'dinner']
    },
    meals: {
      monday: {
        breakfast: 'Oatmeal with berries and honey',
        morningSnack: 'Greek yogurt with almonds',
        lunch: 'Grilled chicken salad with mixed greens',
        eveningSnack: 'Apple slices with peanut butter',
        dinner: 'Baked salmon with roasted vegetables'
      },
      tuesday: {
        breakfast: 'Avocado toast with poached egg',
        morningSnack: 'Mixed nuts and dried fruit',
        lunch: 'Quinoa bowl with chickpeas and tahini',
        eveningSnack: 'Carrot sticks with hummus',
        dinner: 'Turkey meatballs with spaghetti squash'
      },
      wednesday: {
        breakfast: 'Smoothie bowl with granola',
        morningSnack: 'Hard-boiled eggs',
        lunch: 'Lentil soup with whole grain bread',
        eveningSnack: 'Cottage cheese with berries',
        dinner: 'Grilled shrimp with brown rice'
      },
      thursday: {
        breakfast: 'Chia pudding with mango',
        morningSnack: 'Trail mix',
        lunch: 'Caesar salad with grilled chicken',
        eveningSnack: 'Celery with almond butter',
        dinner: 'Beef stir-fry with vegetables'
      },
      friday: {
        breakfast: 'Pancakes with maple syrup',
        morningSnack: 'Protein shake',
        lunch: 'Tuna salad wrap',
        eveningSnack: 'Dark chocolate squares',
        dinner: 'Pizza with a side salad'
      },
      saturday: {
        breakfast: 'French toast with berries',
        morningSnack: 'Fresh fruit salad',
        lunch: 'BBQ pulled pork sandwich',
        eveningSnack: 'Cheese and crackers',
        dinner: 'Grilled steak with sweet potato'
      },
      sunday: {
        breakfast: 'Eggs Benedict',
        morningSnack: 'Smoothie',
        lunch: 'Roast chicken with vegetables',
        eveningSnack: 'Popcorn',
        dinner: 'Pasta with marinara sauce'
      }
    }
  };

  const emailHtml = generateMealPlanEmail(sampleData);

  return new NextResponse(emailHtml, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
}


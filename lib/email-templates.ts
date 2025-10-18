import { format, addDays } from 'date-fns';
import { generateUnsubscribeUrl } from './jwt-utils';
import { generateEmailTrackingUrls, createEmailTrackingData } from './email-tracking-utils';

export interface MealPlanEmailData {
  userName: string;
  weekStartDate: string;
  userEmail: string;
  userId: string;
  meals: {
    [day: string]: {
      [mealType: string]: string | { name: string, calories: number };
    };
  };
  mealSettings?: {
    enabledMealTypes: string[];
  };
}

export function generateMealPlanEmail({ userName, weekStartDate, userEmail, userId, meals, mealSettings }: MealPlanEmailData): string {
  const weekStart = new Date(weekStartDate);
  const enabledMeals = mealSettings?.enabledMealTypes || ['breakfast', 'lunch', 'dinner'];
  
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  const mealTypeLabels: { [key: string]: string } = {
    breakfast: 'Breakfast',
    morningSnack: 'Morning Snack',
    lunch: 'Lunch',
    eveningSnack: 'Evening Snack',
    dinner: 'Dinner'
  };

  // Helper function to get meal type pill colors (matching mobile layout)
  const getMealTypePillClasses = (mealType: string) => {
    const colorMap: { [key: string]: string } = {
      'breakfast': 'background-color: #fef3c7; color: #92400e;', // amber-100 text-amber-700
      'lunch': 'background-color: #dcfce7; color: #166534;', // green-100 text-green-700
      'dinner': 'background-color: #dbeafe; color: #1e40af;', // blue-100 text-blue-700
      'snack': 'background-color: #f3e8ff; color: #7c2d12;', // purple-100 text-purple-700
      'morningSnack': 'background-color: #f3e8ff; color: #7c2d12;', // purple-100 text-purple-700
      'eveningSnack': 'background-color: #fce7f3; color: #be185d;', // pink-100 text-pink-700
    };
    return colorMap[mealType] || 'background-color: #f3f4f6; color: #374151;'; // gray-100 text-gray-700
  };

  const weekRange = `${format(weekStart, 'MMM d')} - ${format(addDays(weekStart, 6), 'MMM d, yyyy')}`;
  const unsubscribeUrl = generateUnsubscribeUrl(userEmail, userId);
  
  // Generate tracking URLs
  const trackingData = createEmailTrackingData(userId, userEmail, weekStartDate);
  const trackingUrls = generateEmailTrackingUrls(trackingData);
  
  // Generate plan URL for the specific week
  const planUrl = `https://www.khanakyabanau.in/plan/${weekStartDate}`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Weekly Meal Plan - ${weekRange}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 12px; padding: 12px;">
    <div style="background-color: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="text-align: center; padding-bottom: 15px; border-bottom: 2px solid #e9ecef;">
            <h1 style="color: #2c3e50; margin: 0 0 8px 0; font-size: 28px;">🍽️ Your Weekly Meal Plan</h1>
            <p style="color: #6c757d; margin: 0 0 12px 0; font-size: 16px;">Hello ${userName}! Here's your personalized meal plan for the week.</p>
            <p style="margin: 0; font-size: 12px; color: #6c757d; font-style: italic;">
            💡 Click the edit buttons to customize your meals
            </p>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
            <h2 style="margin: 0 0 5px 0; color: #495057; font-size: 20px;">Week of ${weekRange}</h2>
            <p style="margin: 0; color: #6c757d; font-size: 14px;">Don't like the suggestions? Edit to fill manually or generate with AI again by editing your liked dishes</p>
            <p style="margin: 0 0 8px 0; font-size: 14px;">
                <a href="${trackingUrls.mainAppLink}&week=${weekStartDate}" style="color: #007bff; text-decoration: none; font-weight: 500;">🔗 Open Meal Plan</a>
            </p>
        </div>
        
        <!-- Mobile-style card layout -->
        <div style="margin-bottom: 20px;">
            ${days.map((day, index) => {
              const dayMeals = meals[day] || {};
              const dayDate = new Date(weekStart);
              dayDate.setDate(dayDate.getDate() + index);
              const isToday = new Date().toDateString() === dayDate.toDateString();
              const isLastDay = index === days.length - 1;
              
              return `
                <div style="margin-bottom: ${isLastDay ? '0' : '16px'}; background-color: white; border-radius: 8px; border: 1px solid #e5e7eb; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
                    <!-- Day header -->
                    <div style="background-color: ${isToday ? '#3b82f6' : '#f9fafb'}; color: ${isToday ? 'white' : '#374151'}; padding: 12px 16px; font-weight: 600; font-size: 16px; border-bottom: 1px solid #e5e7eb;">
                        ${dayNames[index]}${isToday ? ' (Today)' : ''}
                    </div>
                    
                    <!-- Meals list -->
                    <div>
                        ${enabledMeals.map((mealType, mealIndex) => {
                          const mealData = dayMeals[mealType];
                          console.log('mealData', mealData);
                          const mealName = mealData instanceof Object ? mealData.name : mealData;
                          const mealCalories = mealData instanceof Object ? mealData.calories : null;
                          const isLastMeal = mealIndex === enabledMeals.length - 1;
                          const hasText = mealName && mealName.trim().length > 0;
                          
                          return `
                            <div style="padding: 12px 16px; ${!isLastMeal ? 'border-bottom: 1px solid #f3f4f6;' : ''}">
                                <!-- Meal type and calorie pills -->
                                <div style="margin-bottom: 8px;">
                                    <div style="display: inline-flex; align-items: center; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; margin-right: 8px; ${getMealTypePillClasses(mealType)}">
                                        ${mealTypeLabels[mealType] || mealType}
                                    </div>
                                    ${mealCalories ? `<span style="background-color: #fed7aa; color: #ea580c; font-size: 12px; font-weight: 500; padding: 2px 8px; border-radius: 4px; border: 1px solid #fdba74;">${mealCalories} kcal</span>` : ''}
                                </div>
                                
                                <!-- Meal name with edit button using table for better email support -->
                                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                    <tr>
                                        <td style="vertical-align: top; padding: 0;">
                                            <div style="color: ${hasText ? '#111827' : '#6b7280'}; font-size: 16px; line-height: 1.5; ${!hasText ? 'font-style: italic;' : ''}">
                                                ${mealName || 'Not planned yet'}
                                            </div>
                                        </td>
                                        <td style="vertical-align: top; padding: 0; text-align: right; width: 40px;">
                                            <a href="${planUrl}?day=${day}&mealType=${mealType}" style="display: inline-block; width: 32px; height: 32px; border-radius: 6px; background-color: #f3f4f6; color: #6b7280; text-decoration: none; text-align: center; line-height: 32px; font-size: 16px;" title="Edit meal">
                                                ✏️
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                            </div>
                          `;
                        }).join('')}
                    </div>
                </div>
              `;
            }).join('')}
        </div>
        
        <div style="text-align: center; padding-top: 16px; border-top: 1px solid #e9ecef; color: #6c757d; font-size: 14px;">
            <p style="margin: 0 0 8px 0;">
                <strong>Happy cooking! 🧑‍🍳</strong><br>
                This meal plan was generated by your personal AI assistant.
            </p>
            <p style="margin: 0 0 12px 0;">
                <a href="${trackingUrls.footerAppLink}" style="color: #007bff; text-decoration: none;">Visit your meal planner</a> 
                to make changes or generate new plans.
            </p>
            <div style="border-top: 1px solid #e9ecef; padding-top: 12px; margin-top: 12px;">
                <p style="margin: 0 0 10px 0; font-size: 12px; color: #6c757d;">
                    Don't want to receive these emails anymore?
                </p>
                <a href="${unsubscribeUrl}" style="color: #dc3545; text-decoration: none; font-size: 12px;">
                    Unsubscribe from weekly meal plans
                </a>
            </div>
        </div>
    </div>
    <!-- Email tracking pixel -->
    <img src="${trackingUrls.trackingPixel}" alt="" width="1" height="1" style="display: none; visibility: hidden; opacity: 0;" />
</body>
</html>
  `;
}

export function generateMealPlanTextEmail({ userName, weekStartDate, userEmail, userId, meals, mealSettings }: MealPlanEmailData): string {
  const weekStart = new Date(weekStartDate);
  const enabledMeals = mealSettings?.enabledMealTypes || ['breakfast', 'lunch', 'dinner'];
  
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  const mealTypeLabels: { [key: string]: string } = {
    breakfast: 'Breakfast',
    morningSnack: 'Morning Snack',
    lunch: 'Lunch',
    eveningSnack: 'Evening Snack',
    dinner: 'Dinner'
  };

  const weekRange = `${format(weekStart, 'MMM d')} - ${format(addDays(weekStart, 6), 'MMM d, yyyy')}`;
  const unsubscribeUrl = generateUnsubscribeUrl(userEmail, userId);
  
  // Generate tracking URLs
  const trackingData = createEmailTrackingData(userId, userEmail, weekStartDate);
  const trackingUrls = generateEmailTrackingUrls(trackingData);

  let text = `🍽️ Your Weekly Meal Plan\n\n`;
  text += `Hello ${userName}!\n`;
  text += `Here's your personalized meal plan for the week of ${weekRange}.\n\n`;
  text += `🔗 Open Meal Planner App: ${trackingUrls.mainAppLink}\n\n`;
  text += `Plan your grocery shopping and meal prep with confidence!\n\n`;

  days.forEach((day, index) => {
    const dayMeals = meals[day] || {};
    text += `${dayNames[index]}:\n`;
    text += `${'='.repeat(dayNames[index].length)}\n`;
    
    enabledMeals.forEach(mealType => {
      const mealName = dayMeals[mealType];
      const label = mealTypeLabels[mealType] || mealType;
      text += `${label}: ${mealName || 'Not planned yet'}\n`;
    });
    
    text += '\n';
  });

  text += `Happy cooking! 🧑‍🍳\n\n`;
  text += `This meal plan was generated by your personal AI assistant.\n`;
  text += `Visit your meal planner to make changes or generate new plans.\n`;
  text += `${trackingUrls.footerAppLink}\n\n`;
  text += `---\n`;
  text += `Don't want to receive these emails anymore?\n`;
  text += `Unsubscribe: ${unsubscribeUrl}\n`;

  return text;
}
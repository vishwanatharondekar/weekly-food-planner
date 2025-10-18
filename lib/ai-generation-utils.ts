import { GoogleGenerativeAI } from '@google/generative-ai';
import { INDIAN_CUISINES, getDishesForCuisines } from '@/lib/cuisine-data';

// Initialize Google AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export function getDietaryInfo(dietaryPreferences: any) {
  if (!dietaryPreferences) {
    return 'No specific dietary preferences';
  }

  let returnString = `Dietary Preferences: `;
  
  if (dietaryPreferences.isVegetarian) {
    returnString += `The user is strictly vegetarian. Never suggest non-vegetarian meals.
Exclude any dish with meat, fish, or eggs. 
If uncertain, default to a vegetarian option.`;
  } else {
    returnString += dietaryPreferences.nonVegDays ? `Non-vegetarian, User can eat non veg only on the days: ${dietaryPreferences.nonVegDays?.join(', ')}. Exclude any dish with meat, fish, or eggs on other days.` : `Non-vegetarian, User can eat non veg on any day. Have a mix of vegetarian and non-vegetarian meals.`;
  }

  // Add calorie information if enabled
  if (dietaryPreferences.showCalories) {
    returnString += `\n\nCalorie Tracking: ENABLED`;
    if (dietaryPreferences.dailyCalorieTarget && dietaryPreferences.dailyCalorieTarget > 0) {
      returnString += `\nDaily Calorie Target: ${dietaryPreferences.dailyCalorieTarget} kcal`;
      returnString += `\nPlease suggest meals that help stay within this daily calorie target.`;
    }
  }

  return returnString;
}

export function getJsonFormat(mealSettings?: { enabledMealTypes: string[] }, showCalories?: boolean) {
  // Default to all meal types if no settings provided (backward compatibility)
  const enabledMeals = mealSettings?.enabledMealTypes || ['breakfast', 'lunch', 'dinner'];
  
  // Create meal entries for each enabled meal type
  const mealEntries = showCalories 
    ? enabledMeals.map(mealType => `"${mealType}": { "name": "meal name", "calories": 500 }`).join(', ')
    : enabledMeals.map(mealType => `"${mealType}": "meal name"`).join(', ');
  
  // Create the JSON structure for each day
  const dayStructure = `{ ${mealEntries} }`;
  
  // Create the full JSON format with all days
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const dayEntries = days.map(day => `"${day}": ${dayStructure}`).join(',\n            ');
  
  return `{
            ${dayEntries}
          }`;
}

export function isWeekEmpty(meals: any, enabledMeals: string[]) {
  return !Object.keys(meals).every(day => isDayEmpty(meals?.[day], enabledMeals));
}

export function isDayEmpty(meals: any, enabledMeals: string[]) {
  return enabledMeals.every(mealType => !meals?.[mealType]?.name);
}

export async function generateAISuggestions(
  history: any[], 
  weekStartDate: string, 
  dietaryPreferences?: any, 
  cuisinePreferences: string[] = [], 
  dishPreferences: { breakfast: string[], lunch_dinner: string[] } = { breakfast: [], lunch_dinner: [] }, 
  ingredients: string[] = [], 
  mealSettings?: { enabledMealTypes: string[] }
) {
  // Prepare history for AI
  const enabledMeals = mealSettings?.enabledMealTypes || ['breakfast', 'lunch', 'dinner'];
  const historyText = history.length > 0 ? history
  .filter((plan: any) => isWeekEmpty(plan.meals, enabledMeals))
  .slice(0, 2)
  .map(plan => {
    const meals = plan.meals;
    const weekInfo = `Week of ${plan.weekStartDate}:\n`;
    const mealsText = Object.entries(meals)
                        .filter(([day, dayMeals]: [string, any]) => !isDayEmpty(dayMeals, enabledMeals))
                        .map(([day, dayMeals]: [string, any]) => {
                          const mealNames = enabledMeals.map(mealType => dayMeals?.[mealType]?.name || 'empty').join(' / ');
                          return `  ${day}: ${mealNames}`;
                        }).join('\n');
    return weekInfo + mealsText;
  }).join('\n\n') : 'No previous meal history available.';

  // Prepare dietary preferences
  const dietaryInfo = getDietaryInfo(dietaryPreferences);

  // Prepare ingredients information
  const ingredientsInfo = ingredients.length > 0 ? 
    `Must use all of the following ingredients in at least one dish: ${ingredients.join(', ')}` :
    '';

  // Prepare cuisine preferences and get available dishes
  let cuisineInfo = 'No specific cuisine preferences';
  let availableDishes = '';
  
  // Get JSON format for the prompt (needed regardless of cuisine/dish preferences)
  const showCalories = dietaryPreferences?.showCalories || false;
  const jsonFormat = getJsonFormat(mealSettings, showCalories);
  
  // Check if user has specific dish preferences (from onboarding)
  const hasDishPreferences = dishPreferences.breakfast.length > 0 && dishPreferences.lunch_dinner.length > 0;
  
  if (hasDishPreferences) {
    // Use user's specific dish preferences from onboarding
    cuisineInfo = `Include authentic dishes from: ${cuisinePreferences.join(', ')} cuisine`;
    availableDishes = `User likes following dishes:
      Breakfast: ${dishPreferences.breakfast.join(', ')}
      Lunch/Dinner: ${dishPreferences.lunch_dinner.join(', ')}`;
  }

  const calorieInstructions = showCalories 
    ? `\n\nIMPORTANT - Calorie Information:
- Include calorie count for EACH meal in the response
- Provide realistic calorie estimates based on typical portion sizes
- Format: { "name": "meal name", "calories": number }
${dietaryPreferences?.dailyCalorieTarget ? `- Try to keep total daily calories around ${dietaryPreferences.dailyCalorieTarget} kcal` : ''}`
    : '';

  const prompt = `Based on the following meal history, dietary preferences, available ingredients, and preferences, suggest meals for the week of ${weekStartDate}.
${dietaryInfo}
${ingredientsInfo}
${cuisineInfo}
${availableDishes}

Meal History:
${historyText}

Please suggest meals for each day (${enabledMeals.join(', ')}) that are:
${history.length > 0 ? '1. Similar to the users meal history but do not repeat the same meals' : '1. Similar to the their dish preferences but do not repeat the same meals'}
2. Respect their dietary restrictions
3. ${ingredients.length > 0 ? 'Use the ingredients listed above for some dishes' : 'Use common ingredients that are easily available'}
4. ${cuisinePreferences.length > 0 ? `Focus on ${cuisinePreferences.join(', ')} cuisine` : 'Use any appropriate cuisine'}
5. Easy to prepare
6. Include authentic dishes from: ${cuisinePreferences.join(', ')}
7. Use the dishes provided above as reference for selecting other dishes
8. Do not repeat the suggestions. Provide new suggestions for each day.
9. Do not suggest the options which are present in the meal history provided above.
${calorieInstructions}

Return the suggestions in this exact JSON format:
${jsonFormat}`;

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();

  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Invalid AI response format - no JSON found in response');
  }

  const suggestions = JSON.parse(jsonMatch[0]);
  return suggestions;
}

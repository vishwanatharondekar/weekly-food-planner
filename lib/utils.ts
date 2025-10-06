import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, startOfWeek, addWeeks, subWeeks } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function getWeekStartDate(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 }); // Monday as start of week
}

export function getNextWeekStartDate(date: Date): Date {
  // If the given date is Saturday (6) or Sunday (0), return next week's Monday
  const day = date.getDay();
  // Move to next Monday
  const nextMonday = new Date(date);
  // Calculate days to add: (8 - day) % 7
  const daysToAdd = (8 - day) % 7;
  nextMonday.setDate(date.getDate() + daysToAdd);
  return startOfWeek(nextMonday, { weekStartsOn: 1 });
}

export function getWeekDays(startDate: Date): Date[] {
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(startDate);
    day.setDate(startDate.getDate() + i);
    days.push(day);
  }
  return days;
}

// Debounce utility function
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
// All possible meal types
export const ALL_MEAL_TYPES = ['breakfast', 'morningSnack', 'lunch', 'eveningSnack', 'dinner'];

// Default enabled meal types (maintaining backward compatibility)
export const MEAL_TYPES = ['breakfast', 'morningSnack', 'lunch', 'eveningSnack', 'dinner'];

export interface MealSettings {
  enabledMealTypes: string[];
  dailyCalorieTarget?: number;
}

export const DEFAULT_MEAL_SETTINGS: MealSettings = {
  enabledMealTypes: ['breakfast', 'lunch', 'dinner'], // Default to basic 3 meals
  dailyCalorieTarget: 2000 // Default daily calorie target
};

export function getMealDisplayName(mealType: string): string {
  switch (mealType) {
    case 'morningSnack':
      return 'Morning Snack';
    case 'eveningSnack':
      return 'Evening Snack';
    default:
      return mealType.charAt(0).toUpperCase() + mealType.slice(1);
  }
}

export function getMealPlaceholder(mealType: string): string {
  switch (mealType) {
    case 'morningSnack':
      return 'morning snack';
    case 'eveningSnack':
      return 'evening snack';
    default:
      return mealType;
  }
}

// Utility function to ensure meal types are in correct chronological order
export function sortMealTypes(mealTypes: string[]): string[] {
  return ALL_MEAL_TYPES.filter(type => mealTypes.includes(type));
} 

export interface MealData {
  [day: string]: {
    [mealType: string]: string;
  };
}

export interface MealDataWithVideos {
  [day: string]: {
    [mealType: string]: {
      name: string;
      videoUrl?: string;
    };
  };
}

/**
 * Validates if an email address is valid and not from known invalid patterns
 * @param email The email address to validate
 * @returns true if email is valid and should receive emails, false otherwise
 */
export function isValidEmailForSending(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return false;
  }

  // Convert to lowercase for consistent checking
  const lowerEmail = email.toLowerCase().trim();

  // Known invalid email patterns to skip
  const invalidPatterns = [
    // Test emails
    /^test@/,
    /^testing@/,
    /^demo@/,
    /^example@/,
    /^sample@/,
    /@test\./,
    /@testing\./,
    /@example\./,
    /@sample\./,
    
    // Temporary/disposable email domains
    /@10minutemail\./,
    /@guerrillamail\./,
    /@mailinator\./,
    /@tempmail\./,
    /@throwaway\./,
    /@disposable\./,
    /@temp-mail\./,
    /@fakeinbox\./,
    /@yopmail\./,
    /@maildrop\./,
    
    // Invalid/placeholder domains
    /@invalid\./,
    /@placeholder\./,
    /@fake\./,
    /@dummy\./,
    /@localhost$/,
    /@127\.0\.0\.1$/,
    
    // Common typos in popular domains
    /@gmial\./,
    /@gmai\./,
    /@yahooo\./,
    /@hotmial\./,
    /@outlok\./,
    
    // No-reply and system emails
    /^noreply@/,
    /^no-reply@/,
    /^donotreply@/,
    /^do-not-reply@/,
    /^system@/,
    /^admin@.*\.local$/,
    /^root@.*\.local$/,
  ];

  // Check against invalid patterns
  for (const pattern of invalidPatterns) {
    if (pattern.test(lowerEmail)) {
      return false;
    }
  }

  // Additional checks for obviously fake emails
  if (
    lowerEmail.includes('asdf') ||
    lowerEmail.includes('qwerty') ||
    lowerEmail.includes('123456') ||
    lowerEmail.includes('abcdef') ||
    lowerEmail.match(/^[a-z]\@/) || // Single character before @
    lowerEmail.match(/\@[a-z]\./) // Single character domain
  ) {
    return false;
  }

  return true;
} 
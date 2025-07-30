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
}

export const DEFAULT_MEAL_SETTINGS: MealSettings = {
  enabledMealTypes: ['breakfast', 'lunch', 'dinner'] // Default to basic 3 meals
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
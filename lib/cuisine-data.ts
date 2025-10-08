export interface CuisineDishes {
  breakfast: string[];
  lunch_dinner: string[];
  snacks: string[];
}

// Internal interface for separating veg and non-veg dishes
interface InternalCuisineDishes {
  breakfast: string[];
  lunch_dinner_veg: string[];
  lunch_dinner_non_veg: string[];
  snacks: string[];
}

export interface Cuisine {
  name: string;
  dishes: CuisineDishes;
}

// Internal data with veg/non-veg separation
const INTERNAL_CUISINE_DATA: { name: string; dishes: InternalCuisineDishes }[] = [
  {
    name: "Maharashtrian",
    dishes: {
      breakfast: ["Poha", "Sabudana Khichdi", "Thalipeeth", "Misal Pav", "Upma", "Idli Sambaar", "Sandwich"],
      lunch_dinner_veg: ["Puran Poli", "Varan-Bhaat", "Zunka-Bhakar", "Bharli Vangi", "Pav Bhaji"],
      lunch_dinner_non_veg: ["Kolhapuri Chicken", "Malvani Fish Curry"],
      snacks: ["Vada Pav", "Bhakarwadi", "Kothimbir Vadi"]
    }
  },
  {
    name: "North Indian",
    dishes: {
      breakfast: [ "Aloo Puri", "Aloo Paratha", "Sattu Paratha", "Sabudana Khichdi", "Dahi Chura", "Suji Halwa", "Besan Chilla", "Moong Dal Chilla"],
      lunch_dinner_veg: ["Chole Bhature",  "Dal Baati, Churma",  "Litti Chokha", "Dal Makhani", "Palak Paneer", "Chana Masala", "Rajma", "Chhole", "Ker Sangri", "Dum Aloo", "Vegetable Curry", "Paneer Bhurji"],
      lunch_dinner_non_veg: ["Butter Chicken", "Tandoori Chicken", "Rogan Josh", "Laal Maas", "Chicken Curry", "Fish Curry"],
      snacks: ["Samosa", "Pakora", "Kachori", "Jalebi", "Gulab Jamun", "Rasgulla", "Ghewar", "Mawa Kachori", "Kashmiri Samosa", "Nadru Monje", "Kashmiri Tea", "Sheer Chai", "Singodi", "Bal Mithai", "Arsa", "Jhangora Ki Kheer", "Patande", "Aktori", "Chaat"]
    }
  },
  {
    name: "South Indian",
    dishes: {
      breakfast: ["Pongal", "Appam", "Puttu", "Idiyappam", "Rava Idli", "Rava Dosa"],
      lunch_dinner_veg: ["Sambar Rice", "Rasam Rice", "Coconut Rice", "Vegetable Curry", "Sambar", "Rasam", "Bisi Bele Bath", "Ragi Mudde"],
      lunch_dinner_non_veg: ["Fish Curry", "Chicken Curry", "Prawn Curry"],
      snacks: ["Vada", "Bonda", "Bajji", "Murukku", "Laddu", "Payasam", "Banana Chips", "Kozhukatta", "Unniyappam", "Achappam", "Mysore Pak", "Bebinca", "Dodol", "Coconut Ladoo"]
    }
  },
  {
    name: "Gujarati",
    dishes: {
      breakfast: ["Dhokla", "Thepla", "Fafda", "Khandvi", "Handvo", "Idli Sambaar", "Poha"],
      lunch_dinner_veg: ["Dal Dhokli", "Undhiyu", "Kadhi", "Sabzi", "Gujarati Thali", "Sev Tameta", "Vagharela Bhaat", "Pulaav"],
      lunch_dinner_non_veg: [],
      snacks: ["Fafda", "Gathiya", "Chakri", "Mathiya", "Gujarati Samosa", "Ragda Petis"]
    }
  },
  {
    name: "Bengali",
    dishes: {
      breakfast: ["Luchi", "Aloo Dum", "Puri", "Kochuri", "Poha"],
      lunch_dinner_veg: ["Dal", "Rice", "Vegetable Curry"],
      lunch_dinner_non_veg: ["Fish Curry", "Chicken Curry", "Biryani", "Mutton Curry"],
      snacks: ["Singara", "Jhal Muri", "Tele Bhaja", "Rasgulla", "Sandesh", "Mishti Doi", "Ragda Petis"]
    }
  },
  {
    name: "Assamese",
    dishes: {
      breakfast: ["Pitha", "Luchi", "Aloo Pitika", "Khar", "Til Pitha"],
      lunch_dinner_veg: ["Dal", "Rice"],
      lunch_dinner_non_veg: ["Fish Curry", "Chicken Curry", "Biryani", "Masor Tenga"],
      snacks: ["Pitha", "Laddu", "Narikol Pitha", "Til Pitha", "Ghila Pitha"]
    }
  },
  {
    name: "Odisha",
    dishes: {
      breakfast: ["Pakhala", "Chuda", "Pitha", "Upma", "Poha"],
      lunch_dinner_veg: ["Dal", "Rice", "Vegetable Curry"],
      lunch_dinner_non_veg: ["Chicken Curry", "Fish Curry", "Biryani"],
      snacks: ["Samosa", "Kachori", "Jalebi", "Gulab Jamun", "Rasgulla", "Chhena Poda"]
    }
  }
];

// Convert internal data to public format (merging veg and non-veg)
export const INDIAN_CUISINES: Cuisine[] = INTERNAL_CUISINE_DATA.map(cuisine => ({
  name: cuisine.name,
  dishes: {
    breakfast: cuisine.dishes.breakfast,
    lunch_dinner: [...cuisine.dishes.lunch_dinner_veg, ...cuisine.dishes.lunch_dinner_non_veg],
    snacks: cuisine.dishes.snacks
  }
}));

// Internal universal dishes with veg/non-veg separation
const INTERNAL_UNIVERSAL_DISHES: InternalCuisineDishes = {
  breakfast: ["Idli", "Dosa", "Poha", "Upma", "Bread Toast", "Cornflakes", "Sandwich", "Fruit Salad"],
  lunch_dinner_veg: ["Veg Biryani", "Rajma", "Chole", "Chana Masala", "Dal Makhani", "Paneer Masala", "Vegetable Curry", "Mixed Vegetable", "Aloo Gobi", "Aloo Matar", "Palak Paneer", "Pasta", "Maggi", "Veg Fried Rice", "Veg Pulao", "Jeera Rice", "Dal Khichdi", "Vegetable Khichdi", "Thai Curry"],
  lunch_dinner_non_veg: ["Chicken Curry", "Butter Chicken", "Fish Curry", "Egg Curry", "Mutton Curry", "Chicken Biryani", "Mutton Biryani", "Chicken Fried Rice", "Egg Fried Rice"],
  snacks: ["Samosa", "Pakora", "Kachori", "Vada", "Bonda", "Bajji", "Jalebi", "Rasgulla", "Ladoo", "Besan Ladoo", "Coconut Ladoo", "Gajar Halwa", "Sooji Halwa", "Kheer", "Rice Kheer", "Dry Fruits", "Nuts", "Almonds", "Cashews", "Pistachios", "Walnuts", "Raisins", "Banana Chips", "Potato Chips", "Popcorn", "Biscuits", "Cookies", "Namkeen", "Mixture", "Dhokla", "Dahi Vada", "Dahi Puri", "Sev Puri", "Bhel Puri", "Pani Puri", "Chaat", "Aloo Chaat", "Fruit Chaat", "Boiled Corn", "Potato", "Boiled Potato", "French Fries", "Boiled Egg", "Fried Egg", "Scrambled Egg", "Omelette", "Egg Sandwich", "Veg Sandwich", "Paneer Sandwich", "Veg Burger", "Veg Pizza", "Pasta", "Spaghetti", "Macaroni", "Noodles"]
};

// Function to get universal dishes with optional vegetarian filtering
export function getUniversalCuisines(veg?: boolean): CuisineDishes {
  const allDishes: CuisineDishes = {
    breakfast: [...INTERNAL_UNIVERSAL_DISHES.breakfast],
    lunch_dinner: [],
    snacks: [...INTERNAL_UNIVERSAL_DISHES.snacks]
  };
  
  // Merge veg and non-veg based on the veg parameter
  if (veg === true) {
    // Only vegetarian dishes
    allDishes.lunch_dinner.push(...INTERNAL_UNIVERSAL_DISHES.lunch_dinner_veg);
  } else {
    // All dishes (both veg and non-veg) - default behavior
    allDishes.lunch_dinner.push(...INTERNAL_UNIVERSAL_DISHES.lunch_dinner_veg, ...INTERNAL_UNIVERSAL_DISHES.lunch_dinner_non_veg);
  }
  
  return allDishes;
}

// Helper function to get all cuisine names
export function getAllCuisineNames(): string[] {
  return INDIAN_CUISINES.map(cuisine => cuisine.name);
}

// Helper function to get dishes for selected cuisines
export function getDishesForCuisines(cuisineNames: string[], veg?: boolean): CuisineDishes {
  const selectedCuisines = INTERNAL_CUISINE_DATA.filter(cuisine => 
    cuisineNames.includes(cuisine.name)
  );
  
  const allDishes: CuisineDishes = {
    breakfast: [],
    lunch_dinner: [],
    snacks: []
  };
  
  selectedCuisines.forEach(cuisine => {
    allDishes.breakfast.push(...cuisine.dishes.breakfast);
    
    // Merge veg and non-veg based on the veg parameter
    if (veg === true) {
      // Only vegetarian dishes
      allDishes.lunch_dinner.push(...cuisine.dishes.lunch_dinner_veg);
    } else if (veg === false) {
      // All dishes (both veg and non-veg)
      allDishes.lunch_dinner.push(...cuisine.dishes.lunch_dinner_veg, ...cuisine.dishes.lunch_dinner_non_veg);
    } else {
      // Default behavior - all dishes
      allDishes.lunch_dinner.push(...cuisine.dishes.lunch_dinner_veg, ...cuisine.dishes.lunch_dinner_non_veg);
    }
    
    allDishes.snacks.push(...cuisine.dishes.snacks);
  });
  
  // Add universal dishes based on veg parameter
  const universalDishes = getUniversalCuisines(veg);
  allDishes.breakfast.push(...universalDishes.breakfast);
  allDishes.lunch_dinner.push(...universalDishes.lunch_dinner);
  allDishes.snacks.push(...universalDishes.snacks);
  
  // Remove duplicates
  allDishes.breakfast = Array.from(new Set(allDishes.breakfast));
  allDishes.lunch_dinner = Array.from(new Set(allDishes.lunch_dinner));
  allDishes.snacks = Array.from(new Set(allDishes.snacks));
  
  return allDishes;
}

// Helper function to get a random selection of dishes for meal planning
export function getRandomDishesForMealPlan(cuisineNames: string[], count: number = 5, veg?: boolean): string[] {
  const allDishes = getDishesForCuisines(cuisineNames, veg);
  const allDishList = [
    ...allDishes.breakfast,
    ...allDishes.lunch_dinner,
    ...allDishes.snacks
  ];
  
  // Shuffle and return random selection
  const shuffled = allDishList.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
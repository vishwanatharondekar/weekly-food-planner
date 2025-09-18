export interface CuisineDishes {
  breakfast: string[];
  lunch_dinner: string[];
  snacks: string[];
}

export interface Cuisine {
  name: string;
  dishes: CuisineDishes;
}

export const INDIAN_CUISINES: Cuisine[] = [
  {
    name: "Maharashtrian",
    dishes: {
      breakfast: ["Poha", "Sabudana Khichdi", "Thalipeeth", "Misal Pav", "Upma"],
      lunch_dinner: ["Puran Poli", "Varan-Bhaat", "Zunka-Bhakar", "Bharli Vangi", "Kolhapuri Chicken", "Malvani Fish Curry", "Pav Bhaji"],
      snacks: ["Vada Pav", "Bhakarwadi", "Kothimbir Vadi"]
    }
  },
  {
    name: "North Indian",
    dishes: {
      breakfast: ["Paratha", "Chole Bhature", "Aloo Puri", "Rajma Chawal", "Kadhi Chawal", "Aloo Paratha", "Punjabi Lassi", "Makki Roti", "Sarson da Saag", "Bajra Roti", "Gatte ki Sabzi", "Dal Baati", "Churma", "Kashmiri Kahwa", "Sheermal", "Kashmiri Roti", "Nun Chai", "Litti Chokha", "Sattu Paratha", "Chana Dal", "Puri", "Siddu", "Babru", "Khatta", "Aloo Ke Gutke", "Bhatt Ki Churkani", "Mandua Roti", "Fara", "Muthia", "Chila", "Poha", "Upma", "Sabudana Khichdi"],
      lunch_dinner: ["Dal Makhani", "Butter Chicken", "Palak Paneer", "Chana Masala", "Biryani", "Tandoori Chicken", "Rogan Josh", "Rajma", "Chole", "Kadhi", "Tandoori Roti", "Dal Baati Churma", "Ker Sangri", "Laal Maas", "Yakhni", "Dum Aloo", "Gushtaba", "Kashmiri Pulao", "Dal", "Rice", "Chicken Curry", "Fish Curry", "Vegetable Curry", "Madra", "Chana Madra", "Bhatt Ki Dal", "Gahat Ki Dal", "Chainsoo", "Litti", "Thekua", "Khaja"],
      snacks: ["Samosa", "Pakora", "Kachori", "Jalebi", "Gulab Jamun", "Rasgulla", "Ghewar", "Mawa Kachori", "Kashmiri Samosa", "Nadru Monje", "Kashmiri Tea", "Sheer Chai", "Singodi", "Bal Mithai", "Arsa", "Jhangora Ki Kheer", "Patande", "Aktori", "Chaat"]
    }
  },
  {
    name: "South Indian",
    dishes: {
      breakfast: ["Dosa", "Idli", "Upma", "Pongal", "Appam", "Puttu", "Idiyappam", "Rava Idli", "Rava Dosa", "Pao", "Bread"],
      lunch_dinner: ["Sambar Rice", "Rasam Rice", "Coconut Rice", "Biryani", "Fish Curry", "Chicken Curry", "Vegetable Curry", "Sambar", "Rasam", "Bisi Bele Bath", "Ragi Mudde", "Prawn Curry", "Chicken Xacuti", "Vindaloo", "Goan Sausage"],
      snacks: ["Vada", "Bonda", "Bajji", "Murukku", "Laddu", "Payasam", "Banana Chips", "Kozhukatta", "Unniyappam", "Achappam", "Mysore Pak", "Bebinca", "Dodol", "Coconut Ladoo"]
    }
  },
  {
    name: "Gujarati",
    dishes: {
      breakfast: ["Dhokla", "Thepla", "Fafda", "Khandvi", "Handvo", "Idli Sambaar", "Poha"],
      lunch_dinner: ["Dal Dhokli", "Undhiyu", "Kadhi", "Sabzi", "Khichdi", "Gujarati Thali", "Sev Tameta", "Vagharela Bhaat", "Pulaav"],
      snacks: ["Fafda", "Gathiya", "Chakri", "Mathiya", "Gujarati Samosa", "Ragda Petis"]
    }
  },
  {
    name: "Bengali",
    dishes: {
      breakfast: ["Luchi", "Aloo Dum", "Puri", "Kochuri", "Poha"],
      lunch_dinner: ["Fish Curry", "Chicken Curry", "Dal", "Rice", "Biryani", "Mutton Curry", "Vegetable Curry"],
      snacks: ["Singara", "Jhal Muri", "Tele Bhaja", "Rasgulla", "Sandesh", "Mishti Doi", "Ragda Petis"]
    }
  },
  {
    name: "Assamese",
    dishes: {
      breakfast: ["Pitha", "Luchi", "Aloo Pitika", "Khar", "Til Pitha"],
      lunch_dinner: ["Fish Curry", "Chicken Curry", "Dal", "Rice", "Biryani", "Masor Tenga"],
      snacks: ["Pitha", "Laddu", "Narikol Pitha", "Til Pitha", "Ghila Pitha"]
    }
  },
  {
    name: "Odisha",
    dishes: {
      breakfast: ["Pakhala", "Chuda", "Pitha", "Upma", "Poha"],
      lunch_dinner: ["Dal", "Rice", "Chicken Curry", "Fish Curry", "Biryani", "Vegetable Curry"],
      snacks: ["Samosa", "Kachori", "Jalebi", "Gulab Jamun", "Rasgulla", "Chhena Poda"]
    }
  }
];

// Helper function to get all cuisine names
export function getAllCuisineNames(): string[] {
  return INDIAN_CUISINES.map(cuisine => cuisine.name);
}

// Helper function to get dishes for selected cuisines
export function getDishesForCuisines(cuisineNames: string[]): CuisineDishes {
  const selectedCuisines = INDIAN_CUISINES.filter(cuisine => 
    cuisineNames.includes(cuisine.name)
  );
  
  const allDishes: CuisineDishes = {
    breakfast: [],
    lunch_dinner: [],
    snacks: []
  };
  
  selectedCuisines.forEach(cuisine => {
    allDishes.breakfast.push(...cuisine.dishes.breakfast);
    allDishes.lunch_dinner.push(...cuisine.dishes.lunch_dinner);
    allDishes.snacks.push(...cuisine.dishes.snacks);
  });
  
  // Remove duplicates
  allDishes.breakfast = Array.from(new Set(allDishes.breakfast));
  allDishes.lunch_dinner = Array.from(new Set(allDishes.lunch_dinner));
  allDishes.snacks = Array.from(new Set(allDishes.snacks));
  
  return allDishes;
}

// Helper function to get a random selection of dishes for meal planning
export function getRandomDishesForMealPlan(cuisineNames: string[], count: number = 5): string[] {
  const allDishes = getDishesForCuisines(cuisineNames);
  const allDishList = [
    ...allDishes.breakfast,
    ...allDishes.lunch_dinner,
    ...allDishes.snacks
  ];
  
  // Shuffle and return random selection
  const shuffled = allDishList.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
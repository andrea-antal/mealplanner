// Mock data following the API structure for easy backend integration

export interface FamilyMember {
  name: string;
  ageGroup: 'toddler' | 'child' | 'adult';
  allergies: string[];
  dislikes: string[];
}

export interface HouseholdProfile {
  familyMembers: FamilyMember[];
  daycareRules: {
    noNuts: boolean;
    noHoney: boolean;
    mustBeServedCold: boolean;
  };
  cookingPreferences: {
    appliances: string[];
    cookingMethods: string[];
    skillLevel: 'beginner' | 'intermediate' | 'advanced';
    maxCookingTimeWeeknight: number;
    maxCookingTimeWeekend: number;
  };
  preferences: {
    weeknightPriority: 'quick' | 'batch-cookable' | 'minimal-prep';
    weekendPriority: 'batch-cookable' | 'slow-cooked' | 'special';
  };
}

export interface Recipe {
  id: string;
  title: string;
  ingredients: string[];
  instructions: string;
  tags: string[];
  prepTimeMinutes: number;
  activeCookingTimeMinutes: number;
  serves: number;
  requiredAppliances: string[];
}

export interface Meal {
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  forWho: string;
  recipeTitle: string;
  notes: string;
  isLeftover?: boolean;
}

export interface MealPlanDay {
  date: string;
  meals: Meal[];
}

export interface MealPlan {
  weekStartDate: string;
  days: MealPlanDay[];
}

// Mock household profile
export const mockHouseholdProfile: HouseholdProfile = {
  familyMembers: [
    { name: 'Andrea', ageGroup: 'adult', allergies: [], dislikes: ['mushrooms'] },
    { name: 'Marcus', ageGroup: 'adult', allergies: ['shellfish'], dislikes: [] },
    { name: 'Sophie', ageGroup: 'toddler', allergies: [], dislikes: ['spicy'] },
  ],
  daycareRules: {
    noNuts: true,
    noHoney: true,
    mustBeServedCold: false,
  },
  cookingPreferences: {
    appliances: ['oven', 'instant pot', 'blender'],
    cookingMethods: ['one-pot', 'sheet pan'],
    skillLevel: 'intermediate',
    maxCookingTimeWeeknight: 30,
    maxCookingTimeWeekend: 60,
  },
  preferences: {
    weeknightPriority: 'quick',
    weekendPriority: 'batch-cookable',
  },
};

// Mock groceries
export const mockGroceries = {
  items: ['chicken breast', 'rice', 'broccoli', 'eggs', 'milk', 'cheese', 'pasta', 'tomatoes', 'onions', 'garlic', 'olive oil', 'butter'],
};

// Mock recipes
export const mockRecipes: Recipe[] = [
  {
    id: 'recipe_001',
    title: 'One-Pot Chicken and Rice',
    ingredients: ['2 lbs chicken breast', '2 cups rice', '4 cups chicken broth', '1 onion', '2 cloves garlic'],
    instructions: '1. Heat oil in a large pot over medium heat.\n2. Season and brown chicken on both sides.\n3. Remove chicken, sauté onions and garlic.\n4. Add rice and broth, bring to boil.\n5. Return chicken, cover and simmer 20 minutes.',
    tags: ['toddler-friendly', 'quick', 'one-pot'],
    prepTimeMinutes: 10,
    activeCookingTimeMinutes: 25,
    serves: 6,
    requiredAppliances: ['oven'],
  },
  {
    id: 'recipe_002',
    title: 'Cheesy Scrambled Eggs',
    ingredients: ['4 eggs', '2 tbsp butter', '1/4 cup shredded cheese', 'Salt and pepper'],
    instructions: '1. Whisk eggs with salt and pepper.\n2. Melt butter in non-stick pan over low heat.\n3. Add eggs, stir gently with spatula.\n4. When nearly set, fold in cheese.\n5. Serve immediately.',
    tags: ['toddler-friendly', 'quick', 'breakfast'],
    prepTimeMinutes: 2,
    activeCookingTimeMinutes: 5,
    serves: 2,
    requiredAppliances: [],
  },
  {
    id: 'recipe_003',
    title: 'Sheet Pan Veggie Pasta',
    ingredients: ['1 lb pasta', 'Cherry tomatoes', 'Broccoli florets', 'Olive oil', 'Parmesan cheese'],
    instructions: '1. Preheat oven to 400°F.\n2. Toss vegetables with olive oil and seasonings.\n3. Roast for 20 minutes.\n4. Cook pasta according to package.\n5. Combine and top with parmesan.',
    tags: ['toddler-friendly', 'batch-cookable', 'sheet pan'],
    prepTimeMinutes: 10,
    activeCookingTimeMinutes: 25,
    serves: 4,
    requiredAppliances: ['oven'],
  },
  {
    id: 'recipe_004',
    title: 'Instant Pot Beef Stew',
    ingredients: ['2 lbs beef chuck', '4 potatoes', '3 carrots', 'Beef broth', 'Tomato paste'],
    instructions: '1. Cut beef and vegetables into chunks.\n2. Sear beef in Instant Pot on sauté mode.\n3. Add vegetables, broth, and seasonings.\n4. Pressure cook on high for 35 minutes.\n5. Natural release for 10 minutes.',
    tags: ['husband-approved', 'batch-cookable', 'one-pot'],
    prepTimeMinutes: 15,
    activeCookingTimeMinutes: 45,
    serves: 8,
    requiredAppliances: ['instant pot'],
  },
  {
    id: 'recipe_005',
    title: 'Daycare-Safe Pasta Salad',
    ingredients: ['Rotini pasta', 'Cucumber', 'Cherry tomatoes', 'Italian dressing', 'Cheese cubes'],
    instructions: '1. Cook pasta and cool completely.\n2. Dice cucumber and halve tomatoes.\n3. Cut cheese into small cubes.\n4. Combine all ingredients.\n5. Toss with dressing and refrigerate.',
    tags: ['daycare-safe', 'toddler-friendly', 'quick'],
    prepTimeMinutes: 15,
    activeCookingTimeMinutes: 10,
    serves: 4,
    requiredAppliances: [],
  },
  {
    id: 'recipe_006',
    title: 'Banana Oat Pancakes',
    ingredients: ['2 ripe bananas', '1 cup oats', '2 eggs', '1/2 cup milk', 'Cinnamon'],
    instructions: '1. Blend all ingredients until smooth.\n2. Heat non-stick pan over medium heat.\n3. Pour 1/4 cup batter per pancake.\n4. Cook until bubbles form, flip.\n5. Serve with fresh fruit.',
    tags: ['toddler-friendly', 'breakfast', 'quick'],
    prepTimeMinutes: 5,
    activeCookingTimeMinutes: 15,
    serves: 4,
    requiredAppliances: ['blender'],
  },
];

// Mock meal plan
export const mockMealPlan: MealPlan = {
  weekStartDate: '2025-12-08',
  days: [
    {
      date: '2025-12-08',
      meals: [
        { mealType: 'breakfast', forWho: 'Family', recipeTitle: 'Banana Oat Pancakes', notes: 'Weekend special' },
        { mealType: 'lunch', forWho: 'Family', recipeTitle: 'Daycare-Safe Pasta Salad', notes: 'Make extra for Monday' },
        { mealType: 'dinner', forWho: 'Family', recipeTitle: 'Instant Pot Beef Stew', notes: 'Batch cook for the week' },
        { mealType: 'snack', forWho: 'Sophie', recipeTitle: 'Fresh fruit', notes: 'Apple slices' },
      ],
    },
    {
      date: '2025-12-09',
      meals: [
        { mealType: 'breakfast', forWho: 'Andrea', recipeTitle: 'Cheesy Scrambled Eggs', notes: 'Quick weekday breakfast' },
        { mealType: 'lunch', forWho: 'Sophie', recipeTitle: 'Daycare-Safe Pasta Salad', notes: 'From Sunday batch', isLeftover: true },
        { mealType: 'dinner', forWho: 'Family', recipeTitle: 'Instant Pot Beef Stew', notes: 'Sunday leftovers', isLeftover: true },
        { mealType: 'snack', forWho: 'Family', recipeTitle: 'Cheese and crackers', notes: '' },
      ],
    },
    {
      date: '2025-12-10',
      meals: [
        { mealType: 'breakfast', forWho: 'Family', recipeTitle: 'Cheesy Scrambled Eggs', notes: '' },
        { mealType: 'lunch', forWho: 'Sophie', recipeTitle: 'Chicken and rice bowl', notes: 'Daycare lunch' },
        { mealType: 'dinner', forWho: 'Family', recipeTitle: 'One-Pot Chicken and Rice', notes: 'Make extra for lunches' },
        { mealType: 'snack', forWho: 'Sophie', recipeTitle: 'Yogurt with berries', notes: '' },
      ],
    },
    {
      date: '2025-12-11',
      meals: [
        { mealType: 'breakfast', forWho: 'Andrea', recipeTitle: 'Banana Oat Pancakes', notes: 'Prep night before', isLeftover: true },
        { mealType: 'lunch', forWho: 'Family', recipeTitle: 'One-Pot Chicken and Rice', notes: 'Tuesday leftovers', isLeftover: true },
        { mealType: 'dinner', forWho: 'Family', recipeTitle: 'Sheet Pan Veggie Pasta', notes: '' },
        { mealType: 'snack', forWho: 'Sophie', recipeTitle: 'Apple slices with cheese', notes: '' },
      ],
    },
    {
      date: '2025-12-12',
      meals: [
        { mealType: 'breakfast', forWho: 'Family', recipeTitle: 'Cheesy Scrambled Eggs', notes: '' },
        { mealType: 'lunch', forWho: 'Sophie', recipeTitle: 'Sheet Pan Veggie Pasta', notes: 'Cold pasta for daycare', isLeftover: true },
        { mealType: 'dinner', forWho: 'Family', recipeTitle: 'One-Pot Chicken and Rice', notes: 'Fresh batch' },
        { mealType: 'snack', forWho: 'Family', recipeTitle: 'Veggies and hummus', notes: '' },
      ],
    },
    {
      date: '2025-12-13',
      meals: [
        { mealType: 'breakfast', forWho: 'Family', recipeTitle: 'Banana Oat Pancakes', notes: 'Weekend morning' },
        { mealType: 'lunch', forWho: 'Family', recipeTitle: 'One-Pot Chicken and Rice', notes: 'Friday leftovers', isLeftover: true },
        { mealType: 'dinner', forWho: 'Adults', recipeTitle: 'Date night out', notes: 'Sophie with grandparents' },
        { mealType: 'snack', forWho: 'Sophie', recipeTitle: 'Banana', notes: '' },
      ],
    },
    {
      date: '2025-12-14',
      meals: [
        { mealType: 'breakfast', forWho: 'Family', recipeTitle: 'Cheesy Scrambled Eggs', notes: 'Lazy Sunday' },
        { mealType: 'lunch', forWho: 'Family', recipeTitle: 'Daycare-Safe Pasta Salad', notes: 'Fresh batch' },
        { mealType: 'dinner', forWho: 'Family', recipeTitle: 'Instant Pot Beef Stew', notes: 'Prep for next week' },
        { mealType: 'snack', forWho: 'Family', recipeTitle: 'Popcorn', notes: 'Movie night!' },
      ],
    },
  ],
};

// Helper to format date
export const formatDate = (dateString: string): { dayName: string; shortDate: string } => {
  const date = new Date(dateString);
  return {
    dayName: date.toLocaleDateString('en-US', { weekday: 'long' }),
    shortDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  };
};

// Tag color mapping
export const getTagColor = (tag: string): string => {
  const tagMap: Record<string, string> = {
    'toddler-friendly': 'bg-tag-toddler',
    'quick': 'bg-tag-quick text-foreground',
    'daycare-safe': 'bg-tag-daycare',
    'husband-approved': 'bg-tag-approved',
    'one-pot': 'bg-tag-onepot',
    'batch-cookable': 'bg-tag-batch',
    'breakfast': 'bg-tag-breakfast',
    'sheet pan': 'bg-tag-onepot',
  };
  return tagMap[tag] || 'bg-muted text-muted-foreground';
};

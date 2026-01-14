/**
 * Grocery category mappings for category-based search.
 * Based on backend/app/services/storage_categories.py
 */

export const GROCERY_CATEGORIES: Record<string, string[]> = {
  // Refrigerated categories
  dairy: [
    "milk", "cheese", "yogurt", "butter", "cream", "sour cream", "cream cheese",
    "cottage cheese", "ricotta", "mozzarella", "cheddar", "parmesan", "feta",
    "brie", "gouda", "swiss cheese", "half and half", "heavy cream", "whipping cream",
    "buttermilk", "kefir", "greek yogurt", "skyr"
  ],
  eggs: ["eggs", "egg", "egg whites", "liquid eggs"],
  meat: [
    "chicken", "beef", "pork", "lamb", "turkey", "duck", "veal",
    "chicken breast", "chicken thigh", "chicken wings", "ground beef", "ground turkey",
    "ground pork", "steak", "ribeye", "sirloin", "tenderloin", "pork chops",
    "bacon", "ham", "sausage", "hot dogs", "deli meat", "salami", "prosciutto",
    "pepperoni", "chorizo", "bratwurst", "italian sausage", "breakfast sausage"
  ],
  seafood: [
    "fish", "salmon", "tuna", "shrimp", "prawns", "lobster", "crab", "scallops",
    "cod", "tilapia", "halibut", "trout", "mahi mahi", "sea bass", "snapper",
    "clams", "mussels", "oysters", "squid", "calamari", "octopus", "anchovies"
  ],
  produce: [
    "lettuce", "spinach", "arugula", "kale", "mixed greens", "salad mix",
    "spring mix", "romaine", "iceberg", "cabbage", "bok choy", "swiss chard",
    "celery", "carrots", "broccoli", "cauliflower", "asparagus", "green beans",
    "snap peas", "snow peas", "zucchini", "squash", "cucumber", "bell pepper",
    "peppers", "mushrooms", "corn", "eggplant", "artichoke", "brussels sprouts",
    "leeks", "scallions", "green onions", "chives", "fresh herbs", "cilantro",
    "parsley", "basil", "mint", "dill", "thyme", "rosemary", "tarragon",
    "berries", "strawberries", "blueberries", "raspberries", "blackberries",
    "grapes", "cherries", "cut fruit", "fresh fruit",
    // Shelf-stable produce (also searchable under produce)
    "potatoes", "sweet potatoes", "yams", "onions", "garlic", "shallots",
    "ginger root", "butternut squash", "acorn squash", "spaghetti squash",
    "pumpkin", "apples", "oranges", "lemons", "limes", "bananas", "avocados",
    "tomatoes", "mangoes", "pineapple", "watermelon", "cantaloupe", "honeydew"
  ],
  frozen: [
    "ice cream", "frozen vegetables", "frozen fruit", "frozen pizza",
    "frozen meals", "frozen dinner", "ice", "popsicles", "frozen berries",
    "frozen peas", "frozen corn", "frozen spinach", "frozen fish",
    "frozen shrimp", "frozen chicken"
  ],

  // Pantry categories
  grains: [
    "rice", "pasta", "spaghetti", "penne", "linguine", "fettuccine", "macaroni",
    "lasagna noodles", "ramen", "noodles", "couscous", "quinoa", "bulgur",
    "farro", "barley", "oats", "oatmeal", "cereal", "granola", "muesli",
    "bread crumbs", "panko", "crackers", "breadsticks",
    "bread", "tortillas", "pita", "naan", "bagels", "english muffins",
    "croissants", "rolls", "buns", "hamburger buns", "hot dog buns"
  ],
  baking: [
    "flour", "sugar", "brown sugar", "powdered sugar", "baking soda",
    "baking powder", "yeast", "cornstarch", "cocoa powder", "chocolate chips",
    "vanilla extract", "almond extract", "food coloring", "sprinkles"
  ],
  canned: [
    "canned beans", "black beans", "kidney beans", "chickpeas", "lentils",
    "canned tomatoes", "tomato paste", "tomato sauce", "marinara",
    "canned corn", "canned peas", "canned vegetables", "canned fruit",
    "canned tuna", "canned salmon", "canned chicken", "spam",
    "coconut milk", "evaporated milk", "condensed milk"
  ],
  spices: [
    "salt", "pepper", "black pepper", "garlic powder", "onion powder",
    "paprika", "cumin", "coriander", "turmeric", "curry powder", "garam masala",
    "chili powder", "cayenne", "oregano", "basil", "thyme", "rosemary",
    "cinnamon", "nutmeg", "cloves", "allspice", "ginger", "cardamom",
    "bay leaves", "italian seasoning", "taco seasoning", "everything bagel seasoning"
  ],
  snacks: [
    "chips", "pretzels", "popcorn", "trail mix", "granola bars", "protein bars",
    "cookies", "crackers", "rice cakes", "tortilla chips", "pita chips"
  ],
  beverages: [
    "coffee", "tea", "coffee beans", "ground coffee", "tea bags",
    "hot chocolate", "powdered drink mix", "soda", "sparkling water",
    "coconut water", "sports drinks", "orange juice", "apple juice", "juice",
    "cold brew", "iced coffee", "kombucha", "fresh squeezed"
  ],
  oils: [
    "olive oil", "vegetable oil", "canola oil", "coconut oil", "sesame oil",
    "avocado oil", "peanut oil", "cooking spray", "vinegar", "balsamic vinegar",
    "red wine vinegar", "white wine vinegar", "apple cider vinegar", "rice vinegar"
  ],
  condiments: [
    "soy sauce", "fish sauce", "oyster sauce", "hoisin sauce", "sriracha",
    "hot sauce", "tabasco", "worcestershire sauce", "bbq sauce", "teriyaki sauce",
    "maple syrup", "honey", "agave", "molasses", "corn syrup", "jam", "jelly",
    "preserves", "marmalade", "peanut butter", "almond butter", "nutella",
    "mayonnaise", "mayo", "ketchup", "mustard", "relish", "horseradish",
    "salad dressing", "ranch", "blue cheese dressing", "pesto", "hummus",
    "guacamole", "salsa", "tzatziki", "aioli", "tartar sauce"
  ],
  nuts: [
    "nuts", "almonds", "walnuts", "pecans", "cashews", "peanuts", "pistachios",
    "macadamia", "pine nuts", "seeds", "sunflower seeds", "pumpkin seeds",
    "chia seeds", "flax seeds", "sesame seeds", "poppy seeds"
  ],
};

/**
 * Get all category names for display in helper text
 */
export const CATEGORY_NAMES = Object.keys(GROCERY_CATEGORIES);

/**
 * Check if a search query matches a category name
 */
export function isCategory(query: string): boolean {
  return query.toLowerCase() in GROCERY_CATEGORIES;
}

/**
 * Get items that belong to a category
 */
export function getCategoryItems(categoryName: string): string[] {
  return GROCERY_CATEGORIES[categoryName.toLowerCase()] ?? [];
}

/**
 * Check if an item matches a category search
 * Returns true if the item name contains any keyword from the category
 */
export function itemMatchesCategory(
  itemName: string,
  canonicalName: string | undefined,
  categoryName: string
): boolean {
  const keywords = GROCERY_CATEGORIES[categoryName.toLowerCase()];
  if (!keywords) return false;

  const nameLower = itemName.toLowerCase();
  const canonicalLower = canonicalName?.toLowerCase() ?? '';

  return keywords.some(
    keyword => nameLower.includes(keyword) || canonicalLower.includes(keyword)
  );
}

/**
 * Auto-categorize an item based on its name
 * Returns the category name if found, otherwise undefined
 */
export function categorizeItem(itemName: string): string | undefined {
  const nameLower = itemName.toLowerCase();

  for (const [category, keywords] of Object.entries(GROCERY_CATEGORIES)) {
    for (const keyword of keywords) {
      // Check if the item name contains the keyword
      if (nameLower.includes(keyword)) {
        return category;
      }
      // Also check if the keyword contains the item name (for short names like "eggs")
      if (keyword.includes(nameLower) && nameLower.length >= 3) {
        return category;
      }
    }
  }

  return undefined;
}

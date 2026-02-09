"""
Storage category lookup for grocery items.

Provides heuristic-based suggestions for whether items should be stored
in fridge/freezer or pantry based on common grocery item names.
"""
from typing import Literal, Set

# Common refrigerated/frozen items (case-insensitive matching)
FRIDGE_ITEMS: Set[str] = {
    # Dairy
    "milk", "cheese", "yogurt", "butter", "cream", "sour cream", "cream cheese",
    "cottage cheese", "ricotta", "mozzarella", "cheddar", "parmesan", "feta",
    "brie", "gouda", "swiss cheese", "half and half", "heavy cream", "whipping cream",
    "buttermilk", "kefir", "greek yogurt", "skyr",

    # Eggs
    "eggs", "egg", "egg whites", "liquid eggs",

    # Meat & Poultry
    "chicken", "beef", "pork", "lamb", "turkey", "duck", "veal",
    "chicken breast", "chicken thigh", "chicken wings", "ground beef", "ground turkey",
    "ground pork", "steak", "ribeye", "sirloin", "tenderloin", "pork chops",
    "bacon", "ham", "sausage", "hot dogs", "deli meat", "salami", "prosciutto",
    "pepperoni", "chorizo", "bratwurst", "italian sausage", "breakfast sausage",

    # Seafood
    "fish", "salmon", "tuna", "shrimp", "prawns", "lobster", "crab", "scallops",
    "cod", "tilapia", "halibut", "trout", "mahi mahi", "sea bass", "snapper",
    "clams", "mussels", "oysters", "squid", "calamari", "octopus", "anchovies",

    # Fresh Produce (perishables)
    "lettuce", "spinach", "arugula", "kale", "mixed greens", "salad mix",
    "spring mix", "romaine", "iceberg", "cabbage", "bok choy", "swiss chard",
    "celery", "carrots", "broccoli", "cauliflower", "asparagus", "green beans",
    "snap peas", "snow peas", "zucchini", "squash", "cucumber", "bell pepper",
    "peppers", "mushrooms", "corn", "eggplant", "artichoke", "brussels sprouts",
    "leeks", "scallions", "green onions", "chives", "fresh herbs", "cilantro",
    "parsley", "basil", "mint", "dill", "thyme", "rosemary", "tarragon",
    "berries", "strawberries", "blueberries", "raspberries", "blackberries",
    "grapes", "cherries", "cut fruit", "fresh fruit",

    # Tofu & Plant-Based
    "tofu", "tempeh", "seitan", "beyond meat", "impossible meat", "plant-based meat",
    "veggie burgers", "vegan cheese", "oat milk", "almond milk", "soy milk",

    # Condiments & Sauces (after opening)
    "mayonnaise", "mayo", "ketchup", "mustard", "relish", "horseradish",
    "salad dressing", "ranch", "blue cheese dressing", "pesto", "hummus",
    "guacamole", "salsa", "tzatziki", "aioli", "tartar sauce",

    # Prepared Foods
    "leftovers", "meal prep", "cooked rice", "cooked pasta", "soup",
    "deli salad", "potato salad", "coleslaw", "pasta salad", "fresh pasta",

    # Beverages
    "orange juice", "apple juice", "juice", "cold brew", "iced coffee",
    "kombucha", "fresh squeezed",

    # Frozen Items
    "ice cream", "frozen vegetables", "frozen fruit", "frozen pizza",
    "frozen meals", "frozen dinner", "ice", "popsicles", "frozen berries",
    "frozen peas", "frozen corn", "frozen spinach", "frozen fish",
    "frozen shrimp", "frozen chicken",
}

# Common pantry/shelf-stable items
PANTRY_ITEMS: Set[str] = {
    # Grains & Pasta
    "rice", "pasta", "spaghetti", "penne", "linguine", "fettuccine", "macaroni",
    "lasagna noodles", "ramen", "noodles", "couscous", "quinoa", "bulgur",
    "farro", "barley", "oats", "oatmeal", "cereal", "granola", "muesli",
    "bread crumbs", "panko", "crackers", "breadsticks",

    # Bread (short-term pantry)
    "bread", "tortillas", "pita", "naan", "bagels", "english muffins",
    "croissants", "rolls", "buns", "hamburger buns", "hot dog buns",

    # Baking
    "flour", "sugar", "brown sugar", "powdered sugar", "baking soda",
    "baking powder", "yeast", "cornstarch", "cocoa powder", "chocolate chips",
    "vanilla extract", "almond extract", "food coloring", "sprinkles",

    # Canned Goods
    "canned beans", "black beans", "kidney beans", "chickpeas", "lentils",
    "canned tomatoes", "tomato paste", "tomato sauce", "marinara",
    "canned corn", "canned peas", "canned vegetables", "canned fruit",
    "canned tuna", "canned salmon", "canned chicken", "spam",
    "coconut milk", "evaporated milk", "condensed milk",

    # Dried Goods
    "dried beans", "dried lentils", "split peas", "dried pasta",
    "dried fruit", "raisins", "dried cranberries", "dates", "prunes",
    "dried apricots", "dried mango", "nuts", "almonds", "walnuts", "pecans",
    "cashews", "peanuts", "pistachios", "macadamia", "pine nuts",
    "seeds", "sunflower seeds", "pumpkin seeds", "chia seeds", "flax seeds",
    "sesame seeds", "poppy seeds",

    # Oils & Vinegars
    "olive oil", "vegetable oil", "canola oil", "coconut oil", "sesame oil",
    "avocado oil", "peanut oil", "cooking spray", "vinegar", "balsamic vinegar",
    "red wine vinegar", "white wine vinegar", "apple cider vinegar", "rice vinegar",

    # Sauces & Condiments (shelf-stable)
    "soy sauce", "fish sauce", "oyster sauce", "hoisin sauce", "sriracha",
    "hot sauce", "tabasco", "worcestershire sauce", "bbq sauce", "teriyaki sauce",
    "maple syrup", "honey", "agave", "molasses", "corn syrup", "jam", "jelly",
    "preserves", "marmalade", "peanut butter", "almond butter", "nutella",

    # Spices & Seasonings
    "salt", "pepper", "black pepper", "garlic powder", "onion powder",
    "paprika", "cumin", "coriander", "turmeric", "curry powder", "garam masala",
    "chili powder", "cayenne", "oregano", "basil", "thyme", "rosemary",
    "cinnamon", "nutmeg", "cloves", "allspice", "ginger", "cardamom",
    "bay leaves", "italian seasoning", "taco seasoning", "everything bagel seasoning",

    # Snacks
    "chips", "pretzels", "popcorn", "trail mix", "granola bars", "protein bars",
    "cookies", "crackers", "rice cakes", "tortilla chips", "pita chips",

    # Beverages (shelf-stable)
    "coffee", "tea", "coffee beans", "ground coffee", "tea bags",
    "hot chocolate", "powdered drink mix", "soda", "sparkling water",
    "coconut water", "sports drinks",

    # Shelf-Stable Produce
    "potatoes", "sweet potatoes", "yams", "onions", "garlic", "shallots",
    "ginger root", "butternut squash", "acorn squash", "spaghetti squash",
    "pumpkin", "apples", "oranges", "lemons", "limes", "bananas", "avocados",
    "tomatoes", "mangoes", "pineapple", "watermelon", "cantaloupe", "honeydew",

    # Miscellaneous
    "stock", "broth", "chicken broth", "beef broth", "vegetable broth",
    "bouillon", "soup mix", "instant noodles", "mac and cheese", "boxed meals",
}


def suggest_storage_location(item_name: str) -> Literal["fridge", "pantry"]:
    """
    Suggest storage location based on item name.

    Uses fuzzy matching against known fridge and pantry items.
    Defaults to "fridge" for unknown items (safer for perishables).

    Args:
        item_name: The grocery item name to categorize

    Returns:
        "fridge" or "pantry" based on the item type
    """
    name_lower = item_name.lower().strip()

    # Check for exact matches first
    if name_lower in FRIDGE_ITEMS:
        return "fridge"
    if name_lower in PANTRY_ITEMS:
        return "pantry"

    # Check if any fridge item is a substring or vice versa
    for fridge_item in FRIDGE_ITEMS:
        if fridge_item in name_lower or name_lower in fridge_item:
            return "fridge"

    for pantry_item in PANTRY_ITEMS:
        if pantry_item in name_lower or name_lower in pantry_item:
            return "pantry"

    # Default to fridge (safer for perishables)
    return "fridge"

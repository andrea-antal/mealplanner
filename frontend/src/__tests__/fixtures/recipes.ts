import type { Recipe } from '@/lib/api';

export const mockRecipeWithSource: Recipe = {
  id: 'imported-recipe-123',
  title: 'Classic Chocolate Chip Cookies',
  description: 'Delicious cookies from AllRecipes',
  ingredients: ['2 cups flour', '1 cup butter', '2 cups chocolate chips'],
  instructions: '1. Mix dry ingredients. 2. Cream butter and sugar. 3. Combine and add chocolate chips. 4. Bake at 375°F for 10-12 minutes.',
  tags: ['dessert', 'baking', 'cookies'],
  prep_time_minutes: 15,
  active_cooking_time_minutes: 12,
  serves: 24,
  required_appliances: ['oven'],
  is_generated: false,
  source_url: 'https://www.allrecipes.com/recipe/12345/chocolate-chip-cookies',
  source_name: 'AllRecipes',
};

export const mockRecipeWithoutSource: Recipe = {
  id: 'manual-recipe-456',
  title: 'Homemade Pasta',
  description: 'Fresh pasta from scratch',
  ingredients: ['2 cups flour', '3 eggs', 'pinch of salt'],
  instructions: '1. Mix flour and salt. 2. Make a well and add eggs. 3. Knead for 10 minutes. 4. Roll and cut into desired shapes.',
  tags: ['italian', 'dinner', 'pasta'],
  prep_time_minutes: 30,
  active_cooking_time_minutes: 5,
  serves: 4,
  required_appliances: ['stove'],
  is_generated: false,
  // No source_url or source_name
};

export const mockGeneratedRecipeWithSource: Recipe = {
  id: 'generated_789',
  title: 'AI-Generated Stir Fry',
  description: 'Created by Claude from your ingredients',
  ingredients: ['1 lb chicken breast', '2 cups mixed vegetables', '3 tbsp soy sauce'],
  instructions: '1. Chop chicken and vegetables. 2. Heat oil in wok. 3. Stir fry chicken until cooked. 4. Add vegetables and sauce.',
  tags: ['quick', 'asian', 'dinner'],
  prep_time_minutes: 10,
  active_cooking_time_minutes: 15,
  serves: 4,
  required_appliances: ['wok'],
  is_generated: true,
  source_url: 'https://www.seriouseats.com/stir-fry-101',
  source_name: 'Serious Eats',
};

export const mockRecipeLongUrl: Recipe = {
  id: 'long-url-recipe',
  title: 'Recipe With Very Long URL',
  description: 'Testing URL truncation',
  ingredients: ['1 ingredient'],
  instructions: '1. Cook the ingredient.',
  tags: ['test'],
  prep_time_minutes: 5,
  active_cooking_time_minutes: 10,
  serves: 2,
  required_appliances: ['stove'],
  is_generated: false,
  source_url: 'https://www.verylongdomainname.com/recipes/category/subcategory/another-level/recipe-with-extremely-long-title-that-goes-on-forever',
  source_name: 'Very Long Domain Name With Many Words',
};

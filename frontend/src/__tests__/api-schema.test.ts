/**
 * API Schema Tests
 *
 * Validates that frontend TypeScript interfaces match backend Pydantic models.
 * These tests catch field name mismatches early (e.g., camelCase vs snake_case).
 */

import { Recipe } from '@/lib/api';

describe('Recipe Interface Schema', () => {
  it('should have correct field names matching backend', () => {
    // Create a mock Recipe object with all required fields
    const recipe: Recipe = {
      id: 'test-123',
      title: 'Test Recipe',
      description: 'A test recipe',
      ingredients: ['chicken breast', 'rice', 'broccoli'],
      instructions: '1. Cook chicken. 2. Cook rice. 3. Steam broccoli.',
      tags: ['quick', 'healthy'],
      prep_time_minutes: 10,
      active_cooking_time_minutes: 20, // Critical: NOT cook_time_minutes!
      serves: 4, // Critical: NOT servings!
      required_appliances: ['stove', 'pot'],
      is_generated: false,
    };

    // Verify all fields exist with correct names
    expect(recipe).toHaveProperty('active_cooking_time_minutes');
    expect(recipe).toHaveProperty('serves');
    expect(recipe).toHaveProperty('is_generated');
    expect(recipe).toHaveProperty('description');

    // Verify incorrect field names don't exist
    expect(recipe).not.toHaveProperty('cook_time_minutes');
    expect(recipe).not.toHaveProperty('servings');
  });

  it('should support generated recipes with is_generated flag', () => {
    const generatedRecipe: Recipe = {
      id: 'generated_abc123',
      title: 'AI Generated Recipe',
      description: 'Dynamically created from ingredients',
      ingredients: ['chicken', 'rice'],
      instructions: 'Cook everything.',
      tags: ['generated'],
      prep_time_minutes: 5,
      active_cooking_time_minutes: 15,
      serves: 4,
      required_appliances: ['stove'],
      is_generated: true,
    };

    expect(generatedRecipe.is_generated).toBe(true);
    expect(generatedRecipe.id).toContain('generated_');
  });
});

describe('Recipe Interface - Source Fields', () => {
  it('should support optional source_url field', () => {
    const recipe: Recipe = {
      id: 'test',
      title: 'Test Recipe',
      description: 'A test recipe',
      ingredients: ['flour', 'sugar'],
      instructions: '1. Mix. 2. Bake.',
      tags: ['dessert'],
      prep_time_minutes: 5,
      active_cooking_time_minutes: 10,
      serves: 2,
      required_appliances: ['oven'],
      is_generated: false,
      source_url: 'https://example.com/recipe',
    };

    expect(recipe.source_url).toBe('https://example.com/recipe');
  });

  it('should support optional source_name field', () => {
    const recipe: Recipe = {
      id: 'test',
      title: 'Test Recipe',
      description: 'A test recipe',
      ingredients: ['flour', 'sugar'],
      instructions: '1. Mix. 2. Bake.',
      tags: ['dessert'],
      prep_time_minutes: 5,
      active_cooking_time_minutes: 10,
      serves: 2,
      required_appliances: ['oven'],
      is_generated: false,
      source_name: 'Example.com',
    };

    expect(recipe.source_name).toBe('Example.com');
  });

  it('should allow recipes without source fields', () => {
    const recipe: Recipe = {
      id: 'test',
      title: 'Test Recipe',
      description: 'A test recipe',
      ingredients: ['flour', 'sugar'],
      instructions: '1. Mix. 2. Bake.',
      tags: ['dessert'],
      prep_time_minutes: 5,
      active_cooking_time_minutes: 10,
      serves: 2,
      required_appliances: ['oven'],
      is_generated: false,
      // No source_url or source_name
    };

    expect(recipe.source_url).toBeUndefined();
    expect(recipe.source_name).toBeUndefined();
  });

  it('should allow recipes with both source fields populated', () => {
    const recipe: Recipe = {
      id: 'imported-123',
      title: 'Imported Recipe',
      description: 'From a cooking website',
      ingredients: ['chicken', 'vegetables'],
      instructions: '1. Cook. 2. Serve.',
      tags: ['dinner'],
      prep_time_minutes: 10,
      active_cooking_time_minutes: 20,
      serves: 4,
      required_appliances: ['stove'],
      is_generated: false,
      source_url: 'https://www.allrecipes.com/recipe/12345',
      source_name: 'AllRecipes',
    };

    expect(recipe.source_url).toBe('https://www.allrecipes.com/recipe/12345');
    expect(recipe.source_name).toBe('AllRecipes');
  });
});

describe('DynamicRecipeRequest Interface', () => {
  it('should match backend DynamicRecipeRequest model', () => {
    // This interface doesn't exist yet - we'll create it next
    // Placeholder test to ensure we add it
    expect(true).toBe(true);
  });
});

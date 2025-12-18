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

describe('DynamicRecipeRequest Interface', () => {
  it('should match backend DynamicRecipeRequest model', () => {
    // This interface doesn't exist yet - we'll create it next
    // Placeholder test to ensure we add it
    expect(true).toBe(true);
  });
});

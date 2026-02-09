/**
 * API barrel file — re-exports all domain modules.
 *
 * Existing imports like `from '@/lib/api'` resolve to this file
 * via the path alias. New feature code can import directly from
 * domain modules (e.g., `from '@/lib/api/recipes'`) to reduce
 * coupling and merge conflicts.
 */

// Base client (rarely needed directly)
export { APIError } from './client';

// All types
export type {
  // Household
  FamilyMember,
  DaycareRules,
  CookingPreferences,
  Preferences,
  OnboardingStatus,
  OnboardingData,
  OnboardingSubmission,
  HouseholdProfile,
  // Groceries
  GroceryItem,
  GroceryList,
  ProposedGroceryItem,
  VoiceParseResponse,
  ExcludedReceiptItem,
  ReceiptParseResponse,
  // Shopping
  ShoppingListItem,
  ShoppingList,
  TemplateItem,
  TemplateList,
  AddShoppingItemRequest,
  CreateTemplateRequest,
  // Recipes
  Recipe,
  RecipeRating,
  RecipeReadiness,
  DynamicRecipeRequest,
  GenerateFromTitleRequest,
  ImportFromUrlRequest,
  ImportedRecipeResponse,
  BoundingBox,
  TextRegion,
  OCRFromPhotoResponse,
  FieldConfidence,
  // Meal Plans
  MealPlanRequest,
  Meal,
  Day,
  MealPlan,
  AlternativeRecipesRequest,
  AlternativeRecipeSuggestion,
  SwapMealRequest,
  UndoSwapRequest,
  MoveMealRequest,
  AddMealRequest,
  DeleteMealRequest,
  // Admin
  WorkspaceSummary,
  InactiveWorkspace,
  ChromaSyncResult,
  ErrorLogEntry,
  WorkspaceErrorsResponse,
  OnboardingWorkspaceDetail,
  OnboardingAnalytics,
} from './types';

// API clients
export { householdAPI, onboardingAPI } from './household';
export { groceriesAPI, shoppingListAPI, templatesAPI } from './groceries';
export { recipesAPI } from './recipes';
export { mealPlansAPI, healthAPI } from './mealPlans';
export { adminAPI } from './admin';

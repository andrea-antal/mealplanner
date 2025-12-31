/**
 * API client for the Meal Planner backend
 * Base URL: http://localhost:8000
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Type definitions matching backend Pydantic models
export interface FamilyMember {
  name: string;
  age_group: 'toddler' | 'child' | 'adult';
  allergies: string[];
  dislikes: string[];
  preferences: string[];
}

export interface DaycareRules {
  no_nuts: boolean;
  no_honey: boolean;
  must_be_cold: boolean;
}

export interface CookingPreferences {
  available_appliances: string[];
  preferred_methods: string[];
  skill_level: 'beginner' | 'intermediate' | 'advanced';
  max_active_cooking_time_weeknight: number;
  max_active_cooking_time_weekend: number;
}

export interface Preferences {
  weeknight_priority: string;
  weekend_priority: string;
}

export interface HouseholdProfile {
  family_members: FamilyMember[];
  daycare_rules: DaycareRules;
  cooking_preferences: CookingPreferences;
  preferences: Preferences;
}

export interface GroceryItem {
  name: string;
  date_added: string; // ISO format
  purchase_date?: string; // ISO format, optional
  expiry_type?: 'expiry_date' | 'best_before_date';
  expiry_date?: string; // ISO format, optional
}

export interface GroceryList {
  items: GroceryItem[];
}

// Voice parsing types (Sprint 4 Phase 1)
export interface ProposedGroceryItem {
  name: string;
  date_added?: string;
  purchase_date?: string;
  expiry_type?: 'expiry_date' | 'best_before_date';
  expiry_date?: string;
  portion?: string;
  confidence: 'high' | 'medium' | 'low';
  notes?: string;
}

export interface VoiceParseResponse {
  proposed_items: ProposedGroceryItem[];
  transcription_used: string;
  warnings: string[];
}

export interface ReceiptParseResponse {
  proposed_items: ProposedGroceryItem[];
  detected_purchase_date: string | null;
  detected_store: string | null;
  warnings: string[];
}

export interface Recipe {
  id: string;
  title: string;
  description?: string;
  ingredients: string[];
  instructions: string;
  tags: string[];
  meal_types: string[];  // Required: breakfast, lunch, dinner, snack (at least one)
  prep_time_minutes: number;
  active_cooking_time_minutes: number;
  serves: number;
  required_appliances: string[];
  is_generated?: boolean;
  source_url?: string;
  source_name?: string;
}

export interface RecipeRating {
  recipe_id: string;
  ratings: Record<string, string | null>;
}

export interface DynamicRecipeRequest {
  ingredients: string[];
  portions?: Record<string, string>;
  meal_type?: string;
  cuisine_type?: string;
  cooking_time_max?: number;
  servings?: number;
}

export interface GenerateFromTitleRequest {
  recipe_title: string;
  meal_type?: string;
  servings?: number;
}

export interface ImportFromUrlRequest {
  url: string;
}

export interface ImportedRecipeResponse {
  recipe_data: Recipe;
  confidence: 'high' | 'medium' | 'low';
  missing_fields: string[];
  warnings: string[];
}

export interface MealPlanRequest {
  week_start_date: string; // ISO format: YYYY-MM-DD
  num_recipes?: number;
}

export interface Meal {
  meal_type: string;
  for_who: string;
  recipe_id: string | null;
  recipe_title: string;
  notes: string;
  previous_recipe_id?: string | null;
  previous_recipe_title?: string | null;
}

export interface Day {
  date: string;
  meals: Meal[];
}

export interface MealPlan {
  id?: string;
  week_start_date: string;
  days: Day[];
  created_at?: string;
  updated_at?: string;
}

// Meal plan customization types
export interface AlternativeRecipesRequest {
  meal_type: string;
  exclude_recipe_ids: string[];
  limit?: number;
}

export interface AlternativeRecipeSuggestion {
  recipe: Recipe;
  match_score: number;
  warnings: string[];
}

export interface SwapMealRequest {
  day_index: number;
  meal_index: number;
  new_recipe_id: string;
  new_recipe_title: string;
}

export interface UndoSwapRequest {
  day_index: number;
  meal_index: number;
}

// API Error handling
class APIError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'APIError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text();
    throw new APIError(response.status, `API Error ${response.status}: ${errorText}`);
  }
  return response.json();
}

// Household Profile API
export const householdAPI = {
  async getProfile(workspaceId: string): Promise<HouseholdProfile> {
    const response = await fetch(`${API_BASE_URL}/household/profile?workspace_id=${encodeURIComponent(workspaceId)}`);
    return handleResponse<HouseholdProfile>(response);
  },

  async updateProfile(workspaceId: string, profile: HouseholdProfile): Promise<HouseholdProfile> {
    const response = await fetch(`${API_BASE_URL}/household/profile?workspace_id=${encodeURIComponent(workspaceId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    });
    return handleResponse<HouseholdProfile>(response);
  },

  // Deprecated: Use groceriesAPI instead
  async getGroceries(workspaceId: string): Promise<GroceryList> {
    const response = await fetch(`${API_BASE_URL}/groceries?workspace_id=${encodeURIComponent(workspaceId)}`);
    return handleResponse<GroceryList>(response);
  },

  // Deprecated: Use groceriesAPI instead
  async updateGroceries(workspaceId: string, items: GroceryItem[]): Promise<GroceryList> {
    const response = await fetch(`${API_BASE_URL}/household/groceries?workspace_id=${encodeURIComponent(workspaceId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    });
    return handleResponse<GroceryList>(response);
  },
};

// Groceries API
export const groceriesAPI = {
  async getAll(workspaceId: string): Promise<GroceryList> {
    const response = await fetch(`${API_BASE_URL}/groceries?workspace_id=${encodeURIComponent(workspaceId)}`);
    return handleResponse<GroceryList>(response);
  },

  async add(workspaceId: string, item: GroceryItem): Promise<GroceryItem> {
    const response = await fetch(`${API_BASE_URL}/groceries?workspace_id=${encodeURIComponent(workspaceId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    return handleResponse<GroceryItem>(response);
  },

  async delete(workspaceId: string, name: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/groceries/${encodeURIComponent(name)}?workspace_id=${encodeURIComponent(workspaceId)}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new APIError(response.status, `Failed to delete grocery: ${errorText}`);
    }
  },

  async getExpiringSoon(workspaceId: string, daysAhead: number = 1): Promise<GroceryList> {
    const response = await fetch(`${API_BASE_URL}/groceries/expiring-soon?workspace_id=${encodeURIComponent(workspaceId)}&days_ahead=${daysAhead}`);
    return handleResponse<GroceryList>(response);
  },

  // Voice parsing methods (Sprint 4 Phase 1)
  async parseVoice(workspaceId: string, transcription: string): Promise<VoiceParseResponse> {
    const response = await fetch(`${API_BASE_URL}/groceries/parse-voice?workspace_id=${encodeURIComponent(workspaceId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcription }),
    });
    return handleResponse<VoiceParseResponse>(response);
  },

  async batchAdd(workspaceId: string, items: GroceryItem[]): Promise<GroceryList> {
    const response = await fetch(`${API_BASE_URL}/groceries/batch?workspace_id=${encodeURIComponent(workspaceId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    });
    return handleResponse<GroceryList>(response);
  },

  async batchDelete(workspaceId: string, itemNames: string[]): Promise<GroceryList> {
    const response = await fetch(`${API_BASE_URL}/groceries/batch?workspace_id=${encodeURIComponent(workspaceId)}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_names: itemNames }),
    });
    return handleResponse<GroceryList>(response);
  },

  // Receipt OCR methods (Sprint 4 Phase 2)
  async parseReceipt(workspaceId: string, imageBase64: string): Promise<ReceiptParseResponse> {
    const response = await fetch(`${API_BASE_URL}/groceries/parse-receipt?workspace_id=${encodeURIComponent(workspaceId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_base64: imageBase64 }),
    });
    return handleResponse<ReceiptParseResponse>(response);
  },
};

// Recipes API
export const recipesAPI = {
  async getAll(workspaceId: string): Promise<Recipe[]> {
    const response = await fetch(`${API_BASE_URL}/recipes?workspace_id=${encodeURIComponent(workspaceId)}`);
    return handleResponse<Recipe[]>(response);
  },

  async getById(workspaceId: string, id: string): Promise<Recipe> {
    const response = await fetch(`${API_BASE_URL}/recipes/${id}?workspace_id=${encodeURIComponent(workspaceId)}`);
    return handleResponse<Recipe>(response);
  },

  async create(workspaceId: string, recipe: Omit<Recipe, 'recipe_id'>): Promise<Recipe> {
    const response = await fetch(`${API_BASE_URL}/recipes?workspace_id=${encodeURIComponent(workspaceId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(recipe),
    });
    return handleResponse<Recipe>(response);
  },

  async update(workspaceId: string, id: string, recipe: Recipe): Promise<Recipe> {
    const response = await fetch(`${API_BASE_URL}/recipes/${id}?workspace_id=${encodeURIComponent(workspaceId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(recipe),
    });
    return handleResponse<Recipe>(response);
  },

  async delete(workspaceId: string, id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/recipes/${id}?workspace_id=${encodeURIComponent(workspaceId)}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new APIError(response.status, `Failed to delete recipe: ${errorText}`);
    }
    // DELETE returns 204 No Content, so no JSON to parse
  },

  async generateFromIngredients(workspaceId: string, request: DynamicRecipeRequest): Promise<Recipe> {
    const response = await fetch(`${API_BASE_URL}/recipes/generate?workspace_id=${encodeURIComponent(workspaceId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    return handleResponse<Recipe>(response);
  },

  async generateFromTitle(workspaceId: string, request: GenerateFromTitleRequest): Promise<Recipe> {
    const response = await fetch(`${API_BASE_URL}/recipes/generate-from-title?workspace_id=${encodeURIComponent(workspaceId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    return handleResponse<Recipe>(response);
  },

  async importFromUrl(workspaceId: string, url: string): Promise<ImportedRecipeResponse> {
    const response = await fetch(`${API_BASE_URL}/recipes/import-from-url?workspace_id=${encodeURIComponent(workspaceId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    return handleResponse<ImportedRecipeResponse>(response);
  },

  async getRatings(workspaceId: string, recipeId: string): Promise<Record<string, string | null>> {
    const response = await fetch(`${API_BASE_URL}/recipes/${recipeId}/ratings?workspace_id=${encodeURIComponent(workspaceId)}`);
    return handleResponse<Record<string, string | null>>(response);
  },

  async rateRecipe(
    workspaceId: string,
    recipeId: string,
    memberName: string,
    rating: string | null
  ): Promise<Record<string, string | null>> {
    const response = await fetch(`${API_BASE_URL}/recipes/${recipeId}/rating?workspace_id=${encodeURIComponent(workspaceId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ member_name: memberName, rating }),
    });
    return handleResponse<Record<string, string | null>>(response);
  },

  async getAllRatings(workspaceId: string): Promise<RecipeRating[]> {
    const response = await fetch(`${API_BASE_URL}/recipes/ratings?workspace_id=${encodeURIComponent(workspaceId)}`);
    return handleResponse<RecipeRating[]>(response);
  },

  async getFavorites(workspaceId: string, memberName: string): Promise<Recipe[]> {
    const response = await fetch(`${API_BASE_URL}/recipes/favorites/${encodeURIComponent(memberName)}?workspace_id=${encodeURIComponent(workspaceId)}`);
    return handleResponse<Recipe[]>(response);
  },

  async getPopular(workspaceId: string): Promise<Recipe[]> {
    const response = await fetch(`${API_BASE_URL}/recipes/popular?workspace_id=${encodeURIComponent(workspaceId)}`);
    return handleResponse<Recipe[]>(response);
  },
};

// Meal Plans API
export const mealPlansAPI = {
  async generate(workspaceId: string, request: MealPlanRequest, options?: { signal?: AbortSignal }): Promise<MealPlan> {
    const response = await fetch(`${API_BASE_URL}/meal-plans/generate?workspace_id=${encodeURIComponent(workspaceId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal: options?.signal,
    });
    return handleResponse<MealPlan>(response);
  },

  async getAll(workspaceId: string): Promise<MealPlan[]> {
    const response = await fetch(`${API_BASE_URL}/meal-plans?workspace_id=${encodeURIComponent(workspaceId)}`);
    return handleResponse<MealPlan[]>(response);
  },

  async getById(workspaceId: string, mealPlanId: string): Promise<MealPlan> {
    const response = await fetch(`${API_BASE_URL}/meal-plans/${encodeURIComponent(mealPlanId)}?workspace_id=${encodeURIComponent(workspaceId)}`);
    return handleResponse<MealPlan>(response);
  },

  async save(workspaceId: string, mealPlan: MealPlan): Promise<MealPlan> {
    const response = await fetch(`${API_BASE_URL}/meal-plans?workspace_id=${encodeURIComponent(workspaceId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mealPlan),
    });
    return handleResponse<MealPlan>(response);
  },

  async delete(workspaceId: string, mealPlanId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/meal-plans/${encodeURIComponent(mealPlanId)}?workspace_id=${encodeURIComponent(workspaceId)}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new APIError(response.status, `Failed to delete meal plan: ${errorText}`);
    }
  },

  async getAlternatives(workspaceId: string, request: AlternativeRecipesRequest): Promise<AlternativeRecipeSuggestion[]> {
    const response = await fetch(`${API_BASE_URL}/meal-plans/alternatives?workspace_id=${encodeURIComponent(workspaceId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    return handleResponse<AlternativeRecipeSuggestion[]>(response);
  },

  async swap(workspaceId: string, mealPlanId: string, request: SwapMealRequest): Promise<MealPlan> {
    const response = await fetch(`${API_BASE_URL}/meal-plans/${encodeURIComponent(mealPlanId)}?workspace_id=${encodeURIComponent(workspaceId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    return handleResponse<MealPlan>(response);
  },

  async undoSwap(workspaceId: string, mealPlanId: string, request: UndoSwapRequest): Promise<MealPlan> {
    const response = await fetch(`${API_BASE_URL}/meal-plans/${encodeURIComponent(mealPlanId)}/undo-swap?workspace_id=${encodeURIComponent(workspaceId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    return handleResponse<MealPlan>(response);
  },
};

// Health check
export const healthAPI = {
  async check(): Promise<{ status: string }> {
    const response = await fetch(`${API_BASE_URL}/health`);
    return handleResponse<{ status: string }>(response);
  },
};

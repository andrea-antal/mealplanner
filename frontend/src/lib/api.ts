/**
 * API client for the Meal Planner backend
 * Base URL: http://localhost:8000
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Admin key helper for protected admin endpoints
function getAdminKey(): string | null {
  return sessionStorage.getItem('adminKey');
}

// Type definitions matching backend Pydantic models
export interface FamilyMember {
  name: string;
  age_group: 'toddler' | 'child' | 'adult';
  allergies: string[];
  dislikes: string[];
  likes: string[];
  diet: string[];
}

export interface DaycareRules {
  no_nuts: boolean;
  no_peanuts_only: boolean;
  no_chocolate: boolean;
  no_honey: boolean;
  must_be_cold: boolean;
  custom_rules: string[]; // Custom rules like 'no spicy food'
  daycare_days: string[]; // 'monday', 'tuesday', etc.
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

export interface OnboardingStatus {
  completed: boolean;
  skipped_count: number;
  permanently_dismissed: boolean;
  completed_at: string | null;
}

export interface OnboardingData {
  cooking_frequency: string | null;
  kitchen_equipment_level: string | null;
  pantry_stock_level: string | null;
  primary_goal: string | null;
  cuisine_preferences: string[];
  dietary_goals: string | null;
  dietary_patterns: string[];
}

export interface OnboardingSubmission {
  skill_level: 'beginner' | 'intermediate' | 'advanced';
  cooking_frequency: 'daily' | 'few_times_week' | 'few_times_month' | 'rarely';
  kitchen_equipment_level: 'minimal' | 'basic' | 'standard' | 'well_equipped';
  pantry_stock_level: 'minimal' | 'moderate' | 'well_stocked';
  primary_goal: 'grocery_management' | 'recipe_library' | 'household_preferences' | 'meal_planning';
  cuisine_preferences: string[];
  dietary_goals: 'meal_prep' | 'cook_fresh' | 'mixed';
  dietary_patterns: string[];
  household_members: FamilyMember[];
  starter_content_choice?: 'meal_plan' | 'starter_recipes' | 'skip';
}

export interface HouseholdProfile {
  family_members: FamilyMember[];
  daycare_rules: DaycareRules;
  cooking_preferences: CookingPreferences;
  preferences: Preferences;
  onboarding_status?: OnboardingStatus;
  onboarding_data?: OnboardingData;
}

export interface GroceryItem {
  name: string;
  canonical_name?: string; // English name for cross-language matching
  date_added: string; // ISO format
  purchase_date?: string; // ISO format, optional
  expiry_type?: 'expiry_date' | 'best_before_date';
  expiry_date?: string; // ISO format, optional
  storage_location?: 'fridge' | 'pantry'; // defaults to 'fridge' on backend
}

export interface GroceryList {
  items: GroceryItem[];
}

// Shopping List types (Shopping List V1)
export interface ShoppingListItem {
  id: string;
  name: string;
  canonical_name?: string;
  quantity?: string;
  category?: string;
  is_checked: boolean;
  template_id?: string;
  added_at: string;
}

export interface ShoppingList {
  items: ShoppingListItem[];
}

export interface TemplateItem {
  id: string;
  name: string;
  canonical_name?: string;
  default_quantity?: string;
  category: string;
  frequency?: 'weekly' | 'biweekly' | 'monthly' | 'as_needed';
  last_purchased?: string;
  is_favorite: boolean;
  created_at: string;
}

export interface TemplateList {
  items: TemplateItem[];
}

export interface AddShoppingItemRequest {
  name: string;
  canonical_name?: string;
  quantity?: string;
  category?: string;
}

export interface CreateTemplateRequest {
  name: string;
  canonical_name?: string;
  category: string;
  default_quantity?: string;
  frequency?: 'weekly' | 'biweekly' | 'monthly' | 'as_needed';
  is_favorite?: boolean;
}

// Voice parsing types (Sprint 4 Phase 1)
export interface ProposedGroceryItem {
  name: string;
  canonical_name?: string; // English name for cross-language matching
  date_added?: string;
  purchase_date?: string;
  expiry_type?: 'expiry_date' | 'best_before_date';
  expiry_date?: string;
  storage_location?: 'fridge' | 'pantry';
  portion?: string;
  confidence: 'high' | 'medium' | 'low';
  notes?: string;
}

export interface VoiceParseResponse {
  proposed_items: ProposedGroceryItem[];
  transcription_used: string;
  warnings: string[];
}

export interface ExcludedReceiptItem {
  name: string;
  reason: string;
}

export interface ReceiptParseResponse {
  proposed_items: ProposedGroceryItem[];
  excluded_items: ExcludedReceiptItem[];
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
  notes?: string;
}

export interface RecipeRating {
  recipe_id: string;
  ratings: Record<string, string | null>;
}

// Recipe readiness check for meal plan generation (V1 empty state handling)
export interface RecipeReadiness {
  total_count: number;
  counts_by_meal_type: Record<string, number>;
  is_ready: boolean;
  missing_meal_types: string[];
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

// Photo OCR types (for parsing recipes from photos)
export interface BoundingBox {
  x: number;       // Left edge (0-1 normalized)
  y: number;       // Top edge (0-1 normalized)
  width: number;   // Width (0-1 normalized)
  height: number;  // Height (0-1 normalized)
}

export interface TextRegion {
  text: string;
  region_type: 'title' | 'ingredients' | 'instructions' | 'unknown';
  confidence: 'high' | 'medium' | 'low';
  bounding_box?: BoundingBox;
}

export interface OCRFromPhotoResponse {
  raw_text: string;
  text_regions: TextRegion[];
  ocr_confidence: 'high' | 'medium' | 'low';
  is_handwritten: boolean;
  warnings: string[];
}

export interface FieldConfidence {
  field_name: string;
  confidence: 'high' | 'medium' | 'low';
  bounding_box?: BoundingBox;
  extracted_value?: string;
  notes?: string;
}

export interface MealPlanRequest {
  week_start_date: string; // ISO format: YYYY-MM-DD
  num_recipes?: number;
  week_context?: string; // Optional user description of their week (schedule, preferences, etc.)
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

  // Storage location management
  async updateStorageLocation(
    workspaceId: string,
    itemNames: string[],
    storageLocation: 'fridge' | 'pantry'
  ): Promise<GroceryList> {
    const response = await fetch(`${API_BASE_URL}/groceries/storage-location?workspace_id=${encodeURIComponent(workspaceId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_names: itemNames, storage_location: storageLocation }),
    });
    return handleResponse<GroceryList>(response);
  },
};

// Shopping List API (Shopping List V1)
export const shoppingListAPI = {
  async getAll(workspaceId: string): Promise<ShoppingList> {
    const response = await fetch(`${API_BASE_URL}/shopping-list?workspace_id=${encodeURIComponent(workspaceId)}`);
    return handleResponse<ShoppingList>(response);
  },

  async addItem(workspaceId: string, item: AddShoppingItemRequest): Promise<ShoppingListItem> {
    const response = await fetch(`${API_BASE_URL}/shopping-list/items?workspace_id=${encodeURIComponent(workspaceId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    return handleResponse<ShoppingListItem>(response);
  },

  async updateItem(
    workspaceId: string,
    itemId: string,
    updates: { name?: string; quantity?: string; is_checked?: boolean }
  ): Promise<ShoppingListItem> {
    const response = await fetch(`${API_BASE_URL}/shopping-list/items/${itemId}?workspace_id=${encodeURIComponent(workspaceId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return handleResponse<ShoppingListItem>(response);
  },

  async deleteItem(workspaceId: string, itemId: string): Promise<ShoppingList> {
    const response = await fetch(`${API_BASE_URL}/shopping-list/items/${itemId}?workspace_id=${encodeURIComponent(workspaceId)}`, {
      method: 'DELETE',
    });
    return handleResponse<ShoppingList>(response);
  },

  async clearAll(workspaceId: string): Promise<ShoppingList> {
    const response = await fetch(`${API_BASE_URL}/shopping-list?workspace_id=${encodeURIComponent(workspaceId)}`, {
      method: 'DELETE',
    });
    return handleResponse<ShoppingList>(response);
  },

  async checkOff(workspaceId: string, itemId: string, addToInventory: boolean = false): Promise<ShoppingListItem> {
    const response = await fetch(`${API_BASE_URL}/shopping-list/check-off?workspace_id=${encodeURIComponent(workspaceId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_id: itemId, add_to_inventory: addToInventory }),
    });
    return handleResponse<ShoppingListItem>(response);
  },

  async addFromTemplates(workspaceId: string, templateIds: string[]): Promise<ShoppingList> {
    const response = await fetch(`${API_BASE_URL}/shopping-list/from-templates?workspace_id=${encodeURIComponent(workspaceId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template_ids: templateIds }),
    });
    return handleResponse<ShoppingList>(response);
  },

  async addFromFavorites(workspaceId: string): Promise<ShoppingList> {
    const response = await fetch(`${API_BASE_URL}/shopping-list/from-favorites?workspace_id=${encodeURIComponent(workspaceId)}`, {
      method: 'POST',
    });
    return handleResponse<ShoppingList>(response);
  },

  async batchAdd(workspaceId: string, items: AddShoppingItemRequest[]): Promise<ShoppingList> {
    const response = await fetch(
      `${API_BASE_URL}/shopping-list/items/batch?workspace_id=${encodeURIComponent(workspaceId)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      }
    );
    return handleResponse<ShoppingList>(response);
  },
};

// Shopping Templates API (Shopping List V1)
export const templatesAPI = {
  async getAll(workspaceId: string): Promise<TemplateList> {
    const response = await fetch(`${API_BASE_URL}/shopping-templates?workspace_id=${encodeURIComponent(workspaceId)}`);
    return handleResponse<TemplateList>(response);
  },

  async create(workspaceId: string, template: CreateTemplateRequest): Promise<TemplateItem> {
    const response = await fetch(`${API_BASE_URL}/shopping-templates?workspace_id=${encodeURIComponent(workspaceId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(template),
    });
    return handleResponse<TemplateItem>(response);
  },

  async update(
    workspaceId: string,
    templateId: string,
    updates: Partial<CreateTemplateRequest>
  ): Promise<TemplateItem> {
    const response = await fetch(`${API_BASE_URL}/shopping-templates/${templateId}?workspace_id=${encodeURIComponent(workspaceId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return handleResponse<TemplateItem>(response);
  },

  async delete(workspaceId: string, templateId: string): Promise<TemplateList> {
    const response = await fetch(`${API_BASE_URL}/shopping-templates/${templateId}?workspace_id=${encodeURIComponent(workspaceId)}`, {
      method: 'DELETE',
    });
    return handleResponse<TemplateList>(response);
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

  async parseFromText(workspaceId: string, text: string): Promise<ImportedRecipeResponse> {
    const response = await fetch(`${API_BASE_URL}/recipes/parse-text?workspace_id=${encodeURIComponent(workspaceId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    return handleResponse<ImportedRecipeResponse>(response);
  },

  async ocrFromPhoto(workspaceId: string, imageBase64: string): Promise<OCRFromPhotoResponse> {
    const response = await fetch(`${API_BASE_URL}/recipes/ocr-from-photo?workspace_id=${encodeURIComponent(workspaceId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_base64: imageBase64 }),
    });
    return handleResponse<OCRFromPhotoResponse>(response);
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

  async checkReadiness(workspaceId: string): Promise<RecipeReadiness> {
    const response = await fetch(`${API_BASE_URL}/meal-plans/readiness?workspace_id=${encodeURIComponent(workspaceId)}`);
    return handleResponse<RecipeReadiness>(response);
  },
};

// Health check
export const healthAPI = {
  async check(): Promise<{ status: string }> {
    const response = await fetch(`${API_BASE_URL}/health`);
    return handleResponse<{ status: string }>(response);
  },
};

// Onboarding API
export const onboardingAPI = {
  async getStatus(workspaceId: string): Promise<OnboardingStatus> {
    const response = await fetch(`${API_BASE_URL}/household/onboarding-status?workspace_id=${encodeURIComponent(workspaceId)}`);
    return handleResponse<OnboardingStatus>(response);
  },

  async submit(workspaceId: string, data: OnboardingSubmission): Promise<HouseholdProfile> {
    const response = await fetch(`${API_BASE_URL}/household/onboarding?workspace_id=${encodeURIComponent(workspaceId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<HouseholdProfile>(response);
  },

  async skip(workspaceId: string, permanent: boolean = false): Promise<OnboardingStatus> {
    const response = await fetch(`${API_BASE_URL}/household/onboarding/skip?workspace_id=${encodeURIComponent(workspaceId)}&permanent=${permanent}`, {
      method: 'POST',
    });
    return handleResponse<OnboardingStatus>(response);
  },
};

// Admin API types
export interface WorkspaceSummary {
  workspace_id: string;
  email: string | null;
  recipe_count: number;
  meal_plan_count: number;
  grocery_count: number;
  member_count: number;
  last_meal_plan_date: string | null;
  last_activity: string | null;
  api_requests: number;
  api_errors: number;
  last_api_call: string | null;
  claude_calls: number;
  openai_calls: number;
}

export interface InactiveWorkspace {
  workspace_id: string;
  last_activity: string | null;
  days_inactive: number | null;
}

export interface ChromaSyncResult {
  orphaned_removed: number;
  missing_added: number;
  total_in_sync: number;
}

export interface ErrorLogEntry {
  timestamp: string;
  method: string;
  path: string;
  workspace_id: string;
  status_code: number;
  duration_ms: number;
  error: string;
  response_body?: string;
  acknowledged: boolean;
}

export interface WorkspaceErrorsResponse {
  workspace_id: string;
  count: number;
  errors: ErrorLogEntry[];
}

// Onboarding Analytics types
export interface OnboardingWorkspaceDetail {
  workspace_id: string;
  email?: string | null;  // User email for display
  completed_at: string | null;
  answers: {
    skill_level: string | null;
    cooking_frequency: string | null;
    kitchen_equipment_level: string | null;
    pantry_stock_level: string | null;
    primary_goal: string | null;
    cuisine_preferences: string[];
    dietary_goals: string | null;
    dietary_patterns: string[];
    starter_content_choice: string | null;
  };
}

export interface OnboardingAnalytics {
  total_completions: number;
  total_started: number;
  total_skipped: number;
  completion_rate: number;
  skip_rate: number;
  answer_distributions: Record<string, Record<string, number>>;
  workspace_details: OnboardingWorkspaceDetail[];
}

// Admin API (workspace analytics and management)
// All admin endpoints require X-Admin-Key header
export const adminAPI = {
  async getWorkspacesSummary(): Promise<{ count: number; workspaces: WorkspaceSummary[] }> {
    const response = await fetch(`${API_BASE_URL}/workspaces/summary`, {
      headers: { 'X-Admin-Key': getAdminKey() || '' },
    });
    return handleResponse(response);
  },

  async getEmptyWorkspaces(): Promise<{ count: number; workspaces: string[] }> {
    const response = await fetch(`${API_BASE_URL}/admin/workspaces/empty`, {
      headers: { 'X-Admin-Key': getAdminKey() || '' },
    });
    return handleResponse(response);
  },

  async getInactiveWorkspaces(days: number = 30): Promise<{ count: number; days_threshold: number; workspaces: InactiveWorkspace[] }> {
    const response = await fetch(`${API_BASE_URL}/admin/workspaces/inactive?days=${days}`, {
      headers: { 'X-Admin-Key': getAdminKey() || '' },
    });
    return handleResponse(response);
  },

  async deleteWorkspace(workspaceId: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/admin/workspaces/${encodeURIComponent(workspaceId)}`, {
      method: 'DELETE',
      headers: { 'X-Admin-Key': getAdminKey() || '' },
    });
    return handleResponse(response);
  },

  async deleteAccount(workspaceId: string): Promise<{ message: string; details: { workspace_deleted: boolean; auth_user_deleted: boolean } }> {
    const response = await fetch(`${API_BASE_URL}/admin/accounts/${encodeURIComponent(workspaceId)}`, {
      method: 'DELETE',
      headers: { 'X-Admin-Key': getAdminKey() || '' },
    });
    return handleResponse(response);
  },

  async syncAllWorkspaces(): Promise<{ message: string; results: Record<string, ChromaSyncResult> }> {
    const response = await fetch(`${API_BASE_URL}/recipes/admin/sync-all-workspaces`, {
      method: 'POST',
      headers: { 'X-Admin-Key': getAdminKey() || '' },
    });
    return handleResponse(response);
  },

  async syncWorkspace(workspaceId: string): Promise<ChromaSyncResult> {
    const response = await fetch(`${API_BASE_URL}/recipes/admin/sync-chroma?workspace_id=${encodeURIComponent(workspaceId)}`, {
      method: 'POST',
      headers: { 'X-Admin-Key': getAdminKey() || '' },
    });
    return handleResponse(response);
  },

  async getWorkspaceErrors(
    workspaceId: string,
    limit: number = 50,
    includeAcknowledged: boolean = false
  ): Promise<WorkspaceErrorsResponse> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      include_acknowledged: includeAcknowledged.toString(),
    });
    const response = await fetch(
      `${API_BASE_URL}/logs/errors/${encodeURIComponent(workspaceId)}?${params}`,
      { headers: { 'X-Admin-Key': getAdminKey() || '' } }
    );
    return handleResponse(response);
  },

  async clearWorkspaceErrors(workspaceId: string): Promise<{ message: string; cleared_before: string }> {
    const response = await fetch(
      `${API_BASE_URL}/logs/errors/${encodeURIComponent(workspaceId)}/clear`,
      { method: 'POST', headers: { 'X-Admin-Key': getAdminKey() || '' } }
    );
    return handleResponse(response);
  },

  async getOnboardingAnalytics(startDate?: string, endDate?: string): Promise<OnboardingAnalytics> {
    const params = new URLSearchParams();
    if (startDate) params.set('start_date', startDate);
    if (endDate) params.set('end_date', endDate);
    const queryString = params.toString();
    const response = await fetch(
      `${API_BASE_URL}/admin/onboarding/analytics${queryString ? `?${queryString}` : ''}`,
      { headers: { 'X-Admin-Key': getAdminKey() || '' } }
    );
    return handleResponse(response);
  },
};

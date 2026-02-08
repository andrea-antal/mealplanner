/**
 * Shared type definitions matching backend Pydantic models.
 * Organized by domain for clarity, but all exported from one place.
 */

// ── Household ────────────────────────────────────────────────────────

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
  custom_rules: string[];
  daycare_days: string[];
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

// ── Groceries ────────────────────────────────────────────────────────

export interface GroceryItem {
  name: string;
  canonical_name?: string;
  date_added: string;
  purchase_date?: string;
  expiry_type?: 'expiry_date' | 'best_before_date';
  expiry_date?: string;
  storage_location?: 'fridge' | 'pantry';
}

export interface GroceryList {
  items: GroceryItem[];
}

export interface ProposedGroceryItem {
  name: string;
  canonical_name?: string;
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

// ── Shopping List ────────────────────────────────────────────────────

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

// ── Recipes ──────────────────────────────────────────────────────────

export interface Recipe {
  id: string;
  title: string;
  description?: string;
  ingredients: string[];
  instructions: string;
  tags: string[];
  meal_types: string[];
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

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
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

// ── Meal Plans ───────────────────────────────────────────────────────

export interface MealPlanRequest {
  week_start_date: string;
  num_recipes?: number;
  week_context?: string;
}

export interface Meal {
  meal_type: string;
  for_who: string;
  recipe_id: string | null;
  recipe_title: string;
  notes: string;
  is_daycare?: boolean;
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

export interface MoveMealRequest {
  source_day_index: number;
  source_meal_index: number;
  target_day_index: number;
  target_meal_index: number;
}

export interface AddMealRequest {
  day_index: number;
  meal_type: string;
  recipe_id: string;
  recipe_title: string;
  for_who?: string;
  notes?: string;
  is_daycare?: boolean;
}

export interface DeleteMealRequest {
  day_index: number;
  meal_index: number;
}

// ── Admin ────────────────────────────────────────────────────────────

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

export interface OnboardingWorkspaceDetail {
  workspace_id: string;
  email?: string | null;
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

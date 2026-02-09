import { API_BASE_URL, APIError, handleResponse } from './client';
import type {
  MealPlan,
  MealPlanRequest,
  GenerationConfig,
  RecipeReadiness,
  AlternativeRecipesRequest,
  AlternativeRecipeSuggestion,
  SwapMealRequest,
  UndoSwapRequest,
  MoveMealRequest,
  AddMealRequest,
  DeleteMealRequest,
} from './types';

export const mealPlansAPI = {
  async generate(workspaceId: string, request: MealPlanRequest, options?: { signal?: AbortSignal; config?: GenerationConfig }): Promise<MealPlan> {
    const body: Record<string, unknown> = { ...request };
    if (options?.config) {
      body.generation_config = options.config;
    }
    const response = await fetch(`${API_BASE_URL}/meal-plans/generate?workspace_id=${encodeURIComponent(workspaceId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
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

  async moveMeal(workspaceId: string, mealPlanId: string, request: MoveMealRequest): Promise<MealPlan> {
    const response = await fetch(`${API_BASE_URL}/meal-plans/${encodeURIComponent(mealPlanId)}/move-meal?workspace_id=${encodeURIComponent(workspaceId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    return handleResponse<MealPlan>(response);
  },

  async addMeal(workspaceId: string, mealPlanId: string, request: AddMealRequest): Promise<MealPlan> {
    const response = await fetch(`${API_BASE_URL}/meal-plans/${encodeURIComponent(mealPlanId)}/add-meal?workspace_id=${encodeURIComponent(workspaceId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    return handleResponse<MealPlan>(response);
  },

  async deleteMeal(workspaceId: string, mealPlanId: string, request: DeleteMealRequest): Promise<MealPlan> {
    const response = await fetch(`${API_BASE_URL}/meal-plans/${encodeURIComponent(mealPlanId)}/delete-meal?workspace_id=${encodeURIComponent(workspaceId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    return handleResponse<MealPlan>(response);
  },

  async getByWeek(workspaceId: string, weekStartDate: string): Promise<MealPlan | null> {
    const response = await fetch(`${API_BASE_URL}/meal-plans/week/${encodeURIComponent(weekStartDate)}?workspace_id=${encodeURIComponent(workspaceId)}`);
    if (response.status === 404) {
      return null;
    }
    return handleResponse<MealPlan>(response);
  },

  async listWeeks(workspaceId: string): Promise<string[]> {
    const response = await fetch(`${API_BASE_URL}/meal-plans/weeks?workspace_id=${encodeURIComponent(workspaceId)}`);
    return handleResponse<string[]>(response);
  },
};

export const healthAPI = {
  async check(): Promise<{ status: string }> {
    const response = await fetch(`${API_BASE_URL}/health`);
    return handleResponse<{ status: string }>(response);
  },
};

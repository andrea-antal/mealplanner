import { API_BASE_URL, APIError, handleResponse } from './client';
import type {
  Recipe,
  RecipeRating,
  DynamicRecipeRequest,
  GenerateFromTitleRequest,
  ImportedRecipeResponse,
  OCRFromPhotoResponse,
} from './types';

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

  async uploadPhoto(recipeId: string, workspaceId: string, file: File): Promise<{photo_url: string}> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(
      `${API_BASE_URL}/recipes/${recipeId}/photo?workspace_id=${encodeURIComponent(workspaceId)}`,
      {
        method: 'POST',
        body: formData,
      }
    );
    return handleResponse<{photo_url: string}>(response);
  },

  async deletePhoto(recipeId: string, workspaceId: string): Promise<void> {
    const response = await fetch(
      `${API_BASE_URL}/recipes/${recipeId}/photo?workspace_id=${encodeURIComponent(workspaceId)}`,
      {
        method: 'DELETE',
      }
    );
    if (!response.ok) {
      const errorText = await response.text();
      throw new APIError(response.status, `Failed to delete photo: ${errorText}`);
    }
  },
};

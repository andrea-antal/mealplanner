import { API_BASE_URL, handleResponse } from './client';
import type { HouseholdProfile, GroceryItem, GroceryList, OnboardingStatus, OnboardingSubmission } from './types';

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

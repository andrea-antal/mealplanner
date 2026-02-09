import { API_BASE_URL, getAdminKey, handleResponse } from './client';
import type {
  WorkspaceSummary,
  InactiveWorkspace,
  ChromaSyncResult,
  WorkspaceErrorsResponse,
  OnboardingAnalytics,
} from './types';

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

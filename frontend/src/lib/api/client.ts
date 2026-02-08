/**
 * Base API client — shared fetch logic, error handling, and config.
 * All domain modules import from here.
 */

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export class APIError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'APIError';
  }
}

export async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text();
    throw new APIError(response.status, `API Error ${response.status}: ${errorText}`);
  }
  return response.json();
}

export function getAdminKey(): string | null {
  return sessionStorage.getItem('adminKey');
}

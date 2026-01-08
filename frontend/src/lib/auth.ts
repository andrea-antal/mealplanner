/**
 * Authentication utilities for magic link login.
 *
 * Stores JWT tokens in localStorage and provides auth state management.
 * Works alongside the existing workspace system during migration.
 */

const TOKEN_STORAGE_KEY = 'mealplanner_auth_token';
const USER_STORAGE_KEY = 'mealplanner_auth_user';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface AuthUser {
  email: string;
  workspace_id: string;
  created_at?: string;
  last_login?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  token: string | null;
}

/**
 * Get the stored auth token.
 */
export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to read auth token:', error);
    return null;
  }
}

/**
 * Get the stored auth user.
 */
export function getAuthUser(): AuthUser | null {
  try {
    const userJson = localStorage.getItem(USER_STORAGE_KEY);
    if (!userJson) return null;
    return JSON.parse(userJson);
  } catch (error) {
    console.error('Failed to read auth user:', error);
    return null;
  }
}

/**
 * Get the current auth state.
 */
export function getAuthState(): AuthState {
  const token = getAuthToken();
  const user = getAuthUser();
  return {
    isAuthenticated: !!token && !!user,
    token,
    user,
  };
}

/**
 * Store auth credentials after successful login.
 */
export function setAuthCredentials(token: string, user: AuthUser): void {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));

    // Also set the workspace for backwards compatibility with existing code
    localStorage.setItem('mealplanner_current_workspace', user.workspace_id);
  } catch (error) {
    console.error('Failed to save auth credentials:', error);
    throw new Error('Failed to save login. Please check your browser settings.');
  }
}

/**
 * Clear auth credentials (logout).
 */
export function clearAuthCredentials(): void {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    // Note: We don't clear workspace for backwards compatibility
  } catch (error) {
    console.error('Failed to clear auth credentials:', error);
  }
}

/**
 * Request a magic link to be sent to the user's email.
 */
export async function requestMagicLink(email: string): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/magic-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        message: error.detail || 'Failed to send magic link',
      };
    }

    const data = await response.json();
    return {
      success: true,
      message: data.message || 'Check your email for the login link.',
    };
  } catch (error) {
    console.error('Magic link request failed:', error);
    return {
      success: false,
      message: 'Network error. Please try again.',
    };
  }
}

/**
 * Verify a magic link token and get session credentials.
 */
export async function verifyMagicLink(token: string): Promise<{
  success: boolean;
  message: string;
  user?: AuthUser;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/verify?token=${encodeURIComponent(token)}`);

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        message: error.detail || 'Invalid or expired link',
      };
    }

    const data = await response.json();

    // Store credentials
    setAuthCredentials(data.access_token, {
      email: data.email,
      workspace_id: data.workspace_id,
    });

    return {
      success: true,
      message: 'Login successful!',
      user: {
        email: data.email,
        workspace_id: data.workspace_id,
      },
    };
  } catch (error) {
    console.error('Magic link verification failed:', error);
    return {
      success: false,
      message: 'Network error. Please try again.',
    };
  }
}

/**
 * Get current user info from the server.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = getAuthToken();
  if (!token) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      // Token might be expired
      if (response.status === 401) {
        clearAuthCredentials();
      }
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to get current user:', error);
    return null;
  }
}

/**
 * Logout the current user.
 */
export async function logout(): Promise<void> {
  const token = getAuthToken();

  // Call logout endpoint (optional, mainly for logging)
  if (token) {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (error) {
      // Ignore errors - we're logging out anyway
    }
  }

  clearAuthCredentials();
}

/**
 * Get headers for authenticated API requests.
 * Returns Authorization header if logged in.
 */
export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

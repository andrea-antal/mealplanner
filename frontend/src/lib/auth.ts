/**
 * Authentication utilities using Supabase Auth.
 *
 * Provides auth state management with magic link login.
 */
import { supabase } from './supabase';
import { Session, User } from '@supabase/supabase-js';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface AuthUser {
  id: string;
  email: string;
  workspace_id: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  session: Session | null;
}

/**
 * Get the current Supabase session.
 */
export async function getSession(): Promise<Session | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

/**
 * Get the current access token for API requests.
 */
export async function getAccessToken(): Promise<string | null> {
  const session = await getSession();
  return session?.access_token || null;
}

/**
 * Convert Supabase User to our AuthUser format.
 * Fetches workspace_id from the profiles table.
 */
async function userToAuthUser(user: User): Promise<AuthUser> {
  // Get workspace_id from profiles table
  const { data: profile } = await supabase
    .from('profiles')
    .select('workspace_id')
    .eq('id', user.id)
    .single();

  const workspace_id = profile?.workspace_id || emailToWorkspaceId(user.email || '');

  // Store workspace for backwards compatibility
  localStorage.setItem('mealplanner_current_workspace', workspace_id);

  return {
    id: user.id,
    email: user.email || '',
    workspace_id,
  };
}

/**
 * Convert email to workspace_id (same logic as backend).
 */
function emailToWorkspaceId(email: string): string {
  const username = email.split('@')[0];
  return username.toLowerCase().replace(/[^a-z0-9]/g, '-');
}

/**
 * Validate an invite code before signup.
 */
export async function validateInviteCode(
  inviteCode: string,
  email: string
): Promise<{ valid: boolean; message: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/validate-invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invite_code: inviteCode, email }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { valid: false, message: error.detail || 'Invalid invite code' };
    }

    return { valid: true, message: 'Invite code is valid' };
  } catch (error) {
    console.error('Invite validation failed:', error);
    return { valid: false, message: 'Network error. Please try again.' };
  }
}

/**
 * Use (redeem) an invite code after signup.
 */
export async function useInviteCode(
  inviteCode: string,
  email: string
): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/use-invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invite_code: inviteCode, email }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, message: error.detail || 'Failed to redeem invite code' };
    }

    return { success: true, message: 'Invite code redeemed' };
  } catch (error) {
    console.error('Invite redemption failed:', error);
    return { success: false, message: 'Network error. Please try again.' };
  }
}

/**
 * Check if a user exists (has used the app before).
 */
async function checkUserExists(email: string): Promise<boolean> {
  // We check if they have a profile in the database
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single();

  return !!data;
}

/**
 * Request a magic link to be sent to the user's email.
 * New users must validate an invite code first.
 */
export async function requestMagicLink(
  email: string,
  inviteCode?: string
): Promise<{ success: boolean; message: string; needsInviteCode?: boolean }> {
  try {
    // Check if this is a new user
    const userExists = await checkUserExists(email);

    if (!userExists) {
      // New user - require invite code
      if (!inviteCode) {
        return {
          success: false,
          message: 'Invite code required for new accounts',
          needsInviteCode: true,
        };
      }

      // Validate the invite code
      const validation = await validateInviteCode(inviteCode, email);
      if (!validation.valid) {
        return {
          success: false,
          message: validation.message,
        };
      }
    }

    // Get the redirect URL based on environment
    const redirectTo = window.location.origin + '/auth/callback';

    // Send magic link via Supabase
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          invite_code: inviteCode, // Store invite code to redeem after verification
        },
      },
    });

    if (error) {
      console.error('Supabase magic link error:', error);
      return {
        success: false,
        message: error.message || 'Failed to send magic link',
      };
    }

    return {
      success: true,
      message: 'Check your email for the login link.',
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
 * Handle the auth callback after clicking magic link.
 * This is called on the /auth/callback route.
 */
export async function handleAuthCallback(): Promise<{
  success: boolean;
  user?: AuthUser;
  message: string;
}> {
  try {
    // Get session from URL (Supabase handles the token exchange)
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      console.error('Auth callback error:', error);
      return { success: false, message: error.message };
    }

    if (!session?.user) {
      return { success: false, message: 'No session found' };
    }

    // Check if this is a new user with an invite code to redeem
    const inviteCode = session.user.user_metadata?.invite_code;
    if (inviteCode) {
      // Redeem the invite code
      await useInviteCode(inviteCode, session.user.email || '');
    }

    const authUser = await userToAuthUser(session.user);

    return {
      success: true,
      user: authUser,
      message: 'Login successful!',
    };
  } catch (error) {
    console.error('Auth callback failed:', error);
    return { success: false, message: 'Login failed. Please try again.' };
  }
}

/**
 * Get the current authenticated user.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) {
    return null;
  }

  try {
    return await userToAuthUser(session.user);
  } catch (error) {
    console.error('Failed to get current user:', error);
    return null;
  }
}

/**
 * Logout the current user.
 */
export async function logout(): Promise<void> {
  await supabase.auth.signOut();
  localStorage.removeItem('mealplanner_current_workspace');
}

/**
 * Get headers for authenticated API requests.
 * Returns Authorization header with Supabase access token.
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getAccessToken();
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

/**
 * Subscribe to auth state changes.
 */
export function onAuthStateChange(
  callback: (user: AuthUser | null) => void
): () => void {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      if (session?.user) {
        const authUser = await userToAuthUser(session.user);
        callback(authUser);
      } else {
        callback(null);
      }
    }
  );

  return () => subscription.unsubscribe();
}

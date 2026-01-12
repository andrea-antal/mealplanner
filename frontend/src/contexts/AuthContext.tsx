/**
 * Authentication context for React components.
 *
 * Provides auth state and actions to the component tree.
 * Uses Supabase Auth for authentication.
 */
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session } from '@supabase/supabase-js';
import {
  AuthUser,
  getCurrentUser,
  requestMagicLink,
  logout as logoutUser,
  onAuthStateChange,
  getSession,
} from '@/lib/auth';

interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  session: Session | null;
}

interface AuthContextType extends AuthState {
  login: (email: string, inviteCode?: string) => Promise<{ success: boolean; message: string; needsInviteCode?: boolean }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    session: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state and subscribe to changes
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const session = await getSession();
        if (session && mounted) {
          const user = await getCurrentUser();
          setAuthState({
            isAuthenticated: !!user,
            user,
            session,
          });
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initAuth();

    // Subscribe to auth state changes
    const unsubscribe = onAuthStateChange(async (user) => {
      if (mounted) {
        const session = await getSession();
        setAuthState({
          isAuthenticated: !!user,
          user,
          session,
        });
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const login = async (email: string, inviteCode?: string) => {
    return requestMagicLink(email, inviteCode);
  };

  const logout = async () => {
    await logoutUser();
    setAuthState({
      isAuthenticated: false,
      user: null,
      session: null,
    });
  };

  const refreshUser = async () => {
    const user = await getCurrentUser();
    const session = await getSession();
    setAuthState({
      isAuthenticated: !!user,
      user,
      session,
    });
  };

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        login,
        logout,
        refreshUser,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

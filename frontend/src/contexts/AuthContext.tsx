/**
 * Authentication context for React components.
 *
 * Provides auth state and actions to the component tree.
 */
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  AuthState,
  AuthUser,
  getAuthState,
  requestMagicLink,
  verifyMagicLink,
  logout as logoutUser,
  getCurrentUser,
} from '@/lib/auth';

interface AuthContextType extends AuthState {
  login: (email: string) => Promise<{ success: boolean; message: string }>;
  verify: (token: string) => Promise<{ success: boolean; message: string; user?: AuthUser }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>(getAuthState);
  const [isLoading, setIsLoading] = useState(true);

  // Check auth state on mount
  useEffect(() => {
    const checkAuth = async () => {
      const state = getAuthState();
      if (state.isAuthenticated) {
        // Verify token is still valid by fetching user
        const user = await getCurrentUser();
        if (user) {
          setAuthState({
            isAuthenticated: true,
            token: state.token,
            user,
          });
        } else {
          // Token invalid, clear state
          setAuthState({
            isAuthenticated: false,
            token: null,
            user: null,
          });
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email: string) => {
    return requestMagicLink(email);
  };

  const verify = async (token: string) => {
    const result = await verifyMagicLink(token);
    if (result.success && result.user) {
      setAuthState({
        isAuthenticated: true,
        token: getAuthState().token,
        user: result.user,
      });
    }
    return result;
  };

  const logout = async () => {
    await logoutUser();
    setAuthState({
      isAuthenticated: false,
      token: null,
      user: null,
    });
  };

  const refreshUser = async () => {
    const user = await getCurrentUser();
    if (user) {
      setAuthState((prev) => ({
        ...prev,
        user,
      }));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        login,
        verify,
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

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface WorkspaceGuardProps {
  children: React.ReactNode;
}

/**
 * WorkspaceGuard protects routes that require authentication.
 *
 * If the user is not authenticated, redirects to /login.
 * Uses the authenticated user's UUID as workspace_id.
 *
 * @example
 * <Route path="/groceries" element={
 *   <WorkspaceGuard>
 *     <Groceries />
 *   </WorkspaceGuard>
 * } />
 */
export function WorkspaceGuard({ children }: WorkspaceGuardProps) {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, user } = useAuth();

  useEffect(() => {
    // Only redirect after auth check completes
    if (!isLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isLoading, isAuthenticated, navigate]);

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Don't render children if not authenticated (will redirect)
  if (!isAuthenticated || !user?.workspace_id) {
    return null;
  }

  return <>{children}</>;
}

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentWorkspace } from '@/lib/workspace';

interface WorkspaceGuardProps {
  children: React.ReactNode;
}

/**
 * WorkspaceGuard protects routes that require a workspace to be set.
 *
 * If no workspace is found in localStorage, it redirects to the home page (/)
 * where the WorkspaceSelector modal will prompt the user to select a workspace.
 *
 * This prevents users from accessing protected pages via direct links or
 * bookmarks without first setting a workspace.
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
  const [isChecking, setIsChecking] = useState(true);
  const workspaceId = getCurrentWorkspace();

  useEffect(() => {
    if (!workspaceId) {
      // No workspace set - redirect to home page where WorkspaceSelector will appear
      navigate('/');
    } else {
      // Workspace is set - allow rendering
      setIsChecking(false);
    }
  }, [workspaceId, navigate]);

  // Don't render children during redirect or if no workspace
  if (isChecking || !workspaceId) {
    return null;
  }

  return <>{children}</>;
}

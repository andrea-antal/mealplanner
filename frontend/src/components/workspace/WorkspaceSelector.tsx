import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Users } from 'lucide-react';
import { isValidWorkspaceId, setCurrentWorkspace } from '@/lib/workspace';

interface WorkspaceSelectorProps {
  /**
   * Whether the dialog is open.
   * When workspace is not set, this should typically be true and non-dismissible.
   */
  open: boolean;
  /**
   * Callback when workspace is selected and saved.
   * @param workspaceId - The selected workspace ID
   */
  onWorkspaceSelected: (workspaceId: string) => void;
}

/**
 * WorkspaceSelector modal for first-time users.
 *
 * Prompts users to enter a workspace name on their first visit.
 * The workspace ID is stored in localStorage and used for all API requests
 * to ensure data isolation between beta testers.
 *
 * @example
 * const [workspace, setWorkspace] = useState(getCurrentWorkspace());
 *
 * if (!workspace) {
 *   return (
 *     <WorkspaceSelector
 *       open={true}
 *       onWorkspaceSelected={(id) => setWorkspace(id)}
 *     />
 *   );
 * }
 */
export function WorkspaceSelector({ open, onWorkspaceSelected }: WorkspaceSelectorProps) {
  const [workspaceId, setWorkspaceIdInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Automatically convert to lowercase and replace spaces with hyphens for better UX
    let value = e.target.value.toLowerCase();
    value = value.replace(/\s/g, '-'); // Replace all spaces with hyphens
    value = value.slice(0, 50); // Cap at 50 characters
    setWorkspaceIdInput(value);

    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate workspace ID
    if (!workspaceId.trim()) {
      setError('Workspace name is required');
      return;
    }

    if (!isValidWorkspaceId(workspaceId)) {
      setError('Workspace name must be lowercase letters, numbers, and hyphens only (1-50 characters)');
      return;
    }

    try {
      // Save to localStorage
      setCurrentWorkspace(workspaceId);

      // Notify parent component
      onWorkspaceSelected(workspaceId);
    } catch (err) {
      setError('Failed to save workspace. Please try again.');
      console.error('Error saving workspace:', err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {/* Prevent closing when workspace not set */}}>
      <DialogContent className="max-w-md [&>button]:hidden" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Welcome to Meal Planner
          </DialogTitle>
          <DialogDescription>
            Choose a workspace name to get started
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>For beta testers:</strong> Pick a unique name (e.g., "andrea", "sarah", "test-user-1").
                This keeps your data separate from other testers.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="workspace-input">Workspace Name</Label>
              <Input
                id="workspace-input"
                type="text"
                placeholder="e.g., andrea"
                value={workspaceId}
                onChange={handleInputChange}
                maxLength={50}
                autoFocus
                className={error ? 'border-red-500' : ''}
              />
              <p className="text-xs text-muted-foreground">
                Lowercase letters, numbers, and hyphens only (max 50 characters, spaces auto-convert to hyphens)
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="font-medium">Important:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Your workspace name is stored locally in your browser</li>
                <li>To access your data again, use the same workspace name</li>
                <li>Don't share your workspace name if you want your data private</li>
              </ul>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button type="submit" variant="default">
              Get Started
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

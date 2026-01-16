import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { RecipeTag } from './RecipeTag';
import { RecipeRating } from './RecipeRating';
import type { Recipe } from '@/lib/api';
import { householdAPI, recipesAPI } from '@/lib/api';
import { getCurrentWorkspace } from '@/lib/workspace';
import { Clock, Users, Trash2, RefreshCw, ExternalLink, Pencil, StickyNote, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { RecipeForm } from './RecipeForm';
import { toast } from 'sonner';

interface RecipeModalProps {
  recipe: Recipe | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete?: (recipeId: string) => void;
}

// Helper function to extract domain from URL
function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

// URL validation helper to prevent XSS
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// Render text with clickable URLs
function renderTextWithLinks(text: string): React.ReactNode {
  // Match URLs in text
  const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/g;
  const parts = text.split(urlRegex);

  return parts.map((part, index) => {
    if (urlRegex.test(part)) {
      // Reset regex state after test
      urlRegex.lastIndex = 0;
      if (isValidUrl(part)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline break-all"
          >
            {part}
          </a>
        );
      }
    }
    return part;
  });
}

export function RecipeModal({ recipe, open, onOpenChange, onDelete }: RecipeModalProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const workspaceId = getCurrentWorkspace()!;
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);

  // Fetch household members
  const { data: household } = useQuery({
    queryKey: ['householdProfile', workspaceId],
    queryFn: () => householdAPI.getProfile(workspaceId),
  });

  // Fetch current ratings for this recipe
  const { data: ratings } = useQuery({
    queryKey: ['recipeRatings', workspaceId, recipe?.id],
    queryFn: () => recipesAPI.getRatings(workspaceId, recipe!.id),
    enabled: !!recipe,
  });

  // Mutation for rating updates
  const rateMutation = useMutation({
    mutationFn: ({ recipeId, memberName, rating }: { recipeId: string; memberName: string; rating: string | null }) =>
      recipesAPI.rateRecipe(workspaceId, recipeId, memberName, rating),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipeRatings', workspaceId, recipe?.id] });
      toast.success('Rating saved!');
    },
    onError: (error: Error) => {
      toast.error(`Failed to save rating: ${error.message}`);
    },
  });

  const handleRate = (recipeId: string, memberName: string, rating: string | null) => {
    rateMutation.mutate({ recipeId, memberName, rating });
  };

  // Update mutation for editing recipes
  const updateMutation = useMutation({
    mutationFn: (updatedRecipe: Recipe) =>
      recipesAPI.update(workspaceId, updatedRecipe.id, updatedRecipe),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes', workspaceId] });
      setShowEditForm(false);
      toast.success('Recipe updated!');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update recipe: ${error.message}`);
    },
  });

  const handleEditSubmit = (updatedRecipe: Recipe) => {
    updateMutation.mutate(updatedRecipe);
  };

  if (!recipe) return null;

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete "${recipe.title}"?`)) {
      onDelete?.(recipe.id);
      onOpenChange(false);
    }
  };

  const handleRegenerateConfirm = () => {
    setShowRegenerateDialog(false);
    onDelete?.(recipe.id); // Delete the current recipe
    onOpenChange(false); // Close the recipe modal
    toast.info('Select ingredients from your grocery list to generate a new recipe');
    navigate('/groceries'); // Navigate to groceries page to select fresh ingredients
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
        {/* Actions menu - positioned to align with close button */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="absolute right-12 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Recipe actions</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setShowEditForm(true)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            {recipe.is_generated && (
              <DropdownMenuItem onClick={() => setShowRegenerateDialog(true)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Regenerate
              </DropdownMenuItem>
            )}
            {onDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <DialogHeader className="px-6 pt-6 pb-4 pr-20 shrink-0">
          <DialogTitle className="font-display text-2xl">{recipe.title}</DialogTitle>
        </DialogHeader>

        {/* Top Half: Recipe Details (Scrollable) */}
        <div className="flex-1 overflow-y-auto px-6 space-y-6">
          {/* Description */}
          {recipe.description && (
            <p className="text-muted-foreground">{recipe.description}</p>
          )}

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {recipe.tags.map((tag) => (
              <RecipeTag key={tag} tag={tag} />
            ))}
          </div>

          {/* Quick Info */}
          <div className="flex flex-wrap gap-6 py-4 border-y border-border">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Prep Time</p>
                <p className="font-medium">{recipe.prep_time_minutes} min</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Cook Time</p>
                <p className="font-medium">{recipe.active_cooking_time_minutes} min</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Serves</p>
                <p className="font-medium">{recipe.serves} people</p>
              </div>
            </div>
          </div>

          {/* Ingredients */}
          <div>
            <h4 className="font-display font-semibold text-lg mb-3">Ingredients</h4>
            <ul className="space-y-2">
              {recipe.ingredients.map((ingredient, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary mt-2 shrink-0" />
                  <span>{ingredient}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Instructions */}
          <div className="pb-4">
            <h4 className="font-display font-semibold text-lg mb-3">Instructions</h4>
            <div className="space-y-3">
              {recipe.instructions.split(/\d+\.\s+/).filter(step => step.trim()).map((step, idx) => (
                <div key={idx} className="flex gap-3 text-sm">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground text-xs font-medium">
                    {idx + 1}
                  </span>
                  <p className="pt-0.5">{step.trim()}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Notes Section */}
          {recipe.notes && (
            <div className="pb-4">
              <h4 className="font-display font-semibold text-lg mb-3 flex items-center gap-2">
                <StickyNote className="h-5 w-5" />
                Notes
              </h4>
              <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                {renderTextWithLinks(recipe.notes)}
              </div>
            </div>
          )}

          {/* Recipe Source Section */}
          {recipe.source_url && (
            <div className="pb-4">
              <h4 className="font-display font-semibold text-lg mb-3">Recipe Source</h4>
              <div className="text-sm text-muted-foreground space-y-2">
                <div className="flex items-center gap-2">
                  <ExternalLink className="h-4 w-4 shrink-0" />
                  <span className="font-medium">
                    {recipe.source_name || extractDomain(recipe.source_url)}
                  </span>
                </div>

                {isValidUrl(recipe.source_url) ? (
                  <a
                    href={recipe.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-primary hover:underline"
                    aria-label={`View original recipe at ${recipe.source_name || 'source'} (opens in new tab)`}
                  >
                    <span>View Original Recipe</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <p className="truncate">
                    {recipe.source_url}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom: Ratings Only (Fixed) */}
        {household && ratings && (
          <div className="shrink-0 border-t border-border bg-muted/30 px-6 py-4">
            <RecipeRating
              recipeId={recipe.id}
              currentRatings={ratings}
              householdMembers={household.family_members}
              onRate={handleRate}
              disabled={rateMutation.isPending}
            />
          </div>
        )}
      </DialogContent>

      {/* Regenerate Confirmation Dialog */}
      <AlertDialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Generate a New Recipe?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the current recipe "{recipe.title}" and take you to the Groceries page to select ingredients for a new recipe.
              The current recipe will not be saved. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRegenerateConfirm}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Recipe Form */}
      <RecipeForm
        open={showEditForm}
        onOpenChange={setShowEditForm}
        onSubmit={handleEditSubmit}
        workspaceId={workspaceId}
        mode="edit"
        initialRecipe={recipe}
      />
    </Dialog>
  );
}

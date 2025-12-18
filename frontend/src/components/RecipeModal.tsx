import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import type { Recipe } from '@/lib/api';
import { Clock, Users, Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface RecipeModalProps {
  recipe: Recipe | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete?: (recipeId: string) => void;
}

export function RecipeModal({ recipe, open, onOpenChange, onDelete }: RecipeModalProps) {
  const navigate = useNavigate();
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);

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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{recipe.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
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
          <div>
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

          {/* Action Buttons - Moved to bottom */}
          {(recipe.is_generated || onDelete) && (
            <div className="flex gap-2 pt-4 border-t border-border">
              {recipe.is_generated && (
                <Button
                  variant="outline"
                  onClick={() => setShowRegenerateDialog(true)}
                  className="text-primary hover:text-primary hover:bg-primary/10"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Generate Again
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="outline"
                  onClick={handleDelete}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Recipe
                </Button>
              )}
            </div>
          )}
        </div>
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
    </Dialog>
  );
}

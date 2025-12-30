import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { mealPlansAPI, type AlternativeRecipeSuggestion } from '@/lib/api';
import { getCurrentWorkspace } from '@/lib/workspace';
import { Loader2, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SwapRecipeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mealType: string;
  currentRecipeTitle: string;
  excludeRecipeIds: string[];
  onSelect: (recipe: AlternativeRecipeSuggestion) => void;
  isSwapping: boolean;
}

export function SwapRecipeModal({
  open,
  onOpenChange,
  mealType,
  currentRecipeTitle,
  excludeRecipeIds,
  onSelect,
  isSwapping,
}: SwapRecipeModalProps) {
  const workspaceId = getCurrentWorkspace()!;

  // Fetch alternatives when modal opens
  const {
    data: alternatives,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['meal-plan-alternatives', workspaceId, mealType, excludeRecipeIds],
    queryFn: () =>
      mealPlansAPI.getAlternatives(workspaceId, {
        meal_type: mealType,
        exclude_recipe_ids: excludeRecipeIds,
        limit: 10,
      }),
    enabled: open && !!mealType,
  });

  // Refetch when modal opens with new context
  useEffect(() => {
    if (open && mealType) {
      refetch();
    }
  }, [open, mealType, refetch]);

  const handleSelect = (recipe: AlternativeRecipeSuggestion) => {
    onSelect(recipe);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            Swap Recipe
          </DialogTitle>
          <DialogDescription>
            Replace "{currentRecipeTitle}" with another {mealType} option
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 -mx-6 px-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground mt-2">
                Finding alternatives...
              </p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertTriangle className="h-8 w-8 text-destructive" />
              <p className="text-sm text-destructive mt-2">
                Failed to load alternatives
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => refetch()}
              >
                Try Again
              </Button>
            </div>
          ) : alternatives && alternatives.length > 0 ? (
            <div className="space-y-2">
              {alternatives.map((suggestion) => (
                <button
                  key={suggestion.recipe.id}
                  onClick={() => handleSelect(suggestion)}
                  disabled={isSwapping}
                  className={cn(
                    'w-full text-left p-4 rounded-lg border transition-all duration-200',
                    'hover:border-primary hover:bg-primary/5',
                    'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    suggestion.warnings.length > 0
                      ? 'border-amber-200 bg-amber-50/50'
                      : 'border-border bg-card'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {suggestion.recipe.title}
                      </p>

                      {/* Tags */}
                      {suggestion.recipe.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {suggestion.recipe.tags.slice(0, 4).map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground"
                            >
                              {tag}
                            </span>
                          ))}
                          {suggestion.recipe.tags.length > 4 && (
                            <span className="text-xs text-muted-foreground">
                              +{suggestion.recipe.tags.length - 4} more
                            </span>
                          )}
                        </div>
                      )}

                      {/* Warnings */}
                      {suggestion.warnings.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {suggestion.warnings.map((warning, idx) => (
                            <p
                              key={idx}
                              className="text-xs text-amber-600 flex items-center gap-1"
                            >
                              <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                              {warning}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Match score indicator */}
                    <div className="flex-shrink-0">
                      {suggestion.match_score >= 0.8 ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : suggestion.match_score >= 0.5 ? (
                        <div className="h-5 w-5 rounded-full border-2 border-primary/50" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No alternative recipes found for {mealType}.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Try adding more recipes to your library.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSwapping}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Check, Loader2, X, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { recipesAPI } from '@/lib/api';
import { getCurrentWorkspace } from '@/lib/workspace';

interface RecipeProgress {
  title: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  error?: string;
}

export interface SaveAllResult {
  saved: number;
  failed: number;
  errors: string[];
}

interface SaveAllRecipesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipeTitles: string[];
  onComplete: (results: SaveAllResult) => void;
  onProcessingChange?: (isProcessing: boolean) => void;
}

export function SaveAllRecipesModal({
  open,
  onOpenChange,
  recipeTitles,
  onComplete,
  onProcessingChange,
}: SaveAllRecipesModalProps) {
  const workspaceId = getCurrentWorkspace()!;
  const [recipes, setRecipes] = useState<RecipeProgress[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const processingRef = useRef(false);
  const hasStartedRef = useRef(false);

  // Notify parent of processing state changes
  useEffect(() => {
    onProcessingChange?.(isProcessing);
  }, [isProcessing, onProcessingChange]);

  // Initialize and start processing when modal opens with new titles
  useEffect(() => {
    if (open && recipeTitles.length > 0 && !hasStartedRef.current) {
      setRecipes(recipeTitles.map(title => ({ title, status: 'pending' })));
      setIsComplete(false);
      hasStartedRef.current = true;
      processingRef.current = true;
      processRecipes();
    }
  }, [open, recipeTitles]);

  // Only reset state when processing is complete and modal closes
  useEffect(() => {
    if (!open && !isProcessing && isComplete) {
      // Reset after completion so next batch starts fresh
      hasStartedRef.current = false;
      processingRef.current = false;
      setIsComplete(false);
      setRecipes([]);
    }
  }, [open, isProcessing, isComplete]);

  const processRecipes = async () => {
    setIsProcessing(true);
    let saved = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < recipeTitles.length; i++) {
      const title = recipeTitles[i];

      // Update status to generating
      setRecipes(prev => prev.map((r, idx) =>
        idx === i ? { ...r, status: 'generating' } : r
      ));

      try {
        await recipesAPI.generateFromTitle(workspaceId, {
          recipe_title: title,
          servings: 4,
        });

        saved++;
        setRecipes(prev => prev.map((r, idx) =>
          idx === i ? { ...r, status: 'completed' } : r
        ));
      } catch (error: unknown) {
        failed++;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${title}: ${errorMsg}`);
        setRecipes(prev => prev.map((r, idx) =>
          idx === i ? { ...r, status: 'failed', error: errorMsg } : r
        ));
      }
    }

    setIsProcessing(false);
    setIsComplete(true);

    // Small delay before calling onComplete so user sees final state
    setTimeout(() => {
      onComplete({ saved, failed, errors });
    }, 1500);
  };

  const handleClose = () => {
    // Allow closing even during processing (continues in background)
    onOpenChange(false);
  };

  const completedCount = recipes.filter(r => r.status === 'completed' || r.status === 'failed').length;
  const progress = recipeTitles.length > 0 ? (completedCount / recipeTitles.length) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={e => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-xl">
            <Download className="h-5 w-5 text-primary" />
            {isComplete ? 'Recipes Saved' : 'Saving Recipes'}
          </DialogTitle>
          <DialogDescription>
            {isComplete
              ? 'Your recipes have been added to your library'
              : 'Generating full recipes from meal plan suggestions'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Recipe List */}
          <div className="max-h-64 overflow-y-auto space-y-2 pr-2">
            {recipes.map((recipe, idx) => (
              <div
                key={idx}
                className={cn(
                  'flex items-center gap-3 p-2 rounded-lg transition-all duration-300',
                  recipe.status === 'generating' && 'bg-primary/10'
                )}
              >
                {/* Status Icon */}
                <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                  {recipe.status === 'pending' && (
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                  )}
                  {recipe.status === 'generating' && (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  )}
                  {recipe.status === 'completed' && (
                    <Check className="h-4 w-4 text-green-600" />
                  )}
                  {recipe.status === 'failed' && (
                    <X className="h-4 w-4 text-red-500" />
                  )}
                </div>

                {/* Recipe Title */}
                <span className={cn(
                  'text-sm flex-1 min-w-0 truncate',
                  recipe.status === 'generating' && 'font-medium text-foreground',
                  recipe.status === 'completed' && 'text-muted-foreground',
                  recipe.status === 'failed' && 'text-red-600'
                )}>
                  {recipe.title}
                </span>
              </div>
            ))}
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              {completedCount} of {recipeTitles.length} recipes processed
            </p>
          </div>

          {/* Action Button */}
          <div className="pt-2">
            {isProcessing ? (
              <>
                <Button variant="outline" onClick={handleClose} className="w-full">
                  Continue in Background
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Saving will continue even if you close this
                </p>
              </>
            ) : isComplete ? (
              <Button onClick={handleClose} className="w-full">
                Done
              </Button>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

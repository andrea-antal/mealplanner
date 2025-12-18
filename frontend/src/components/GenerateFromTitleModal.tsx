import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { recipesAPI, GenerateFromTitleRequest } from '@/lib/api';
import { Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface GenerateFromTitleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipeTitle: string;
  mealType: string;
  onRecipeGenerated?: (recipeId: string) => void;
}

export function GenerateFromTitleModal({
  open,
  onOpenChange,
  recipeTitle,
  mealType,
  onRecipeGenerated,
}: GenerateFromTitleModalProps) {
  const queryClient = useQueryClient();
  const [duplicateError, setDuplicateError] = useState<string | null>(null);

  // Reset state when modal opens/closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setDuplicateError(null);
    }
    onOpenChange(newOpen);
  };

  // Mutation to generate recipe from title
  const generateMutation = useMutation({
    mutationFn: async () => {
      const request: GenerateFromTitleRequest = {
        recipe_title: recipeTitle,
        meal_type: mealType,
        servings: 4,
      };
      return await recipesAPI.generateFromTitle(request);
    },
    onSuccess: (recipe) => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      queryClient.invalidateQueries({ queryKey: ['mealPlan'] });
      toast.success(`Recipe "${recipeTitle}" generated successfully!`);
      if (onRecipeGenerated) {
        onRecipeGenerated(recipe.id);
      }
      handleOpenChange(false);
    },
    onError: (error: any) => {
      // Check if it's a 409 Conflict (duplicate)
      if (error.status === 409) {
        setDuplicateError(error.message);
        toast.error('A recipe with this title already exists');
      } else {
        toast.error(`Failed to generate recipe: ${error.message}`);
      }
    },
  });

  const handleGenerate = () => {
    generateMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Generate Recipe
          </DialogTitle>
          <DialogDescription>
            Create a full recipe for "{recipeTitle}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {duplicateError ? (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold">Recipe already exists</p>
                <p className="mt-1">
                  A recipe with the title "{recipeTitle}" already exists in your library.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Recipe Title</p>
                <p className="text-base font-semibold mt-1">{recipeTitle}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Meal Type</p>
                <p className="text-base capitalize mt-1">{mealType}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                AI will generate a complete recipe with ingredients, instructions, and metadata based on this title and meal type.
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="default"
            onClick={handleGenerate}
            disabled={generateMutation.isPending || !!duplicateError}
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Recipe
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

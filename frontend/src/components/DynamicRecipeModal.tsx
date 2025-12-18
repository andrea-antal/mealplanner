import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { recipesAPI, DynamicRecipeRequest, Recipe } from '@/lib/api';
import { Loader2, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';

interface DynamicRecipeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIngredients: string[];
  onRecipeGenerated?: (recipe: Recipe) => void;
}

export function DynamicRecipeModal({
  open,
  onOpenChange,
  selectedIngredients,
  onRecipeGenerated,
}: DynamicRecipeModalProps) {
  const queryClient = useQueryClient();
  const [mealType, setMealType] = useState<string>('dinner');
  const [cuisineType, setCuisineType] = useState<string>('none');
  const [customCuisine, setCustomCuisine] = useState<string>('');
  const [servings, setServings] = useState<number>(4);
  const [cookingTimeMax, setCookingTimeMax] = useState<string>('');
  const [portions, setPortions] = useState<Record<string, string>>({});

  // Reset form when modal closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setMealType('dinner');
      setCuisineType('none');
      setCustomCuisine('');
      setServings(4);
      setCookingTimeMax('');
      setPortions({});
    }
    onOpenChange(newOpen);
  };

  // Mutation to generate recipe
  const generateMutation = useMutation({
    mutationFn: (request: DynamicRecipeRequest) =>
      recipesAPI.generateFromIngredients(request),
    onSuccess: (recipe) => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      toast.success(`Recipe "${recipe.title}" generated successfully!`);
      if (onRecipeGenerated) {
        onRecipeGenerated(recipe);
      }
      handleOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(`Failed to generate recipe: ${error.message}`);
    },
  });

  const handleGenerate = () => {
    // Validate "Other" cuisine requires custom text
    if (cuisineType === 'other' && !customCuisine.trim()) {
      toast.error('Please specify the cuisine type');
      return;
    }

    const finalCuisineType = cuisineType === 'other'
      ? customCuisine
      : cuisineType === 'none'
        ? undefined
        : cuisineType;

    const request: DynamicRecipeRequest = {
      ingredients: selectedIngredients,
      portions: Object.keys(portions).length > 0 ? portions : undefined,
      meal_type: mealType,
      cuisine_type: finalCuisineType,
      servings,
      cooking_time_max: cookingTimeMax ? parseInt(cookingTimeMax) : undefined,
    };

    generateMutation.mutate(request);
  };

  const updatePortion = (ingredient: string, portion: string) => {
    setPortions((prev) => {
      if (!portion.trim()) {
        const newPortions = { ...prev };
        delete newPortions[ingredient];
        return newPortions;
      }
      return { ...prev, [ingredient]: portion };
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Generate Recipe from Ingredients
          </DialogTitle>
          <DialogDescription>
            Configure your recipe preferences and let AI create a custom recipe for you.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Selected Ingredients */}
          <div>
            <Label className="text-base font-semibold">Selected Ingredients</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedIngredients.map((ingredient) => (
                <div
                  key={ingredient}
                  className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm"
                >
                  <span className="capitalize">{ingredient}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Optional Portions */}
          <div>
            <Label className="text-base font-semibold">Ingredient Portions (Optional)</Label>
            <p className="text-sm text-muted-foreground mb-3">
              Specify quantities for specific ingredients
            </p>
            <div className="space-y-2">
              {selectedIngredients.map((ingredient) => (
                <div key={ingredient} className="flex items-center gap-2">
                  <Label htmlFor={`portion-${ingredient}`} className="w-40 capitalize">
                    {ingredient}:
                  </Label>
                  <Input
                    id={`portion-${ingredient}`}
                    placeholder="e.g., 2 cups, 1 lb"
                    value={portions[ingredient] || ''}
                    onChange={(e) => updatePortion(ingredient, e.target.value)}
                    className="flex-1"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Meal Type */}
          <div>
            <Label htmlFor="meal-type" className="text-base font-semibold">
              Meal Type
            </Label>
            <Select value={mealType} onValueChange={setMealType}>
              <SelectTrigger id="meal-type" className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="breakfast">Breakfast</SelectItem>
                <SelectItem value="lunch">Lunch</SelectItem>
                <SelectItem value="dinner">Dinner</SelectItem>
                <SelectItem value="snack">Snack</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Cuisine Type */}
          <div>
            <Label htmlFor="cuisine-type" className="text-base font-semibold">
              Cuisine Type (Optional)
            </Label>
            <Select value={cuisineType} onValueChange={setCuisineType}>
              <SelectTrigger id="cuisine-type" className="mt-2">
                <SelectValue placeholder="No preference" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No preference</SelectItem>
                <SelectItem value="italian">Italian</SelectItem>
                <SelectItem value="mexican">Mexican</SelectItem>
                <SelectItem value="chinese">Chinese</SelectItem>
                <SelectItem value="korean">Korean</SelectItem>
                <SelectItem value="japanese">Japanese</SelectItem>
                <SelectItem value="greek">Greek</SelectItem>
                <SelectItem value="healthy">Healthy</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            {cuisineType === 'other' && (
              <Input
                id="custom-cuisine"
                placeholder="e.g., Thai, Indian, Mediterranean"
                value={customCuisine}
                onChange={(e) => setCustomCuisine(e.target.value)}
                className="mt-2"
              />
            )}
          </div>

          {/* Servings */}
          <div>
            <Label htmlFor="servings" className="text-base font-semibold">
              Number of Servings
            </Label>
            <Input
              id="servings"
              type="number"
              min="1"
              max="20"
              value={servings}
              onChange={(e) => setServings(parseInt(e.target.value) || 1)}
              className="mt-2"
            />
          </div>

          {/* Cooking Time */}
          <div>
            <Label htmlFor="cooking-time" className="text-base font-semibold">
              Maximum Cooking Time (Optional)
            </Label>
            <div className="flex items-center gap-2 mt-2">
              <Input
                id="cooking-time"
                type="number"
                min="5"
                max="300"
                placeholder="e.g., 30"
                value={cookingTimeMax}
                onChange={(e) => setCookingTimeMax(e.target.value)}
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground">minutes</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="default"
            onClick={handleGenerate}
            disabled={generateMutation.isPending || selectedIngredients.length === 0}
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

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { recipesAPI, type Recipe } from '@/lib/api';
import { getCurrentWorkspace } from '@/lib/workspace';
import { Loader2, Search, Plus, UtensilsCrossed } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RecipePickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dayIndex: number;
  dayLabel: string;
  mealType?: string;
  onSelect: (recipe: Recipe, mealType: string) => void;
  isAdding?: boolean;
}

const MEAL_TYPE_OPTIONS = ['breakfast', 'lunch', 'dinner', 'snack'];

export function RecipePickerModal({
  open,
  onOpenChange,
  dayIndex,
  dayLabel,
  mealType: initialMealType,
  onSelect,
  isAdding = false,
}: RecipePickerModalProps) {
  const workspaceId = getCurrentWorkspace()!;
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMealType, setSelectedMealType] = useState(initialMealType || 'lunch');

  // Fetch all recipes
  const { data: recipes, isLoading } = useQuery({
    queryKey: ['recipes', workspaceId],
    queryFn: () => recipesAPI.getAll(workspaceId),
    enabled: open,
  });

  // Filter recipes by search query and meal type
  const filteredRecipes = useMemo(() => {
    if (!recipes) return [];

    return recipes.filter((recipe) => {
      // Filter by meal type
      const matchesMealType = recipe.meal_types?.includes(selectedMealType) ||
        (selectedMealType === 'lunch' && recipe.meal_types?.includes('side_dish')) ||
        (selectedMealType === 'dinner' && recipe.meal_types?.includes('side_dish'));

      // Filter by search query
      const matchesSearch = !searchQuery ||
        recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recipe.ingredients?.some(ing => ing.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesMealType && matchesSearch;
    });
  }, [recipes, selectedMealType, searchQuery]);

  const handleSelect = (recipe: Recipe) => {
    onSelect(recipe, selectedMealType);
    onOpenChange(false);
    setSearchQuery('');
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) setSearchQuery('');
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Add Recipe to {dayLabel}
          </DialogTitle>
          <DialogDescription>
            Search your recipe library to add a meal
          </DialogDescription>
        </DialogHeader>

        {/* Meal type selector */}
        <div className="flex gap-2 flex-wrap">
          {MEAL_TYPE_OPTIONS.map((type) => (
            <Button
              key={type}
              variant={selectedMealType === type ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedMealType(type)}
              className="capitalize"
            >
              {type}
            </Button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search recipes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>

        {/* Recipe list */}
        <div className="flex-1 overflow-y-auto py-2 -mx-6 px-6 min-h-[200px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground mt-2">
                Loading recipes...
              </p>
            </div>
          ) : filteredRecipes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <UtensilsCrossed className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mt-2">
                {searchQuery
                  ? `No ${selectedMealType} recipes matching "${searchQuery}"`
                  : `No ${selectedMealType} recipes in your library`}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredRecipes.map((recipe) => (
                <button
                  key={recipe.id}
                  onClick={() => handleSelect(recipe)}
                  disabled={isAdding}
                  className={cn(
                    "w-full text-left p-3 rounded-lg border transition-colors",
                    "hover:bg-accent hover:border-primary/50",
                    "focus:outline-none focus:ring-2 focus:ring-primary/50",
                    isAdding && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <div className="font-medium">{recipe.title}</div>
                  {recipe.active_cooking_time_minutes && (
                    <div className="text-sm text-muted-foreground mt-1">
                      {recipe.active_cooking_time_minutes} min active cooking
                    </div>
                  )}
                  {recipe.tags && recipe.tags.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {recipe.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-2 py-0.5 bg-muted rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from 'react';
import type { Meal, Recipe } from '@/lib/api';
import { recipesAPI } from '@/lib/api';
import { cn } from '@/lib/utils';
import { RecipeModal } from './RecipeModal';
import { GenerateFromTitleModal } from './GenerateFromTitleModal';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

interface MealCardProps {
  meal: Meal;
}

const mealTypeStyles: Record<string, string> = {
  breakfast: 'border-l-tag-breakfast',
  lunch: 'border-l-tag-daycare',
  dinner: 'border-l-primary',
  snack: 'border-l-tag-quick',
};

const mealTypeLabels: Record<string, string> = {
  breakfast: '🍳 Breakfast',
  lunch: '🥗 Lunch',
  dinner: '🍽️ Dinner',
  snack: '🍪 Snack/Dessert',
};

export function MealCard({ meal }: MealCardProps) {
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generateModalOpen, setGenerateModalOpen] = useState(false);

  const handleRecipeClick = async () => {
    // Skip if no recipe_id (simple snacks)
    if (!meal.recipe_id) {
      return;
    }

    setLoading(true);
    try {
      const recipe = await recipesAPI.getById(meal.recipe_id);
      setSelectedRecipe(recipe);
      setModalOpen(true);
    } catch (error) {
      toast.error('Failed to load recipe details');
      console.error('Error loading recipe:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateRecipe = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    setGenerateModalOpen(true);
  };

  const handleRecipeGenerated = async (recipeId: string) => {
    // Update the meal card to show the newly generated recipe
    setLoading(true);
    try {
      const recipe = await recipesAPI.getById(recipeId);
      setSelectedRecipe(recipe);
      setModalOpen(true);
    } catch (error) {
      toast.error('Failed to load generated recipe');
      console.error('Error loading generated recipe:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div
        className={cn(
          'rounded-lg bg-card p-3 border-l-[3px] shadow-xs transition-all',
          mealTypeStyles[meal.meal_type] || 'border-l-muted',
          meal.recipe_id && 'cursor-pointer hover:shadow-soft'
        )}
        onClick={handleRecipeClick}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground mb-1">
              {mealTypeLabels[meal.meal_type]}
            </p>
            <p className={cn(
              "font-medium text-foreground truncate",
              meal.recipe_id && "hover:text-primary transition-colors"
            )}>
              {loading ? 'Loading...' : meal.recipe_title}
            </p>
            {meal.for_who && (
              <p className="text-xs text-muted-foreground mt-0.5">
                For: {meal.for_who}
              </p>
            )}
            {meal.notes && (
              <p className="text-xs text-muted-foreground mt-1 italic">
                {meal.notes}
              </p>
            )}
          </div>

          {!meal.recipe_id && (
            <button
              onClick={handleGenerateRecipe}
              className={cn(
                "flex-shrink-0 p-2 rounded-full transition-all duration-200",
                "bg-primary/10 hover:bg-primary/20 text-primary",
                "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              )}
              title="Generate recipe"
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <RecipeModal
        recipe={selectedRecipe}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />

      <GenerateFromTitleModal
        open={generateModalOpen}
        onOpenChange={setGenerateModalOpen}
        recipeTitle={meal.recipe_title}
        mealType={meal.meal_type}
        onRecipeGenerated={handleRecipeGenerated}
      />
    </>
  );
}

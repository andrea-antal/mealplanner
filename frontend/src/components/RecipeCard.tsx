import { Clock, Users, ChefHat, Sparkles } from 'lucide-react';
import { RecipeTag } from './RecipeTag';
import type { Recipe } from '@/lib/api';
import { Button } from '@/components/ui/button';

interface RecipeCardProps {
  recipe: Recipe;
  onViewDetails: (recipe: Recipe) => void;
}

export function RecipeCard({ recipe, onViewDetails }: RecipeCardProps) {
  return (
    <div className="rounded-2xl bg-card shadow-soft overflow-hidden transition-all duration-300 hover:shadow-medium group">
      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-display text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
            {recipe.title}
          </h3>
          {recipe.is_generated && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium shrink-0">
              <Sparkles className="h-3 w-3" />
              <span>AI</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {recipe.tags.slice(0, 3).map((tag) => (
            <RecipeTag key={tag} tag={tag} />
          ))}
          {recipe.tags.length > 3 && (
            <span className="text-xs text-muted-foreground self-center">
              +{recipe.tags.length - 3} more
            </span>
          )}
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            <span>{recipe.prep_time_minutes + recipe.active_cooking_time_minutes} min</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            <span>Serves {recipe.serves}</span>
          </div>
        </div>

        <Button
          variant="secondary"
          className="w-full"
          onClick={() => onViewDetails(recipe)}
        >
          <ChefHat className="h-4 w-4" />
          View Recipe
        </Button>
      </div>
    </div>
  );
}

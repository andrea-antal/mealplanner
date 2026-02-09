import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ChefHat, Utensils, CheckCircle2 } from 'lucide-react';

interface MisEnPlaceProps {
  ingredients: string[];
  equipment: string[];
  checkedIngredients: Set<string>;
  onToggleIngredient: (ingredient: string) => void;
  onReady: () => void;
}

export function MisEnPlace({
  ingredients,
  equipment,
  checkedIngredients,
  onToggleIngredient,
  onReady,
}: MisEnPlaceProps) {
  const allChecked = ingredients.length > 0 && checkedIngredients.size === ingredients.length;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-2">
          <ChefHat className="h-8 w-8 text-primary" />
        </div>
        <h2 className="font-display text-2xl font-bold">Mise en Place</h2>
        <p className="text-muted-foreground">
          Gather your ingredients and equipment before you start cooking.
        </p>
      </div>

      {equipment.length > 0 && (
        <div className="rounded-xl bg-card border border-border p-5 space-y-3">
          <h3 className="font-display font-semibold text-lg flex items-center gap-2">
            <Utensils className="h-5 w-5 text-primary" />
            Equipment Needed
          </h3>
          <div className="flex flex-wrap gap-2">
            {equipment.map((item) => (
              <span key={item} className="inline-flex items-center px-3 py-1.5 rounded-full bg-muted text-sm font-medium capitalize">
                {item}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl bg-card border border-border p-5 space-y-3">
        <h3 className="font-display font-semibold text-lg flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          Ingredients
        </h3>
        <div className="space-y-2">
          {ingredients.map((ingredient, idx) => (
            <label key={idx} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
              <Checkbox checked={checkedIngredients.has(ingredient)} onCheckedChange={() => onToggleIngredient(ingredient)} />
              <span className={`text-base ${checkedIngredients.has(ingredient) ? 'line-through text-muted-foreground' : ''}`}>
                {ingredient}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="sticky bottom-4">
        <Button onClick={onReady} size="lg" className="w-full text-lg py-6 font-semibold" variant={allChecked ? 'default' : 'outline'}>
          {allChecked ? "Let's Cook!" : 'Ready to Cook'}
        </Button>
      </div>
    </div>
  );
}

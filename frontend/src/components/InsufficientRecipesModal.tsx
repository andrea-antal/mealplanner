import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ChefHat } from 'lucide-react';

interface InsufficientRecipesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalCount: number;
  missingMealTypes: string[];
}

export function InsufficientRecipesModal({
  open,
  onOpenChange,
  totalCount,
  missingMealTypes,
}: InsufficientRecipesModalProps) {
  const navigate = useNavigate();

  const handleGoToRecipes = () => {
    onOpenChange(false);
    navigate('/cook');
  };

  // Format meal types for display
  const formatMealTypes = (types: string[]) => {
    if (types.length === 1) return types[0];
    if (types.length === 2) return `${types[0]} and ${types[1]}`;
    return types.slice(0, -1).join(', ') + ', and ' + types[types.length - 1];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            More Recipes Needed
          </DialogTitle>
          <DialogDescription>
            To generate a meal plan, you need recipes for each meal type
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {totalCount === 0 ? (
            <div className="text-center py-6">
              <ChefHat className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-foreground font-medium">
                You don't have any recipes yet
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Add some recipes to get started with meal planning
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-foreground">
                You have <strong>{totalCount}</strong> recipe{totalCount !== 1 ? 's' : ''},
                but you're missing recipes for:
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                {missingMealTypes.map((type) => (
                  <li key={type} className="capitalize">
                    {type} recipes
                  </li>
                ))}
              </ul>
              <p className="text-sm text-muted-foreground">
                Each recipe needs a meal type tag (breakfast, lunch, or dinner).
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleGoToRecipes}
            className="flex-1"
          >
            Go to Recipes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

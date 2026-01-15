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
  onGenerateAnyway: () => void;
  householdSetUp: boolean;
}

export function InsufficientRecipesModal({
  open,
  onOpenChange,
  totalCount,
  missingMealTypes,
  onGenerateAnyway,
  householdSetUp,
}: InsufficientRecipesModalProps) {
  const navigate = useNavigate();

  // Smart routing: household setup is more impactful for new users
  const handlePrimaryAction = () => {
    onOpenChange(false);
    navigate(householdSetUp ? '/recipes' : '/household');
  };

  const handleGenerateAnyway = () => {
    onOpenChange(false);
    onGenerateAnyway();
  };

  const primaryButtonText = householdSetUp ? 'Go to Recipes' : 'Set Up Household';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            More Recipes Needed
          </DialogTitle>
          <DialogDescription>
            For best results, add recipes for each meal type
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
                You can still generate a meal plan to see how it works.
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
                You can still generate a meal plan, but some meals may not have matching recipes.
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <Button onClick={handlePrimaryAction} className="w-full">
            {primaryButtonText}
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={handleGenerateAnyway}
              className="flex-1"
            >
              Generate Anyway
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

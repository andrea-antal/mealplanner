import { Button } from '@/components/ui/button';
import { ChefHat, Calendar, Trash2 } from 'lucide-react';

interface StickyActionBarProps {
  selectedCount: number;
  onCook: () => void;
  onPlan: () => void;
  onDelete: () => void;
}

export function StickyActionBar({
  selectedCount,
  onCook,
  onPlan,
  onDelete,
}: StickyActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-20 left-0 right-0 z-50 p-4 bg-background/80 backdrop-blur-lg border-t border-border">
      <div className="container max-w-2xl mx-auto flex gap-3">
        <Button
          variant="hero"
          size="lg"
          className="flex-1 h-14"
          onClick={onCook}
        >
          <ChefHat className="h-5 w-5 mr-2" />
          Cook with {selectedCount}
        </Button>

        <Button
          variant="outline"
          size="lg"
          className="h-14 px-6"
          onClick={onPlan}
        >
          <Calendar className="h-5 w-5" />
        </Button>

        <Button
          variant="outline"
          size="lg"
          className="h-14 px-6 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
          onClick={onDelete}
        >
          <Trash2 className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}

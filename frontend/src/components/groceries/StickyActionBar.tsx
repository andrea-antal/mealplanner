import { Button } from '@/components/ui/button';
import { ChefHat, Calendar, Trash2, ArrowRightLeft } from 'lucide-react';

interface StickyActionBarProps {
  selectedCount: number;
  onCook: () => void;
  onPlan: () => void;
  onMove?: () => void;
  onDelete: () => void;
}

export function StickyActionBar({
  selectedCount,
  onCook,
  onPlan,
  onMove,
  onDelete,
}: StickyActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-[72px] left-0 right-0 z-40 px-4 py-3 bg-background/95 backdrop-blur-lg border-t border-border md:bottom-6">
      <div className="max-w-2xl mx-auto flex gap-2">
        <Button
          variant="hero"
          size="lg"
          className="flex-1 h-12"
          onClick={onCook}
        >
          <ChefHat className="h-5 w-5 mr-2" />
          Cook with {selectedCount}
        </Button>

        <Button
          variant="outline"
          size="lg"
          className="h-12 w-12 p-0 shrink-0"
          onClick={onPlan}
        >
          <Calendar className="h-5 w-5" />
        </Button>

        {onMove && (
          <Button
            variant="outline"
            size="lg"
            className="h-12 w-12 p-0 shrink-0"
            onClick={onMove}
            title="Move to Fridge/Pantry"
          >
            <ArrowRightLeft className="h-5 w-5" />
          </Button>
        )}

        <Button
          variant="outline"
          size="lg"
          className="h-12 w-12 p-0 shrink-0"
          onClick={onDelete}
        >
          <Trash2 className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}

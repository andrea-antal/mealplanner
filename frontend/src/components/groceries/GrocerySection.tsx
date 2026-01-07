import { ChevronDown, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { GroceryChip } from './GroceryChip';
import type { GroceryItem } from '@/lib/api';

interface GrocerySectionProps {
  title: string;
  icon: LucideIcon;
  items: GroceryItem[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  // Selection mode props
  isSelectionMode: boolean;
  selectedIngredients: string[];
  onToggleSelect: (name: string) => void;
  onOpenModal: (item: GroceryItem) => void;
}

export function GrocerySection({
  title,
  icon: Icon,
  items,
  isOpen,
  onOpenChange,
  isSelectionMode,
  selectedIngredients,
  onToggleSelect,
  onOpenModal,
}: GrocerySectionProps) {
  const itemCount = items.length;
  const isEmpty = itemCount === 0;

  return (
    <Collapsible open={isOpen && !isEmpty} onOpenChange={onOpenChange}>
      <CollapsibleTrigger asChild disabled={isEmpty}>
        <button
          className={cn(
            "w-full flex items-center justify-between px-4 py-3 rounded-lg",
            "bg-muted/50 transition-colors text-left",
            isEmpty ? "cursor-default opacity-60" : "hover:bg-muted"
          )}
        >
          <div className="flex items-center gap-3">
            <Icon className={cn("h-5 w-5", isEmpty ? "text-muted-foreground/50" : "text-muted-foreground")} />
            <span className={cn("font-medium", isEmpty && "text-muted-foreground")}>{title}</span>
            <span className="text-sm text-muted-foreground">({itemCount})</span>
          </div>
          {!isEmpty && (
            <ChevronDown
              className={cn(
                "h-5 w-5 text-muted-foreground transition-transform duration-200",
                isOpen && "rotate-180"
              )}
            />
          )}
        </button>
      </CollapsibleTrigger>
      {!isEmpty && (
        <CollapsibleContent>
          <div className="pt-4 flex flex-wrap gap-2">
            {items.map((item) => (
              <GroceryChip
                key={item.name}
                item={item}
                isSelected={selectedIngredients.includes(item.name)}
                isSelectionMode={isSelectionMode}
                onToggleSelect={onToggleSelect}
                onOpenModal={onOpenModal}
              />
            ))}
          </div>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}

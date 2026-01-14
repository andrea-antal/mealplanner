import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GroceryListItem } from './GroceryListItem';
import type { GroceryItem } from '@/lib/api';

interface GrocerySectionProps {
  title: string;
  icon: LucideIcon;
  items: GroceryItem[];
  // Selection mode props
  isSelectionMode: boolean;
  selectedIngredients: string[];
  onToggleSelect: (name: string) => void;
  onOpenModal: (item: GroceryItem) => void;
  // Quick action props
  onAddToFavorites?: (item: GroceryItem) => void;
  onAddToShoppingList?: (item: GroceryItem) => void;
}

export function GrocerySection({
  title,
  icon: Icon,
  items,
  isSelectionMode,
  selectedIngredients,
  onToggleSelect,
  onOpenModal,
  onAddToFavorites,
  onAddToShoppingList,
}: GrocerySectionProps) {
  const itemCount = items.length;
  const isEmpty = itemCount === 0;

  return (
    <div className="space-y-2">
      {/* Section header - non-collapsible */}
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2",
          isEmpty && "opacity-50"
        )}
      >
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        <span className="text-xs text-muted-foreground">({itemCount})</span>
      </div>

      {/* Items list */}
      {!isEmpty ? (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {items.map((item) => (
            <GroceryListItem
              key={item.name}
              item={item}
              isSelected={selectedIngredients.includes(item.name)}
              isSelectionMode={isSelectionMode}
              showStorageTag={false}
              onToggleSelect={onToggleSelect}
              onOpenModal={onOpenModal}
              onAddToFavorites={onAddToFavorites}
              onAddToShoppingList={onAddToShoppingList}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border/50 py-6 text-center">
          <p className="text-sm text-muted-foreground">No items</p>
        </div>
      )}
    </div>
  );
}

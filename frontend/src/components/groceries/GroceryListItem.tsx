import { AlertCircle, Clock, ChevronRight, Star, ShoppingCart } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { StorageTag } from './StorageTag';
import { cn } from '@/lib/utils';
import type { GroceryItem } from '@/lib/api';

interface GroceryListItemProps {
  item: GroceryItem;
  isSelected: boolean;
  isSelectionMode: boolean;
  showStorageTag?: boolean;
  isFavorite?: boolean;
  onToggleSelect: (name: string) => void;
  onOpenModal: (item: GroceryItem) => void;
  onAddToFavorites?: (item: GroceryItem) => void;
  onAddToShoppingList?: (item: GroceryItem) => void;
}

export function GroceryListItem({
  item,
  isSelected,
  isSelectionMode,
  showStorageTag = false,
  isFavorite = false,
  onToggleSelect,
  onOpenModal,
  onAddToFavorites,
  onAddToShoppingList,
}: GroceryListItemProps) {
  // Calculate expiry status
  const getExpiryInfo = (): { status: 'expired' | 'soon' | 'good'; daysText?: string } => {
    if (!item.expiry_date) return { status: 'good' };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiryDate = new Date(item.expiry_date);
    expiryDate.setHours(0, 0, 0, 0);

    const daysUntilExpiry = Math.floor(
      (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilExpiry < 0) {
      return { status: 'expired', daysText: 'Expired' };
    }
    if (daysUntilExpiry === 0) {
      return { status: 'expired', daysText: 'Today' };
    }
    if (daysUntilExpiry === 1) {
      return { status: 'soon', daysText: 'Tomorrow' };
    }
    if (daysUntilExpiry <= 3) {
      return { status: 'soon', daysText: `${daysUntilExpiry}d` };
    }
    return { status: 'good' };
  };

  const { status: expiryStatus, daysText } = getExpiryInfo();

  const handleClick = () => {
    if (isSelectionMode) {
      onToggleSelect(item.name);
    } else {
      onOpenModal(item);
    }
  };

  const handleCheckboxChange = (checked: boolean) => {
    onToggleSelect(item.name);
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
        'border-b border-border/50 last:border-b-0',
        'hover:bg-muted/30 active:bg-muted/50',
        isSelected && 'bg-primary/5'
      )}
    >
      {/* Checkbox in selection mode */}
      {isSelectionMode && (
        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={isSelected}
            onCheckedChange={handleCheckboxChange}
            className="h-5 w-5"
          />
        </div>
      )}

      {/* Item content */}
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className="font-medium text-foreground capitalize truncate">
          {item.name}
        </span>

        {/* Expiry badge - icon only for expired, icon + days for expiring soon */}
        {expiryStatus === 'expired' && (
          <span
            className="inline-flex items-center text-destructive shrink-0"
            title={daysText}
          >
            <AlertCircle className="h-4 w-4" />
          </span>
        )}
        {expiryStatus === 'soon' && (
          <span
            className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full shrink-0 bg-warning/20 text-warning-foreground"
          >
            <Clock className="h-3 w-3" />
            {daysText}
          </span>
        )}
      </div>

      {/* Storage tag (only in flat view) */}
      {showStorageTag && (
        <StorageTag location={item.storage_location} />
      )}

      {/* Quick action icons (not in selection mode) */}
      {!isSelectionMode && (onAddToFavorites || onAddToShoppingList) && (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {onAddToFavorites && (
            <button
              onClick={() => onAddToFavorites(item)}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                isFavorite
                  ? "text-yellow-500"
                  : "text-muted-foreground hover:text-yellow-500 hover:bg-yellow-500/10"
              )}
              title={isFavorite ? "Already in favorites" : "Add to favorites"}
            >
              <Star className={cn("h-3.5 w-3.5", isFavorite && "fill-yellow-500")} />
            </button>
          )}
          {onAddToShoppingList && (
            <button
              onClick={() => onAddToShoppingList(item)}
              className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
              title="Add to shopping list"
            >
              <ShoppingCart className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Chevron indicator (not in selection mode) */}
      {!isSelectionMode && (
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
      )}
    </button>
  );
}

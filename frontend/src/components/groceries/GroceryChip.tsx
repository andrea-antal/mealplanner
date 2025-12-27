import { Check, AlertCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GroceryItem } from '@/lib/api';

interface GroceryChipProps {
  item: GroceryItem;
  isSelected: boolean;
  onToggleSelect: (name: string) => void;
  onOpenModal: (item: GroceryItem) => void;
}

export function GroceryChip({
  item,
  isSelected,
  onToggleSelect,
  onOpenModal,
}: GroceryChipProps) {
  // Calculate expiry status
  const getExpiryStatus = (): 'expired' | 'soon' | 'good' => {
    if (!item.expiry_date) return 'good';

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiryDate = new Date(item.expiry_date);
    expiryDate.setHours(0, 0, 0, 0);

    const daysUntilExpiry = Math.floor(
      (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilExpiry < 0 || daysUntilExpiry === 0) return 'expired';
    if (daysUntilExpiry <= 3) return 'soon';
    return 'good';
  };

  const expiryStatus = getExpiryStatus();

  const handleChipClick = () => {
    // Open modal for editing
    onOpenModal(item);
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    // Prevent modal from opening when clicking checkbox area
    e.stopPropagation();
    onToggleSelect(item.name);
  };

  return (
    <button
      onClick={handleChipClick}
      className={cn(
        "inline-flex items-center gap-2 px-4 py-3 rounded-full text-base font-medium transition-all",
        "border-2 min-h-[48px] relative group",
        isSelected
          ? "bg-primary border-primary text-primary-foreground shadow-soft"
          : "bg-card border-border text-foreground hover:border-primary/50 hover:shadow-soft"
      )}
    >
      {/* Selection checkbox area - separate click handler */}
      <span
        onClick={handleCheckboxClick}
        className="flex items-center justify-center shrink-0"
      >
        {isSelected && <Check className="h-4 w-4" />}
        {!isSelected && <span className="h-4 w-4 rounded border-2 border-current" />}
      </span>

      {/* Item name */}
      <span className="capitalize flex-1 text-left">{item.name}</span>

      {/* Expiry indicator - icon + color for accessibility */}
      {expiryStatus === 'expired' && (
        <span
          className="flex items-center justify-center h-5 w-5 shrink-0"
          title="Expired or expires today"
        >
          <AlertCircle className="h-4 w-4 text-destructive" />
        </span>
      )}
      {expiryStatus === 'soon' && (
        <span
          className="flex items-center justify-center h-5 w-5 shrink-0"
          title="Expires within 3 days"
        >
          <Clock className="h-4 w-4 text-warning" />
        </span>
      )}
    </button>
  );
}

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, AlertTriangle, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Proposed grocery item from AI parsing
 */
export interface ProposedGroceryItem {
  name: string;
  date_added?: string;
  purchase_date?: string;
  expiry_type?: 'expiry_date' | 'best_before_date';
  expiry_date?: string;
  portion?: string;
  confidence: 'high' | 'medium' | 'low';
  notes?: string;
}

/**
 * Confirmed item (ready to add to grocery list)
 */
export interface ConfirmedGroceryItem {
  name: string;
  date_added: string;
  purchase_date?: string;
  expiry_type?: 'expiry_date' | 'best_before_date';
  expiry_date?: string;
}

export interface GroceryConfirmationDialogProps {
  /** Dialog open state */
  open: boolean;
  /** Dialog open state change handler */
  onOpenChange: (open: boolean) => void;
  /** Proposed items from AI parsing */
  proposedItems: ProposedGroceryItem[];
  /** Warnings from AI parsing */
  warnings?: string[];
  /** Callback when user confirms items */
  onConfirm: (items: ConfirmedGroceryItem[]) => void;
  /** Whether confirmation is in progress (e.g., API call) */
  isLoading?: boolean;
}

/**
 * Confirmation dialog for AI-parsed grocery items
 *
 * Features:
 * - Shows proposed items with confidence badges
 * - Allows inline editing of item names
 * - Displays AI reasoning in notes
 * - Shows warnings for duplicates/ambiguities
 * - Allows removing individual items
 *
 * @example
 * ```tsx
 * <GroceryConfirmationDialog
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   proposedItems={items}
 *   warnings={warnings}
 *   onConfirm={handleConfirm}
 * />
 * ```
 */
export function GroceryConfirmationDialog({
  open,
  onOpenChange,
  proposedItems,
  warnings = [],
  onConfirm,
  isLoading = false,
}: GroceryConfirmationDialogProps) {
  // Editable items state (initialized from proposed items)
  const [editableItems, setEditableItems] = useState<ProposedGroceryItem[]>([]);

  // Update editable items when proposed items change or dialog opens
  useEffect(() => {
    if (open && proposedItems.length > 0) {
      setEditableItems([...proposedItems]);
    }
  }, [open, proposedItems]);

  const updateItemName = (index: number, newName: string) => {
    setEditableItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], name: newName };
      return updated;
    });
  };

  const removeItem = (index: number) => {
    setEditableItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleConfirm = () => {
    const today = new Date().toISOString().split('T')[0];
    const confirmed: ConfirmedGroceryItem[] = editableItems
      .filter(item => item.name.trim()) // Remove empty names
      .map(item => ({
        name: item.name.trim(),
        date_added: today,
        purchase_date: item.purchase_date,
        expiry_type: item.expiry_type,
        expiry_date: item.expiry_date,
      }));

    onConfirm(confirmed);
  };

  const getConfidenceBadge = (confidence: 'high' | 'medium' | 'low') => {
    const config = {
      high: {
        icon: CheckCircle2,
        color: 'bg-green-500/10 text-green-700 border-green-500',
        label: 'High Confidence'
      },
      medium: {
        icon: AlertTriangle,
        color: 'bg-yellow-500/10 text-yellow-700 border-yellow-500',
        label: 'Medium Confidence'
      },
      low: {
        icon: AlertCircle,
        color: 'bg-orange-500/10 text-orange-700 border-orange-500',
        label: 'Low Confidence'
      },
    };

    const { icon: Icon, color, label } = config[confidence];

    return (
      <Badge variant="outline" className={cn('gap-1 text-xs', color)}>
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Confirm Grocery Items</DialogTitle>
          <DialogDescription>
            Review and edit the items below before adding them to your list
          </DialogDescription>
        </DialogHeader>

        {/* Warnings Section */}
        {warnings.length > 0 && (
          <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-700 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-700">Warnings</p>
                <ul className="text-sm text-yellow-600 mt-1 space-y-1">
                  {warnings.map((warning, idx) => (
                    <li key={idx} className="flex items-start gap-1">
                      <span className="text-yellow-600">•</span>
                      <span>{warning}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Items List */}
        <div className="space-y-3">
          {editableItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No items to confirm
            </div>
          ) : (
            editableItems.map((item, index) => (
              <div
                key={index}
                className="rounded-lg border border-border p-4 space-y-3 bg-card"
              >
                {/* Header: Name input + Confidence + Remove */}
                <div className="flex items-start gap-2">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor={`item-name-${index}`} className="text-xs text-muted-foreground">
                      Item Name
                    </Label>
                    <Input
                      id={`item-name-${index}`}
                      value={item.name}
                      onChange={(e) => updateItemName(index, e.target.value)}
                      placeholder="Enter item name"
                      className="font-medium"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-7">
                    {getConfidenceBadge(item.confidence)}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(index)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      title="Remove item"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Metadata: Portion, Dates */}
                {(item.portion || item.purchase_date || item.expiry_date) && (
                  <div className="flex flex-wrap gap-2 text-xs">
                    {item.portion && (
                      <Badge variant="secondary" className="gap-1">
                        <span className="font-semibold">Portion:</span> {item.portion}
                      </Badge>
                    )}
                    {item.purchase_date && (
                      <Badge variant="secondary" className="gap-1">
                        <span className="font-semibold">Purchased:</span>{' '}
                        {new Date(item.purchase_date).toLocaleDateString()}
                      </Badge>
                    )}
                    {item.expiry_date && (
                      <Badge variant="secondary" className="gap-1">
                        <span className="font-semibold">
                          {item.expiry_type === 'best_before_date' ? 'Best Before' : 'Expires'}:
                        </span>{' '}
                        {new Date(item.expiry_date).toLocaleDateString()}
                      </Badge>
                    )}
                  </div>
                )}

                {/* AI Notes */}
                {item.notes && (
                  <div className="text-xs text-muted-foreground italic bg-muted/50 rounded p-2">
                    <span className="font-semibold not-italic">AI Note:</span> {item.notes}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={editableItems.length === 0 || isLoading}
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Add {editableItems.length} Item{editableItems.length !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

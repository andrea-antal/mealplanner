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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { AlertCircle, CheckCircle2, AlertTriangle, X, Loader2, ChevronDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Item excluded from receipt parsing (non-food, tax, etc.)
 */
export interface ExcludedReceiptItem {
  name: string;
  reason: string;
}

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
  /** Items excluded from parsing (non-food, etc.) */
  excludedItems?: ExcludedReceiptItem[];
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
  excludedItems = [],
  warnings = [],
  onConfirm,
  isLoading = false,
}: GroceryConfirmationDialogProps) {
  // Editable items state (initialized from proposed items)
  const [editableItems, setEditableItems] = useState<ProposedGroceryItem[]>([]);
  // Selected excluded items to add back
  const [selectedExcluded, setSelectedExcluded] = useState<Set<number>>(new Set());
  // Excluded section open state
  const [excludedOpen, setExcludedOpen] = useState(false);

  // Update editable items when proposed items change or dialog opens
  useEffect(() => {
    if (open && proposedItems.length > 0) {
      setEditableItems([...proposedItems]);
    }
    // Reset excluded selection when dialog opens
    if (open) {
      setSelectedExcluded(new Set());
      setExcludedOpen(false);
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

  const toggleExcludedSelection = (index: number) => {
    setSelectedExcluded(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const addSelectedExcludedItems = () => {
    const itemsToAdd: ProposedGroceryItem[] = Array.from(selectedExcluded).map(idx => ({
      name: excludedItems[idx].name,
      confidence: 'medium' as const, // User manually added, so medium confidence
    }));
    setEditableItems(prev => [...prev, ...itemsToAdd]);
    setSelectedExcluded(new Set());
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

  const getConfidenceIcon = (confidence: 'high' | 'medium' | 'low') => {
    const config = {
      high: {
        icon: CheckCircle2,
        color: 'text-green-600',
        title: 'High confidence'
      },
      medium: {
        icon: AlertTriangle,
        color: 'text-yellow-600',
        title: 'Medium confidence'
      },
      low: {
        icon: AlertCircle,
        color: 'text-orange-600',
        title: 'Low confidence'
      },
    };

    const { icon: Icon, color, title } = config[confidence];

    return <Icon className={cn('h-4 w-4', color)} title={title} />;
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
        {(warnings.length > 0 || excludedItems.length > 0) && (
          <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-700 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-700">Notices</p>
                <ul className="text-sm text-yellow-600 mt-1 space-y-1">
                  {warnings.map((warning, idx) => (
                    <li key={idx} className="flex items-start gap-1">
                      <span className="text-yellow-600">•</span>
                      <span>{warning}</span>
                    </li>
                  ))}
                  {excludedItems.length > 0 && (
                    <li className="flex items-start gap-1">
                      <span className="text-yellow-600">•</span>
                      <span>
                        {excludedItems.length} item{excludedItems.length !== 1 ? 's were' : ' was'} excluded (non-food, tax, etc.).
                        If something is missing, expand "Excluded items" at the bottom to add it back.
                      </span>
                    </li>
                  )}
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
                className="rounded-lg border border-border p-4 space-y-2 bg-card"
              >
                {/* Row 1: Confidence icon + Label + X button */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getConfidenceIcon(item.confidence)}
                    <Label htmlFor={`item-name-${index}`} className="text-xs text-muted-foreground">
                      Item Name
                    </Label>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(index)}
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    title="Remove item"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Row 2: Full-width input */}
                <Input
                  id={`item-name-${index}`}
                  value={item.name}
                  onChange={(e) => updateItemName(index, e.target.value)}
                  placeholder="Enter item name"
                  className="w-full font-medium"
                />

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
              </div>
            ))
          )}
        </div>

        {/* Excluded Items Section */}
        {excludedItems.length > 0 && (
          <Collapsible open={excludedOpen} onOpenChange={setExcludedOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between text-muted-foreground hover:text-foreground"
              >
                <span className="text-sm">
                  Excluded items ({excludedItems.length})
                </span>
                <ChevronDown className={cn(
                  "h-4 w-4 transition-transform",
                  excludedOpen && "rotate-180"
                )} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-2">
              <p className="text-xs text-muted-foreground mb-2">
                Select any items that were incorrectly excluded to add them to your list.
              </p>
              {excludedItems.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-2 rounded-md bg-muted/50"
                >
                  <Checkbox
                    id={`excluded-${index}`}
                    checked={selectedExcluded.has(index)}
                    onCheckedChange={() => toggleExcludedSelection(index)}
                  />
                  <label
                    htmlFor={`excluded-${index}`}
                    className="flex-1 text-sm cursor-pointer"
                  >
                    {item.name}
                    <span className="text-xs text-muted-foreground ml-2">
                      ({item.reason})
                    </span>
                  </label>
                </div>
              ))}
              {selectedExcluded.size > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addSelectedExcludedItems}
                  className="w-full mt-2"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add {selectedExcluded.size} selected item{selectedExcluded.size !== 1 ? 's' : ''}
                </Button>
              )}
            </CollapsibleContent>
          </Collapsible>
        )}

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

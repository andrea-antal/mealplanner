import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { MoreHorizontal, Trash2 } from 'lucide-react';
import { type GroceryItem, type ShoppingListItem } from '@/lib/api';
import { type NukeScope } from '@/hooks/useNukeWithUndo';

interface NukeButtonProps {
  inventoryItems: GroceryItem[];
  shoppingItems: ShoppingListItem[];
  onNuke: (scope: NukeScope, inventoryItems: GroceryItem[], shoppingItems: ShoppingListItem[]) => void;
  disabled?: boolean;
}

export function NukeButton({ inventoryItems, shoppingItems, onNuke, disabled }: NukeButtonProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedScope, setSelectedScope] = useState<NukeScope>('both');

  const inventoryCount = inventoryItems.length;
  const shoppingCount = shoppingItems.length;
  const totalCount = inventoryCount + shoppingCount;

  const isDisabled = disabled || totalCount === 0;

  const handleConfirm = () => {
    onNuke(selectedScope, inventoryItems, shoppingItems);
    setShowConfirmDialog(false);
  };

  const getSelectedCount = () => {
    switch (selectedScope) {
      case 'inventory':
        return inventoryCount;
      case 'shopping':
        return shoppingCount;
      case 'both':
        return totalCount;
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground"
            disabled={isDisabled}
          >
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">More options</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => setShowConfirmDialog(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All...
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Items?</AlertDialogTitle>
            <AlertDialogDescription>
              Select what to clear. You can undo this action for 10 seconds after clearing.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <RadioGroup
            value={selectedScope}
            onValueChange={(value) => setSelectedScope(value as NukeScope)}
            className="space-y-3 py-4"
          >
            <div className="flex items-center space-x-3">
              <RadioGroupItem
                value="inventory"
                id="scope-inventory"
                disabled={inventoryCount === 0}
              />
              <Label
                htmlFor="scope-inventory"
                className={inventoryCount === 0 ? 'text-muted-foreground' : ''}
              >
                Inventory only ({inventoryCount} item{inventoryCount !== 1 ? 's' : ''})
              </Label>
            </div>

            <div className="flex items-center space-x-3">
              <RadioGroupItem
                value="shopping"
                id="scope-shopping"
                disabled={shoppingCount === 0}
              />
              <Label
                htmlFor="scope-shopping"
                className={shoppingCount === 0 ? 'text-muted-foreground' : ''}
              >
                Shopping list only ({shoppingCount} item{shoppingCount !== 1 ? 's' : ''})
              </Label>
            </div>

            <div className="flex items-center space-x-3">
              <RadioGroupItem value="both" id="scope-both" />
              <Label htmlFor="scope-both">
                Both ({totalCount} item{totalCount !== 1 ? 's' : ''} total)
              </Label>
            </div>
          </RadioGroup>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={getSelectedCount() === 0}
            >
              Clear {getSelectedCount()} Item{getSelectedCount() !== 1 ? 's' : ''}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

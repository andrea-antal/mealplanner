import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  shoppingListAPI,
  templatesAPI,
  type ShoppingListItem,
  type TemplateItem,
} from '@/lib/api';
import { getCurrentWorkspace } from '@/lib/workspace';
import { TemplatesManager } from './TemplatesManager';
import {
  Plus,
  Trash2,
  Loader2,
  Star,
  ShoppingCart,
  Package,
  Bookmark,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { GROCERY_CATEGORIES } from '@/lib/groceryCategories';

interface ShoppingListTabProps {
  onAddToInventory?: (item: ShoppingListItem) => void;
}

export const ShoppingListTab = ({ onAddToInventory }: ShoppingListTabProps) => {
  const queryClient = useQueryClient();
  const workspaceId = getCurrentWorkspace();

  const [newItemName, setNewItemName] = useState('');
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showAddToInventoryDialog, setShowAddToInventoryDialog] = useState(false);
  const [itemToCheckOff, setItemToCheckOff] = useState<ShoppingListItem | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);

  // Fetch shopping list
  const { data: shoppingList, isLoading } = useQuery({
    queryKey: ['shopping-list', workspaceId],
    queryFn: () => shoppingListAPI.getAll(workspaceId!),
    enabled: !!workspaceId,
  });

  // Fetch templates for favorites
  const { data: templates } = useQuery({
    queryKey: ['shopping-templates', workspaceId],
    queryFn: () => templatesAPI.getAll(workspaceId!),
    enabled: !!workspaceId,
  });

  // Mutations
  const addItemMutation = useMutation({
    mutationFn: (name: string) =>
      shoppingListAPI.addItem(workspaceId!, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-list', workspaceId] });
      setNewItemName('');
      toast.success('Item added to shopping list');
    },
    onError: () => {
      toast.error('Failed to add item');
    },
  });

  const checkOffMutation = useMutation({
    mutationFn: ({ itemId, addToInventory }: { itemId: string; addToInventory: boolean }) =>
      shoppingListAPI.checkOff(workspaceId!, itemId, addToInventory),
    onSuccess: (item, { addToInventory }) => {
      queryClient.invalidateQueries({ queryKey: ['shopping-list', workspaceId] });
      if (addToInventory) {
        queryClient.invalidateQueries({ queryKey: ['groceries', workspaceId] });
        toast.success(`${item.name} added to inventory`);
      }
    },
    onError: () => {
      toast.error('Failed to check off item');
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: (itemId: string) =>
      shoppingListAPI.deleteItem(workspaceId!, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-list', workspaceId] });
    },
    onError: () => {
      toast.error('Failed to delete item');
    },
  });

  const clearListMutation = useMutation({
    mutationFn: () => shoppingListAPI.clearAll(workspaceId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-list', workspaceId] });
      toast.success('Shopping list cleared');
      setShowClearDialog(false);
    },
    onError: () => {
      toast.error('Failed to clear list');
    },
  });

  const addFromFavoritesMutation = useMutation({
    mutationFn: () => shoppingListAPI.addFromFavorites(workspaceId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-list', workspaceId] });
      toast.success('Favorites added to shopping list');
    },
    onError: () => {
      toast.error('Failed to add favorites');
    },
  });

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItemName.trim()) {
      addItemMutation.mutate(newItemName.trim());
    }
  };

  const handleCheckOff = (item: ShoppingListItem) => {
    if (item.is_checked) {
      // Uncheck - just update the item
      checkOffMutation.mutate({ itemId: item.id, addToInventory: false });
    } else {
      // Check off - ask about inventory
      setItemToCheckOff(item);
      setShowAddToInventoryDialog(true);
    }
  };

  const confirmCheckOff = (addToInventory: boolean) => {
    if (itemToCheckOff) {
      checkOffMutation.mutate({ itemId: itemToCheckOff.id, addToInventory });
      setItemToCheckOff(null);
      setShowAddToInventoryDialog(false);
    }
  };

  // Group items by category
  const groupedItems = shoppingList?.items.reduce((acc, item) => {
    const category = item.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, ShoppingListItem[]>) || {};

  const uncheckedCount = shoppingList?.items.filter(i => !i.is_checked).length || 0;
  const totalCount = shoppingList?.items.length || 0;
  const favoriteCount = templates?.items.filter(t => t.is_favorite).length || 0;

  if (!workspaceId) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {uncheckedCount} of {totalCount} items remaining
          </span>
        </div>
        <div className="flex gap-2">
          {favoriteCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => addFromFavoritesMutation.mutate()}
              disabled={addFromFavoritesMutation.isPending}
            >
              <Star className="w-4 h-4 mr-1" />
              Add Favorites ({favoriteCount})
            </Button>
          )}
          {totalCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowClearDialog(true)}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Clear List
            </Button>
          )}
        </div>
      </div>

      {/* Add item form */}
      <form onSubmit={handleAddItem} className="flex gap-2">
        <Input
          placeholder="Add item to shopping list..."
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          className="flex-1"
        />
        <Button
          type="submit"
          disabled={!newItemName.trim() || addItemMutation.isPending}
        >
          {addItemMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
        </Button>
      </form>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && totalCount === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">Your shopping list is empty</p>
          <p className="text-sm mt-1">Add items above or use your favorite templates</p>
        </div>
      )}

      {/* Shopping list items grouped by category */}
      {!isLoading && totalCount > 0 && (
        <div className="space-y-4">
          {Object.entries(groupedItems).map(([category, items]) => (
            <div key={category} className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground capitalize">
                {category}
              </h3>
              <div className="space-y-1">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border bg-card group',
                      'hover:bg-accent/50 transition-colors',
                      item.is_checked && 'opacity-60'
                    )}
                  >
                    <Checkbox
                      checked={item.is_checked}
                      onCheckedChange={() => handleCheckOff(item)}
                      className="h-5 w-5"
                    />
                    <div className="flex-1 min-w-0">
                      <span
                        className={cn(
                          'text-sm font-medium',
                          item.is_checked && 'line-through text-muted-foreground'
                        )}
                      >
                        {item.name}
                      </span>
                      {item.quantity && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({item.quantity})
                        </span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteItemMutation.mutate(item.id)}
                      className="opacity-0 group-hover:opacity-100 hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Templates section */}
      <Collapsible open={showTemplates} onOpenChange={setShowTemplates}>
        <CollapsibleTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between"
          >
            <div className="flex items-center gap-2">
              <Bookmark className="w-4 h-4" />
              <span>Manage Templates</span>
            </div>
            <ChevronDown
              className={cn(
                'w-4 h-4 transition-transform',
                showTemplates && 'rotate-180'
              )}
            />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4">
          <TemplatesManager />
        </CollapsibleContent>
      </Collapsible>

      {/* Clear list confirmation dialog */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Shopping List?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all {totalCount} items from your shopping list.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => clearListMutation.mutate()}
              disabled={clearListMutation.isPending}
            >
              {clearListMutation.isPending ? 'Clearing...' : 'Clear List'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add to inventory dialog */}
      <AlertDialog open={showAddToInventoryDialog} onOpenChange={setShowAddToInventoryDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add to Inventory?</AlertDialogTitle>
            <AlertDialogDescription>
              Would you like to add "{itemToCheckOff?.name}" to your grocery inventory?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => confirmCheckOff(false)}>
              No, just check off
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmCheckOff(true)}>
              Yes, add to inventory
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

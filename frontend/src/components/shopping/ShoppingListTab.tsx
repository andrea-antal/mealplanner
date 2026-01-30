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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  shoppingListAPI,
  templatesAPI,
  type ShoppingListItem,
} from '@/lib/api';
import { getCurrentWorkspace } from '@/lib/workspace';
import {
  X,
  Trash2,
  Loader2,
  Package,
  MoreHorizontal,
  Search,
  ArrowDownAZ,
  Clock,
  CheckSquare,
  Snowflake,
  Star,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ShoppingListTabProps {
  onAddToInventory?: (item: ShoppingListItem) => void;
}

// Get unique categories from items
const getCategories = (items: ShoppingListItem[]): string[] => {
  const categories = new Set(items.map(item => item.category || 'Other'));
  return Array.from(categories).sort();
};

export const ShoppingListTab = ({ onAddToInventory }: ShoppingListTabProps) => {
  const queryClient = useQueryClient();
  const workspaceId = getCurrentWorkspace();

  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showAddToInventoryDialog, setShowAddToInventoryDialog] = useState(false);
  const [itemToCheckOff, setItemToCheckOff] = useState<ShoppingListItem | null>(null);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortMode, setSortMode] = useState<'recent' | 'alphabetical'>(() => {
    return (localStorage.getItem('mealplanner_shopping_sort_mode') as 'recent' | 'alphabetical') || 'recent';
  });
  const [viewMode, setViewMode] = useState<'flat' | 'split'>('flat');

  // Selection mode state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  // Persist sort mode
  const handleSortChange = (mode: 'recent' | 'alphabetical') => {
    setSortMode(mode);
    localStorage.setItem('mealplanner_shopping_sort_mode', mode);
  };

  // Fetch shopping list
  const { data: shoppingList, isLoading } = useQuery({
    queryKey: ['shopping-list', workspaceId],
    queryFn: () => shoppingListAPI.getAll(workspaceId!),
    enabled: !!workspaceId,
  });

  // Fetch favorites/templates
  const { data: templateList } = useQuery({
    queryKey: ['shopping-templates', workspaceId],
    queryFn: () => templatesAPI.getAll(workspaceId!),
    enabled: !!workspaceId,
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

  // Batch delete mutation
  const batchDeleteMutation = useMutation({
    mutationFn: async (itemIds: string[]) => {
      for (const id of itemIds) {
        await shoppingListAPI.deleteItem(workspaceId!, id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-list', workspaceId] });
      toast.success(`${selectedItems.length} items deleted`);
      setSelectedItems([]);
      setIsSelectionMode(false);
    },
    onError: () => {
      toast.error('Failed to delete items');
    },
  });

  // Add all favorites to shopping list mutation
  const addFavoritesMutation = useMutation({
    mutationFn: async () => {
      const favorites = templateList?.items || [];
      const existingNames = new Set(
        (shoppingList?.items || []).map(item => item.canonical_name || item.name.toLowerCase())
      );

      // Filter out favorites already in shopping list
      const newFavorites = favorites.filter(
        f => !existingNames.has(f.canonical_name || f.name.toLowerCase())
      );

      if (newFavorites.length === 0) {
        return { added: 0 };
      }

      // Add each favorite to shopping list
      for (const favorite of newFavorites) {
        await shoppingListAPI.addItem(workspaceId!, {
          name: favorite.name,
          canonical_name: favorite.canonical_name,
          category: favorite.category,
          quantity: favorite.default_quantity,
        });
      }

      return { added: newFavorites.length };
    },
    onSuccess: ({ added }) => {
      queryClient.invalidateQueries({ queryKey: ['shopping-list', workspaceId] });
      if (added > 0) {
        toast.success(`Added ${added} favorite${added !== 1 ? 's' : ''} to list`);
      } else {
        toast.info('All favorites already in list');
      }
    },
    onError: () => {
      toast.error('Failed to add favorites');
    },
  });

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

  // Selection handlers
  const handleToggleSelect = (itemId: string) => {
    setSelectedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleDeleteSelected = () => {
    if (selectedItems.length > 0) {
      batchDeleteMutation.mutate(selectedItems);
    }
  };

  // Get all items and available categories
  const allItems = shoppingList?.items || [];
  const categories = getCategories(allItems);

  // Filter items
  const filteredItems = allItems.filter(item => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!item.name.toLowerCase().includes(query)) {
        return false;
      }
    }
    // Category filter
    if (categoryFilter !== 'all') {
      const itemCategory = item.category || 'Other';
      if (itemCategory !== categoryFilter) {
        return false;
      }
    }
    return true;
  });

  // Sort items
  const sortedItems = [...filteredItems].sort((a, b) => {
    if (sortMode === 'alphabetical') {
      return a.name.localeCompare(b.name);
    }
    // 'recent' - by ID (newer items have later IDs)
    return b.id.localeCompare(a.id);
  });

  // Group items by category for display
  const groupedItems = sortedItems.reduce((acc, item) => {
    const category = item.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, ShoppingListItem[]>);

  const uncheckedCount = allItems.filter(i => !i.is_checked).length;
  const totalCount = allItems.length;
  const filteredCount = filteredItems.length;

  if (!workspaceId) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Search, Filter, Sort Controls */}
      <div className="rounded-2xl bg-card shadow-soft p-4 space-y-3">
        {/* Search and Filter Row */}
        <div className="flex items-center gap-2">
          {/* Search - full width like Inventory */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-10 gap-1 min-w-[80px]">
                {categoryFilter === 'all' ? 'All' : categoryFilter}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setCategoryFilter('all')}>
                All Categories
              </DropdownMenuItem>
              {categories.map(category => (
                <DropdownMenuItem
                  key={category}
                  onClick={() => setCategoryFilter(category)}
                >
                  {category}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sort and View Buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleSortChange('alphabetical')}
              className={cn(
                "p-2 rounded-md transition-colors",
                sortMode === 'alphabetical'
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
              title="Sort A-Z"
            >
              <ArrowDownAZ className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleSortChange('recent')}
              className={cn(
                "p-2 rounded-md transition-colors",
                sortMode === 'recent'
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
              title="Sort by recently added"
            >
              <Clock className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode(viewMode === 'flat' ? 'split' : 'flat')}
              className={cn(
                "p-2 rounded-md transition-colors",
                viewMode === 'split'
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
              title={viewMode === 'flat' ? 'Group by category' : 'Show flat list'}
            >
              <Snowflake className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Item Count and Actions Row */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {uncheckedCount} of {totalCount} items remaining
            {filteredCount !== totalCount && ` (showing ${filteredCount})`}
          </p>
          <div className="flex items-center gap-2">
            {/* Add Favorites button */}
            {(templateList?.items.length || 0) > 0 && (
              <button
                onClick={() => addFavoritesMutation.mutate()}
                disabled={addFavoritesMutation.isPending}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-colors",
                  "text-muted-foreground hover:text-yellow-600 hover:bg-yellow-500/10"
                )}
                title="Add all favorites to shopping list"
              >
                {addFavoritesMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Star className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">Add Favorites</span>
              </button>
            )}
            <button
              onClick={() => {
                if (isSelectionMode) {
                  setSelectedItems([]);
                }
                setIsSelectionMode(!isSelectionMode);
              }}
              className={cn(
                "flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-colors",
                isSelectionMode
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <CheckSquare className="h-3.5 w-3.5" />
              Select
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => setShowClearDialog(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear List
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Selection Mode Action Bar */}
      {isSelectionMode && selectedItems.length > 0 && (
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <span className="text-sm font-medium">
            {selectedItems.length} selected
          </span>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDeleteSelected}
            disabled={batchDeleteMutation.isPending}
          >
            {batchDeleteMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </>
            )}
          </Button>
        </div>
      )}

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
          <p className="text-sm mt-1">Click "Add Items" to get started</p>
        </div>
      )}

      {/* No results state */}
      {!isLoading && totalCount > 0 && filteredCount === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No items match your search</p>
          <p className="text-sm mt-1">Try a different search term or filter</p>
        </div>
      )}

      {/* Shopping list items grouped by category */}
      {!isLoading && filteredCount > 0 && (
        <div className="rounded-2xl bg-card shadow-soft overflow-hidden">
          {Object.entries(groupedItems)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([category, items], categoryIndex) => (
              <div key={category}>
                {/* Category header */}
                <div className="px-4 py-2 bg-muted/30 border-b border-border">
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {category}
                  </h3>
                </div>
                {/* Items in category */}
                {items.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 border-b border-border/50 last:border-b-0',
                      'hover:bg-muted/30 transition-colors group',
                      item.is_checked && 'opacity-60',
                      isSelectionMode && selectedItems.includes(item.id) && 'bg-primary/5'
                    )}
                  >
                    {isSelectionMode ? (
                      <Checkbox
                        checked={selectedItems.includes(item.id)}
                        onCheckedChange={() => handleToggleSelect(item.id)}
                        className="h-5 w-5"
                      />
                    ) : (
                      <Checkbox
                        checked={item.is_checked}
                        onCheckedChange={() => handleCheckOff(item)}
                        className="h-5 w-5"
                      />
                    )}
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
                    {!isSelectionMode && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteItemMutation.mutate(item.id)}
                        className="opacity-0 group-hover:opacity-100 h-8 w-8 p-0"
                      >
                        <Trash2 className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ))}
        </div>
      )}

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

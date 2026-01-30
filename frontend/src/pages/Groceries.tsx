import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { DynamicRecipeModal } from '@/components/DynamicRecipeModal';
import { AddGroceryModal } from '@/components/groceries/AddGroceryModal';
import { GroceryListItem } from '@/components/groceries/GroceryListItem';
import { GrocerySection } from '@/components/groceries/GrocerySection';
import { GroceryItemModal } from '@/components/groceries/GroceryItemModal';
import { StickyActionBar } from '@/components/groceries/StickyActionBar';
import { ShoppingListTab } from '@/components/shopping/ShoppingListTab';
import { TemplatesManager } from '@/components/shopping/TemplatesManager';
import { groceriesAPI, templatesAPI, shoppingListAPI, type GroceryItem, type Recipe } from '@/lib/api';
import { getCurrentWorkspace } from '@/lib/workspace';
import {
  X,
  Plus,
  ShoppingBasket,
  Loader2,
  CheckSquare,
  Snowflake,
  Package,
  Search,
  ArrowDownAZ,
  Clock,
  ShoppingCart,
  ArrowUp,
  Star,
  MoreHorizontal,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { itemMatchesCategory } from '@/lib/groceryCategories';

const Groceries = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const workspaceId = getCurrentWorkspace();

  // Redirect to home if no workspace is set
  useEffect(() => {
    if (!workspaceId) {
      navigate('/');
    }
  }, [workspaceId, navigate]);

  if (!workspaceId) {
    return null;
  }

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);

  // Selection state
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedItem, setSelectedItem] = useState<GroceryItem | null>(null);

  // Clear inventory dialog state
  const [showClearInventoryDialog, setShowClearInventoryDialog] = useState(false);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [expiryFilter, setExpiryFilter] = useState<'all' | 'expiring' | 'expired'>('all');

  // Scroll state for back to top button
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Tab state with localStorage persistence
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('mealplanner_groceries_tab') || 'inventory';
  });

  useEffect(() => {
    localStorage.setItem('mealplanner_groceries_tab', activeTab);
  }, [activeTab]);

  // View mode state: 'flat' shows single list, 'split' shows Fridge/Pantry columns
  const [viewMode, setViewMode] = useState<'flat' | 'split'>(() => {
    return (localStorage.getItem('mealplanner_grocery_view_mode') as 'flat' | 'split') || 'flat';
  });

  useEffect(() => {
    localStorage.setItem('mealplanner_grocery_view_mode', viewMode);
  }, [viewMode]);

  // Sort mode state: 'recent' (newest first) or 'alphabetical' (A-Z)
  const [sortMode, setSortMode] = useState<'recent' | 'alphabetical'>(() => {
    return (localStorage.getItem('mealplanner_grocery_sort_mode') as 'recent' | 'alphabetical') || 'recent';
  });

  useEffect(() => {
    localStorage.setItem('mealplanner_grocery_sort_mode', sortMode);
  }, [sortMode]);

  // Fetch groceries from backend
  const { data: groceryList, isLoading, error } = useQuery({
    queryKey: ['groceries', workspaceId],
    queryFn: () => groceriesAPI.getAll(workspaceId),
  });

  // Fetch shopping list for nuke button
  const { data: shoppingList } = useQuery({
    queryKey: ['shopping-list', workspaceId],
    queryFn: () => shoppingListAPI.getAll(workspaceId),
    enabled: !!workspaceId,
  });

  // Fetch favorites/templates to check which items are already favorites
  const { data: templateList } = useQuery({
    queryKey: ['shopping-templates', workspaceId],
    queryFn: () => templatesAPI.getAll(workspaceId),
    enabled: !!workspaceId,
  });

  // Create a Set of favorite names for quick lookup (case-insensitive)
  const favoriteNames = new Set(
    templateList?.items.map(t => t.name.toLowerCase()) || []
  );

  // Delete grocery mutation
  const deleteMutation = useMutation({
    mutationFn: (name: string) => groceriesAPI.delete(workspaceId, name),
    onSuccess: (_, name) => {
      queryClient.invalidateQueries({ queryKey: ['groceries', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['groceries-expiring', workspaceId] });
      toast.success(`${name} removed`);
      setSelectedIngredients((prev) => prev.filter((i) => i !== name));
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete item: ${error.message}`);
    },
  });

  // Update grocery mutation
  const updateMutation = useMutation({
    mutationFn: async ({ name, updates }: { name: string; updates: Partial<GroceryItem> }) => {
      const currentItem = groceries.find(g => g.name === name);
      if (!currentItem) throw new Error('Item not found');
      await groceriesAPI.delete(workspaceId, name);
      return groceriesAPI.add(workspaceId, { ...currentItem, ...updates } as GroceryItem);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groceries', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['groceries-expiring', workspaceId] });
      toast.success('Item updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update item: ${error.message}`);
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: (itemNames: string[]) => groceriesAPI.batchDelete(workspaceId, itemNames),
    onSuccess: (_, itemNames) => {
      queryClient.invalidateQueries({ queryKey: ['groceries', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['groceries-expiring', workspaceId] });
      toast.success(`${itemNames.length} item${itemNames.length !== 1 ? 's' : ''} deleted`);
      setSelectedIngredients([]);
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete items: ${error.message}`);
    },
  });

  // Storage location update mutation
  const updateStorageLocationMutation = useMutation({
    mutationFn: ({ itemNames, storageLocation }: { itemNames: string[]; storageLocation: 'fridge' | 'pantry' }) =>
      groceriesAPI.updateStorageLocation(workspaceId, itemNames, storageLocation),
    onSuccess: (_, { itemNames, storageLocation }) => {
      queryClient.invalidateQueries({ queryKey: ['groceries', workspaceId] });
      const locationLabel = storageLocation === 'fridge' ? 'Fridge/Freezer' : 'Pantry';
      toast.success(`Moved ${itemNames.length} item${itemNames.length !== 1 ? 's' : ''} to ${locationLabel}`);
      setSelectedIngredients([]);
    },
    onError: (error: Error) => {
      toast.error(`Failed to move items: ${error.message}`);
    },
  });

  // Add to favorites mutation
  const addToFavoritesMutation = useMutation({
    mutationFn: (item: GroceryItem) => templatesAPI.create(workspaceId, {
      name: item.name,
      canonical_name: item.canonical_name,
      category: item.storage_location === 'pantry' ? 'pantry' : 'dairy',
      is_favorite: true,
    }),
    onSuccess: (_, item) => {
      queryClient.invalidateQueries({ queryKey: ['shopping-templates', workspaceId] });
      toast.success(`${item.name} added to favorites`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to add favorite: ${error.message}`);
    },
  });

  // Handler that checks for duplicates before adding to favorites
  const handleAddToFavorites = (item: GroceryItem) => {
    if (favoriteNames.has(item.name.toLowerCase())) {
      toast.info(`${item.name} is already in favorites`);
      return;
    }
    addToFavoritesMutation.mutate(item);
  };

  // Add to shopping list mutation
  const addToShoppingListMutation = useMutation({
    mutationFn: (item: GroceryItem) => shoppingListAPI.addItem(workspaceId, { name: item.name }),
    onSuccess: (_, item) => {
      queryClient.invalidateQueries({ queryKey: ['shopping-list', workspaceId] });
      toast.success(`${item.name} added to shopping list`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to add to shopping list: ${error.message}`);
    },
  });

  // Handlers
  const removeGrocery = (name: string) => deleteMutation.mutate(name);

  const handleOpenItemModal = (item: GroceryItem) => {
    setSelectedItem(item);
    setShowItemModal(true);
  };

  const handleUpdateItem = (name: string, updates: Partial<GroceryItem>) => {
    updateMutation.mutate({ name, updates });
  };

  const handleMoveItem = (name: string, storageLocation: 'fridge' | 'pantry') => {
    updateStorageLocationMutation.mutate({ itemNames: [name], storageLocation });
  };

  const toggleIngredientSelection = (name: string) => {
    setSelectedIngredients((prev) =>
      prev.includes(name) ? prev.filter((i) => i !== name) : [...prev, name]
    );
  };

  const handleCancelSelection = () => {
    setIsSelectionMode(false);
    setSelectedIngredients([]);
  };

  const handleCookWithSelected = () => {
    if (selectedIngredients.length === 0) {
      toast.error('Please select at least one ingredient');
      return;
    }
    setShowRecipeModal(true);
  };

  const handleRecipeGenerated = (recipe: Recipe) => {
    toast.success(`Recipe "${recipe.title}" created successfully!`);
    navigate('/cook', { state: { openRecipeId: recipe.id } });
  };

  const handleBulkDeleteRequest = () => {
    if (selectedIngredients.length === 0) {
      toast.error('Please select at least one item to delete');
      return;
    }
    setShowDeleteConfirmDialog(true);
  };

  const handleClearInventoryConfirm = () => {
    const allItemNames = groceries.map(item => item.name);
    if (allItemNames.length > 0) {
      bulkDeleteMutation.mutate(allItemNames);
    }
    setShowClearInventoryDialog(false);
  };

  const handleBulkDeleteConfirm = () => {
    bulkDeleteMutation.mutate(selectedIngredients);
    setShowDeleteConfirmDialog(false);
  };

  const handleBulkMoveRequest = () => {
    if (selectedIngredients.length === 0) {
      toast.error('Please select at least one item to move');
      return;
    }
    setShowMoveDialog(true);
  };

  const handleBulkMove = (storageLocation: 'fridge' | 'pantry') => {
    updateStorageLocationMutation.mutate({ itemNames: selectedIngredients, storageLocation });
    setShowMoveDialog(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-destructive/10 p-6 text-destructive">
        <h2 className="font-semibold mb-2">Error loading grocery list</h2>
        <p className="text-sm">{error instanceof Error ? error.message : 'Unknown error'}</p>
      </div>
    );
  }

  const groceries = groceryList?.items || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Groceries</h1>
          <p className="text-muted-foreground mt-1">Manage your inventory and shopping list</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="hero" onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4" />
            Add Items
          </Button>
        </div>
      </div>

      {/* Tab Navigation - Underline Style */}
      <div className="flex items-center gap-6 border-b border-border">
        <button
          onClick={() => setActiveTab('inventory')}
          className={cn(
            "flex items-center gap-2 py-3 text-sm font-medium transition-colors relative",
            activeTab === 'inventory'
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Package className="h-4 w-4" />
          Inventory
          {activeTab === 'inventory' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('shopping')}
          className={cn(
            "flex items-center gap-2 py-3 text-sm font-medium transition-colors relative",
            activeTab === 'shopping'
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <ShoppingCart className="h-4 w-4" />
          Shopping List
          {activeTab === 'shopping' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('favorites')}
          className={cn(
            "flex items-center gap-2 py-3 text-sm font-medium transition-colors relative",
            activeTab === 'favorites'
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Star className="h-4 w-4" />
          Favorites
          {activeTab === 'favorites' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
          )}
        </button>
      </div>

      {/* Shopping List Tab */}
      {activeTab === 'shopping' && (
        <div className="space-y-6">
          <ShoppingListTab />
        </div>
      )}

      {/* Favorites Tab */}
      {activeTab === 'favorites' && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-card shadow-soft p-4">
            <TemplatesManager />
          </div>
        </div>
      )}

      {/* Inventory Tab */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">

          {/* Grocery List */}
          {(() => {
            const getExpiryStatus = (item: GroceryItem): 'expired' | 'expiring' | 'good' => {
              if (!item.expiry_date) return 'good';
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const expiryDate = new Date(item.expiry_date);
              expiryDate.setHours(0, 0, 0, 0);
              const daysUntilExpiry = Math.floor(
                (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
              );
              if (daysUntilExpiry <= 0) return 'expired';
              if (daysUntilExpiry <= 3) return 'expiring';
              return 'good';
            };

            const filteredGroceries = groceries
              .filter(item => {
                const searchLower = searchQuery.toLowerCase().trim();
                const matchesText = searchLower === '' ||
                  item.name.toLowerCase().includes(searchLower) ||
                  (item.canonical_name?.toLowerCase().includes(searchLower) ?? false);
                const matchesCategory = searchLower !== '' &&
                  itemMatchesCategory(item.name, item.canonical_name, searchLower);
                const matchesSearch = matchesText || matchesCategory;
                const status = getExpiryStatus(item);
                const matchesExpiry = expiryFilter === 'all' ||
                  (expiryFilter === 'expired' && status === 'expired') ||
                  (expiryFilter === 'expiring' && (status === 'expired' || status === 'expiring'));
                return matchesSearch && matchesExpiry;
              })
              .sort((a, b) => {
                if (sortMode === 'alphabetical') {
                  return a.name.localeCompare(b.name);
                }
                // 'recent' - sort by date_added descending (newest first)
                return new Date(b.date_added).getTime() - new Date(a.date_added).getTime();
              });

            const fridgeItems = filteredGroceries.filter(g => (g.storage_location ?? 'fridge') === 'fridge');
            const pantryItems = filteredGroceries.filter(g => g.storage_location === 'pantry');
            const isFiltering = searchQuery !== '' || expiryFilter !== 'all';

            if (groceries.length === 0) {
              return (
                <div className="flex flex-col items-center justify-center rounded-2xl bg-card py-16 text-center shadow-soft">
                  <ShoppingBasket className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-2">Your grocery list is empty</p>
                  <p className="text-sm text-muted-foreground">
                    Add items to help generate better meal plans
                  </p>
                </div>
              );
            }

            if (filteredGroceries.length === 0 && isFiltering) {
              return (
                <div className="flex flex-col items-center justify-center rounded-2xl bg-card py-12 text-center shadow-soft">
                  <Search className="h-10 w-10 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-2">No items match your search</p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setSearchQuery('');
                      setExpiryFilter('all');
                    }}
                  >
                    Clear filters
                  </Button>
                </div>
              );
            }

            return (
              <div className="rounded-2xl bg-card shadow-soft p-4 space-y-3">
                {/* Search and filter row */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-8 h-9"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <select
                    value={expiryFilter}
                    onChange={(e) => setExpiryFilter(e.target.value as 'all' | 'expiring' | 'expired')}
                    className="h-9 px-2 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="all">All</option>
                    <option value="expiring">Expiring</option>
                    <option value="expired">Expired</option>
                  </select>
                  <div className="flex items-center gap-1 border-l border-border pl-2 ml-1">
                    <button
                      onClick={() => setSortMode('alphabetical')}
                      className={cn(
                        "p-2 rounded-lg transition-colors shrink-0",
                        sortMode === 'alphabetical'
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      )}
                      title="Sort A-Z"
                    >
                      <ArrowDownAZ className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setSortMode('recent')}
                      className={cn(
                        "p-2 rounded-lg transition-colors shrink-0",
                        sortMode === 'recent'
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      )}
                      title="Sort by recently added"
                    >
                      <Clock className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setViewMode(viewMode === 'flat' ? 'split' : 'flat')}
                      className={cn(
                        "p-2 rounded-lg transition-colors shrink-0",
                        viewMode === 'split'
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      )}
                      title={viewMode === 'flat' ? 'Show Fridge/Pantry split' : 'Show flat list'}
                    >
                      <Snowflake className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Count and selection row */}
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {isFiltering
                      ? `${filteredGroceries.length} of ${groceries.length} items`
                      : `${groceries.length} item${groceries.length !== 1 ? 's' : ''}`
                    }
                    {isSelectionMode && selectedIngredients.length > 0 && (
                      <span className="text-primary ml-1">
                        ({selectedIngredients.length} selected)
                      </span>
                    )}
                  </p>
                  <div className="flex items-center gap-2">
                    {isSelectionMode ? (
                      <button
                        onClick={handleCancelSelection}
                        className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Cancel
                      </button>
                    ) : (
                      <button
                        onClick={() => setIsSelectionMode(true)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <CheckSquare className="h-3.5 w-3.5" />
                        Select
                      </button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => setShowClearInventoryDialog(true)}
                          disabled={groceries.length === 0}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Clear Inventory
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Flat view */}
                {viewMode === 'flat' && (
                  <div className="rounded-xl border border-border overflow-hidden">
                    {filteredGroceries.map((item) => (
                      <GroceryListItem
                        key={item.name}
                        item={item}
                        isSelected={selectedIngredients.includes(item.name)}
                        isSelectionMode={isSelectionMode}
                        showStorageTag={true}
                        isFavorite={favoriteNames.has(item.name.toLowerCase())}
                        onToggleSelect={toggleIngredientSelection}
                        onOpenModal={handleOpenItemModal}
                        onAddToFavorites={handleAddToFavorites}
                        onAddToShoppingList={(item) => addToShoppingListMutation.mutate(item)}
                      />
                    ))}
                  </div>
                )}

                {/* Split view */}
                {viewMode === 'split' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <GrocerySection
                      title="Fridge / Freezer"
                      icon={Snowflake}
                      items={fridgeItems}
                      isSelectionMode={isSelectionMode}
                      selectedIngredients={selectedIngredients}
                      onToggleSelect={toggleIngredientSelection}
                      onOpenModal={handleOpenItemModal}
                      onAddToFavorites={handleAddToFavorites}
                      onAddToShoppingList={(item) => addToShoppingListMutation.mutate(item)}
                      favoriteNames={favoriteNames}
                    />
                    <GrocerySection
                      title="Pantry"
                      icon={Package}
                      items={pantryItems}
                      isSelectionMode={isSelectionMode}
                      selectedIngredients={selectedIngredients}
                      onToggleSelect={toggleIngredientSelection}
                      onOpenModal={handleOpenItemModal}
                      onAddToFavorites={handleAddToFavorites}
                      onAddToShoppingList={(item) => addToShoppingListMutation.mutate(item)}
                      favoriteNames={favoriteNames}
                    />
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Sticky Action Bar */}
      {isSelectionMode && activeTab === 'inventory' && (
        <StickyActionBar
          selectedCount={selectedIngredients.length}
          onCook={handleCookWithSelected}
          onPlan={() => navigate('/plan', { state: { selectedIngredients } })}
          onMove={handleBulkMoveRequest}
          onDelete={handleBulkDeleteRequest}
        />
      )}

      {/* Modals */}
      <AddGroceryModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        defaultDestination={activeTab === 'shopping' || activeTab === 'favorites' ? 'shopping' : 'inventory'}
      />

      <DynamicRecipeModal
        open={showRecipeModal}
        onOpenChange={setShowRecipeModal}
        selectedIngredients={selectedIngredients}
        onRecipeGenerated={handleRecipeGenerated}
      />

      <GroceryItemModal
        item={selectedItem}
        open={showItemModal}
        onOpenChange={setShowItemModal}
        onUpdate={handleUpdateItem}
        onDelete={removeGrocery}
        onMove={handleMoveItem}
        onAddToFavorites={(item) => addToFavoritesMutation.mutate(item)}
      />

      {/* Bulk Delete Dialog */}
      <AlertDialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedIngredients.length} item{selectedIngredients.length !== 1 ? 's' : ''}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected grocery items.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear Inventory Dialog */}
      <AlertDialog open={showClearInventoryDialog} onOpenChange={setShowClearInventoryDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Inventory?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all {groceries.length} item{groceries.length !== 1 ? 's' : ''} from your inventory.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearInventoryConfirm}
              disabled={bulkDeleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDeleteMutation.isPending ? 'Clearing...' : 'Clear Inventory'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Move Dialog */}
      <AlertDialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Move {selectedIngredients.length} item{selectedIngredients.length !== 1 ? 's' : ''}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Choose where to move the selected items.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-3 py-4">
            <Button
              variant="outline"
              className="w-full h-14 justify-start"
              onClick={() => handleBulkMove('fridge')}
            >
              <Snowflake className="h-5 w-5 mr-3" />
              <div className="text-left">
                <div className="font-medium">Move to Fridge / Freezer</div>
                <div className="text-xs text-muted-foreground">Perishables, dairy, meat</div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="w-full h-14 justify-start"
              onClick={() => handleBulkMove('pantry')}
            >
              <Package className="h-5 w-5 mr-3" />
              <div className="text-left">
                <div className="font-medium">Move to Pantry</div>
                <div className="text-xs text-muted-foreground">Dry goods, canned items, spices</div>
              </div>
            </Button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Back to top button - positioned above bottom nav on mobile */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className={cn(
            "fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50",
            "flex items-center gap-2 px-4 py-2.5 rounded-full",
            "bg-card border border-border shadow-lg",
            "text-sm font-medium text-muted-foreground",
            "hover:text-foreground hover:border-primary/50",
            "transition-all duration-200"
          )}
        >
          <ArrowUp className="h-4 w-4" />
          Back to top
        </button>
      )}
    </div>
  );
};

export default Groceries;

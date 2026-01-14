import { useState, useEffect } from 'react';
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  shoppingListAPI,
  templatesAPI,
  type ShoppingListItem,
} from '@/lib/api';
import { getCurrentWorkspace } from '@/lib/workspace';
import { TemplatesManager } from './TemplatesManager';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import {
  Plus,
  Trash2,
  Loader2,
  Star,
  ShoppingCart,
  Package,
  ChevronDown,
  MoreHorizontal,
  Mic,
  MicOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { categorizeItem } from '@/lib/groceryCategories';

// Language options for voice input
const LANGUAGE_OPTIONS = [
  { code: 'en-US', label: 'EN', name: 'English' },
  { code: 'hu-HU', label: 'HU', name: 'Magyar' },
  { code: 'yue-Hant-HK', label: '粵', name: '廣東話' },
];

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

  // Voice input
  const [voiceLanguage, setVoiceLanguage] = useState(() => {
    return localStorage.getItem('mealplanner_voice_language') || navigator.language || 'en-US';
  });

  const {
    state: voiceState,
    transcription,
    error: voiceError,
    startListening,
    stopListening,
    reset: resetVoice,
    isSupported: isVoiceSupported,
  } = useVoiceInput(voiceLanguage);

  // Persist voice language
  useEffect(() => {
    localStorage.setItem('mealplanner_voice_language', voiceLanguage);
  }, [voiceLanguage]);

  // Update input with voice transcription
  useEffect(() => {
    if (transcription && voiceState === 'listening') {
      setNewItemName(transcription);
    }
  }, [transcription, voiceState]);

  // Handle voice toggle
  const handleVoiceToggle = () => {
    if (voiceState === 'listening') {
      stopListening();
    } else {
      setNewItemName(''); // Clear input when starting voice
      startListening();
    }
  };

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
    mutationFn: (name: string) => {
      const category = categorizeItem(name);
      return shoppingListAPI.addItem(workspaceId!, { name, category });
    },
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

  // State for tracking favorites being added
  const [isAddingFavorites, setIsAddingFavorites] = useState(false);

  // Smart add favorites - only adds items not already in shopping list
  const handleAddFromFavorites = async () => {
    if (!templates || !shoppingList) return;

    // Get favorite templates
    const favorites = templates.items.filter(t => t.is_favorite);
    if (favorites.length === 0) {
      toast.info('No favorites to add');
      return;
    }

    // Get existing shopping list item names (lowercase for comparison)
    const existingNames = new Set(
      shoppingList.items.map(item => item.name.toLowerCase())
    );

    // Filter out favorites already in shopping list
    const newFavorites = favorites.filter(
      fav => !existingNames.has(fav.name.toLowerCase())
    );

    if (newFavorites.length === 0) {
      toast.info('All favorites are already in your shopping list');
      return;
    }

    // Add only the new favorites
    setIsAddingFavorites(true);
    try {
      for (const favorite of newFavorites) {
        await shoppingListAPI.addItem(workspaceId!, {
          name: favorite.name,
          quantity: favorite.default_quantity,
          category: favorite.category,
        });
      }
      queryClient.invalidateQueries({ queryKey: ['shopping-list', workspaceId] });

      const skippedCount = favorites.length - newFavorites.length;
      if (skippedCount > 0) {
        toast.success(`${newFavorites.length} new favorite${newFavorites.length !== 1 ? 's' : ''} added (${skippedCount} already in list)`);
      } else {
        toast.success(`${newFavorites.length} favorite${newFavorites.length !== 1 ? 's' : ''} added to shopping list`);
      }
    } catch (error) {
      toast.error('Failed to add favorites');
    } finally {
      setIsAddingFavorites(false);
    }
  };

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
      {/* Add item form and favorites button */}
      <div className="flex gap-2">
        <div className="flex-1 rounded-xl border border-border bg-card p-3 space-y-2">
          <form onSubmit={handleAddItem} className="flex gap-2">
            <Input
              placeholder="Add item"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              className="flex-1 h-11"
            />
            {/* Voice input button */}
            {isVoiceSupported && (
              <Button
                type="button"
                variant={voiceState === 'listening' ? 'destructive' : 'outline'}
                className="h-11 px-3"
                onClick={handleVoiceToggle}
                title={voiceState === 'listening' ? 'Stop recording' : 'Start voice input'}
              >
                {voiceState === 'listening' ? (
                  <MicOff className="w-4 h-4" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </Button>
            )}
            <Button
              type="submit"
              disabled={!newItemName.trim() || addItemMutation.isPending}
              className="h-11 px-4"
            >
              {addItemMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
            </Button>
          </form>

          {/* Voice state indicators */}
          {voiceState === 'listening' && (
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-destructive rounded-full animate-pulse" />
              <span className="text-xs text-muted-foreground">Listening...</span>
              {/* Language selector */}
              <div className="flex items-center gap-1 ml-auto">
                {LANGUAGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.code}
                    type="button"
                    onClick={() => setVoiceLanguage(opt.code)}
                    className={cn(
                      "px-2 py-0.5 text-xs rounded transition-colors",
                      voiceLanguage === opt.code
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {voiceError && (
            <div className="flex items-center gap-2 text-xs text-destructive">
              <span>{voiceError}</span>
            </div>
          )}
        </div>
        {favoriteCount > 0 && (
          <Button
            type="button"
            variant="outline"
            onClick={handleAddFromFavorites}
            disabled={isAddingFavorites}
            className="h-auto px-3 shrink-0"
          >
            {isAddingFavorites ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Star className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Add all favorites</span>
                <span className="sm:hidden">Favorites</span>
              </>
            )}
          </Button>
        )}
      </div>

      {/* List header with count and overflow menu */}
      {totalCount > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {uncheckedCount} of {totalCount} items remaining
          </p>
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
                      'hover:bg-muted/50 transition-colors',
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
                      className="md:opacity-0 md:group-hover:opacity-100"
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
              <Star className="w-4 h-4" />
              <span>Manage Favorites</span>
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

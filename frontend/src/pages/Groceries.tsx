import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { DynamicRecipeModal } from '@/components/DynamicRecipeModal';
import { GroceryConfirmationDialog, type ProposedGroceryItem } from '@/components/GroceryConfirmationDialog';
import { GroceryInputHero } from '@/components/groceries/GroceryInputHero';
import { GroceryChip } from '@/components/groceries/GroceryChip';
import { GrocerySection } from '@/components/groceries/GrocerySection';
import { GroceryItemModal } from '@/components/groceries/GroceryItemModal';
import { StickyActionBar } from '@/components/groceries/StickyActionBar';
import { groceriesAPI, type GroceryItem, type Recipe, type ExcludedReceiptItem } from '@/lib/api';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { getCurrentWorkspace } from '@/lib/workspace';
import {
  Plus,
  X,
  Trash2,
  ShoppingBasket,
  Loader2,
  ChefHat,
  AlertCircle,
  Calendar,
  ChevronDown,
  ChevronUp,
  Mic,
  MicOff,
  Camera,
  CheckSquare,
  Snowflake,
  Package,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const Groceries = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const workspaceId = getCurrentWorkspace();

  // Redirect to home if no workspace is set (defense in depth)
  useEffect(() => {
    if (!workspaceId) {
      navigate('/');
    }
  }, [workspaceId, navigate]);

  // Don't render if no workspace
  if (!workspaceId) {
    return null;
  }

  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [showAdvancedForm, setShowAdvancedForm] = useState(false);
  const [showExpiringDetails, setShowExpiringDetails] = useState(false);
  const [selectedItem, setSelectedItem] = useState<GroceryItem | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);

  // Accordion state for fridge/pantry sections with localStorage persistence
  const [accordionState, setAccordionState] = useState(() => {
    const stored = localStorage.getItem('mealplanner_grocery_accordion_state');
    return stored ? JSON.parse(stored) : { fridge: true, pantry: true };
  });

  // Persist accordion state to localStorage
  useEffect(() => {
    localStorage.setItem('mealplanner_grocery_accordion_state', JSON.stringify(accordionState));
  }, [accordionState]);

  // Form state for adding new grocery
  const [newItemName, setNewItemName] = useState('');
  const [newItemPurchaseDate, setNewItemPurchaseDate] = useState('');
  const [newItemExpiryType, setNewItemExpiryType] = useState<'expiry_date' | 'best_before_date' | ''>('');
  const [newItemExpiryDate, setNewItemExpiryDate] = useState('');

  // Voice input state
  const {
    state: voiceState,
    transcription,
    error: voiceError,
    startListening,
    stopListening,
    reset: resetVoice,
    isSupported: isVoiceSupported,
  } = useVoiceInput();

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [proposedItems, setProposedItems] = useState<ProposedGroceryItem[]>([]);
  const [excludedItems, setExcludedItems] = useState<ExcludedReceiptItem[]>([]);
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);

  // Receipt upload state
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch groceries from backend
  const { data: groceryList, isLoading, error } = useQuery({
    queryKey: ['groceries', workspaceId],
    queryFn: () => groceriesAPI.getAll(workspaceId),
  });

  // Fetch expiring soon items
  const { data: expiringSoon } = useQuery({
    queryKey: ['groceries-expiring', workspaceId],
    queryFn: () => groceriesAPI.getExpiringSoon(workspaceId, 1),
    refetchInterval: 60000, // Refetch every minute
  });

  // Add grocery mutation
  const addMutation = useMutation({
    mutationFn: (item: GroceryItem) => groceriesAPI.add(workspaceId, item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groceries', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['groceries-expiring', workspaceId] });
      toast.success(`${newItemName} added to list`);
      // Reset form
      setNewItemName('');
      setNewItemPurchaseDate('');
      setNewItemExpiryType('');
      setNewItemExpiryDate('');
      setShowAdvancedForm(false);
    },
    onError: (error: Error) => {
      toast.error(`Failed to add item: ${error.message}`);
    },
  });

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

  // Update grocery mutation (delete and re-add with updates)
  const updateMutation = useMutation({
    mutationFn: async ({ name, updates }: { name: string; updates: Partial<GroceryItem> }) => {
      // Get current item to preserve fields
      const currentItem = groceries.find(g => g.name === name);
      if (!currentItem) throw new Error('Item not found');

      // Delete old item
      await groceriesAPI.delete(workspaceId, name);

      // Add updated item
      return groceriesAPI.add(workspaceId, {
        ...currentItem,
        ...updates,
      } as GroceryItem);
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

  // Voice parsing mutation
  const parseVoiceMutation = useMutation({
    mutationFn: (transcription: string) => groceriesAPI.parseVoice(workspaceId, transcription),
    onSuccess: (response) => {
      setProposedItems(response.proposed_items);
      setParseWarnings(response.warnings);
      setShowConfirmDialog(true);
      resetVoice();
    },
    onError: (error: Error) => {
      toast.error(`Failed to parse voice input: ${error.message}`);
      resetVoice();
    },
  });

  // Batch add mutation
  const batchAddMutation = useMutation({
    mutationFn: (items: GroceryItem[]) => groceriesAPI.batchAdd(workspaceId, items),
    onSuccess: (_, items) => {
      queryClient.invalidateQueries({ queryKey: ['groceries', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['groceries-expiring', workspaceId] });
      toast.success(`${items.length} item${items.length !== 1 ? 's' : ''} added to list`);
      setShowConfirmDialog(false);
      setProposedItems([]);
      setParseWarnings([]);
    },
    onError: (error: Error) => {
      toast.error(`Failed to add items: ${error.message}`);
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: (itemNames: string[]) => groceriesAPI.batchDelete(workspaceId, itemNames),
    onSuccess: (_, itemNames) => {
      queryClient.invalidateQueries({ queryKey: ['groceries', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['groceries-expiring', workspaceId] });
      toast.success(`${itemNames.length} item${itemNames.length !== 1 ? 's' : ''} deleted`);
      setSelectedIngredients([]); // Clear selection after successful delete
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
      setSelectedIngredients([]); // Clear selection after move
    },
    onError: (error: Error) => {
      toast.error(`Failed to move items: ${error.message}`);
    },
  });

  // Receipt parsing mutation
  const parseReceiptMutation = useMutation({
    mutationFn: (imageBase64: string) => groceriesAPI.parseReceipt(workspaceId, imageBase64),
    onSuccess: (response) => {
      setProposedItems(response.proposed_items);
      setExcludedItems(response.excluded_items || []);
      setParseWarnings(response.warnings);
      setShowConfirmDialog(true);
    },
    onError: (error: Error) => {
      toast.error(`Receipt OCR failed: ${error.message}`);
    },
  });

  const addGrocery = () => {
    if (!newItemName.trim()) {
      toast.error('Please enter a grocery item name');
      return;
    }

    // Check for duplicate
    if (groceryList?.items.some((item) => item.name.toLowerCase() === newItemName.trim().toLowerCase())) {
      toast.error('Item already in list');
      return;
    }

    // Validate expiry fields
    if (newItemExpiryDate && !newItemExpiryType) {
      toast.error('Please select an expiry type');
      return;
    }

    const newItem: GroceryItem = {
      name: newItemName.trim(),
      date_added: new Date().toISOString().split('T')[0],
      purchase_date: newItemPurchaseDate || undefined,
      expiry_type: newItemExpiryType || undefined,
      expiry_date: newItemExpiryDate || undefined,
    };

    addMutation.mutate(newItem);
  };

  const removeGrocery = (name: string) => {
    deleteMutation.mutate(name);
  };

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
      prev.includes(name)
        ? prev.filter((i) => i !== name)
        : [...prev, name]
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

  // Voice input handlers
  const handleVoiceToggle = () => {
    if (voiceState === 'listening') {
      stopListening();
      // Parse transcription when stopped
      if (transcription.trim()) {
        parseVoiceMutation.mutate(transcription);
      }
    } else {
      startListening();
    }
  };

  const handleConfirmItems = (items: GroceryItem[]) => {
    batchAddMutation.mutate(items);
  };

  // Bulk delete handlers
  const handleBulkDeleteRequest = () => {
    if (selectedIngredients.length === 0) {
      toast.error('Please select at least one item to delete');
      return;
    }
    setShowDeleteConfirmDialog(true);
  };

  const handleBulkDeleteConfirm = () => {
    bulkDeleteMutation.mutate(selectedIngredients);
    setShowDeleteConfirmDialog(false);
  };

  // Bulk move handlers
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

  // Receipt upload handlers
  const compressImage = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Create canvas for compression
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }

          // Calculate resize ratio (max 1024px width or height)
          const maxSize = 1024;
          let width = img.width;
          let height = img.height;

          if (width > height && width > maxSize) {
            height = (height / width) * maxSize;
            width = maxSize;
          } else if (height > maxSize) {
            width = (width / height) * maxSize;
            height = maxSize;
          }

          // Resize image
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          // Export as JPEG at 80% quality
          const base64 = canvas.toDataURL('image/jpeg', 0.8);

          // Strip data URL prefix (data:image/jpeg;base64,)
          const base64Data = base64.split(',')[1];
          resolve(base64Data);
        };

        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const handleReceiptUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.match(/^image\/(png|jpe?g)$/)) {
      toast.error('Please upload a PNG or JPEG image');
      return;
    }

    // Validate file size (max 10MB before compression)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image too large (max 10MB)');
      return;
    }

    setIsUploadingReceipt(true);

    try {
      // Compress image
      const base64Image = await compressImage(file);

      // Call API to parse receipt
      await parseReceiptMutation.mutateAsync(base64Image);

    } catch (error) {
      console.error('Upload error:', error);
      // Error toast handled by mutation onError
    } finally {
      setIsUploadingReceipt(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Helper to calculate days until expiry
  const getDaysUntilExpiry = (expiryDate: string): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Helper to get expiry badge color
  const getExpiryBadgeClass = (daysUntil: number): string => {
    if (daysUntil < 0) return 'bg-destructive/20 text-destructive border-destructive';
    if (daysUntil === 0) return 'bg-destructive/20 text-destructive border-destructive';
    if (daysUntil <= 1) return 'bg-destructive/20 text-destructive border-destructive';
    if (daysUntil <= 3) return 'bg-yellow-500/20 text-yellow-700 border-yellow-500';
    return 'bg-green-500/20 text-green-700 border-green-500';
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
        <p className="text-sm mt-2">Make sure your backend is running at http://localhost:8000</p>
      </div>
    );
  }

  const groceries = groceryList?.items || [];
  const expiringItems = expiringSoon?.items || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Grocery List
          </h1>
          <p className="text-muted-foreground mt-1">
            Track what ingredients you have with expiry dates
          </p>
        </div>
      </div>

      {/* Expiring Soon Alert - Subtle and Expandable */}
      {expiringItems.length > 0 && (
        <button
          onClick={() => setShowExpiringDetails(!showExpiringDetails)}
          className="w-full rounded-r-2xl bg-amber-50/50 border-l-4 border-amber-400 px-6 py-3 text-left transition-all hover:bg-amber-50"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
              <span className="text-sm text-amber-900 font-medium">
                {expiringItems.length} item{expiringItems.length !== 1 ? 's' : ''} expiring soon
              </span>
            </div>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-amber-600 transition-transform",
                showExpiringDetails && "rotate-180"
              )}
            />
          </div>

          {showExpiringDetails && (
            <div className="mt-3 pt-3 border-t border-amber-200 flex flex-wrap gap-2">
              {expiringItems.map((item) => (
                <span
                  key={item.name}
                  className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900 border border-amber-300"
                >
                  {item.name}
                </span>
              ))}
            </div>
          )}
        </button>
      )}


      {/* Add Item Form */}
      <GroceryInputHero
        voiceState={voiceState}
        transcription={transcription}
        voiceError={voiceError}
        isVoiceSupported={isVoiceSupported}
        handleVoiceToggle={handleVoiceToggle}
        parseVoiceMutationPending={parseVoiceMutation.isPending}
        fileInputRef={fileInputRef}
        handleReceiptUpload={handleReceiptUpload}
        isUploadingReceipt={isUploadingReceipt}
        newItemName={newItemName}
        setNewItemName={setNewItemName}
        newItemPurchaseDate={newItemPurchaseDate}
        setNewItemPurchaseDate={setNewItemPurchaseDate}
        newItemExpiryType={newItemExpiryType}
        setNewItemExpiryType={setNewItemExpiryType}
        newItemExpiryDate={newItemExpiryDate}
        setNewItemExpiryDate={setNewItemExpiryDate}
        addGrocery={addGrocery}
        addMutationPending={addMutation.isPending}
      />

      {/* Storage Location Help Text */}
      <p className="text-sm text-muted-foreground">
        Tap an item to move it between Fridge/Freezer and Pantry, or select multiple items to move them together.
      </p>

      {/* Grocery List - Split View (Fridge/Pantry) */}
      {(() => {
        // Split groceries by storage location
        const fridgeItems = groceries.filter(g => (g.storage_location ?? 'fridge') === 'fridge');
        const pantryItems = groceries.filter(g => g.storage_location === 'pantry');

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

        return (
          <div className="rounded-2xl bg-card shadow-soft p-6 space-y-4">
            {/* Header with count and selection toggle */}
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                {groceries.length} item{groceries.length !== 1 ? 's' : ''} on hand
                {isSelectionMode && selectedIngredients.length > 0 && (
                  <span className="text-primary ml-2">
                    ({selectedIngredients.length} selected)
                  </span>
                )}
              </p>
              {isSelectionMode ? (
                <button
                  onClick={handleCancelSelection}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
              ) : (
                <button
                  onClick={() => setIsSelectionMode(true)}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <CheckSquare className="h-4 w-4" />
                  Select
                </button>
              )}
            </div>

            {/* Responsive Layout: Stacked on mobile, side-by-side on desktop */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Fridge/Freezer Section */}
              <GrocerySection
                title="Fridge / Freezer"
                icon={Snowflake}
                items={fridgeItems}
                isOpen={accordionState.fridge}
                onOpenChange={(open) => setAccordionState(s => ({ ...s, fridge: open }))}
                isSelectionMode={isSelectionMode}
                selectedIngredients={selectedIngredients}
                onToggleSelect={toggleIngredientSelection}
                onOpenModal={handleOpenItemModal}
              />

              {/* Pantry Section */}
              <GrocerySection
                title="Pantry"
                icon={Package}
                items={pantryItems}
                isOpen={accordionState.pantry}
                onOpenChange={(open) => setAccordionState(s => ({ ...s, pantry: open }))}
                isSelectionMode={isSelectionMode}
                selectedIngredients={selectedIngredients}
                onToggleSelect={toggleIngredientSelection}
                onOpenModal={handleOpenItemModal}
              />
            </div>
          </div>
        );
      })()}

      {/* Tip */}
      <div className="rounded-xl bg-secondary/50 p-4">
        <p className="text-sm text-secondary-foreground">
          <strong>Tip:</strong> Add expiry dates to your groceries so the meal planner can prioritize
          ingredients that need to be used soon, reducing food waste!
        </p>
      </div>

      {/* Dynamic Recipe Modal */}
      <DynamicRecipeModal
        open={showRecipeModal}
        onOpenChange={setShowRecipeModal}
        selectedIngredients={selectedIngredients}
        onRecipeGenerated={handleRecipeGenerated}
      />

      {/* Grocery Confirmation Dialog */}
      <GroceryConfirmationDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        proposedItems={proposedItems}
        excludedItems={excludedItems}
        warnings={parseWarnings}
        onConfirm={handleConfirmItems}
        isLoading={batchAddMutation.isPending}
      />

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedIngredients.length} item{selectedIngredients.length !== 1 ? 's' : ''}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected grocery items. This action cannot be undone.
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

      {/* Sticky Action Bar - only show in selection mode */}
      {isSelectionMode && (
        <StickyActionBar
          selectedCount={selectedIngredients.length}
          onCook={handleCookWithSelected}
          onPlan={() => navigate('/plan', { state: { selectedIngredients } })}
          onMove={handleBulkMoveRequest}
          onDelete={handleBulkDeleteRequest}
        />
      )}

      {/* Grocery Item Modal */}
      <GroceryItemModal
        item={selectedItem}
        open={showItemModal}
        onOpenChange={setShowItemModal}
        onUpdate={handleUpdateItem}
        onDelete={removeGrocery}
        onMove={handleMoveItem}
      />
    </div>
  );
};

export default Groceries;

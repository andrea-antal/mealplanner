import { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Mic,
  MicOff,
  Camera,
  Loader2,
  ChevronDown,
  Plus,
  AlertCircle,
  Globe,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { groceriesAPI, shoppingListAPI, type GroceryItem, type AddShoppingItemRequest } from '@/lib/api';
import { GroceryConfirmationDialog, type ProposedGroceryItem, type GroceryDestination } from '@/components/GroceryConfirmationDialog';
import { categorizeItem } from '@/lib/groceryCategories';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { getCurrentWorkspace } from '@/lib/workspace';

// Language options for voice input
const LANGUAGE_OPTIONS = [
  { code: 'en-US', label: 'EN', name: 'English' },
  { code: 'hu-HU', label: 'HU', name: 'Magyar' },
  { code: 'yue-Hant-HK', label: '粵', name: '廣東話' },
];

interface AddGroceryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Default destination for items (current tab). Defaults to 'inventory'. */
  defaultDestination?: GroceryDestination;
}

export function AddGroceryModal({ open, onOpenChange, defaultDestination = 'inventory' }: AddGroceryModalProps) {
  const queryClient = useQueryClient();
  const workspaceId = getCurrentWorkspace();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Text input state
  const [groceryInput, setGroceryInput] = useState('');
  const [isParsing, setIsParsing] = useState(false);

  // Destination state
  const [destination, setDestination] = useState<GroceryDestination>(defaultDestination);

  // Manual entry state
  const [manualExpanded, setManualExpanded] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPurchaseDate, setNewItemPurchaseDate] = useState('');
  const [newItemExpiryType, setNewItemExpiryType] = useState<'expiry_date' | 'best_before_date' | ''>('');
  const [newItemExpiryDate, setNewItemExpiryDate] = useState('');

  // Receipt upload state
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);

  // Confirmation dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [proposedItems, setProposedItems] = useState<ProposedGroceryItem[]>([]);
  const [excludedItems, setExcludedItems] = useState<any[]>([]);
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);

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

  // Append voice transcription to textarea
  useEffect(() => {
    if (transcription && voiceState === 'listening') {
      // Find the start of the current voice session content
      // by tracking what was there before
      setGroceryInput(prev => {
        // If the textarea was empty before, just set the transcription
        // Otherwise, append on a new line
        if (prev.trim() === '') {
          return transcription;
        }
        // Check if transcription is already at the end (it updates continuously)
        if (prev.endsWith(transcription)) {
          return prev;
        }
        // Find common prefix and only append new content
        return transcription;
      });
    }
  }, [transcription, voiceState]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      // Reset destination to default when opening
      setDestination(defaultDestination);
    } else {
      setGroceryInput('');
      setManualExpanded(false);
      setNewItemName('');
      setNewItemPurchaseDate('');
      setNewItemExpiryType('');
      setNewItemExpiryDate('');
      setProposedItems([]);
      setExcludedItems([]);
      setParseWarnings([]);
      resetVoice();
    }
  }, [open, defaultDestination, resetVoice]);

  // Parse text mutation
  const parseTextMutation = useMutation({
    mutationFn: (text: string) => groceriesAPI.parseVoice(workspaceId!, text),
    onSuccess: (response) => {
      setProposedItems(response.proposed_items);
      setParseWarnings(response.warnings);
      setShowConfirmDialog(true);
      setIsParsing(false);
    },
    onError: (error: Error) => {
      toast.error(`Failed to parse items: ${error.message}`);
      setIsParsing(false);
    },
  });

  // Receipt parsing mutation
  const parseReceiptMutation = useMutation({
    mutationFn: (imageBase64: string) => groceriesAPI.parseReceipt(workspaceId!, imageBase64),
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

  // Batch add to inventory mutation
  const batchAddToInventoryMutation = useMutation({
    mutationFn: (items: GroceryItem[]) => groceriesAPI.batchAdd(workspaceId!, items),
    onSuccess: (_, items) => {
      queryClient.invalidateQueries({ queryKey: ['groceries', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['groceries-expiring', workspaceId] });
      toast.success(`${items.length} item${items.length !== 1 ? 's' : ''} added to inventory`);
      setShowConfirmDialog(false);
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(`Failed to add items: ${error.message}`);
    },
  });

  // Batch add to shopping list mutation
  const batchAddToShoppingMutation = useMutation({
    mutationFn: (items: AddShoppingItemRequest[]) => shoppingListAPI.batchAdd(workspaceId!, items),
    onSuccess: (_, items) => {
      queryClient.invalidateQueries({ queryKey: ['shopping-list', workspaceId] });
      toast.success(`${items.length} item${items.length !== 1 ? 's' : ''} added to shopping list`);
      setShowConfirmDialog(false);
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(`Failed to add items: ${error.message}`);
    },
  });

  // Single item add mutation
  const addItemMutation = useMutation({
    mutationFn: (item: GroceryItem) => groceriesAPI.add(workspaceId!, item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groceries', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['groceries-expiring', workspaceId] });
      toast.success(`${newItemName} added`);
      setNewItemName('');
      setNewItemPurchaseDate('');
      setNewItemExpiryType('');
      setNewItemExpiryDate('');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add item: ${error.message}`);
    },
  });

  // Handle parsing text input
  const handleParse = () => {
    if (!groceryInput.trim()) return;
    setIsParsing(true);
    parseTextMutation.mutate(groceryInput.trim());
  };

  // Handle voice toggle
  const handleVoiceToggle = () => {
    if (voiceState === 'listening') {
      stopListening();
    } else {
      startListening();
    }
  };

  // Compress and upload receipt
  const compressImage = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }
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
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
          const base64 = canvas.toDataURL('image/jpeg', 0.8);
          resolve(base64.split(',')[1]);
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

    if (!file.type.match(/^image\/(png|jpe?g)$/)) {
      toast.error('Please upload a PNG or JPEG image');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image too large (max 10MB)');
      return;
    }

    setIsUploadingReceipt(true);
    try {
      const base64Image = await compressImage(file);
      await parseReceiptMutation.mutateAsync(base64Image);
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setIsUploadingReceipt(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle manual item add
  const handleAddManualItem = () => {
    if (!newItemName.trim()) {
      toast.error('Please enter an item name');
      return;
    }

    const newItem: GroceryItem = {
      name: newItemName.trim(),
      date_added: new Date().toISOString().split('T')[0],
      purchase_date: newItemPurchaseDate || undefined,
      expiry_type: newItemExpiryType || undefined,
      expiry_date: newItemExpiryDate || undefined,
    };

    addItemMutation.mutate(newItem);
  };

  // Handle confirmation with destination routing
  const handleConfirmItems = (items: GroceryItem[], dest: GroceryDestination) => {
    if (dest === 'shopping') {
      // Transform to shopping list items with auto-categorization
      const shoppingItems: AddShoppingItemRequest[] = items.map(item => ({
        name: item.name,
        canonical_name: item.canonical_name,
        category: categorizeItem(item.name, item.canonical_name),
      }));
      batchAddToShoppingMutation.mutate(shoppingItems);
    } else {
      batchAddToInventoryMutation.mutate(items);
    }
  };

  const canParse = groceryInput.trim().length >= 3;
  const isProcessing = isParsing || isUploadingReceipt || parseReceiptMutation.isPending;
  const isConfirming = batchAddToInventoryMutation.isPending || batchAddToShoppingMutation.isPending;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              Add Items
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Main text input section */}
            <div>
              <Label htmlFor="grocery-input" className="text-base font-semibold">
                Enter Items
              </Label>
              <p className="text-sm text-muted-foreground mb-2">
                List your groceries - one per line or as a comma-separated list
              </p>

              {/* Textarea */}
              <Textarea
                id="grocery-input"
                value={groceryInput}
                onChange={(e) => setGroceryInput(e.target.value)}
                placeholder="milk, eggs, bread
chicken breast 2 lbs
spinach
apples (6)"
                disabled={isProcessing}
                rows={6}
                className="font-mono text-sm resize-none placeholder:italic placeholder:text-muted-foreground/60"
              />

              {/* Voice state indicator - only when listening */}
              {voiceState === 'listening' && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="h-2 w-2 bg-destructive rounded-full animate-pulse" />
                  <span className="text-xs text-muted-foreground">Listening...</span>
                </div>
              )}

              {voiceError && (
                <div className="flex items-center gap-2 mt-2 text-xs text-destructive">
                  <AlertCircle className="h-3 w-3" />
                  {voiceError}
                </div>
              )}

              {/* Controls row: Voice input + Add button */}
              <div className="flex items-center justify-between mt-2">
                {/* Voice controls - left side */}
                {isVoiceSupported ? (
                  <div className="flex items-center gap-2">
                    {/* Language selector */}
                    <div className="flex items-center gap-0.5 bg-muted rounded-md p-0.5">
                      {LANGUAGE_OPTIONS.map((opt) => (
                        <button
                          key={opt.code}
                          type="button"
                          onClick={() => setVoiceLanguage(opt.code)}
                          className={cn(
                            "px-2 py-1 text-xs font-medium rounded transition-colors",
                            voiceLanguage === opt.code
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-muted-foreground/10"
                          )}
                          title={opt.name}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    {/* Mic button */}
                    <Button
                      type="button"
                      variant={voiceState === 'listening' ? 'destructive' : 'outline'}
                      size="sm"
                      onClick={handleVoiceToggle}
                      disabled={isProcessing && voiceState !== 'listening'}
                      title={voiceState === 'listening' ? 'Stop recording' : 'Start voice input'}
                    >
                      {voiceState === 'listening' ? (
                        <MicOff className="h-4 w-4" />
                      ) : (
                        <Mic className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ) : (
                  <div /> // Spacer when voice not supported
                )}

                {/* Add button - right side */}
                <Button
                  type="button"
                  onClick={handleParse}
                  disabled={!canParse || isProcessing}
                  variant="secondary"
                >
                  {isParsing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add'
                  )}
                </Button>
              </div>
            </div>

            {/* Photo upload option */}
            <div className="relative">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground">
                or upload a receipt
              </span>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              onChange={handleReceiptUpload}
              style={{ display: 'none' }}
            />

            <Button
              type="button"
              variant="outline"
              className="w-full h-12"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
            >
              {isUploadingReceipt || parseReceiptMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing receipt...
                </>
              ) : (
                <>
                  <Camera className="mr-2 h-5 w-5" />
                  Scan Receipt Photo
                </>
              )}
            </Button>

            {/* Collapsible manual entry */}
            <Collapsible
              open={manualExpanded}
              onOpenChange={setManualExpanded}
            >
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between">
                  <span>Or enter one item manually</span>
                  <ChevronDown className={cn(
                    "h-4 w-4 transition-transform",
                    manualExpanded && "rotate-180"
                  )} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4 space-y-3">
                {/* Item name */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Item name..."
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddManualItem()}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    onClick={handleAddManualItem}
                    disabled={!newItemName.trim() || addItemMutation.isPending}
                  >
                    {addItemMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {/* Optional date fields */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="purchase-date" className="text-xs">
                      Purchase Date
                    </Label>
                    <Input
                      id="purchase-date"
                      type="date"
                      value={newItemPurchaseDate}
                      onChange={(e) => setNewItemPurchaseDate(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="expiry-type" className="text-xs">
                      Expiry Type
                    </Label>
                    <select
                      id="expiry-type"
                      className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                      value={newItemExpiryType}
                      onChange={(e) => setNewItemExpiryType(e.target.value as any)}
                    >
                      <option value="">None</option>
                      <option value="expiry_date">Use by</option>
                      <option value="best_before_date">Best before</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="expiry-date" className="text-xs">
                      Date
                    </Label>
                    <Input
                      id="expiry-date"
                      type="date"
                      value={newItemExpiryDate}
                      onChange={(e) => setNewItemExpiryDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      disabled={!newItemExpiryType}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <GroceryConfirmationDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        proposedItems={proposedItems}
        excludedItems={excludedItems}
        warnings={parseWarnings}
        onConfirm={handleConfirmItems}
        isLoading={isConfirming}
        destination={destination}
        onDestinationChange={setDestination}
      />
    </>
  );
}

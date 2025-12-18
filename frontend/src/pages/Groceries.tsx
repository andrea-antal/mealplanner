import { useState } from 'react';
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
import { DynamicRecipeModal } from '@/components/DynamicRecipeModal';
import { groceriesAPI, type GroceryItem, type Recipe } from '@/lib/api';
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
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const Groceries = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [showAdvancedForm, setShowAdvancedForm] = useState(false);

  // Form state for adding new grocery
  const [newItemName, setNewItemName] = useState('');
  const [newItemPurchaseDate, setNewItemPurchaseDate] = useState('');
  const [newItemExpiryType, setNewItemExpiryType] = useState<'expiry_date' | 'best_before_date' | ''>('');
  const [newItemExpiryDate, setNewItemExpiryDate] = useState('');

  // Fetch groceries from backend
  const { data: groceryList, isLoading, error } = useQuery({
    queryKey: ['groceries'],
    queryFn: groceriesAPI.getAll,
  });

  // Fetch expiring soon items
  const { data: expiringSoon } = useQuery({
    queryKey: ['groceries-expiring'],
    queryFn: () => groceriesAPI.getExpiringSoon(1),
    refetchInterval: 60000, // Refetch every minute
  });

  // Add grocery mutation
  const addMutation = useMutation({
    mutationFn: (item: GroceryItem) => groceriesAPI.add(item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groceries'] });
      queryClient.invalidateQueries({ queryKey: ['groceries-expiring'] });
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
    mutationFn: (name: string) => groceriesAPI.delete(name),
    onSuccess: (_, name) => {
      queryClient.invalidateQueries({ queryKey: ['groceries'] });
      queryClient.invalidateQueries({ queryKey: ['groceries-expiring'] });
      toast.success(`${name} removed`);
      setSelectedIngredients((prev) => prev.filter((i) => i !== name));
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete item: ${error.message}`);
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

  const toggleIngredientSelection = (name: string) => {
    setSelectedIngredients((prev) =>
      prev.includes(name)
        ? prev.filter((i) => i !== name)
        : [...prev, name]
    );
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
    navigate('/recipes', { state: { openRecipeId: recipe.id } });
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
    <div className="space-y-8 max-w-2xl">
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

      {/* Expiring Soon Banner */}
      {expiringItems.length > 0 && (
        <div className="rounded-xl bg-destructive/10 border-2 border-destructive/20 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-destructive">Items Expiring Soon</h3>
              <p className="text-sm text-destructive/80 mt-1">
                {expiringItems.length} item{expiringItems.length !== 1 ? 's' : ''} expiring within 24 hours
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {expiringItems.map((item) => (
                  <span
                    key={item.name}
                    className="inline-flex items-center rounded-md bg-destructive/20 px-2 py-1 text-xs font-medium text-destructive"
                  >
                    {item.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cook with Selected Button */}
      {groceries.length > 0 && (
        <div className="rounded-xl bg-primary/10 border-2 border-primary/20 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">Generate Recipe from Ingredients</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedIngredients.length > 0
                  ? `${selectedIngredients.length} ingredient${selectedIngredients.length !== 1 ? 's' : ''} selected`
                  : 'Select ingredients below to generate a recipe'}
              </p>
            </div>
            <Button
              variant="default"
              onClick={handleCookWithSelected}
              disabled={selectedIngredients.length === 0}
            >
              <ChefHat className="h-4 w-4" />
              Cook with Selected
            </Button>
          </div>
        </div>
      )}

      {/* Add Item Form */}
      <div className="rounded-2xl bg-card shadow-soft p-4 space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Add grocery item..."
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !showAdvancedForm && addGrocery()}
            className="flex-1"
          />
          <Button
            variant="outline"
            onClick={() => {
              const newState = !showAdvancedForm;
              console.log('Advanced button clicked, current state:', showAdvancedForm, 'new state:', newState);
              setShowAdvancedForm(newState);
            }}
            className="shrink-0"
          >
            {showAdvancedForm ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            Advanced
          </Button>
          <Button
            onClick={addGrocery}
            disabled={!newItemName.trim() || addMutation.isPending}
          >
            {addMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Add
          </Button>
        </div>

        {/* Advanced Fields */}
        {showAdvancedForm && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border">
            <div className="space-y-2">
              <Label htmlFor="purchase-date" className="text-sm">
                Purchase Date (optional)
              </Label>
              <Input
                id="purchase-date"
                type="date"
                value={newItemPurchaseDate}
                onChange={(e) => setNewItemPurchaseDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiry-type" className="text-sm">
                Expiry Type (optional)
              </Label>
              <select
                id="expiry-type"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={newItemExpiryType}
                onChange={(e) => setNewItemExpiryType(e.target.value as 'expiry_date' | 'best_before_date' | '')}
              >
                <option value="">None</option>
                <option value="expiry_date">Expiry Date</option>
                <option value="best_before_date">Best Before Date</option>
              </select>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="expiry-date" className="text-sm">
                {newItemExpiryType === 'expiry_date' ? 'Expiry Date' :
                 newItemExpiryType === 'best_before_date' ? 'Best Before Date' :
                 'Expiry/Best Before Date'} (optional)
              </Label>
              <Input
                id="expiry-date"
                type="date"
                value={newItemExpiryDate}
                onChange={(e) => setNewItemExpiryDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                disabled={!newItemExpiryType}
              />
            </div>
          </div>
        )}
      </div>

      {/* Grocery List */}
      {groceries.length > 0 ? (
        <div className="rounded-2xl bg-card shadow-soft overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/50">
            <p className="text-sm font-medium text-muted-foreground">
              {groceries.length} item{groceries.length !== 1 ? 's' : ''} on hand
            </p>
          </div>
          <ul className="divide-y divide-border">
            {groceries.map((item) => {
              const daysUntilExpiry = item.expiry_date ? getDaysUntilExpiry(item.expiry_date) : null;
              // Show expiry badge if there's an expiry date
              // Only hide if purchase_date >= expiry_date (which would be an error scenario)
              const showExpiryWarning = daysUntilExpiry !== null && item.expiry_date &&
                (!item.purchase_date || new Date(item.purchase_date) < new Date(item.expiry_date));

              return (
                <li
                  key={item.name}
                  className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Checkbox
                      id={`ingredient-${item.name}`}
                      checked={selectedIngredients.includes(item.name)}
                      onCheckedChange={() => toggleIngredientSelection(item.name)}
                    />
                    <label
                      htmlFor={`ingredient-${item.name}`}
                      className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary shrink-0">
                        <ShoppingBasket className="h-4 w-4 text-secondary-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-foreground capitalize block truncate">{item.name}</span>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {item.purchase_date && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Purchased {new Date(item.purchase_date).toLocaleDateString()}
                            </span>
                          )}
                          {showExpiryWarning && daysUntilExpiry !== null && (
                            <span
                              className={cn(
                                'text-xs px-2 py-0.5 rounded-full border',
                                getExpiryBadgeClass(daysUntilExpiry)
                              )}
                            >
                              {daysUntilExpiry < 0
                                ? `Expired ${Math.abs(daysUntilExpiry)} day${Math.abs(daysUntilExpiry) !== 1 ? 's' : ''} ago`
                                : daysUntilExpiry === 0
                                ? 'Expires today'
                                : daysUntilExpiry === 1
                                ? 'Expires tomorrow'
                                : `${daysUntilExpiry} days until ${item.expiry_type === 'best_before_date' ? 'best before' : 'expiry'}`}
                            </span>
                          )}
                        </div>
                      </div>
                    </label>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeGrocery(item.name)}
                    className="text-muted-foreground hover:text-destructive shrink-0"
                    disabled={deleteMutation.isPending}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl bg-card py-16 text-center shadow-soft">
          <ShoppingBasket className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-2">Your grocery list is empty</p>
          <p className="text-sm text-muted-foreground">
            Add items to help generate better meal plans
          </p>
        </div>
      )}

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
    </div>
  );
};

export default Groceries;

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Package, Calendar, Trash2, AlertCircle, Clock } from 'lucide-react';
import type { GroceryItem } from '@/lib/api';

interface GroceryItemModalProps {
  item: GroceryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (name: string, updates: Partial<GroceryItem>) => void;
  onDelete: (name: string) => void;
}

export function GroceryItemModal({
  item,
  open,
  onOpenChange,
  onUpdate,
  onDelete,
}: GroceryItemModalProps) {
  const [isEditingAmount, setIsEditingAmount] = useState(false);
  const [isEditingDates, setIsEditingDates] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [amount, setAmount] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [expiryType, setExpiryType] = useState<'expiry_date' | 'best_before_date' | ''>('');
  const [expiryDate, setExpiryDate] = useState('');

  if (!item) return null;

  // Calculate expiry status
  const getExpiryStatus = () => {
    if (!item.expiry_date) return 'good';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(item.expiry_date);
    expiry.setHours(0, 0, 0, 0);
    const daysUntil = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil < 0 || daysUntil === 0) return 'expired';
    if (daysUntil <= 3) return 'soon';
    return 'good';
  };

  const formatExpiryText = () => {
    if (!item.expiry_date) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(item.expiry_date);
    expiry.setHours(0, 0, 0, 0);
    const daysUntil = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntil < 0) return `Expired ${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? 's' : ''} ago`;
    if (daysUntil === 0) return 'Expires today';
    if (daysUntil === 1) return 'Expires tomorrow';
    return `Expires in ${daysUntil} days`;
  };

  const expiryStatus = getExpiryStatus();
  const expiryText = formatExpiryText();

  const handleEditAmountClick = () => {
    setAmount('');
    setIsEditingAmount(true);
  };

  const handleEditDatesClick = () => {
    setPurchaseDate(item.purchase_date || '');
    setExpiryType(item.expiry_type || '');
    setExpiryDate(item.expiry_date || '');
    setIsEditingDates(true);
  };

  const handleSaveAmount = () => {
    if (amount.trim()) {
      onUpdate(item.name, { portion: amount });
    }
    setIsEditingAmount(false);
    onOpenChange(false);
  };

  const handleSaveDates = () => {
    onUpdate(item.name, {
      purchase_date: purchaseDate || undefined,
      expiry_type: expiryType || undefined,
      expiry_date: expiryDate || undefined,
    });
    setIsEditingDates(false);
    onOpenChange(false);
  };

  const handleDelete = () => {
    onDelete(item.name);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold capitalize">
            {item.name}
          </DialogTitle>
          {expiryText && (
            <div className="flex items-center gap-2 pt-2">
              {expiryStatus === 'expired' && (
                <AlertCircle className="h-4 w-4 text-destructive" />
              )}
              {expiryStatus === 'soon' && (
                <Clock className="h-4 w-4 text-warning" />
              )}
              <span className={`text-sm ${
                expiryStatus === 'expired' ? 'text-destructive' :
                expiryStatus === 'soon' ? 'text-warning' :
                'text-muted-foreground'
              }`}>
                {expiryText}
              </span>
            </div>
          )}
        </DialogHeader>

        {/* Main Options */}
        {!isEditingAmount && !isEditingDates && (
          <div className="space-y-3 py-4">
            {/* Edit Amount */}
            <Button
              variant="outline"
              className="w-full h-14 justify-start text-left"
              onClick={handleEditAmountClick}
            >
              <Package className="h-5 w-5 mr-3 shrink-0" />
              <div>
                <div className="font-medium">Edit Amount</div>
                <div className="text-xs text-muted-foreground">
                  Add portion or quantity
                </div>
              </div>
            </Button>

            {/* Edit Dates */}
            <Button
              variant="outline"
              className="w-full h-14 justify-start text-left"
              onClick={handleEditDatesClick}
            >
              <Calendar className="h-5 w-5 mr-3 shrink-0" />
              <div>
                <div className="font-medium">Edit Dates</div>
                <div className="text-xs text-muted-foreground">
                  Update purchase or expiry dates
                </div>
              </div>
            </Button>

            {/* Delete */}
            <Button
              variant="outline"
              className="w-full h-14 justify-start text-left text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="h-5 w-5 mr-3 shrink-0" />
              <div>
                <div className="font-medium">Delete Item</div>
              </div>
            </Button>
          </div>
        )}

        {/* Edit Amount Form */}
        {isEditingAmount && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount / Portion</Label>
              <Input
                id="amount"
                placeholder="e.g., 2 lbs, 6 eggs, 1 bunch"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-12"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsEditingAmount(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleSaveAmount}
                disabled={!amount.trim()}
              >
                Save
              </Button>
            </div>
          </div>
        )}

        {/* Edit Dates Form */}
        {isEditingDates && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="purchase-date">Purchase Date</Label>
              <Input
                id="purchase-date"
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiry-type">Expiry Type</Label>
              <select
                id="expiry-type"
                className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={expiryType}
                onChange={(e) => setExpiryType(e.target.value as 'expiry_date' | 'best_before_date' | '')}
              >
                <option value="">None</option>
                <option value="expiry_date">Expiry Date</option>
                <option value="best_before_date">Best Before Date</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiry-date">
                {expiryType === 'expiry_date' ? 'Expiry Date' :
                 expiryType === 'best_before_date' ? 'Best Before Date' :
                 'Expiry/Best Before Date'}
              </Label>
              <Input
                id="expiry-date"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                disabled={!expiryType}
                className="h-12"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsEditingDates(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleSaveDates}
              >
                Save
              </Button>
            </div>
          </div>
        )}

        {!isEditingAmount && !isEditingDates && (
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="w-full"
            >
              Cancel
            </Button>
          </DialogFooter>
        )}
      </DialogContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {item.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove "{item.name}" from your grocery list. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                handleDelete();
                setShowDeleteConfirm(false);
              }}
              className="border border-input bg-background text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

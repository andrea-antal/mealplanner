import { useState, useEffect } from 'react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { type TemplateItem, type CreateTemplateRequest } from '@/lib/api';
import { CATEGORY_NAMES } from '@/lib/groceryCategories';
import { Loader2 } from 'lucide-react';

interface TemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: TemplateItem | null;
  onSave: (data: CreateTemplateRequest) => Promise<void>;
  isPending?: boolean;
}

export const TemplateModal = ({
  open,
  onOpenChange,
  template,
  onSave,
  isPending,
}: TemplateModalProps) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [defaultQuantity, setDefaultQuantity] = useState('');
  const [frequency, setFrequency] = useState<'weekly' | 'biweekly' | 'monthly' | 'as_needed' | ''>('');

  // Reset form when modal opens with template data
  useEffect(() => {
    if (open) {
      if (template) {
        setName(template.name);
        setCategory(template.category);
        setDefaultQuantity(template.default_quantity || '');
        setFrequency(template.frequency || '');
      } else {
        setName('');
        setCategory('');
        setDefaultQuantity('');
        setFrequency('');
      }
    }
  }, [open, template]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !category) return;

    await onSave({
      name: name.trim(),
      category,
      default_quantity: defaultQuantity.trim() || undefined,
      frequency: frequency || undefined,
      is_favorite: true, // Always true since this is the favorites manager
    });
  };

  const isEditing = !!template;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Favorite' : 'Add Favorite'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Item Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Milk"
              required
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory} required>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_NAMES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Default Quantity */}
          <div className="space-y-2">
            <Label htmlFor="quantity">Default Quantity (optional)</Label>
            <Input
              id="quantity"
              value={defaultQuantity}
              onChange={(e) => setDefaultQuantity(e.target.value)}
              placeholder="e.g., 1 gallon, 2 dozen"
            />
          </div>

          {/* Frequency */}
          <div className="space-y-2">
            <Label htmlFor="frequency">Purchase Frequency (optional)</Label>
            <Select value={frequency} onValueChange={(v) => setFrequency(v as typeof frequency)}>
              <SelectTrigger>
                <SelectValue placeholder="How often do you buy this?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="biweekly">Every 2 weeks</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="as_needed">As needed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || !category || isPending}
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {isEditing ? 'Save Changes' : 'Add Favorite'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

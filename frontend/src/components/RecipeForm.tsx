import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import type { Recipe } from '@/lib/api';
import { recipesAPI } from '@/lib/api';

interface RecipeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (recipe: Recipe) => void;
  workspaceId: string;
  mode?: 'add' | 'edit';
  initialRecipe?: Recipe;
}

const emptyFormData = {
  title: '',
  description: '',
  ingredients: '',
  instructions: '',
  tags: '',
  meal_types: '',
  prep_time_minutes: '',
  active_cooking_time_minutes: '',
  serves: '',
  required_appliances: '',
  source_url: '',
  source_name: '',
};

export function RecipeForm({ open, onOpenChange, onSubmit, workspaceId, mode = 'add', initialRecipe }: RecipeFormProps) {
  const [formData, setFormData] = useState(emptyFormData);

  // URL Import state
  const [importUrl, setImportUrl] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);

  // Populate form when opening in edit mode (useEffect watches the open prop)
  useEffect(() => {
    if (open && mode === 'edit' && initialRecipe) {
      setFormData({
        title: initialRecipe.title || '',
        description: initialRecipe.description || '',
        ingredients: initialRecipe.ingredients?.join('\n') || '',
        instructions: initialRecipe.instructions || '',
        tags: initialRecipe.tags?.join(', ') || '',
        meal_types: initialRecipe.meal_types?.join(', ') || '',
        prep_time_minutes: initialRecipe.prep_time_minutes?.toString() || '',
        active_cooking_time_minutes: initialRecipe.active_cooking_time_minutes?.toString() || '',
        serves: initialRecipe.serves?.toString() || '',
        required_appliances: initialRecipe.required_appliances?.join(', ') || '',
        source_url: initialRecipe.source_url || '',
        source_name: initialRecipe.source_name || '',
      });
    } else if (!open) {
      // Reset form when closing
      setFormData(emptyFormData);
      setImportUrl('');
      setImportWarnings([]);
    }
  }, [open, mode, initialRecipe]);

  const handleFetchRecipe = async () => {
    if (!importUrl || !importUrl.trim()) {
      toast.error('Please enter a URL');
      return;
    }

    setIsFetching(true);
    setImportWarnings([]);

    try {
      const response = await recipesAPI.importFromUrl(workspaceId, importUrl);

      // Auto-populate form fields
      setFormData({
        title: response.recipe_data.title || '',
        description: response.recipe_data.description || '',
        ingredients: response.recipe_data.ingredients?.join('\n') || '',
        instructions: response.recipe_data.instructions || '',
        tags: response.recipe_data.tags?.join(', ') || '',
        prep_time_minutes: response.recipe_data.prep_time_minutes?.toString() || '',
        active_cooking_time_minutes: response.recipe_data.active_cooking_time_minutes?.toString() || '',
        serves: response.recipe_data.serves?.toString() || '',
        required_appliances: response.recipe_data.required_appliances?.join(', ') || '',
        source_url: response.recipe_data.source_url || '',
        source_name: response.recipe_data.source_name || '',
      });

      // Show warnings if any
      const warnings = [...response.warnings];
      if (response.missing_fields.length > 0) {
        warnings.push(`Missing fields: ${response.missing_fields.join(', ')}. Please fill them in.`);
      }
      if (response.confidence === 'low') {
        warnings.push('Low confidence parsing. Please review all fields carefully.');
      } else if (response.confidence === 'medium') {
        warnings.push('Some fields may need review.');
      }
      setImportWarnings(warnings);

      toast.success('Recipe imported! Please review and edit as needed.');
    } catch (error: any) {
      console.error('Failed to import recipe:', error);
      toast.error(`Failed to import recipe: ${error.message || 'Unknown error'}`);
    } finally {
      setIsFetching(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // In edit mode, preserve the original ID; in add mode, generate from title
    const id = mode === 'edit' && initialRecipe
      ? initialRecipe.id
      : formData.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const recipe: Recipe = {
      id,
      title: formData.title,
      description: formData.description || undefined,
      ingredients: formData.ingredients.split('\n').filter(i => i.trim()),
      instructions: formData.instructions,
      tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
      meal_types: formData.meal_types.split(',').map(t => t.trim()).filter(t => t),
      prep_time_minutes: parseInt(formData.prep_time_minutes) || 0,
      active_cooking_time_minutes: parseInt(formData.active_cooking_time_minutes) || 0,
      serves: parseInt(formData.serves) || 1,
      required_appliances: formData.required_appliances.split(',').map(a => a.trim()).filter(a => a),
      source_url: formData.source_url || undefined,
      source_name: formData.source_name || undefined,
      // Preserve these fields in edit mode
      ...(mode === 'edit' && initialRecipe && {
        is_generated: initialRecipe.is_generated,
      }),
    };

    onSubmit(recipe);
    onOpenChange(false);
  };

  const isEditMode = mode === 'edit';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {isEditMode ? 'Edit Recipe' : 'Add New Recipe'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* URL Import Section - only show in add mode */}
          {!isEditMode && (
          <div className="border-b border-border pb-4 mb-4">
            <Label htmlFor="import-url" className="text-base font-semibold">
              Import from URL (Optional)
            </Label>
            <p className="text-sm text-muted-foreground mb-2">
              Paste a recipe URL to automatically extract recipe data
            </p>
            <div className="flex gap-2">
              <Input
                id="import-url"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="https://www.allrecipes.com/recipe/..."
                disabled={isFetching}
                className="flex-1"
              />
              <Button
                type="button"
                onClick={handleFetchRecipe}
                disabled={!importUrl || isFetching}
                variant="secondary"
              >
                {isFetching ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Fetching...
                  </>
                ) : (
                  'Fetch Recipe'
                )}
              </Button>
            </div>
            {importWarnings.length > 0 && (
              <Alert variant="destructive" className="mt-3">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="text-sm space-y-1 mt-1">
                    {importWarnings.map((warning, i) => (
                      <li key={i}>• {warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
          )}

          <div>
            <Label htmlFor="title">Recipe Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              placeholder="e.g., Chicken Stir Fry"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the recipe"
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="ingredients">Ingredients (one per line) *</Label>
            <Textarea
              id="ingredients"
              value={formData.ingredients}
              onChange={(e) => setFormData({ ...formData, ingredients: e.target.value })}
              required
              placeholder="2 chicken breasts&#10;1 cup rice&#10;2 cups broccoli"
              rows={6}
            />
          </div>

          <div>
            <Label htmlFor="instructions">Instructions *</Label>
            <Textarea
              id="instructions"
              value={formData.instructions}
              onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
              required
              placeholder="1. Step one.&#10;2. Step two.&#10;3. Step three."
              rows={6}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="prep_time">Prep Time (minutes) *</Label>
              <Input
                id="prep_time"
                type="number"
                value={formData.prep_time_minutes}
                onChange={(e) => setFormData({ ...formData, prep_time_minutes: e.target.value })}
                required
                min="0"
                placeholder="15"
              />
            </div>

            <div>
              <Label htmlFor="cook_time">Cook Time (minutes) *</Label>
              <Input
                id="cook_time"
                type="number"
                value={formData.active_cooking_time_minutes}
                onChange={(e) => setFormData({ ...formData, active_cooking_time_minutes: e.target.value })}
                required
                min="0"
                placeholder="30"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="serves">Serves (number of people) *</Label>
            <Input
              id="serves"
              type="number"
              value={formData.serves}
              onChange={(e) => setFormData({ ...formData, serves: e.target.value })}
              required
              min="1"
              placeholder="4"
            />
          </div>

          <div>
            <Label htmlFor="meal_types">Meal Types (comma-separated) *</Label>
            <Input
              id="meal_types"
              value={formData.meal_types}
              onChange={(e) => setFormData({ ...formData, meal_types: e.target.value })}
              required
              placeholder="breakfast, lunch, dinner, snack"
            />
            <p className="text-xs text-muted-foreground mt-1">
              When is this recipe suitable? (breakfast, lunch, dinner, snack)
            </p>
          </div>

          <div>
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="quick, healthy, toddler-friendly"
            />
          </div>

          <div>
            <Label htmlFor="appliances">Required Appliances (comma-separated)</Label>
            <Input
              id="appliances"
              value={formData.required_appliances}
              onChange={(e) => setFormData({ ...formData, required_appliances: e.target.value })}
              placeholder="stove, oven, blender"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1">
              {isEditMode ? 'Save Changes' : 'Add Recipe'}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

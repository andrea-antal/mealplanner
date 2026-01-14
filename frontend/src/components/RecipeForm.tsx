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
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { Loader2, AlertTriangle, ChevronDown, RotateCcw, Mic, MicOff } from 'lucide-react';
import { toast } from 'sonner';
import type { Recipe, OCRFromPhotoResponse } from '@/lib/api';
import { recipesAPI } from '@/lib/api';
import { PhotoUploadInput } from './recipe/PhotoUploadInput';
import { OCRReviewStep } from './recipe/OCRReviewStep';
import { useVoiceInput } from '@/hooks/useVoiceInput';

// Valid meal types matching backend validation
const MEAL_TYPES = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack/Dessert' },
  { value: 'side_dish', label: 'Side Dish' },
] as const;

const MAX_TEXT_LENGTH = 10000;
const MIN_TEXT_LENGTH = 50;

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
  meal_types: [] as string[],
  prep_time_minutes: '',
  active_cooking_time_minutes: '',
  serves: '',
  required_appliances: '',
  source_url: '',
  source_name: '',
  notes: '',
};

export function RecipeForm({ open, onOpenChange, onSubmit, workspaceId, mode = 'add', initialRecipe }: RecipeFormProps) {
  const [formData, setFormData] = useState(emptyFormData);

  // Unified input state (replaces old URL-only state)
  const [recipeInput, setRecipeInput] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [hasParsedData, setHasParsedData] = useState(false);
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);
  const [manualExpanded, setManualExpanded] = useState(false);

  // Photo OCR state
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<OCRFromPhotoResponse | null>(null);
  const [correctedText, setCorrectedText] = useState('');
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [showOcrReview, setShowOcrReview] = useState(false);

  // Voice input for recipe text
  const {
    state: voiceState,
    transcription,
    startListening,
    stopListening,
    reset: resetVoice,
    isSupported: isVoiceSupported,
  } = useVoiceInput();

  // Append voice transcription to recipe input
  useEffect(() => {
    if (transcription && voiceState === 'idle') {
      setRecipeInput((prev) => {
        const separator = prev.trim() ? '\n' : '';
        return prev + separator + transcription;
      });
      resetVoice();
    }
  }, [transcription, voiceState, resetVoice]);

  const handleVoiceToggle = () => {
    if (voiceState === 'listening') {
      stopListening();
    } else {
      startListening();
    }
  };

  // Populate form when opening in edit mode (useEffect watches the open prop)
  useEffect(() => {
    if (open && mode === 'edit' && initialRecipe) {
      setFormData({
        title: initialRecipe.title || '',
        description: initialRecipe.description || '',
        ingredients: initialRecipe.ingredients?.join('\n') || '',
        instructions: initialRecipe.instructions || '',
        tags: initialRecipe.tags?.join(', ') || '',
        meal_types: initialRecipe.meal_types || [],
        prep_time_minutes: initialRecipe.prep_time_minutes?.toString() || '',
        active_cooking_time_minutes: initialRecipe.active_cooking_time_minutes?.toString() || '',
        serves: initialRecipe.serves?.toString() || '',
        required_appliances: initialRecipe.required_appliances?.join(', ') || '',
        source_url: initialRecipe.source_url || '',
        source_name: initialRecipe.source_name || '',
        notes: initialRecipe.notes || '',
      });
      setHasParsedData(true); // Show fields directly in edit mode
    } else if (!open) {
      // Reset all state when closing
      setFormData(emptyFormData);
      setRecipeInput('');
      setParseWarnings([]);
      setHasParsedData(false);
      setManualExpanded(false);
      // Reset photo state
      setPhotoBase64(null);
      setPhotoPreviewUrl(null);
      setOcrResult(null);
      setCorrectedText('');
      setIsOcrProcessing(false);
      setShowOcrReview(false);
      // Reset voice state
      resetVoice();
    }
  }, [open, mode, initialRecipe, resetVoice]);

  // Detect if input is a URL
  const isUrl = (text: string) => /^https?:\/\//i.test(text.trim());

  // Handle parsing (URL or text)
  const handleParse = async () => {
    const input = recipeInput.trim();

    if (!input) {
      toast.error('Please enter a recipe URL or text');
      return;
    }

    const inputIsUrl = isUrl(input);

    // Validate text length for non-URLs
    if (!inputIsUrl) {
      if (input.length < MIN_TEXT_LENGTH) {
        toast.error(`Recipe text must be at least ${MIN_TEXT_LENGTH} characters`);
        return;
      }
      if (input.length > MAX_TEXT_LENGTH) {
        toast.error(`Recipe text must be less than ${MAX_TEXT_LENGTH} characters`);
        return;
      }
    }

    setIsParsing(true);
    setParseWarnings([]);

    try {
      const response = inputIsUrl
        ? await recipesAPI.importFromUrl(workspaceId, input)
        : await recipesAPI.parseFromText(workspaceId, input);

      // Auto-populate form fields
      setFormData({
        title: response.recipe_data.title || '',
        description: response.recipe_data.description || '',
        ingredients: response.recipe_data.ingredients?.join('\n') || '',
        instructions: response.recipe_data.instructions || '',
        tags: response.recipe_data.tags?.join(', ') || '',
        meal_types: response.recipe_data.meal_types || [],
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
      setParseWarnings(warnings);
      setHasParsedData(true);

      toast.success('Recipe parsed! Review and edit as needed.');
    } catch (error: any) {
      console.error('Failed to parse recipe:', error);
      toast.error(`Failed to parse recipe: ${error.message || 'Unknown error'}`);
    } finally {
      setIsParsing(false);
    }
  };

  // Reset to input mode
  const handleStartOver = () => {
    setFormData(emptyFormData);
    setHasParsedData(false);
    setParseWarnings([]);
    // Reset photo state too
    setPhotoBase64(null);
    setPhotoPreviewUrl(null);
    setOcrResult(null);
    setCorrectedText('');
    setShowOcrReview(false);
    // Keep the original text input so user can try again
  };

  // Photo upload handler
  const handlePhotoSelected = async (base64: string, previewUrl: string) => {
    setPhotoBase64(base64);
    setPhotoPreviewUrl(previewUrl);
    setIsOcrProcessing(true);

    try {
      const result = await recipesAPI.ocrFromPhoto(workspaceId, base64);
      setOcrResult(result);
      setCorrectedText(result.raw_text);
      setShowOcrReview(true);

      if (result.is_handwritten) {
        toast.info('Handwritten recipe detected. Please review the text carefully.');
      } else if (result.ocr_confidence === 'low') {
        toast.warning('Low confidence OCR. Please review and correct the text.');
      } else {
        toast.success('Text extracted! Review and edit before parsing.');
      }
    } catch (error: any) {
      console.error('OCR failed:', error);
      toast.error(`Failed to extract text: ${error.message || 'Unknown error'}`);
      // Reset photo state on error
      setPhotoBase64(null);
      setPhotoPreviewUrl(null);
    } finally {
      setIsOcrProcessing(false);
    }
  };

  // Handle parsing OCR text (Stage 2)
  const handleParseOcrText = async () => {
    if (correctedText.trim().length < MIN_TEXT_LENGTH) {
      toast.error(`Text must be at least ${MIN_TEXT_LENGTH} characters`);
      return;
    }

    setIsParsing(true);
    setParseWarnings([]);

    try {
      const response = await recipesAPI.parseFromText(workspaceId, correctedText);

      // Auto-populate form fields
      setFormData({
        title: response.recipe_data.title || '',
        description: response.recipe_data.description || '',
        ingredients: response.recipe_data.ingredients?.join('\n') || '',
        instructions: response.recipe_data.instructions || '',
        tags: response.recipe_data.tags?.join(', ') || '',
        meal_types: response.recipe_data.meal_types || [],
        prep_time_minutes: response.recipe_data.prep_time_minutes?.toString() || '',
        active_cooking_time_minutes: response.recipe_data.active_cooking_time_minutes?.toString() || '',
        serves: response.recipe_data.serves?.toString() || '',
        required_appliances: response.recipe_data.required_appliances?.join(', ') || '',
        source_url: response.recipe_data.source_url || '',
        source_name: response.recipe_data.source_name || '',
      });

      // Show warnings
      const warnings = [...response.warnings];
      if (response.missing_fields.length > 0) {
        warnings.push(`Missing fields: ${response.missing_fields.join(', ')}. Please fill them in.`);
      }
      if (response.confidence === 'low') {
        warnings.push('Low confidence parsing. Please review all fields carefully.');
      } else if (response.confidence === 'medium') {
        warnings.push('Some fields may need review.');
      }
      setParseWarnings(warnings);
      setHasParsedData(true);
      setShowOcrReview(false);

      toast.success('Recipe parsed from photo! Review and edit as needed.');
    } catch (error: any) {
      console.error('Failed to parse OCR text:', error);
      toast.error(`Failed to parse recipe: ${error.message || 'Unknown error'}`);
    } finally {
      setIsParsing(false);
    }
  };

  // Back from OCR review to input
  const handleBackFromOcr = () => {
    setShowOcrReview(false);
    setOcrResult(null);
    setPhotoBase64(null);
    setPhotoPreviewUrl(null);
    setCorrectedText('');
  };

  const toggleMealType = (mealType: string) => {
    setFormData(prev => {
      const currentTypes = prev.meal_types || [];
      return {
        ...prev,
        meal_types: currentTypes.includes(mealType)
          ? currentTypes.filter(t => t !== mealType)
          : [...currentTypes, mealType],
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate at least one meal type selected
    if (!formData.meal_types || formData.meal_types.length === 0) {
      toast.error('Please select at least one meal type');
      return;
    }

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
      meal_types: formData.meal_types,
      prep_time_minutes: parseInt(formData.prep_time_minutes) || 0,
      active_cooking_time_minutes: parseInt(formData.active_cooking_time_minutes) || 0,
      serves: parseInt(formData.serves) || 1,
      required_appliances: formData.required_appliances.split(',').map(a => a.trim()).filter(a => a),
      source_url: formData.source_url || undefined,
      source_name: formData.source_name || undefined,
      notes: formData.notes || undefined,
      // Preserve these fields in edit mode
      ...(mode === 'edit' && initialRecipe && {
        is_generated: initialRecipe.is_generated,
      }),
    };

    onSubmit(recipe);
    // Dialog close is handled by parent via mutation onSuccess
  };

  const isEditMode = mode === 'edit';
  const inputLength = recipeInput.trim().length;
  const canParse = inputLength >= MIN_TEXT_LENGTH || isUrl(recipeInput);

  // Render form fields (reused in both parsed and manual modes)
  const renderFormFields = () => (
    <>
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
        <Label className="text-sm font-medium">Meal Types *</Label>
        <p className="text-xs text-muted-foreground mb-2">
          When is this recipe suitable? Select at least one.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {MEAL_TYPES.map((mealType) => (
            <div key={mealType.value} className="flex items-center space-x-2">
              <Checkbox
                id={`meal-type-${mealType.value}`}
                checked={formData.meal_types?.includes(mealType.value) ?? false}
                onCheckedChange={() => toggleMealType(mealType.value)}
              />
              <Label
                htmlFor={`meal-type-${mealType.value}`}
                className="cursor-pointer font-normal"
              >
                {mealType.label}
              </Label>
            </div>
          ))}
        </div>
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

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Personal notes, tips, modifications, reference URLs..."
          rows={3}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Add any personal notes or links. URLs will be preserved as-is.
        </p>
      </div>
    </>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {isEditMode ? 'Edit Recipe' : 'Add New Recipe'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Unified Input Section - only show in add mode when no parsed data */}
          {!isEditMode && !hasParsedData && !showOcrReview && (
            <div className="border-b border-border pb-4 mb-4">
              <Label htmlFor="recipe-input" className="text-base font-semibold">
                Paste Recipe
              </Label>
              <p className="text-sm text-muted-foreground mb-2">
                Paste a recipe URL or recipe text to automatically extract recipe data
              </p>
              <div className="relative">
                <Textarea
                  id="recipe-input"
                  value={recipeInput}
                  onChange={(e) => setRecipeInput(e.target.value)}
                  placeholder="Paste a recipe URL (https://...) or recipe text here...

Example text:
Chocolate Chip Cookies

Ingredients:
- 2 cups flour
- 1 cup butter
- 2 cups chocolate chips

Instructions:
1. Preheat oven to 350°F
2. Mix ingredients
3. Bake for 12 minutes"
                  disabled={isParsing || isOcrProcessing || voiceState === 'listening'}
                  rows={8}
                  className="font-mono text-sm pr-12"
                />
                {isVoiceSupported && (
                  <div className="absolute right-2 top-2">
                    <Button
                      type="button"
                      variant={voiceState === 'listening' ? 'destructive' : 'ghost'}
                      size="icon"
                      className="h-8 w-8"
                      onClick={handleVoiceToggle}
                      disabled={isParsing || isOcrProcessing}
                      title={voiceState === 'listening' ? 'Stop recording' : 'Dictate recipe'}
                    >
                      {voiceState === 'listening' ? (
                        <MicOff className="h-4 w-4" />
                      ) : (
                        <Mic className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                )}
                {voiceState === 'listening' && (
                  <div className="absolute bottom-2 left-2 right-12 flex items-center gap-2 bg-destructive/10 rounded px-2 py-1">
                    <div className="h-2 w-2 bg-destructive rounded-full animate-pulse" />
                    <span className="text-xs text-destructive font-medium">Listening...</span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-muted-foreground">
                  {inputLength.toLocaleString()} / {MAX_TEXT_LENGTH.toLocaleString()} characters
                  {!isUrl(recipeInput) && inputLength > 0 && inputLength < MIN_TEXT_LENGTH && (
                    <span className="text-destructive ml-2">
                      (minimum {MIN_TEXT_LENGTH})
                    </span>
                  )}
                </span>
                <Button
                  type="button"
                  onClick={handleParse}
                  disabled={!canParse || isParsing || isOcrProcessing}
                  variant="secondary"
                >
                  {isParsing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Parsing...
                    </>
                  ) : (
                    'Parse Recipe'
                  )}
                </Button>
              </div>

              {/* Photo upload option */}
              <div className="relative my-4">
                <Separator />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground">
                  or upload a photo
                </span>
              </div>
              <PhotoUploadInput
                onPhotoSelected={handlePhotoSelected}
                disabled={isParsing || isOcrProcessing}
              />
              {isOcrProcessing && (
                <div className="flex items-center justify-center gap-2 mt-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Extracting text from photo...
                </div>
              )}

              {/* Collapsible manual entry */}
              <Collapsible
                open={manualExpanded}
                onOpenChange={setManualExpanded}
                className="mt-4"
              >
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between">
                    <span>Or enter manually</span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${manualExpanded ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4 space-y-4">
                  {renderFormFields()}
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}

          {/* OCR Review Step - show after photo upload, before final parsing */}
          {!isEditMode && !hasParsedData && showOcrReview && ocrResult && photoPreviewUrl && (
            <div className="border-b border-border pb-4 mb-4">
              <OCRReviewStep
                photoPreviewUrl={photoPreviewUrl}
                ocrResult={ocrResult}
                correctedText={correctedText}
                onTextChange={setCorrectedText}
                onProceed={handleParseOcrText}
                onBack={handleBackFromOcr}
                isParsing={isParsing}
              />
            </div>
          )}

          {/* Parsed Data Section - show after parsing or in edit mode */}
          {(hasParsedData || isEditMode) && (
            <>
              {/* Start Over button (only in add mode after parsing) */}
              {!isEditMode && hasParsedData && (
                <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">
                      Review the parsed recipe below
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleStartOver}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <RotateCcw className="mr-1 h-3 w-3" />
                    Start Over
                  </Button>
                </div>
              )}

              {/* Warnings */}
              {parseWarnings.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <ul className="text-sm space-y-1 mt-1">
                      {parseWarnings.map((warning, i) => (
                        <li key={i}>• {warning}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Form fields */}
              {renderFormFields()}
            </>
          )}

          {/* Submit buttons - always show when we have form data to submit */}
          {(hasParsedData || isEditMode || manualExpanded) && (
            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1">
                {isEditMode ? 'Save Changes' : 'Add Recipe'}
              </Button>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}

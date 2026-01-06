import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Check, ChevronRight, SkipForward } from 'lucide-react';
import { PhotoWithHighlight } from './PhotoCrop';
import type { FieldConfidence, BoundingBox } from '@/lib/api';

interface UncertainField {
  fieldName: string;
  label: string;
  value: string;
  confidence: 'low' | 'medium';
  boundingBox?: BoundingBox;
  isMultiline?: boolean;
}

interface FieldConfirmationWizardProps {
  uncertainFields: UncertainField[];
  photoPreviewUrl: string | null;
  onFieldConfirm: (fieldName: string, value: string) => void;
  onComplete: () => void;
  onSkip: () => void;
}

/**
 * Progressive confirmation wizard for uncertain parsed fields.
 * Steps through each field one-by-one, showing photo context where available.
 */
export function FieldConfirmationWizard({
  uncertainFields,
  photoPreviewUrl,
  onFieldConfirm,
  onComplete,
  onSkip,
}: FieldConfirmationWizardProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentValue, setCurrentValue] = useState(uncertainFields[0]?.value || '');

  const currentField = uncertainFields[currentIndex];
  const progressPercent = ((currentIndex + 1) / uncertainFields.length) * 100;
  const isLastField = currentIndex === uncertainFields.length - 1;

  const handleConfirm = () => {
    onFieldConfirm(currentField.fieldName, currentValue);

    if (isLastField) {
      onComplete();
    } else {
      // Move to next field
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setCurrentValue(uncertainFields[nextIndex]?.value || '');
    }
  };

  if (!currentField) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Progress header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Reviewing field {currentIndex + 1} of {uncertainFields.length}
          </span>
          <Button variant="ghost" size="sm" onClick={onSkip}>
            <SkipForward className="h-4 w-4 mr-1" />
            Skip to form
          </Button>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      {/* Two-column layout when photo context is available */}
      <div className={`grid gap-4 ${photoPreviewUrl && currentField.boundingBox ? 'md:grid-cols-2' : ''}`}>
        {/* Photo context (if bounding box available) */}
        {photoPreviewUrl && currentField.boundingBox && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Photo Context</Label>
            <PhotoWithHighlight
              imageUrl={photoPreviewUrl}
              boundingBox={currentField.boundingBox}
              className="aspect-video rounded-lg border overflow-hidden"
            />
          </div>
        )}

        {/* Field input */}
        <div className="space-y-3">
          <div>
            <Label htmlFor="field-value" className="font-medium">
              {currentField.label}
            </Label>
            <p className="text-xs text-muted-foreground mt-1">
              Confidence: <span className={currentField.confidence === 'low' ? 'text-destructive' : 'text-yellow-600'}>
                {currentField.confidence}
              </span>
              {' '}- Please verify this value is correct
            </p>
          </div>

          {currentField.isMultiline ? (
            <Textarea
              id="field-value"
              value={currentValue}
              onChange={(e) => setCurrentValue(e.target.value)}
              rows={6}
              className="font-mono text-sm"
            />
          ) : (
            <Input
              id="field-value"
              value={currentValue}
              onChange={(e) => setCurrentValue(e.target.value)}
            />
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <Button onClick={handleConfirm}>
          {isLastField ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              Confirm & Finish
            </>
          ) : (
            <>
              <ChevronRight className="h-4 w-4 mr-2" />
              Confirm & Next
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

/**
 * Helper to identify uncertain fields from parsed recipe data.
 * Returns fields that should be reviewed by the user.
 */
export function identifyUncertainFields(
  formData: Record<string, string>,
  fieldConfidences?: FieldConfidence[]
): UncertainField[] {
  // If we have field-level confidence data, use it
  if (fieldConfidences && fieldConfidences.length > 0) {
    return fieldConfidences
      .filter(fc => fc.confidence === 'low' || fc.confidence === 'medium')
      .map(fc => ({
        fieldName: fc.field_name,
        label: formatFieldLabel(fc.field_name),
        value: fc.extracted_value || formData[fc.field_name] || '',
        confidence: fc.confidence as 'low' | 'medium',
        boundingBox: fc.bounding_box,
        isMultiline: ['ingredients', 'instructions', 'description', 'notes'].includes(fc.field_name),
      }));
  }

  // Otherwise, return empty (no wizard needed)
  return [];
}

function formatFieldLabel(fieldName: string): string {
  const labels: Record<string, string> = {
    title: 'Recipe Title',
    description: 'Description',
    ingredients: 'Ingredients',
    instructions: 'Instructions',
    prep_time_minutes: 'Prep Time (minutes)',
    active_cooking_time_minutes: 'Cook Time (minutes)',
    serves: 'Servings',
    tags: 'Tags',
    notes: 'Notes',
  };
  return labels[fieldName] || fieldName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

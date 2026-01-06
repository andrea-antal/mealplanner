import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import type { OCRFromPhotoResponse } from '@/lib/api';

interface OCRReviewStepProps {
  photoPreviewUrl: string;
  ocrResult: OCRFromPhotoResponse;
  correctedText: string;
  onTextChange: (text: string) => void;
  onProceed: () => void;
  onBack: () => void;
  isParsing: boolean;
}

/**
 * OCR Review Step - allows user to review and correct extracted text
 * before parsing into structured recipe.
 */
export function OCRReviewStep({
  photoPreviewUrl,
  ocrResult,
  correctedText,
  onTextChange,
  onProceed,
  onBack,
  isParsing,
}: OCRReviewStepProps) {
  const hasWarnings = ocrResult.warnings.length > 0;
  const isLowConfidence = ocrResult.ocr_confidence === 'low';
  const isMediumConfidence = ocrResult.ocr_confidence === 'medium';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Review Extracted Text</h3>
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
      </div>

      {/* Warnings */}
      {(hasWarnings || ocrResult.is_handwritten || isLowConfidence) && (
        <div className="space-y-2">
          {ocrResult.is_handwritten && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Handwritten text detected. Please carefully review for spelling errors
                and unclear characters.
              </AlertDescription>
            </Alert>
          )}

          {isLowConfidence && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Low OCR confidence - the image may be blurry or unclear.
                Please carefully review and correct the text below.
              </AlertDescription>
            </Alert>
          )}

          {isMediumConfidence && !ocrResult.is_handwritten && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Some text may be unclear. Please review before proceeding.
              </AlertDescription>
            </Alert>
          )}

          {hasWarnings && ocrResult.warnings.map((warning, i) => (
            <Alert key={i}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{warning}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Two-column layout on larger screens */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Photo preview */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Original Photo</Label>
          <div className="relative aspect-[3/4] overflow-hidden rounded-lg border bg-muted">
            <img
              src={photoPreviewUrl}
              alt="Recipe photo"
              className="absolute inset-0 w-full h-full object-contain"
            />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Confidence: <span className={`font-medium ${
              isLowConfidence ? 'text-destructive' :
              isMediumConfidence ? 'text-yellow-600' : 'text-green-600'
            }`}>{ocrResult.ocr_confidence}</span>
            {ocrResult.is_handwritten && ' | Handwritten'}
          </p>
        </div>

        {/* Editable text */}
        <div className="space-y-2">
          <Label htmlFor="ocr-text" className="text-xs text-muted-foreground">
            Extracted Text (edit to fix errors)
          </Label>
          <Textarea
            id="ocr-text"
            value={correctedText}
            onChange={(e) => onTextChange(e.target.value)}
            rows={16}
            className="font-mono text-sm resize-none"
            placeholder="Extracted text will appear here..."
            disabled={isParsing}
          />
          <p className="text-xs text-muted-foreground">
            {correctedText.length} characters
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <Button
          onClick={onProceed}
          disabled={isParsing || correctedText.trim().length < 50}
        >
          {isParsing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Parsing...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Parse Recipe
            </>
          )}
        </Button>
      </div>

      {correctedText.trim().length < 50 && correctedText.trim().length > 0 && (
        <p className="text-xs text-muted-foreground text-right">
          Need at least 50 characters to parse ({50 - correctedText.trim().length} more needed)
        </p>
      )}
    </div>
  );
}

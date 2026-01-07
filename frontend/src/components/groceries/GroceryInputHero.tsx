import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  AlertCircle,
  ChevronDown,
  Plus,
  Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Language options for voice input
const LANGUAGE_OPTIONS = [
  { code: 'en-US', label: 'EN', name: 'English' },
  { code: 'hu-HU', label: 'HU', name: 'Magyar' },
  { code: 'yue-Hant-HK', label: '粵', name: '廣東話' },
];

// Get display label for a language code (supports partial matches like "en" -> "EN")
function getLanguageLabel(code: string): string {
  const exact = LANGUAGE_OPTIONS.find(opt => opt.code === code);
  if (exact) return exact.label;

  // Try matching just the language part (e.g., "en" matches "en-US")
  const langPart = code.split('-')[0].toLowerCase();
  const partial = LANGUAGE_OPTIONS.find(opt => opt.code.toLowerCase().startsWith(langPart));
  return partial?.label || code.substring(0, 2).toUpperCase();
}

interface GroceryInputHeroProps {
  // Voice input props
  voiceState: 'idle' | 'listening' | 'processing';
  transcription: string;
  voiceError: string | null;
  isVoiceSupported: boolean;
  handleVoiceToggle: () => void;
  parseVoiceMutationPending: boolean;
  voiceLanguage: string;
  onLanguageChange: (lang: string) => void;

  // Receipt upload props
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleReceiptUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isUploadingReceipt: boolean;

  // Manual input props
  newItemName: string;
  setNewItemName: (value: string) => void;
  newItemPurchaseDate: string;
  setNewItemPurchaseDate: (value: string) => void;
  newItemExpiryType: 'expiry_date' | 'best_before_date' | '';
  setNewItemExpiryType: (value: 'expiry_date' | 'best_before_date' | '') => void;
  newItemExpiryDate: string;
  setNewItemExpiryDate: (value: string) => void;
  addGrocery: () => void;
  addMutationPending: boolean;
}

export function GroceryInputHero({
  voiceState,
  transcription,
  voiceError,
  isVoiceSupported,
  handleVoiceToggle,
  parseVoiceMutationPending,
  voiceLanguage,
  onLanguageChange,
  fileInputRef,
  handleReceiptUpload,
  isUploadingReceipt,
  newItemName,
  setNewItemName,
  newItemPurchaseDate,
  setNewItemPurchaseDate,
  newItemExpiryType,
  setNewItemExpiryType,
  newItemExpiryDate,
  setNewItemExpiryDate,
  addGrocery,
  addMutationPending,
}: GroceryInputHeroProps) {
  const [showManualInput, setShowManualInput] = useState(false);
  const [showAdvancedFields, setShowAdvancedFields] = useState(false);

  return (
    <div className="rounded-3xl bg-gradient-to-br from-primary/5 to-secondary/5 p-6 space-y-4">
      {/* Voice Language Selector - only show if voice is supported */}
      {isVoiceSupported && (
        <div className="flex items-center justify-center gap-1">
          <Globe className="h-3.5 w-3.5 text-muted-foreground mr-1" />
          {LANGUAGE_OPTIONS.map((opt) => (
            <button
              key={opt.code}
              type="button"
              onClick={() => onLanguageChange(opt.code)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-full transition-colors",
                voiceLanguage === opt.code
                  ? "bg-amber-100 text-amber-900 border border-amber-300"
                  : "bg-background text-muted-foreground border border-border hover:bg-amber-50 hover:text-foreground"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Primary Actions - Large Touch Targets */}
      <div className="grid grid-cols-2 gap-3">
        {isVoiceSupported && (
          <Button
            variant={voiceState === 'listening' ? 'destructive' : 'hero'}
            size="xl"
            className="h-24 flex flex-col gap-2"
            onClick={handleVoiceToggle}
            disabled={parseVoiceMutationPending}
          >
            {parseVoiceMutationPending ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : voiceState === 'listening' ? (
              <MicOff className="h-8 w-8" />
            ) : (
              <Mic className="h-8 w-8" />
            )}
            <span className="text-sm font-medium">
              {voiceState === 'listening' ? 'Stop' : 'Add by Voice'}
            </span>
          </Button>
        )}

        {/* Hidden file input for receipt upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg"
          onChange={handleReceiptUpload}
          style={{ display: 'none' }}
        />

        <Button
          variant="outline"
          size="xl"
          className={cn(
            "h-24 flex flex-col gap-2 border-2",
            !isVoiceSupported && "col-span-2"
          )}
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploadingReceipt}
        >
          {isUploadingReceipt ? (
            <Loader2 className="h-8 w-8 animate-spin" />
          ) : (
            <Camera className="h-8 w-8" />
          )}
          <span className="text-sm font-medium">Snap Receipt</span>
        </Button>
      </div>

      {/* Voice State Indicator with Live Transcription */}
      {voiceState === 'listening' && (
        <div className="rounded-lg bg-primary/10 border border-primary/20 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 bg-destructive rounded-full animate-pulse" />
            <span className="text-sm font-medium text-foreground">Listening...</span>
            <span className="text-xs text-muted-foreground">
              Speak clearly, then click stop
            </span>
          </div>

          {/* Live Transcription Display */}
          {transcription && (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground italic">
                Don't worry if this isn't perfect - AI will interpret it
              </div>
              <div className="bg-card rounded-lg p-3 border border-border">
                <p className="text-sm text-foreground min-h-[1.5rem]">
                  {transcription}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Voice Error Display */}
      {voiceError && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <p className="text-sm text-destructive">{voiceError}</p>
          </div>
        </div>
      )}

      {/* Secondary: Manual Input (collapsible) */}
      <Collapsible open={showManualInput} onOpenChange={setShowManualInput}>
        <div className="flex justify-center">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <Plus className="h-4 w-4 mr-2" />
              Add manually
              <ChevronDown className={cn(
                "h-4 w-4 ml-2 transition-transform",
                showManualInput && "rotate-180"
              )} />
            </Button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent className="space-y-4 pt-4">
          {/* Simple name input */}
          <div className="flex gap-2">
            <Input
              placeholder="Item name..."
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !showAdvancedFields && addGrocery()}
              className="flex-1 h-12"
            />
            <Button
              onClick={addGrocery}
              disabled={!newItemName.trim() || addMutationPending}
              className="h-12 px-6"
            >
              {addMutationPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Add
            </Button>
          </div>

          {/* Advanced fields toggle */}
          <div className="flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvancedFields(!showAdvancedFields)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {showAdvancedFields ? 'Hide' : 'Show'} dates (optional)
            </Button>
          </div>

          {/* Advanced Fields */}
          {showAdvancedFields && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border">
              <div className="space-y-2">
                <Label htmlFor="purchase-date" className="text-sm">
                  Purchase Date
                </Label>
                <Input
                  id="purchase-date"
                  type="date"
                  value={newItemPurchaseDate}
                  onChange={(e) => setNewItemPurchaseDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiry-type" className="text-sm">
                  Expiry Type
                </Label>
                <select
                  id="expiry-type"
                  className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
                   'Expiry/Best Before Date'}
                </Label>
                <Input
                  id="expiry-date"
                  type="date"
                  value={newItemExpiryDate}
                  onChange={(e) => setNewItemExpiryDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  disabled={!newItemExpiryType}
                  className="h-12"
                />
              </div>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

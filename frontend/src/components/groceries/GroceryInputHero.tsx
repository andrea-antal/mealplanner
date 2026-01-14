import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Mic,
  MicOff,
  Camera,
  Loader2,
  AlertCircle,
  Plus,
  PenLine,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Language options for voice input
const LANGUAGE_OPTIONS = [
  { code: 'en-US', label: 'EN', name: 'English' },
  { code: 'hu-HU', label: 'HU', name: 'Magyar' },
  { code: 'yue-Hant-HK', label: '粵', name: '廣東話' },
];

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
  const [inputMode, setInputMode] = useState<'none' | 'manual'>('none');
  const [showAdvancedFields, setShowAdvancedFields] = useState(false);

  const isVoiceActive = voiceState === 'listening';
  const isProcessing = parseVoiceMutationPending || isUploadingReceipt;

  // Hidden file input for receipt upload
  const triggerReceiptUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-3">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg"
        onChange={handleReceiptUpload}
        style={{ display: 'none' }}
      />

      {/* Compact Add Section */}
      <div className="rounded-xl border border-border bg-card p-3">
        {/* Default state: show all input options inline */}
        {voiceState !== 'listening' && inputMode === 'none' && (
          <div className="flex items-center gap-2">
            {/* Primary action: Voice (if supported) or Manual (if not) */}
            {isVoiceSupported ? (
              <Button
                variant="default"
                className="flex-1 h-12"
                onClick={handleVoiceToggle}
                disabled={isProcessing}
              >
                {parseVoiceMutationPending ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  <Mic className="h-5 w-5 mr-2" />
                )}
                Add by Voice
              </Button>
            ) : (
              <Button
                variant="default"
                className="flex-1 h-12"
                onClick={() => setInputMode('manual')}
              >
                <PenLine className="h-5 w-5 mr-2" />
                Add Item
              </Button>
            )}

            {/* Receipt scan - icon only */}
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 shrink-0"
              onClick={triggerReceiptUpload}
              disabled={isUploadingReceipt}
              title="Scan Receipt"
            >
              {isUploadingReceipt ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Camera className="h-5 w-5" />
              )}
            </Button>

            {/* Manual input - icon only (only when voice is supported) */}
            {isVoiceSupported && (
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12 shrink-0"
                onClick={() => setInputMode('manual')}
                title="Type Manually"
              >
                <PenLine className="h-5 w-5" />
              </Button>
            )}
          </div>
        )}

        {/* Voice Listening State */}
        {voiceState === 'listening' && (
          <div className="space-y-3">
            {/* Language selector + Stop button */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                {LANGUAGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.code}
                    type="button"
                    onClick={() => onLanguageChange(opt.code)}
                    className={cn(
                      "px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
                      voiceLanguage === opt.code
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleVoiceToggle}
                className="h-9"
              >
                <MicOff className="h-4 w-4 mr-2" />
                Stop
              </Button>
            </div>

            {/* Live indicator + Transcription */}
            <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-2.5 w-2.5 bg-destructive rounded-full animate-pulse" />
                <span className="text-sm font-medium">Listening...</span>
              </div>
              {transcription ? (
                <p className="text-sm text-foreground bg-background rounded p-2 border">
                  {transcription}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  Speak clearly, AI will interpret your words
                </p>
              )}
            </div>
          </div>
        )}

        {/* Manual Input Mode */}
        {inputMode === 'manual' && voiceState !== 'listening' && (
          <div className="space-y-3">
            {/* Item name input */}
            <div className="flex gap-2">
              <Input
                placeholder="Item name..."
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !showAdvancedFields && addGrocery()}
                className="flex-1 h-11"
                autoFocus
              />
              <Button
                onClick={addGrocery}
                disabled={!newItemName.trim() || addMutationPending}
                className="h-11 px-4"
              >
                {addMutationPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Footer: advanced toggle + back button */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowAdvancedFields(!showAdvancedFields)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {showAdvancedFields ? 'Hide dates' : 'Add dates (optional)'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setInputMode('none');
                  setShowAdvancedFields(false);
                }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>

            {/* Advanced Fields */}
            {showAdvancedFields && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-border">
                <div className="space-y-1.5">
                  <Label htmlFor="purchase-date" className="text-xs">
                    Purchase Date
                  </Label>
                  <Input
                    id="purchase-date"
                    type="date"
                    value={newItemPurchaseDate}
                    onChange={(e) => setNewItemPurchaseDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="expiry-type" className="text-xs">
                    Expiry Type
                  </Label>
                  <select
                    id="expiry-type"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={newItemExpiryType}
                    onChange={(e) => setNewItemExpiryType(e.target.value as 'expiry_date' | 'best_before_date' | '')}
                  >
                    <option value="">None</option>
                    <option value="expiry_date">Use by</option>
                    <option value="best_before_date">Best before</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="expiry-date" className="text-xs">
                    {newItemExpiryType === 'expiry_date' ? 'Use By' :
                     newItemExpiryType === 'best_before_date' ? 'Best Before' :
                     'Date'}
                  </Label>
                  <Input
                    id="expiry-date"
                    type="date"
                    value={newItemExpiryDate}
                    onChange={(e) => setNewItemExpiryDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    disabled={!newItemExpiryType}
                    className="h-10"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Voice Error Display */}
      {voiceError && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <p className="text-sm text-destructive">{voiceError}</p>
          </div>
        </div>
      )}
    </div>
  );
}

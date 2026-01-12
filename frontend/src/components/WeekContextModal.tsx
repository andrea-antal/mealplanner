import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Mic, MicOff, Loader2, Sparkles, SkipForward } from 'lucide-react';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { Alert, AlertDescription } from '@/components/ui/alert';

const MAX_CHARS = 750;

interface WeekContextModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (context: string) => void;
  onSkip: () => void;
}

export function WeekContextModal({ open, onOpenChange, onSubmit, onSkip }: WeekContextModalProps) {
  const [contextText, setContextText] = useState('');

  const {
    state: voiceState,
    transcription,
    error: voiceError,
    startListening,
    stopListening,
    reset: resetVoice,
    isSupported: isVoiceSupported,
  } = useVoiceInput();

  // Append voice transcription to text when it updates
  useEffect(() => {
    if (transcription && voiceState === 'idle') {
      setContextText(prev => {
        const combined = prev ? `${prev} ${transcription}` : transcription;
        return combined.slice(0, MAX_CHARS);
      });
      resetVoice();
    }
  }, [transcription, voiceState, resetVoice]);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setContextText('');
      resetVoice();
    }
  }, [open, resetVoice]);

  const handleVoiceToggle = () => {
    if (voiceState === 'listening') {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleSubmit = () => {
    onSubmit(contextText.trim());
  };

  const handleSkip = () => {
    onSkip();
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= MAX_CHARS) {
      setContextText(value);
    }
  };

  const charsRemaining = MAX_CHARS - contextText.length;
  const isNearLimit = charsRemaining <= 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Tell Us About Your Week
          </DialogTitle>
          <DialogDescription>
            Optional: Help Claude create a more personalized meal plan
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Examples hint */}
          <div className="p-3 rounded-lg bg-muted/50 border">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Examples:</strong>
            </p>
            <ul className="text-sm text-muted-foreground mt-1 space-y-1 list-disc list-inside">
              <li>Busy Monday-Thursday, quick meals needed</li>
              <li>Eating out Friday and Saturday dinners</li>
              <li>Want Italian and Mexican cuisines this week</li>
              <li>Kids have activities Tuesday/Thursday evenings</li>
            </ul>
          </div>

          {/* Text input with voice button */}
          <div className="space-y-2">
            <div className="relative">
              <Textarea
                placeholder="Describe your week, schedule, or meal preferences..."
                value={voiceState === 'listening' ? `${contextText} ${transcription}`.trim() : contextText}
                onChange={handleTextChange}
                rows={4}
                className="resize-none pr-12"
                disabled={voiceState === 'listening'}
              />
              {/* Voice input button */}
              {isVoiceSupported && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={`absolute bottom-2 right-2 h-8 w-8 ${
                    voiceState === 'listening' ? 'text-red-500 animate-pulse' : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={handleVoiceToggle}
                  disabled={voiceState === 'processing'}
                  aria-label={voiceState === 'listening' ? 'Stop voice input' : 'Start voice input'}
                >
                  {voiceState === 'listening' ? (
                    <MicOff className="h-4 w-4" />
                  ) : voiceState === 'processing' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>

            {/* Character counter */}
            <div className="flex justify-between items-center">
              <div className="text-xs text-muted-foreground">
                {voiceState === 'listening' && (
                  <span className="text-red-500 flex items-center gap-1">
                    <span className="inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    Listening...
                  </span>
                )}
              </div>
              <p className={`text-xs ${isNearLimit ? 'text-amber-600' : 'text-muted-foreground'}`}>
                {contextText.length} / {MAX_CHARS}
              </p>
            </div>
          </div>

          {/* Voice error alert */}
          {voiceError && (
            <Alert variant="destructive">
              <AlertDescription>{voiceError}</AlertDescription>
            </Alert>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex justify-between gap-3 pt-2 border-t">
          <Button
            type="button"
            variant="ghost"
            onClick={handleSkip}
            className="text-muted-foreground"
          >
            <SkipForward className="h-4 w-4 mr-2" />
            Skip
          </Button>
          <Button
            type="button"
            variant="default"
            onClick={handleSubmit}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Generate Plan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

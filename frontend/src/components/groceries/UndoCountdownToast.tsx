import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface UndoCountdownToastProps {
  itemCount: number;
  durationMs: number;
  onUndo: () => void;
}

export function UndoCountdownToast({ itemCount, durationMs, onUndo }: UndoCountdownToastProps) {
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(durationMs / 1000));

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center justify-between gap-4 w-full">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">Clearing {itemCount} item{itemCount !== 1 ? 's' : ''}...</p>
        <p className="text-xs text-muted-foreground">
          Permanent in {secondsLeft}s
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onUndo}
        className="shrink-0"
      >
        Undo
      </Button>
    </div>
  );
}

import { useState, useEffect } from 'react';

interface SimulatedProgressProps {
  /** Expected duration in seconds (progress asymptotes toward 95%) */
  durationSeconds?: number;
  /** Optional label below the bar */
  label?: string;
}

/**
 * Asymptotic progress bar for long-running API calls.
 * Uses: progress = 95 * (1 - e^(-3t/duration))
 * Starts fast, slows as it approaches 95%, never reaches 100%.
 */
export function SimulatedProgress({ durationSeconds = 15, label }: SimulatedProgressProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const p = 95 * (1 - Math.exp((-3 * elapsed) / durationSeconds));
      setProgress(Math.min(p, 95));
    }, 100);
    return () => clearInterval(interval);
  }, [durationSeconds]);

  return (
    <div className="w-full space-y-2">
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-200 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      {label && (
        <p className="text-xs text-muted-foreground text-center">{label}</p>
      )}
    </div>
  );
}

import { cn } from '@/lib/utils';

interface PortionSelectorProps {
  multiplier: number;
  onMultiplierChange: (multiplier: number) => void;
  originalServes: number;
}

const MULTIPLIER_OPTIONS = [
  { value: 0.5, label: '\u00BD\u00D7' },
  { value: 1, label: '1\u00D7' },
  { value: 2, label: '2\u00D7' },
  { value: 3, label: '3\u00D7' },
];

export function PortionSelector({
  multiplier,
  onMultiplierChange,
  originalServes,
}: PortionSelectorProps) {
  const adjustedServes = Math.round(originalServes * multiplier);

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center rounded-lg border border-border bg-muted/30 p-0.5">
        {MULTIPLIER_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => onMultiplierChange(value)}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-md transition-all',
              multiplier === value
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent',
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <span className="text-sm text-muted-foreground">
        {adjustedServes} {adjustedServes === 1 ? 'serving' : 'servings'}
      </span>
    </div>
  );
}

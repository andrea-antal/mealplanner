import { cn } from '@/lib/utils';
import { Scale, FlaskConical } from 'lucide-react';

export type UnitMode = 'original' | 'weight' | 'volume';

interface UnitToggleProps {
  unitMode: UnitMode;
  onUnitModeChange: (mode: UnitMode) => void;
}

const UNIT_OPTIONS: { value: UnitMode; label: string; icon: typeof Scale }[] = [
  { value: 'original', label: 'Original', icon: FlaskConical },
  { value: 'weight', label: 'Weight', icon: Scale },
  { value: 'volume', label: 'Volume', icon: FlaskConical },
];

export function UnitToggle({ unitMode, onUnitModeChange }: UnitToggleProps) {
  return (
    <div className="flex items-center rounded-lg border border-border bg-muted/30 p-0.5">
      {UNIT_OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          onClick={() => onUnitModeChange(value)}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-all',
            unitMode === value
              ? 'bg-card text-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent',
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}

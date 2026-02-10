import type { TimelineStep } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { getRecipeColor } from './CurrentStepCard';

interface UpNextPanelProps {
  steps: TimelineStep[];
  colorMap: Record<string, number>;
  getClockTime: (offsetMinutes: number) => string | null;
}

export function UpNextPanel({ steps, colorMap, getClockTime }: UpNextPanelProps) {
  if (steps.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-xs space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Up Next
      </h3>
      <div className="space-y-2">
        {steps.map((step, i) => {
          const color = getRecipeColor(colorMap[step.recipe_id] ?? 0);
          const clockTime = getClockTime(step.start_offset_minutes);
          return (
            <div
              key={`${step.recipe_id}-${step.step_number}-${i}`}
              className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0"
            >
              <div className="flex-shrink-0 mt-0.5">
                <div className={`w-2.5 h-2.5 rounded-full ${color.bg} ring-2 ring-background`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`${color.text} text-[10px] px-1.5 py-0 border-0 ${color.bg}`}>
                    {step.recipe_title}
                  </Badge>
                  {clockTime && (
                    <span className="text-[10px] text-muted-foreground">{clockTime}</span>
                  )}
                </div>
                <p className="text-sm text-foreground mt-0.5 line-clamp-2">{step.instruction}</p>
                {step.duration_minutes && (
                  <span className="text-xs text-muted-foreground">{step.duration_minutes} min</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

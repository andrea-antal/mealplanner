import { useState } from 'react';
import type { TimelineStep } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, Check } from 'lucide-react';
import { getRecipeColor } from './CurrentStepCard';

interface FullTimelineProps {
  steps: TimelineStep[];
  currentStepIndex: number;
  colorMap: Record<string, number>;
  getClockTime: (offsetMinutes: number) => string | null;
  onJumpToStep: (index: number) => void;
}

export function FullTimeline({
  steps,
  currentStepIndex,
  colorMap,
  getClockTime,
  onJumpToStep,
}: FullTimelineProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <span>Full Timeline ({steps.length} steps)</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-1">
          {steps.map((step, i) => {
            const color = getRecipeColor(colorMap[step.recipe_id] ?? 0);
            const isCompleted = i < currentStepIndex;
            const isCurrent = i === currentStepIndex;
            const clockTime = getClockTime(step.start_offset_minutes);

            return (
              <button
                key={`${step.recipe_id}-${step.step_number}-${i}`}
                onClick={() => onJumpToStep(i)}
                className={`
                  w-full flex items-start gap-3 py-2 px-2 rounded-lg text-left transition-colors
                  ${isCurrent ? 'bg-primary/5 ring-1 ring-primary/20' : 'hover:bg-muted/50'}
                  ${isCompleted ? 'opacity-50' : ''}
                `}
              >
                {/* Timeline dot/check */}
                <div className="flex-shrink-0 mt-1">
                  {isCompleted ? (
                    <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
                      <Check className="h-3 w-3 text-muted-foreground" />
                    </div>
                  ) : (
                    <div className={`w-5 h-5 rounded-full ${isCurrent ? color.bg : 'bg-muted/50'} flex items-center justify-center`}>
                      <div className={`w-2 h-2 rounded-full ${isCurrent ? color.text.replace('text-', 'bg-') : 'bg-muted-foreground/30'}`} />
                    </div>
                  )}
                </div>

                {/* Step content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`${color.text} text-[10px] px-1.5 py-0 border-0 ${color.bg}`}>
                      {step.recipe_title}
                    </Badge>
                    {clockTime && (
                      <span className="text-[10px] text-muted-foreground">{clockTime}</span>
                    )}
                    {!step.is_active && (
                      <span className="text-[10px] text-muted-foreground italic">passive</span>
                    )}
                  </div>
                  <p className={`text-sm mt-0.5 ${isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                    {step.instruction}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

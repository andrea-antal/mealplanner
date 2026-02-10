import type { TimelineStep } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Timer, Lightbulb } from 'lucide-react';

const RECIPE_COLORS = [
  { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-200' },
  { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-200' },
  { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
  { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200' },
  { bg: 'bg-sky-100', text: 'text-sky-700', border: 'border-sky-200' },
];

export function getRecipeColor(colorIndex: number) {
  return RECIPE_COLORS[colorIndex % RECIPE_COLORS.length];
}

interface CurrentStepCardProps {
  step: TimelineStep;
  colorIndex: number;
  clockTime: string | null;
  onStartTimer?: (minutes: number, label: string) => void;
}

export function CurrentStepCard({ step, colorIndex, clockTime, onStartTimer }: CurrentStepCardProps) {
  const color = getRecipeColor(colorIndex);

  return (
    <div className={`rounded-xl border-2 ${color.border} bg-card p-6 shadow-medium space-y-4`}>
      {/* Recipe badge + clock */}
      <div className="flex items-center justify-between">
        <Badge className={`${color.bg} ${color.text} border-0 font-medium`}>
          {step.recipe_title}
        </Badge>
        {clockTime && (
          <span className="text-sm font-medium text-muted-foreground">{clockTime}</span>
        )}
      </div>

      {/* Step instruction */}
      <div>
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Step {step.step_number} {!step.is_active && '(passive)'}
        </span>
        <p className="text-lg font-medium mt-1">{step.instruction}</p>
      </div>

      {/* Duration + timer */}
      {step.duration_minutes && (
        <div className="flex items-center gap-2">
          <Timer className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{step.duration_minutes} min</span>
          {onStartTimer && (
            <Button
              variant="outline"
              size="sm"
              className="ml-auto"
              onClick={() => onStartTimer(step.duration_minutes!, `${step.recipe_title} — Step ${step.step_number}`)}
            >
              <Timer className="h-3.5 w-3.5 mr-1" />
              Start Timer
            </Button>
          )}
        </div>
      )}

      {/* Tip */}
      {step.tip && (
        <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
          <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-muted-foreground">{step.tip}</p>
        </div>
      )}
    </div>
  );
}

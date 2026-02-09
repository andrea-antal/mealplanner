import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, Timer, Lightbulb, PartyPopper } from 'lucide-react';
import type { TimerInstance } from './CookingTimer';

interface CookingStep {
  step_number: number;
  instruction: string;
  duration_minutes: number | null;
  tip: string | null;
}

interface StepByStepProps {
  steps: CookingStep[];
  currentStep: number;
  onStepChange: (step: number) => void;
  onStartTimer: (minutes: number, label: string) => void;
  onComplete: () => void;
}

export function StepByStep({
  steps,
  currentStep,
  onStepChange,
  onStartTimer,
  onComplete,
}: StepByStepProps) {
  const totalSteps = steps.length;
  const step = steps[currentStep];
  const progress = totalSteps > 0 ? ((currentStep + 1) / totalSteps) * 100 : 0;
  const isLastStep = currentStep === totalSteps - 1;
  const isFirstStep = currentStep === 0;

  if (!step) return null;

  // Touch/swipe support
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = e.changedTouches[0].clientX - touchStart;
    const threshold = 50;
    if (diff > threshold && !isFirstStep) {
      onStepChange(currentStep - 1);
    } else if (diff < -threshold && !isLastStep) {
      onStepChange(currentStep + 1);
    }
    setTouchStart(null);
  };

  return (
    <div
      className="space-y-6"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Step {currentStep + 1} of {totalSteps}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Step Content */}
      <div className="min-h-[200px] flex flex-col justify-center">
        <div className="space-y-4">
          {/* Step number badge */}
          <div className="flex justify-center">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground text-xl font-bold">
              {step.step_number}
            </span>
          </div>

          {/* Instruction */}
          <p className="text-xl sm:text-2xl text-center font-medium leading-relaxed px-2">
            {step.instruction}
          </p>

          {/* Timer button */}
          {step.duration_minutes && step.duration_minutes > 0 && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="lg"
                onClick={() => onStartTimer(step.duration_minutes!, `Step ${step.step_number}`)}
                className="gap-2"
              >
                <Timer className="h-5 w-5 text-primary" />
                Start {step.duration_minutes} min timer
              </Button>
            </div>
          )}

          {/* Tip */}
          {step.tip && (
            <div className="mx-auto max-w-md rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4">
              <div className="flex gap-2">
                <Lightbulb className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 dark:text-amber-200">{step.tip}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          size="lg"
          onClick={() => onStepChange(currentStep - 1)}
          disabled={isFirstStep}
          className="flex-1"
        >
          <ChevronLeft className="h-5 w-5 mr-1" />
          Previous
        </Button>

        {isLastStep ? (
          <Button
            size="lg"
            onClick={onComplete}
            className="flex-1 gap-2"
          >
            <PartyPopper className="h-5 w-5" />
            Done!
          </Button>
        ) : (
          <Button
            size="lg"
            onClick={() => onStepChange(currentStep + 1)}
            className="flex-1"
          >
            Next
            <ChevronRight className="h-5 w-5 ml-1" />
          </Button>
        )}
      </div>

      {/* Swipe hint on mobile */}
      <p className="text-center text-xs text-muted-foreground sm:hidden">
        Swipe left or right to navigate steps
      </p>
    </div>
  );
}

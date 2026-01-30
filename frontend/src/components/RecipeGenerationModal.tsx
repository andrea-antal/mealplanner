import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Check, Loader2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RecipeGenerationModalProps {
  open: boolean;
  onClose: () => void;
  recipeCount?: number;
}

interface Step {
  id: number;
  label: string;
  icon: string;
  duration: number; // milliseconds
}

// Generate steps dynamically based on recipe count
function generateSteps(recipeCount: number): Step[] {
  const steps: Step[] = [
    { id: 1, label: 'Analyzing your cuisine preferences', icon: '🍳', duration: 5000 },
    { id: 2, label: 'Selecting recipes for your library', icon: '📚', duration: 5000 },
  ];

  // Add a step for each recipe
  for (let i = 1; i <= recipeCount; i++) {
    steps.push({
      id: steps.length + 1,
      label: `Generating recipe ${i} of ${recipeCount}...`,
      icon: '🤖',
      duration: 25000, // ~25 seconds per recipe
    });
  }

  steps.push({
    id: steps.length + 1,
    label: 'Finalizing your recipe library',
    icon: '✨',
    duration: 5000,
  });

  return steps;
}

export function RecipeGenerationModal({
  open,
  onClose,
  recipeCount = 5,
}: RecipeGenerationModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  // Memoize steps to prevent useEffect from restarting on every render
  const GENERATION_STEPS = useMemo(() => generateSteps(recipeCount), [recipeCount]);
  const TOTAL_DURATION = useMemo(
    () => GENERATION_STEPS.reduce((sum, step) => sum + step.duration, 0),
    [GENERATION_STEPS]
  );

  useEffect(() => {
    if (!open) {
      // Reset when modal closes
      setCurrentStep(0);
      setProgress(0);
      return;
    }

    if (typeof window === 'undefined') return;

    // Simulate progress through steps
    let elapsedTime = 0;
    const interval = setInterval(() => {
      elapsedTime += 100; // Update every 100ms

      // Calculate overall progress
      const progressPercent = Math.min((elapsedTime / TOTAL_DURATION) * 100, 100);
      setProgress(progressPercent);

      // Determine current step based on elapsed time
      let cumulativeTime = 0;
      for (let i = 0; i < GENERATION_STEPS.length; i++) {
        cumulativeTime += GENERATION_STEPS[i].duration;
        if (elapsedTime < cumulativeTime) {
          setCurrentStep(i);
          break;
        }
      }

      // Stop at 95% (wait for actual completion)
      if (progressPercent >= 95) {
        setProgress(95);
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [open, GENERATION_STEPS, TOTAL_DURATION]);

  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Adding Starter Recipes</DialogTitle>
          <DialogDescription>
            Claude is creating personalized recipes based on your preferences
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Steps List */}
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {GENERATION_STEPS.map((step, index) => {
              const isCompleted = index < currentStep;
              const isCurrent = index === currentStep;
              const isPending = index > currentStep;

              return (
                <div
                  key={step.id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg transition-all duration-300',
                    isCurrent && 'bg-primary/10 border border-primary/20',
                    isCompleted && 'opacity-60'
                  )}
                >
                  {/* Icon/Status */}
                  <div className="flex-shrink-0">
                    {isCompleted && (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-4 w-4" />
                      </div>
                    )}
                    {isCurrent && (
                      <div className="flex h-8 w-8 items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    )}
                    {isPending && (
                      <div className="flex h-8 w-8 items-center justify-center text-2xl opacity-40">
                        {step.icon}
                      </div>
                    )}
                  </div>

                  {/* Label */}
                  <div className="flex-1">
                    <p
                      className={cn(
                        'text-sm font-medium',
                        isCurrent && 'text-foreground',
                        (isCompleted || isPending) && 'text-muted-foreground'
                      )}
                    >
                      {step.label}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              {Math.round(progress)}% complete
            </p>
          </div>

          {/* Time Estimate */}
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Usually takes 2-3 minutes</span>
          </div>

          {/* Close Button */}
          <div className="pt-2">
            <Button
              variant="outline"
              onClick={handleClose}
              className="w-full"
            >
              Continue in Background
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Recipes will be added even if you close this
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

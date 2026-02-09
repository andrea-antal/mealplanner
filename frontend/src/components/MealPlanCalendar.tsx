import { useMemo } from 'react';
import { startOfWeek, addDays, format, isPast, isToday } from 'date-fns';
import { Sparkles, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { MealPlan } from '@/lib/api/types';

// Meal type emoji mapping
const mealTypeIcons: Record<string, string> = {
  breakfast: '🍳',
  lunch: '🥗',
  dinner: '🍽️',
  snack: '🍪',
};

interface MealPlanCalendarProps {
  /** The meal plan for this week, or null if no plan exists */
  mealPlan: MealPlan | null;
  /** The week start date ISO string (Monday) */
  weekStartDate: string;
  /** Whether this is the current week */
  isCurrentWeek: boolean;
  /** Whether this week is in the past */
  isPastWeek: boolean;
  /** Called when user clicks "Generate Plan" */
  onGeneratePlan: () => void;
  /** Whether plan generation is in progress */
  isGenerating: boolean;
  /** Called when user clicks on a recipe (by recipe_id) */
  onRecipeClick?: (recipeId: string) => void;
  /** Called when user clicks "View Full Plan" to switch to the detailed day-by-day view */
  onViewFullPlan?: () => void;
  className?: string;
}

/**
 * Week grid display showing a 7-day overview of meals.
 * Shows an empty state with "Generate Plan" CTA for weeks without plans.
 * Past weeks are read-only.
 */
export const MealPlanCalendar = ({
  mealPlan,
  weekStartDate,
  isCurrentWeek,
  isPastWeek,
  onGeneratePlan,
  isGenerating,
  onRecipeClick,
  onViewFullPlan,
  className,
}: MealPlanCalendarProps) => {
  // Build the 7-day structure
  const days = useMemo(() => {
    const [year, month, day] = weekStartDate.split('-').map(Number);
    const start = new Date(year, month - 1, day);

    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(start, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const planDay = mealPlan?.days.find(d => String(d.date) === dateStr);

      return {
        date,
        dateStr,
        dayName: format(date, 'EEE'),
        dayNumber: format(date, 'd'),
        monthShort: format(date, 'MMM'),
        meals: planDay?.meals ?? [],
        isToday: isToday(date),
        isPast: isPast(date) && !isToday(date),
      };
    });
  }, [weekStartDate, mealPlan]);

  const hasPlan = mealPlan !== null && mealPlan.days.some(d => d.meals.length > 0);
  const canGenerate = !isPastWeek;

  // Empty state - no plan for this week
  if (!hasPlan) {
    return (
      <div className={cn("space-y-4", className)}>
        {/* Empty week grid */}
        <div className="grid grid-cols-7 gap-1.5">
          {days.map((day) => (
            <div
              key={day.dateStr}
              className={cn(
                "rounded-lg border border-border/60 bg-card p-3 min-h-[120px] flex flex-col",
                day.isToday && "ring-2 ring-primary/50 border-primary/30"
              )}
            >
              <div className="text-center mb-2">
                <p className={cn(
                  "text-xs font-medium uppercase tracking-wide",
                  day.isToday ? "text-primary" : "text-muted-foreground"
                )}>
                  {day.dayName}
                </p>
                <p className={cn(
                  "text-lg font-display font-semibold",
                  day.isToday ? "text-primary" : "text-foreground"
                )}>
                  {day.dayNumber}
                </p>
              </div>
              <div className="flex-1 flex items-center justify-center">
                <p className="text-xs text-muted-foreground/50 italic">--</p>
              </div>
            </div>
          ))}
        </div>

        {/* Generate CTA */}
        {canGenerate && (
          <div className="flex flex-col items-center gap-3 py-6">
            <p className="text-sm text-muted-foreground">
              No meal plan for this week yet.
            </p>
            <Button
              variant="hero"
              onClick={onGeneratePlan}
              disabled={isGenerating}
            >
              <Sparkles className="h-4 w-4" />
              {isGenerating ? 'Generating...' : 'Generate Plan'}
            </Button>
          </div>
        )}

        {/* Past week empty message */}
        {isPastWeek && (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              No plan was saved for this week.
            </p>
          </div>
        )}
      </div>
    );
  }

  // Populated state - show the week grid with meals
  return (
    <div className={cn("space-y-4", className)}>
      {/* Week grid with meals */}
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day) => (
          <div
            key={day.dateStr}
            className={cn(
              "rounded-lg border border-border/60 bg-card p-2.5 min-h-[140px] flex flex-col",
              day.isToday && "ring-2 ring-primary/50 border-primary/30",
              day.isPast && isPastWeek && "opacity-75"
            )}
          >
            {/* Day header */}
            <div className="text-center mb-2 pb-1.5 border-b border-border/40">
              <p className={cn(
                "text-xs font-medium uppercase tracking-wide",
                day.isToday ? "text-primary" : "text-muted-foreground"
              )}>
                {day.dayName}
              </p>
              <p className={cn(
                "text-base font-display font-semibold leading-tight",
                day.isToday ? "text-primary" : "text-foreground"
              )}>
                {day.dayNumber}
              </p>
            </div>

            {/* Meals list */}
            <div className="flex-1 space-y-1">
              {day.meals.length === 0 ? (
                <p className="text-xs text-muted-foreground/50 italic text-center py-2">--</p>
              ) : (
                day.meals.map((meal, idx) => {
                  const isClickable = !!meal.recipe_id && !!onRecipeClick;
                  return (
                    <div
                      key={`${day.dateStr}-${idx}`}
                      className={cn(
                        "rounded-md px-1.5 py-1 text-xs",
                        "bg-muted/40 hover:bg-muted/60 transition-colors",
                        isClickable && "cursor-pointer"
                      )}
                      onClick={() => {
                        if (isClickable && meal.recipe_id) {
                          onRecipeClick(meal.recipe_id);
                        }
                      }}
                    >
                      <span className="mr-1">
                        {mealTypeIcons[meal.meal_type.toLowerCase()] || '🍴'}
                      </span>
                      <span className="text-foreground font-medium truncate">
                        {meal.recipe_title}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Actions below the grid */}
      <div className="flex items-center justify-between">
        {isPastWeek && (
          <p className="text-xs text-muted-foreground italic">Past week (read-only)</p>
        )}
        {!isPastWeek && onViewFullPlan && (
          <Button
            variant="outline"
            size="sm"
            onClick={onViewFullPlan}
          >
            View & Edit Full Plan
          </Button>
        )}
        {!isPastWeek && canGenerate && (
          <Button
            variant="hero"
            size="sm"
            onClick={onGeneratePlan}
            disabled={isGenerating}
          >
            <Sparkles className="h-3.5 w-3.5" />
            {hasPlan ? 'Regenerate' : 'Generate Plan'}
          </Button>
        )}
      </div>
    </div>
  );
};

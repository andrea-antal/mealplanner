import { cn } from '@/lib/utils';

// Meal type emoji mapping
const mealTypeIcons: Record<string, string> = {
  breakfast: '🍳',
  lunch: '🥗',
  dinner: '🍽️',
  snack: '🍪',
};

export interface MealPlanMeal {
  meal_type: string;
  recipe_id?: string | null;
  recipe_title: string;
  for_who?: string;
  is_daycare?: boolean;
}

export interface MealPlanDay {
  date: string;
  meals: MealPlanMeal[];
}

interface MealPlanGridProps {
  days: MealPlanDay[];
  visibleDays?: number | 'auto';
  startDayIndex?: number;
  containerWidth?: number; // For auto breakpoint calculation
  className?: string;
}

/**
 * Static display component for meal plan grid.
 * Used in the playground to test responsive layouts without drag-drop complexity.
 */
export const MealPlanGrid = ({
  days,
  visibleDays = 'auto',
  startDayIndex = 0,
  containerWidth,
  className,
}: MealPlanGridProps) => {
  // Calculate visible day count based on mode
  const getVisibleDayCount = (): number => {
    if (visibleDays !== 'auto') {
      return visibleDays;
    }
    // Auto mode: use container width or window width
    const width = containerWidth ?? window.innerWidth;
    if (width >= 1920) return 7;
    if (width >= 1600) return 5;
    if (width >= 1200) return 3;
    if (width >= 1000) return 2;
    return 1;
  };

  const visibleDayCount = getVisibleDayCount();
  const actualVisibleCount = Math.min(visibleDayCount, days.length - startDayIndex);
  const visibleDayIndices = Array.from(
    { length: actualVisibleCount },
    (_, i) => startDayIndex + i
  );

  // Format date helper
  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return {
      dayName: date.toLocaleDateString('en-US', { weekday: 'long' }),
      shortDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    };
  };

  return (
    <div
      className={cn('grid gap-6', className)}
      style={{
        gridTemplateColumns: `repeat(${actualVisibleCount}, minmax(0, 1fr))`,
      }}
    >
      {visibleDayIndices.map((dayIndex, colIndex) => {
        const day = days[dayIndex];
        if (!day) return null;

        const { dayName, shortDate } = formatDate(day.date);
        const isFirstDay = colIndex === 0;

        return (
          <div
            key={day.date}
            className={cn(
              'rounded-2xl bg-card shadow-soft overflow-hidden',
              !isFirstDay && 'opacity-95'
            )}
          >
            {/* Day Header */}
            <div
              className={cn(
                'flex items-center justify-between px-4 py-2.5',
                isFirstDay
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-primary/80 text-primary-foreground'
              )}
            >
              <span className="font-display text-base font-semibold">
                {dayName}
              </span>
              <span
                className={cn(
                  'text-sm',
                  isFirstDay ? 'text-primary-foreground/80' : 'text-primary-foreground/70'
                )}
              >
                {shortDate}
              </span>
            </div>

            {/* Meals */}
            <div className="p-6 space-y-3">
              {day.meals.length === 0 ? (
                <p className="text-sm text-muted-foreground italic text-center py-4">
                  No meals planned
                </p>
              ) : (
                day.meals.map((meal, mealIdx) => {
                  const isForEveryone =
                    !meal.for_who ||
                    meal.for_who === 'everyone' ||
                    meal.for_who.includes(',');
                  const showTag = meal.is_daycare || !isForEveryone;

                  return (
                    <div
                      key={`${day.date}-meal-${mealIdx}`}
                      className="rounded-lg bg-muted/50 p-4 transition-colors hover:bg-muted"
                    >
                      <p className="text-base font-medium text-foreground">
                        <span className="mr-2">
                          {mealTypeIcons[meal.meal_type.toLowerCase()] || '🍴'}
                        </span>
                        <span className="text-muted-foreground capitalize">
                          {meal.meal_type}:
                        </span>{' '}
                        {meal.recipe_title}
                        {showTag && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                            {!isForEveryone ? meal.for_who : ''}
                            {meal.is_daycare
                              ? !isForEveryone
                                ? ' - Daycare'
                                : 'Daycare'
                              : ''}
                          </span>
                        )}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

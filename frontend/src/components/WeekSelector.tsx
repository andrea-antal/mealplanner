import { startOfWeek, addWeeks, format, isSameWeek, addDays, isAfter } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface WeekSelectorProps {
  /** Currently selected week start date (ISO string, e.g. "2026-02-02") */
  selectedWeekStart: string;
  /** Callback when user navigates to a different week */
  onWeekChange: (weekStartDate: string) => void;
  /** Optional set of week start dates that have saved plans */
  weeksWithPlans?: Set<string>;
  /** Maximum weeks into the future the user can navigate */
  maxFutureWeeks?: number;
  className?: string;
}

/**
 * Week navigation bar with previous/next arrows, current week display,
 * and a "Today" button to jump back to the current week.
 */
export const WeekSelector = ({
  selectedWeekStart,
  onWeekChange,
  weeksWithPlans,
  maxFutureWeeks = 4,
  className,
}: WeekSelectorProps) => {
  const today = new Date();
  const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });

  // Parse selected week
  const [year, month, day] = selectedWeekStart.split('-').map(Number);
  const selectedDate = new Date(year, month - 1, day);
  const selectedWeekEnd = addDays(selectedDate, 6);

  // Calculate the maximum allowed week
  const maxWeekStart = addWeeks(currentWeekStart, maxFutureWeeks);

  // Navigation state
  const isCurrentWeek = isSameWeek(selectedDate, today, { weekStartsOn: 1 });
  const canGoNext = !isAfter(addWeeks(selectedDate, 1), maxWeekStart);

  // Format the week range display
  const weekRangeLabel = (() => {
    const startMonth = format(selectedDate, 'MMM');
    const endMonth = format(selectedWeekEnd, 'MMM');
    const startDay = format(selectedDate, 'd');
    const endDay = format(selectedWeekEnd, 'd');
    const yearStr = format(selectedDate, 'yyyy');

    if (startMonth === endMonth) {
      return `${startMonth} ${startDay}-${endDay}, ${yearStr}`;
    }
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${yearStr}`;
  })();

  const handlePrev = () => {
    const prevWeek = addWeeks(selectedDate, -1);
    onWeekChange(format(prevWeek, 'yyyy-MM-dd'));
  };

  const handleNext = () => {
    if (!canGoNext) return;
    const nextWeek = addWeeks(selectedDate, 1);
    onWeekChange(format(nextWeek, 'yyyy-MM-dd'));
  };

  const handleToday = () => {
    onWeekChange(format(currentWeekStart, 'yyyy-MM-dd'));
  };

  // Check if selected week has a plan
  const hasPlan = weeksWithPlans?.has(selectedWeekStart);

  return (
    <div className={cn(
      "flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-card border border-border shadow-xs",
      className
    )}>
      {/* Previous week arrow */}
      <button
        onClick={handlePrev}
        className="p-2 rounded-lg text-foreground hover:bg-muted transition-colors"
        aria-label="Previous week"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      {/* Center: Week display */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="text-center">
          <p className="font-display text-lg font-semibold text-foreground leading-tight">
            {weekRangeLabel}
          </p>
          <div className="flex items-center justify-center gap-2 mt-0.5">
            {isCurrentWeek && (
              <span className="text-xs font-medium text-primary">This week</span>
            )}
            {!isCurrentWeek && hasPlan && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                Planned
              </span>
            )}
            {!isCurrentWeek && !hasPlan && (
              <span className="text-xs text-muted-foreground">No plan</span>
            )}
          </div>
        </div>

        {/* Today button - only show when not on current week */}
        {!isCurrentWeek && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleToday}
            className="text-xs h-7 px-2"
          >
            Today
          </Button>
        )}
      </div>

      {/* Next week arrow */}
      <button
        onClick={handleNext}
        disabled={!canGoNext}
        className={cn(
          "p-2 rounded-lg transition-colors",
          canGoNext
            ? "text-foreground hover:bg-muted"
            : "text-muted-foreground/30 cursor-not-allowed"
        )}
        aria-label="Next week"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
};

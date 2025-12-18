import { MealCard } from './MealCard';
import type { Day } from '@/lib/api';
import { cn } from '@/lib/utils';

interface DayCardProps {
  day: Day;
  isToday?: boolean;
}

// Helper to format date
const formatDate = (dateString: string): { dayName: string; shortDate: string } => {
  const date = new Date(dateString);
  return {
    dayName: date.toLocaleDateString('en-US', { weekday: 'long' }),
    shortDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  };
};

export function DayCard({ day, isToday }: DayCardProps) {
  const { dayName, shortDate } = formatDate(day.date);

  return (
    <div
      className={cn(
        'rounded-2xl bg-card shadow-soft overflow-hidden transition-all duration-300 hover:shadow-medium',
        isToday && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
      )}
    >
      <div
        className={cn(
          'px-4 py-3 border-b border-border',
          isToday ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}
      >
        <p className={cn('font-display font-semibold', isToday ? 'text-primary-foreground' : 'text-foreground')}>
          {dayName}
        </p>
        <p className={cn('text-sm', isToday ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
          {shortDate}
        </p>
      </div>
      <div className="p-3 space-y-2">
        {day.meals.map((meal, idx) => (
          <MealCard key={`${meal.meal_type}-${idx}`} meal={meal} />
        ))}
      </div>
    </div>
  );
}

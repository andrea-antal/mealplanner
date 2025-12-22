import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Day } from '@/lib/api';

// Meal type emoji mapping
const mealTypeIcons: Record<string, string> = {
  Breakfast: '🍳',
  Lunch: '🥗',
  Dinner: '🍽️',
  Snack: '🍎',
};

/**
 * MOCKUP: New Meal Plans UI Design
 *
 * Features:
 * - Week selector at top (clickable days)
 * - Single day view with left/right navigation
 * - Arrows conditionally visible (Monday = right only, Sunday = left only)
 * - Week starts on Monday
 */

// Helper to get next Monday's date
const getNextMonday = () => {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const daysUntilMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : 8 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + daysUntilMonday);
  return monday;
};

// Generate dates for Monday-Sunday week
const generateWeekDates = () => {
  const monday = getNextMonday();
  const dates: string[] = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    dates.push(date.toISOString().split('T')[0]);
  }

  return dates;
};

const weekDates = generateWeekDates();

// Mock data for demonstration - Week starts MONDAY
const mockMealPlan = {
  week_start_date: weekDates[0], // Monday
  days: [
    {
      date: weekDates[0], // Monday
      meals: [
        { meal_type: 'Breakfast', recipe_title: 'Scrambled Eggs & Toast', recipe_id: '1' },
        { meal_type: 'Lunch', recipe_title: 'Caesar Salad', recipe_id: '2' },
        { meal_type: 'Dinner', recipe_title: 'Grilled Chicken & Veggies', recipe_id: '3' },
      ],
    },
    {
      date: weekDates[1], // Tuesday
      meals: [
        { meal_type: 'Breakfast', recipe_title: 'Oatmeal with Berries', recipe_id: '4' },
        { meal_type: 'Lunch', recipe_title: 'Turkey Sandwich', recipe_id: '5' },
        { meal_type: 'Dinner', recipe_title: 'Pasta Primavera', recipe_id: '6' },
      ],
    },
    {
      date: weekDates[2], // Wednesday
      meals: [
        { meal_type: 'Breakfast', recipe_title: 'Greek Yogurt Parfait', recipe_id: '7' },
        { meal_type: 'Lunch', recipe_title: 'Chicken Wrap', recipe_id: '8' },
        { meal_type: 'Dinner', recipe_title: 'Beef Stir Fry', recipe_id: '9' },
      ],
    },
    {
      date: weekDates[3], // Thursday
      meals: [
        { meal_type: 'Breakfast', recipe_title: 'Pancakes', recipe_id: '10' },
        { meal_type: 'Lunch', recipe_title: 'Tomato Soup & Grilled Cheese', recipe_id: '11' },
        { meal_type: 'Dinner', recipe_title: 'Salmon with Rice', recipe_id: '12' },
      ],
    },
    {
      date: weekDates[4], // Friday
      meals: [
        { meal_type: 'Breakfast', recipe_title: 'Smoothie Bowl', recipe_id: '13' },
        { meal_type: 'Lunch', recipe_title: 'Quinoa Salad', recipe_id: '14' },
        { meal_type: 'Dinner', recipe_title: 'Tacos', recipe_id: '15' },
      ],
    },
    {
      date: weekDates[5], // Saturday
      meals: [
        { meal_type: 'Breakfast', recipe_title: 'French Toast', recipe_id: '16' },
        { meal_type: 'Lunch', recipe_title: 'BLT Sandwich', recipe_id: '17' },
        { meal_type: 'Dinner', recipe_title: 'Pizza Night', recipe_id: '18' },
      ],
    },
    {
      date: weekDates[6], // Sunday
      meals: [
        { meal_type: 'Breakfast', recipe_title: 'Breakfast Burrito', recipe_id: '19' },
        { meal_type: 'Lunch', recipe_title: 'Cobb Salad', recipe_id: '20' },
        { meal_type: 'Dinner', recipe_title: 'Roast Chicken & Potatoes', recipe_id: '21' },
      ],
    },
  ] as Day[],
};

const MealPlansMockup = () => {
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  const formatDate = (dateString: string): { dayName: string; shortDate: string; dayOfWeek: string } => {
    const date = new Date(dateString);
    return {
      dayName: date.toLocaleDateString('en-US', { weekday: 'long' }),
      shortDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'short' }),
    };
  };

  const selectedDay = mockMealPlan.days[selectedDayIndex];
  const { dayName, shortDate } = formatDate(selectedDay.date);

  // Navigation helpers
  const isMonday = selectedDayIndex === 0;
  const isSunday = selectedDayIndex === 6;

  const handlePrevDay = () => {
    if (selectedDayIndex > 0) {
      setSelectedDayIndex(selectedDayIndex - 1);
    }
  };

  const handleNextDay = () => {
    if (selectedDayIndex < 6) {
      setSelectedDayIndex(selectedDayIndex + 1);
    }
  };

  return (
    <div className="space-y-8">
      {/* Mockup Banner */}
      <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border-2 border-blue-300 dark:border-blue-700">
        <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
          🎨 MOCKUP: Proposed New Meal Plans Layout
        </p>
        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
          Week selector at top, single day view with arrow navigation, Monday-Sunday week structure
        </p>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Weekly Meal Plan
          </h1>
          <p className="text-muted-foreground mt-1">
            Week of {new Date(mockMealPlan.week_start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>

        <Button variant="hero">
          <Sparkles className="h-4 w-4" />
          Generate New Plan
        </Button>
      </div>

      {/* Week Selector - Horizontal Days */}
      <div className="rounded-2xl bg-card shadow-soft p-4">
        <div className="grid grid-cols-7 gap-2">
          {mockMealPlan.days.map((day, index) => {
            const { dayOfWeek, shortDate } = formatDate(day.date);
            const isSelected = index === selectedDayIndex;
            const today = new Date().toISOString().split('T')[0];
            const isToday = day.date === today;

            return (
              <button
                key={day.date}
                onClick={() => setSelectedDayIndex(index)}
                className={cn(
                  'flex flex-col items-center justify-center p-3 rounded-lg transition-all duration-200',
                  'hover:bg-muted cursor-pointer',
                  isSelected && 'bg-primary text-primary-foreground hover:bg-primary',
                  isToday && !isSelected && 'ring-2 ring-primary ring-offset-2'
                )}
              >
                <p className={cn(
                  'text-xs font-medium uppercase tracking-wide mb-1',
                  isSelected ? 'text-primary-foreground' : 'text-muted-foreground'
                )}>
                  {dayOfWeek}
                </p>
                <p className={cn(
                  'text-sm font-semibold',
                  isSelected ? 'text-primary-foreground' : 'text-foreground'
                )}>
                  {shortDate.split(' ')[1]}
                </p>
                {isToday && !isSelected && (
                  <div className="h-1 w-1 rounded-full bg-primary mt-1" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Day View with Navigation Arrows */}
      <div className="relative">
        <div className="flex items-center gap-4">
          {/* Left Arrow - Hidden on Monday */}
          <div className="shrink-0">
            {!isMonday && (
              <Button
                variant="outline"
                size="icon"
                onClick={handlePrevDay}
                className="h-12 w-12 rounded-full"
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
            )}
            {isMonday && <div className="h-12 w-12" />}
          </div>

          {/* Day Card - Full Width */}
          <div className="flex-1">
            <div className="rounded-2xl bg-card shadow-soft overflow-hidden">
              {/* Day Header */}
              <div className="px-6 py-4 bg-primary text-primary-foreground">
                <p className="font-display text-2xl font-semibold">
                  {dayName}
                </p>
                <p className="text-sm text-primary-foreground/80 mt-1">
                  {shortDate}
                </p>
              </div>

              {/* Meals */}
              <div className="p-6 space-y-3">
                {selectedDay.meals.map((meal, idx) => (
                  <div
                    key={`${meal.meal_type}-${idx}`}
                    className="rounded-lg bg-muted/50 p-4 hover:bg-muted transition-colors cursor-pointer"
                  >
                    <p className="text-base font-medium text-foreground">
                      <span className="mr-2">{mealTypeIcons[meal.meal_type]}</span>
                      <span className="text-muted-foreground">{meal.meal_type}:</span>
                      {' '}
                      {meal.recipe_title}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Arrow - Hidden on Sunday */}
          <div className="shrink-0">
            {!isSunday && (
              <Button
                variant="outline"
                size="icon"
                onClick={handleNextDay}
                className="h-12 w-12 rounded-full"
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            )}
            {isSunday && <div className="h-12 w-12" />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MealPlansMockup;

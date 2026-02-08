import { useState, useCallback, useEffect, useRef } from 'react';
import { MealPlanGrid, type MealPlanDay } from '@/components/MealPlanGrid';
import { cn } from '@/lib/utils';

// Mock meal data for 7 days
const MOCK_DAYS: MealPlanDay[] = [
  {
    date: '2024-02-05', // Monday
    meals: [
      { meal_type: 'Breakfast', recipe_title: 'Overnight Oats with Berries', for_who: 'everyone' },
      { meal_type: 'Lunch', recipe_title: 'Chicken Stir Fry', for_who: 'Adults' },
      { meal_type: 'Lunch', recipe_title: 'Mac and Cheese', for_who: 'Kids', is_daycare: true },
      { meal_type: 'Dinner', recipe_title: 'Salmon with Roasted Vegetables', for_who: 'everyone' },
    ],
  },
  {
    date: '2024-02-06', // Tuesday
    meals: [
      { meal_type: 'Breakfast', recipe_title: 'Smoothie Bowl', for_who: 'everyone' },
      { meal_type: 'Lunch', recipe_title: 'Turkey Sandwich', for_who: 'everyone' },
      { meal_type: 'Dinner', recipe_title: 'Pasta Primavera', for_who: 'everyone' },
    ],
  },
  {
    date: '2024-02-07', // Wednesday
    meals: [
      { meal_type: 'Breakfast', recipe_title: 'Avocado Toast', for_who: 'everyone' },
      { meal_type: 'Lunch', recipe_title: 'Greek Salad', for_who: 'Adults' },
      { meal_type: 'Lunch', recipe_title: 'PB&J Sandwich', for_who: 'Kids', is_daycare: true },
      { meal_type: 'Dinner', recipe_title: 'Beef Tacos', for_who: 'everyone' },
      { meal_type: 'Snack', recipe_title: 'Apple Slices with Peanut Butter' },
    ],
  },
  {
    date: '2024-02-08', // Thursday
    meals: [
      { meal_type: 'Breakfast', recipe_title: 'Scrambled Eggs', for_who: 'everyone' },
      { meal_type: 'Lunch', recipe_title: 'Leftover Tacos', for_who: 'everyone' },
      { meal_type: 'Dinner', recipe_title: 'Grilled Chicken Caesar Salad', for_who: 'everyone' },
    ],
  },
  {
    date: '2024-02-09', // Friday
    meals: [
      { meal_type: 'Breakfast', recipe_title: 'French Toast', for_who: 'everyone' },
      { meal_type: 'Lunch', recipe_title: 'Veggie Wrap', for_who: 'everyone' },
      { meal_type: 'Dinner', recipe_title: 'Pizza Night', for_who: 'everyone' },
    ],
  },
  {
    date: '2024-02-10', // Saturday
    meals: [
      { meal_type: 'Breakfast', recipe_title: 'Pancakes with Maple Syrup', for_who: 'everyone' },
      { meal_type: 'Lunch', recipe_title: 'Eating out' },
      { meal_type: 'Dinner', recipe_title: 'Homemade Burgers', for_who: 'everyone' },
    ],
  },
  {
    date: '2024-02-11', // Sunday
    meals: [
      { meal_type: 'Breakfast', recipe_title: 'Belgian Waffles', for_who: 'everyone' },
      { meal_type: 'Lunch', recipe_title: 'Chicken Noodle Soup', for_who: 'everyone' },
      { meal_type: 'Dinner', recipe_title: 'Sunday Roast Chicken', for_who: 'everyone' },
      { meal_type: 'Snack', recipe_title: 'Carrot Sticks with Hummus' },
    ],
  },
];

// Breakpoint markers with labels
const BREAKPOINTS = [
  { width: 1200, label: '1200px', description: 'Current 3-day threshold' },
  { width: 1400, label: '1400px', description: 'Current container max' },
  { width: 1600, label: '1600px', description: 'Comfortable 5-day' },
  { width: 1920, label: '1920px', description: 'Full HD / 7-day candidate' },
];

type DayCountOption = 3 | 5 | 7 | 'auto';

const MealPlanPlayground = () => {
  const [containerWidth, setContainerWidth] = useState(1400);
  const [dayOverride, setDayOverride] = useState<DayCountOption>('auto');
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const minWidth = 800;
  const maxWidth = 2400;

  // Handle resize drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      // Calculate width from container left edge to mouse position
      const newWidth = e.clientX - rect.left;
      setContainerWidth(Math.min(maxWidth, Math.max(minWidth, newWidth)));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Calculate which breakpoint we're at
  const currentBreakpointLabel = (() => {
    for (let i = BREAKPOINTS.length - 1; i >= 0; i--) {
      if (containerWidth >= BREAKPOINTS[i].width) {
        return BREAKPOINTS[i].label;
      }
    }
    return '< 1200px';
  })();

  // Calculate auto day count for display
  const autoVisibleDays = (() => {
    if (containerWidth >= 1920) return 7;
    if (containerWidth >= 1600) return 5;
    if (containerWidth >= 1200) return 3;
    if (containerWidth >= 1000) return 2;
    return 1;
  })();

  const dayCountOptions: { value: DayCountOption; label: string }[] = [
    { value: 'auto', label: `Auto (${autoVisibleDays})` },
    { value: 3, label: '3 days' },
    { value: 5, label: '5 days' },
    { value: 7, label: '7 days' },
  ];

  return (
    <div className="min-h-screen bg-background p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground">
          Meal Plan Viewport Playground
        </h1>
        <p className="text-muted-foreground mt-1">
          Drag the right edge to resize and test breakpoints
        </p>
      </div>

      {/* Controls */}
      <div className="mb-6 p-4 bg-card rounded-xl shadow-soft">
        <div className="flex flex-wrap items-center gap-6">
          {/* Width display */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Width:</span>
            <span className="font-mono text-lg font-semibold text-foreground">
              {containerWidth}px
            </span>
            <span className="text-xs text-muted-foreground">
              ({currentBreakpointLabel})
            </span>
          </div>

          {/* Day count override */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Days:</span>
            <div className="flex gap-1">
              {dayCountOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setDayOverride(option.value)}
                  className={cn(
                    'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
                    dayOverride === option.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick width presets */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-muted-foreground">Quick:</span>
            <div className="flex gap-1">
              {BREAKPOINTS.map((bp) => (
                <button
                  key={bp.width}
                  onClick={() => setContainerWidth(bp.width)}
                  className={cn(
                    'px-2 py-1 text-xs font-medium rounded transition-colors',
                    containerWidth === bp.width
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  )}
                  title={bp.description}
                >
                  {bp.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Breakpoint ruler */}
      <div className="mb-4 relative h-8">
        <div className="absolute left-0 right-0 h-1 bg-muted rounded top-1/2 -translate-y-1/2" />
        {BREAKPOINTS.map((bp) => {
          const position = ((bp.width - minWidth) / (maxWidth - minWidth)) * 100;
          const isActive = containerWidth >= bp.width;
          return (
            <div
              key={bp.width}
              className="absolute top-0 bottom-0 flex flex-col items-center"
              style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
            >
              <div
                className={cn(
                  'w-0.5 h-full transition-colors',
                  isActive ? 'bg-primary' : 'bg-muted-foreground/30'
                )}
              />
              <span
                className={cn(
                  'absolute -bottom-5 text-xs whitespace-nowrap transition-colors',
                  isActive ? 'text-primary font-medium' : 'text-muted-foreground'
                )}
              >
                {bp.label}
              </span>
            </div>
          );
        })}
        {/* Current position indicator */}
        <div
          className="absolute top-0 bottom-0 flex flex-col items-center z-10"
          style={{
            left: `${((containerWidth - minWidth) / (maxWidth - minWidth)) * 100}%`,
            transform: 'translateX(-50%)',
          }}
        >
          <div className="w-2 h-2 rounded-full bg-primary shadow-lg" />
        </div>
      </div>

      {/* Resizable container */}
      <div
        ref={containerRef}
        className="relative border-2 border-dashed border-primary/30 rounded-xl overflow-hidden bg-background"
        style={{ width: `${containerWidth}px` }}
      >
        {/* Grid content */}
        <div className="p-6">
          <MealPlanGrid
            days={MOCK_DAYS}
            visibleDays={dayOverride}
            containerWidth={containerWidth}
          />
        </div>

        {/* Resize handle */}
        <div
          className={cn(
            'absolute right-0 top-0 bottom-0 w-4 cursor-ew-resize transition-colors',
            'bg-primary/20 hover:bg-primary/40',
            'flex items-center justify-center',
            isDragging && 'bg-primary/50'
          )}
          onMouseDown={handleMouseDown}
        >
          <div className="w-1 h-8 bg-primary/60 rounded-full" />
        </div>
      </div>

      {/* Footer info */}
      <div className="mt-8 p-4 bg-muted/50 rounded-xl text-sm text-muted-foreground">
        <p className="font-medium text-foreground mb-2">Suggested breakpoints:</p>
        <ul className="space-y-1">
          {BREAKPOINTS.map((bp) => (
            <li key={bp.width} className="flex gap-2">
              <span className="font-mono">{bp.label}:</span>
              <span>{bp.description}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default MealPlanPlayground;

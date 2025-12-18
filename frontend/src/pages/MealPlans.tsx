import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { DayCard } from '@/components/DayCard';
import { mealPlansAPI, type MealPlan } from '@/lib/api';
import { Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const MEAL_PLAN_STORAGE_KEY = 'mealplanner_current_meal_plan';

const MealPlans = () => {
  // Load meal plan from localStorage on mount
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(() => {
    const stored = localStorage.getItem(MEAL_PLAN_STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse stored meal plan:', e);
        return null;
      }
    }
    return null;
  });

  // Save meal plan to localStorage whenever it changes
  useEffect(() => {
    if (mealPlan) {
      localStorage.setItem(MEAL_PLAN_STORAGE_KEY, JSON.stringify(mealPlan));
    }
  }, [mealPlan]);

  // Mutation to generate meal plan
  const generateMutation = useMutation({
    mutationFn: (week_start_date: string) =>
      mealPlansAPI.generate({ week_start_date, num_recipes: 7 }),
    onSuccess: (generatedPlan) => {
      setMealPlan(generatedPlan);
      toast.success('Meal plan generated!', {
        description: 'Your personalized 7-day meal plan is ready.',
      });
    },
    onError: (error: Error) => {
      toast.error(`Failed to generate meal plan: ${error.message}`);
    },
  });

  const handleGenerate = () => {
    // Get next Monday's date for the meal plan
    const today = new Date();
    const nextMonday = new Date(today);
    const dayOfWeek = today.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek; // 0 = Sunday
    nextMonday.setDate(today.getDate() + daysUntilMonday);

    const weekStartDate = nextMonday.toISOString().split('T')[0];
    generateMutation.mutate(weekStartDate);
  };

  // Check if today is within the meal plan week
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Weekly Meal Plan
          </h1>
          {mealPlan && (
            <p className="text-muted-foreground mt-1">
              Week of {new Date(mealPlan.week_start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {/* TODO: Export and Print buttons hidden - will be implemented in future sprint */}
          <Button
            variant="hero"
            onClick={handleGenerate}
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate New Plan
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      {mealPlan ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {mealPlan.days.map((day) => (
            <DayCard
              key={day.date}
              day={day}
              isToday={day.date === today}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl bg-card py-16 text-center shadow-soft">
          <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-2">No meal plan yet</p>
          <p className="text-sm text-muted-foreground mb-4">
            Click "Generate New Plan" to create your personalized weekly meal plan
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="rounded-2xl bg-card p-6 shadow-soft">
        <h3 className="font-display font-semibold text-foreground mb-4">
          Meal Types
        </h3>
        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-2">
            <div className="h-4 w-1 rounded-full bg-tag-breakfast" />
            <span className="text-sm text-muted-foreground">🍳 Breakfast</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-1 rounded-full bg-tag-daycare" />
            <span className="text-sm text-muted-foreground">🥗 Lunch</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-1 rounded-full bg-primary" />
            <span className="text-sm text-muted-foreground">🍽️ Dinner</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-1 rounded-full bg-tag-quick" />
            <span className="text-sm text-muted-foreground">🍎 Snack</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MealPlans;

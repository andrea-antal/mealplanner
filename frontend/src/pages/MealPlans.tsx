import { useState, useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { mealPlansAPI, recipesAPI, type MealPlan, type Recipe } from '@/lib/api';
import { getCurrentWorkspace } from '@/lib/workspace';
import { Sparkles, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { RecipeModal } from '@/components/RecipeModal';
import { GenerateFromTitleModal } from '@/components/GenerateFromTitleModal';
import { MealPlanGenerationModal } from '@/components/MealPlanGenerationModal';

// Meal type emoji mapping (lowercase to match API data)
const mealTypeIcons: Record<string, string> = {
  breakfast: '🍳',
  lunch: '🥗',
  dinner: '🍽️',
  snack: '🍎',
};

const MealPlans = () => {
  const navigate = useNavigate();
  const workspaceId = getCurrentWorkspace();

  // Redirect to home if no workspace is set (defense in depth)
  useEffect(() => {
    if (!workspaceId) {
      navigate('/');
    }
  }, [workspaceId, navigate]);

  // Don't render if no workspace
  if (!workspaceId) {
    return null;
  }

  // Load meal plan from localStorage on mount (scoped to workspace)
  const MEAL_PLAN_STORAGE_KEY = `mealplanner_${workspaceId}_meal_plan`;

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

  // Selected day index (0 = Monday, 6 = Sunday)
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  // Day picker scroll state for position indicator dots
  const dayPickerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0); // 0, 1, or 2 for dot position

  const handleDayPickerScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollLeft, scrollWidth, clientWidth } = e.currentTarget;
    const maxScroll = scrollWidth - clientWidth;
    const progress = maxScroll > 0 ? Math.round((scrollLeft / maxScroll) * 2) : 0;
    setScrollProgress(progress);
  };

  // Track viewport width for multi-day desktop view
  const [visibleDayCount, setVisibleDayCount] = useState(1);

  useEffect(() => {
    const updateVisibleDayCount = () => {
      const width = window.innerWidth;
      if (width >= 1500) {
        setVisibleDayCount(3);
      } else if (width >= 1000) {
        setVisibleDayCount(2);
      } else {
        setVisibleDayCount(1);
      }
    };

    updateVisibleDayCount();
    window.addEventListener('resize', updateVisibleDayCount);
    return () => window.removeEventListener('resize', updateVisibleDayCount);
  }, []);

  // Calculate actual visible days (clamp at end of week)
  const actualVisibleCount = Math.min(visibleDayCount, 7 - selectedDayIndex);
  const visibleDayIndices = Array.from(
    { length: actualVisibleCount },
    (_, i) => selectedDayIndex + i
  );

  // Recipe modal state
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [recipeModalOpen, setRecipeModalOpen] = useState(false);
  const [loadingRecipeId, setLoadingRecipeId] = useState<string | null>(null);

  // Generate recipe modal state
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [generateMealType, setGenerateMealType] = useState<string>('');
  const [generateRecipeTitle, setGenerateRecipeTitle] = useState<string>('');
  const [generateMealContext, setGenerateMealContext] = useState<{
    dayIndex: number;
    mealIndex: number;
  } | null>(null);

  // Meal plan generation modal state
  const [generationModalOpen, setGenerationModalOpen] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Save meal plan to localStorage whenever it changes
  useEffect(() => {
    if (mealPlan) {
      localStorage.setItem(MEAL_PLAN_STORAGE_KEY, JSON.stringify(mealPlan));
    }
  }, [mealPlan]);

  // Mutation to generate meal plan
  const generateMutation = useMutation({
    mutationFn: async (week_start_date: string) => {
      // Create new AbortController for this request
      abortControllerRef.current = new AbortController();

      try {
        const result = await mealPlansAPI.generate(
          workspaceId,
          { week_start_date, num_recipes: 7 },
          { signal: abortControllerRef.current.signal }
        );
        return result;
      } catch (error) {
        // If aborted, don't throw error
        if (error instanceof Error && error.name === 'AbortError') {
          return null;
        }
        throw error;
      }
    },
    onMutate: () => {
      // Show progress modal before starting
      setGenerationModalOpen(true);
    },
    onSuccess: (generatedPlan) => {
      setGenerationModalOpen(false);

      if (generatedPlan) {
        setMealPlan(generatedPlan);
        toast.success('Meal plan generated!', {
          description: 'Your personalized 7-day meal plan is ready.',
        });
      }
    },
    onError: (error: Error) => {
      setGenerationModalOpen(false);
      toast.error(`Failed to generate meal plan: ${error.message}`);
    },
  });

  const handleGenerate = () => {
    // Get next Monday's date for the meal plan
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek; // 0 = Sunday

    console.log('🔍 DEBUG:');
    console.log('  Today:', today.toDateString(), '- day of week:', dayOfWeek, ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek]);
    console.log('  Days until Monday:', daysUntilMonday);

    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + daysUntilMonday);

    console.log('  Next Monday:', nextMonday.toDateString(), '- day of week:', nextMonday.getDay());

    // Format date in local time (avoid timezone issues with toISOString)
    const year = nextMonday.getFullYear();
    const month = String(nextMonday.getMonth() + 1).padStart(2, '0');
    const day = String(nextMonday.getDate()).padStart(2, '0');
    const weekStartDate = `${year}-${month}-${day}`;

    console.log('  Formatted date:', weekStartDate);
    console.log('✅ Generating meal plan for week starting:', weekStartDate);
    generateMutation.mutate(weekStartDate);
  };

  // Check if today is within the meal plan week
  const today = new Date().toISOString().split('T')[0];

  // Helper to format date
  const formatDate = (dateString: string): { dayName: string; shortDate: string; dayOfWeek: string } => {
    // Parse as local time, not UTC (avoid timezone shift)
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month is 0-indexed
    return {
      dayName: date.toLocaleDateString('en-US', { weekday: 'long' }),
      shortDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'short' }),
    };
  };

  // Handle recipe click
  const handleRecipeClick = async (recipeId: string) => {
    if (!recipeId) return;

    setLoadingRecipeId(recipeId);
    try {
      const recipe = await recipesAPI.getById(workspaceId, recipeId);
      setSelectedRecipe(recipe);
      setRecipeModalOpen(true);
    } catch (error) {
      toast.error('Failed to load recipe details');
      console.error('Error loading recipe:', error);
    } finally {
      setLoadingRecipeId(null);
    }
  };

  // Handle generate recipe click
  const handleGenerateClick = (
    mealType: string,
    recipeTitle: string,
    dayIndex: number,
    mealIndex: number
  ) => {
    setGenerateMealType(mealType);
    setGenerateRecipeTitle(recipeTitle);
    setGenerateMealContext({ dayIndex, mealIndex });
    setGenerateModalOpen(true);
  };

  // Handle recipe generated - update meal plan with new recipe_id
  const handleRecipeGenerated = async (recipeId: string) => {
    try {
      const recipe = await recipesAPI.getById(workspaceId, recipeId);

      // Update the meal plan to link this recipe to the meal
      if (mealPlan && generateMealContext) {
        const updatedPlan = { ...mealPlan };
        const { dayIndex, mealIndex } = generateMealContext;

        if (updatedPlan.days[dayIndex]?.meals[mealIndex]) {
          updatedPlan.days[dayIndex].meals[mealIndex].recipe_id = recipeId;
          setMealPlan(updatedPlan);
          toast.success('Meal plan updated with new recipe!');
        }
      }

      // Show the recipe modal
      setSelectedRecipe(recipe);
      setRecipeModalOpen(true);
    } catch (error) {
      toast.error('Failed to load generated recipe');
      console.error('Error loading generated recipe:', error);
    }
  };

  // Handle closing generation modal (continues in background)
  const handleCloseGenerationModal = () => {
    setGenerationModalOpen(false);
    toast.info('Generation continuing in background', {
      description: 'You\'ll be notified when your meal plan is ready.',
    });
  };

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

      {/* Meal Plan Content */}
      {mealPlan ? (
        <>
          {/* Week Selector - Pill-Style Day Picker */}
          <div className="rounded-2xl bg-card shadow-soft p-4">
            <div className="relative">
              {/* Scrollable day pills container */}
              <div
                ref={dayPickerRef}
                onScroll={handleDayPickerScroll}
                className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide scroll-smooth md:grid md:grid-cols-7 md:overflow-visible"
              >
                {mealPlan.days.map((day, index) => {
                  const { dayOfWeek, shortDate } = formatDate(day.date);
                  const isSelected = index === selectedDayIndex;
                  const isInVisibleRange = visibleDayIndices.includes(index) && !isSelected;

                  return (
                    <button
                      key={day.date}
                      onClick={() => setSelectedDayIndex(index)}
                      className={cn(
                        'flex flex-col items-center px-4 py-2 rounded-full transition-all duration-200',
                        'min-w-[72px] border-2 cursor-pointer md:min-w-0 md:rounded-lg md:py-3',
                        isSelected
                          ? 'bg-primary text-primary-foreground border-primary hover:bg-primary'
                          : isInVisibleRange
                            ? 'bg-primary/15 border-primary/40 hover:bg-primary/25'
                            : 'bg-transparent border-muted-foreground/30 hover:border-primary/50'
                      )}
                    >
                      <span className={cn(
                        'text-xs font-medium uppercase tracking-wide',
                        isSelected ? 'text-primary-foreground' : 'text-muted-foreground'
                      )}>
                        {dayOfWeek}
                      </span>
                      <span className={cn(
                        'text-sm font-semibold',
                        isSelected
                          ? 'text-primary-foreground'
                          : isInVisibleRange
                            ? 'text-primary'
                            : 'text-foreground'
                      )}>
                        {shortDate.split(' ')[1]}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Left gradient fade indicator - visible when scrolled right (mobile only) */}
              <div
                className={cn(
                  "absolute left-0 top-0 bottom-3 w-12 bg-gradient-to-r from-card to-transparent pointer-events-none md:hidden transition-opacity duration-200",
                  scrollProgress > 0 ? "opacity-100" : "opacity-0"
                )}
              />

              {/* Right gradient fade indicator - visible when more content to the right (mobile only) */}
              <div
                className={cn(
                  "absolute right-0 top-0 bottom-3 w-12 bg-gradient-to-l from-card to-transparent pointer-events-none md:hidden transition-opacity duration-200",
                  scrollProgress < 2 ? "opacity-100" : "opacity-0"
                )}
              />
            </div>

            {/* Scroll position dots (mobile only) */}
            <div className="flex justify-center gap-1.5 mt-1 md:hidden">
              {[0, 1, 2].map((dotIndex) => (
                <div
                  key={dotIndex}
                  className={cn(
                    'w-1.5 h-1.5 rounded-full transition-colors duration-200',
                    scrollProgress === dotIndex ? 'bg-primary' : 'bg-muted-foreground/30'
                  )}
                />
              ))}
            </div>
          </div>

          {/* Day View - Responsive Grid (1-3 days) */}
          <div
            className="grid gap-6"
            style={{
              gridTemplateColumns: `repeat(${actualVisibleCount}, minmax(0, 1fr))`,
            }}
          >
            {visibleDayIndices.map((dayIndex) => {
              const day = mealPlan.days[dayIndex];
              const { dayName, shortDate } = formatDate(day.date);
              const isFirstDay = dayIndex === selectedDayIndex;

              return (
                <div
                  key={day.date}
                  className={cn(
                    "rounded-2xl bg-card shadow-soft overflow-hidden",
                    !isFirstDay && "opacity-95"
                  )}
                >
                  {/* Day Header */}
                  <div className={cn(
                    "px-6 py-4",
                    isFirstDay
                      ? "bg-primary text-primary-foreground"
                      : "bg-primary/80 text-primary-foreground"
                  )}>
                    <p className="font-display text-2xl font-semibold">
                      {dayName}
                    </p>
                    <p className={cn(
                      "text-sm mt-1",
                      isFirstDay ? "text-primary-foreground/80" : "text-primary-foreground/70"
                    )}>
                      {shortDate}
                    </p>
                  </div>

                  {/* Meals */}
                  <div className="p-6 space-y-3">
                    {day.meals.map((meal, mealIdx) => (
                      <div
                        key={`${meal.meal_type}-${mealIdx}`}
                        className={cn(
                          "rounded-lg bg-muted/50 p-4 transition-colors flex items-center justify-between gap-3",
                          meal.recipe_id && "hover:bg-muted cursor-pointer"
                        )}
                        onClick={() => meal.recipe_id && handleRecipeClick(meal.recipe_id)}
                      >
                        <p className="text-base font-medium text-foreground flex-1">
                          <span className="mr-2">{mealTypeIcons[meal.meal_type.toLowerCase()]}</span>
                          <span className="text-muted-foreground capitalize">{meal.meal_type}:</span>
                          {' '}
                          {loadingRecipeId && loadingRecipeId === meal.recipe_id ? 'Loading...' : meal.recipe_title}
                        </p>

                        {!meal.recipe_id && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleGenerateClick(
                                meal.meal_type,
                                meal.recipe_title,
                                dayIndex,
                                mealIdx
                              );
                            }}
                            className={cn(
                              "flex-shrink-0 p-2 rounded-full transition-all duration-200",
                              "bg-primary/10 hover:bg-primary/20 text-primary",
                              "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                            )}
                            title="Generate recipe"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl bg-card py-16 text-center shadow-soft">
          <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-2">No meal plan yet</p>
          <p className="text-sm text-muted-foreground mb-4">
            Click "Generate New Plan" to create your personalized weekly meal plan
          </p>
        </div>
      )}

      {/* Recipe Modal */}
      <RecipeModal
        recipe={selectedRecipe}
        open={recipeModalOpen}
        onOpenChange={setRecipeModalOpen}
      />

      {/* Generate Recipe Modal */}
      <GenerateFromTitleModal
        open={generateModalOpen}
        onOpenChange={setGenerateModalOpen}
        recipeTitle={generateRecipeTitle}
        mealType={generateMealType}
        onRecipeGenerated={handleRecipeGenerated}
      />

      {/* Meal Plan Generation Progress Modal */}
      <MealPlanGenerationModal
        open={generationModalOpen}
        onClose={handleCloseGenerationModal}
      />
    </div>
  );
};

export default MealPlans;

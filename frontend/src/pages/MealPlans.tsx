import { useState, useEffect, useRef, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { startOfWeek, addDays, format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { mealPlansAPI, recipesAPI, onboardingAPI, type MealPlan, type Recipe, type AlternativeRecipeSuggestion } from '@/lib/api';
import { getCurrentWorkspace } from '@/lib/workspace';
import { Sparkles, Loader2, Plus, RefreshCw, Undo2, ChevronLeft, ChevronRight, Download, Trash2, GripVertical } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { RecipeModal } from '@/components/RecipeModal';
import { GenerateFromTitleModal } from '@/components/GenerateFromTitleModal';
import { MealPlanGenerationModal } from '@/components/MealPlanGenerationModal';
import { SwapRecipeModal } from '@/components/SwapRecipeModal';
import { InsufficientRecipesModal } from '@/components/InsufficientRecipesModal';
import { SaveAllRecipesModal, type SaveAllResult } from '@/components/SaveAllRecipesModal';
import { WeekContextModal } from '@/components/WeekContextModal';
import { RecipePickerModal } from '@/components/RecipePickerModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Meal type emoji mapping (lowercase to match API data)
const mealTypeIcons: Record<string, string> = {
  breakfast: '🍳',
  lunch: '🥗',
  dinner: '🍽️',
  snack: '🍪',
};

// Sortable meal item component
interface SortableMealProps {
  id: string;
  meal: {
    meal_type: string;
    recipe_id: string | null;
    recipe_title: string;
    for_who: string;
    is_daycare?: boolean;
    previous_recipe_title?: string | null;
  };
  dayIndex: number;
  mealIdx: number;
  isClickable: boolean;
  hasRecipe: boolean;
  isAIGenerated: boolean;
  loadingRecipeId: string | null;
  onRecipeClick: (recipeId: string) => void;
  onAITitleClick: (dayIndex: number, mealIdx: number, mealType: string, recipeTitle: string) => void;
  onSwapClick: (dayIndex: number, mealIdx: number, mealType: string, recipeTitle: string) => void;
  onUndoSwap: (dayIndex: number, mealIdx: number) => void;
  onRemoveClick: (dayIndex: number, mealIdx: number, mealType: string, recipeTitle: string) => void;
  isUndoPending: boolean;
  isRemovePending: boolean;
}

const SortableMeal = ({
  id,
  meal,
  dayIndex,
  mealIdx,
  isClickable,
  hasRecipe,
  isAIGenerated,
  loadingRecipeId,
  onRecipeClick,
  onAITitleClick,
  onSwapClick,
  onUndoSwap,
  onRemoveClick,
  isUndoPending,
  isRemovePending,
}: SortableMealProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 200ms cubic-bezier(0.25, 1, 0.5, 1)',
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 1 : 0,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-lg bg-muted/50 p-4 transition-colors flex items-center gap-3",
        isClickable && "hover:bg-muted",
        isDragging && "shadow-lg ring-2 ring-primary"
      )}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 -ml-2 text-muted-foreground hover:text-foreground touch-none"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Meal content - clickable area */}
      <div
        className={cn("flex-1 min-w-0", isClickable && "cursor-pointer")}
        onClick={() => {
          if (hasRecipe && meal.recipe_id) {
            onRecipeClick(meal.recipe_id);
          } else if (isAIGenerated) {
            onAITitleClick(dayIndex, mealIdx, meal.meal_type, meal.recipe_title);
          }
        }}
      >
        <p className="text-base font-medium text-foreground">
          <span className="mr-2">{mealTypeIcons[meal.meal_type.toLowerCase()]}</span>
          <span className="text-muted-foreground capitalize">{meal.meal_type}:</span>
          {' '}
          {loadingRecipeId && loadingRecipeId === meal.recipe_id ? 'Loading...' : meal.recipe_title}
          {(() => {
            const isForEveryone = !meal.for_who || meal.for_who === 'everyone' || meal.for_who.includes(',');
            const showTag = meal.is_daycare || !isForEveryone;
            if (!showTag) return null;
            return (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                {!isForEveryone ? meal.for_who : ''}
                {meal.is_daycare ? (!isForEveryone ? ' - Daycare' : 'Daycare') : ''}
              </span>
            );
          })()}
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Undo button */}
        {meal.previous_recipe_title && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUndoSwap(dayIndex, mealIdx);
            }}
            disabled={isUndoPending}
            className={cn(
              "p-2 rounded-full transition-all duration-200",
              "bg-amber-500/10 hover:bg-amber-500/20 text-amber-600",
              "focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2",
              "disabled:opacity-50"
            )}
            title={`Undo: restore "${meal.previous_recipe_title}"`}
          >
            <Undo2 className="h-4 w-4" />
          </button>
        )}

        {/* Swap button - only for existing recipes */}
        {hasRecipe && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSwapClick(dayIndex, mealIdx, meal.meal_type, meal.recipe_title);
            }}
            className={cn(
              "p-2 rounded-full transition-all duration-200",
              "bg-primary/10 hover:bg-primary/20 text-primary",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            )}
            title="Swap with different recipe"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        )}

        {/* Remove button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemoveClick(dayIndex, mealIdx, meal.meal_type, meal.recipe_title);
          }}
          disabled={isRemovePending}
          className={cn(
            "p-2 rounded-full transition-all duration-200",
            "bg-red-500/10 hover:bg-red-500/20 text-red-600",
            "focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2",
            "disabled:opacity-50"
          )}
          title="Remove meal"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

const MealPlans = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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

  // Fetch most recent meal plan from backend
  const { data: mealPlans, isLoading: isLoadingMealPlans } = useQuery({
    queryKey: ['meal-plans', workspaceId],
    queryFn: () => mealPlansAPI.getAll(workspaceId),
    enabled: !!workspaceId,
  });

  // Fetch onboarding status for smart routing in insufficient recipes modal
  const { data: onboardingStatus } = useQuery({
    queryKey: ['onboardingStatus', workspaceId],
    queryFn: () => onboardingAPI.getStatus(workspaceId),
    enabled: !!workspaceId,
  });

  // Fetch existing recipes for duplicate checking in save all
  const { data: existingRecipes } = useQuery({
    queryKey: ['recipes', workspaceId],
    queryFn: () => recipesAPI.getAll(workspaceId),
    enabled: !!workspaceId,
  });

  // Use most recent meal plan (first in list, sorted by date desc)
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);

  // Sync state with fetched data
  useEffect(() => {
    if (mealPlans && mealPlans.length > 0) {
      setMealPlan(mealPlans[0]);
    }
  }, [mealPlans]);

  // Date for generating empty week structure (defaults to today)
  const [selectedDate] = useState(() => new Date());

  // Create empty week structure when no meal plan exists
  const emptyWeekPlan = useMemo(() => {
    if (mealPlan) return null;
    const startDate = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Monday start
    return {
      week_start_date: format(startDate, 'yyyy-MM-dd'),
      days: Array.from({ length: 7 }, (_, i) => ({
        date: format(addDays(startDate, i), 'yyyy-MM-dd'),
        meals: [] as Array<{
          meal_type: string;
          recipe_id: string | null;
          recipe_title: string;
          for_who: string;
          is_daycare?: boolean;
          previous_recipe_title?: string | null;
        }>,
      })),
    };
  }, [mealPlan, selectedDate]);

  // Use either the real meal plan or the empty structure for display
  const displayPlan = mealPlan || emptyWeekPlan;

  // Selected day index (0 = Monday, 6 = Sunday)
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  // Navigation helpers
  const canGoPrev = selectedDayIndex > 0;
  const canGoNext = selectedDayIndex < 6;

  // Track viewport width for multi-day desktop view
  const [visibleDayCount, setVisibleDayCount] = useState(1);

  useEffect(() => {
    const updateVisibleDayCount = () => {
      const width = window.innerWidth;
      if (width >= 1200) {
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

  // Swap recipe modal state
  const [swapModalOpen, setSwapModalOpen] = useState(false);
  const [swapContext, setSwapContext] = useState<{
    dayIndex: number;
    mealIndex: number;
    mealType: string;
    currentRecipeTitle: string;
  } | null>(null);

  // Recipe picker modal state (for adding recipes from library)
  const [recipePickerOpen, setRecipePickerOpen] = useState(false);
  const [recipePickerContext, setRecipePickerContext] = useState<{
    dayIndex: number;
    dayLabel: string;
  } | null>(null);

  // Insufficient recipes modal state (V1 empty state handling)
  const [insufficientModalOpen, setInsufficientModalOpen] = useState(false);
  const [insufficientData, setInsufficientData] = useState<{
    totalCount: number;
    missingMealTypes: string[];
  } | null>(null);

  // Save all recipes modal state
  const [saveAllModalOpen, setSaveAllModalOpen] = useState(false);
  const [recipeTitlesToSave, setRecipeTitlesToSave] = useState<string[]>([]);
  const [isSavingRecipes, setIsSavingRecipes] = useState(false);

  // Week context modal state (for describing user's week before generation)
  const [weekContextModalOpen, setWeekContextModalOpen] = useState(false);
  const [pendingWeekStartDate, setPendingWeekStartDate] = useState<string | null>(null);

  // Remove meal confirmation dialog state
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [removeContext, setRemoveContext] = useState<{
    dayIndex: number;
    mealIndex: number;
    mealType: string;
    recipeTitle: string;
    isLastOfType: boolean;
  } | null>(null);

  // Generate recipe confirmation dialog state (for clicking AI-generated titles)
  const [generateConfirmOpen, setGenerateConfirmOpen] = useState(false);
  const [generateConfirmContext, setGenerateConfirmContext] = useState<{
    dayIndex: number;
    mealIndex: number;
    mealType: string;
    recipeTitle: string;
  } | null>(null);

  // Drag and drop state
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [overDayIndex, setOverDayIndex] = useState<number | null>(null);

  // Drop animation config - spring bounce effect
  const dropAnimation = {
    duration: 250,
    easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)', // Slight overshoot for bounce
  };

  // Drag sensors for pointer and keyboard
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before starting drag
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Mutation to generate meal plan
  const generateMutation = useMutation({
    mutationFn: async ({ week_start_date, week_context }: { week_start_date: string; week_context?: string }) => {
      // Create new AbortController for this request
      abortControllerRef.current = new AbortController();

      try {
        const result = await mealPlansAPI.generate(
          workspaceId,
          { week_start_date, num_recipes: 7, week_context },
          { signal: abortControllerRef.current.signal }
        );
        // Save to backend for persistence
        if (result) {
          await mealPlansAPI.save(workspaceId, result);
        }
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

  // Mutation to swap a recipe
  const swapMutation = useMutation({
    mutationFn: async ({
      dayIndex,
      mealIndex,
      newRecipeId,
      newRecipeTitle,
    }: {
      dayIndex: number;
      mealIndex: number;
      newRecipeId: string;
      newRecipeTitle: string;
    }) => {
      if (!mealPlan?.id) throw new Error('No meal plan to swap');
      return mealPlansAPI.swap(workspaceId, mealPlan.id, {
        day_index: dayIndex,
        meal_index: mealIndex,
        new_recipe_id: newRecipeId,
        new_recipe_title: newRecipeTitle,
      });
    },
    onSuccess: (updatedPlan) => {
      setMealPlan(updatedPlan);
      setSwapModalOpen(false);
      toast.success('Recipe swapped!', {
        description: 'You can undo this change if needed.',
      });
    },
    onError: (error: Error) => {
      toast.error(`Failed to swap recipe: ${error.message}`);
    },
  });

  // Mutation to undo a swap
  const undoSwapMutation = useMutation({
    mutationFn: async ({ dayIndex, mealIndex }: { dayIndex: number; mealIndex: number }) => {
      if (!mealPlan?.id) throw new Error('No meal plan');
      return mealPlansAPI.undoSwap(workspaceId, mealPlan.id, {
        day_index: dayIndex,
        meal_index: mealIndex,
      });
    },
    onSuccess: (updatedPlan) => {
      setMealPlan(updatedPlan);
      toast.success('Swap undone!', {
        description: 'Original recipe restored.',
      });
    },
    onError: (error: Error) => {
      toast.error(`Failed to undo swap: ${error.message}`);
    },
  });

  // Mutation to add a meal from recipe library
  const addMealMutation = useMutation({
    mutationFn: async ({
      dayIndex,
      mealType,
      recipeId,
      recipeTitle,
      forWho = 'everyone',
    }: {
      dayIndex: number;
      mealType: string;
      recipeId: string;
      recipeTitle: string;
      forWho?: string;
    }) => {
      let planId = mealPlan?.id;

      // If no meal plan exists, create one first using the empty week structure
      if (!planId && emptyWeekPlan) {
        const newPlan = await mealPlansAPI.save(workspaceId, emptyWeekPlan as MealPlan);
        planId = newPlan.id;
        // Update local state with the new plan
        setMealPlan(newPlan);
      }

      if (!planId) throw new Error('Failed to create meal plan');

      return mealPlansAPI.addMeal(workspaceId, planId, {
        day_index: dayIndex,
        meal_type: mealType,
        recipe_id: recipeId,
        recipe_title: recipeTitle,
        for_who: forWho,
      });
    },
    onSuccess: (updatedPlan) => {
      setMealPlan(updatedPlan);
      setRecipePickerOpen(false);
      queryClient.invalidateQueries({ queryKey: ['meal-plans', workspaceId] });
      toast.success('Recipe added!', {
        description: 'Added to your meal plan.',
      });
    },
    onError: (error: Error) => {
      toast.error(`Failed to add recipe: ${error.message}`);
    },
  });

  // Mutation to remove a meal
  const removeMealMutation = useMutation({
    mutationFn: async ({
      dayIndex,
      mealIndex,
      replaceWithEatingOut,
      mealType,
    }: {
      dayIndex: number;
      mealIndex: number;
      replaceWithEatingOut?: boolean;
      mealType?: string;
    }) => {
      if (!mealPlan?.id) throw new Error('No meal plan');

      // If replacing with "Eating out", first delete then add
      const updatedPlan = await mealPlansAPI.deleteMeal(workspaceId, mealPlan.id, {
        day_index: dayIndex,
        meal_index: mealIndex,
      });

      // If user chose to replace with "Eating out", add that meal
      if (replaceWithEatingOut && mealType) {
        return mealPlansAPI.addMeal(workspaceId, mealPlan.id, {
          day_index: dayIndex,
          meal_type: mealType,
          recipe_id: null,
          recipe_title: 'Eating out',
          for_who: 'everyone',
        });
      }

      return updatedPlan;
    },
    onSuccess: (updatedPlan, variables) => {
      setMealPlan(updatedPlan);
      setRemoveDialogOpen(false);
      setRemoveContext(null);
      toast.success(
        variables.replaceWithEatingOut ? 'Meal replaced with "Eating out"' : 'Meal removed!',
        { description: 'Your meal plan has been updated.' }
      );
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove meal: ${error.message}`);
    },
  });

  // Mutation to move a meal (drag and drop)
  const moveMealMutation = useMutation({
    mutationFn: async ({
      sourceDayIndex,
      sourceMealIndex,
      targetDayIndex,
      targetMealIndex,
    }: {
      sourceDayIndex: number;
      sourceMealIndex: number;
      targetDayIndex: number;
      targetMealIndex: number;
    }) => {
      if (!mealPlan?.id) throw new Error('No meal plan');
      return mealPlansAPI.moveMeal(workspaceId, mealPlan.id, {
        source_day_index: sourceDayIndex,
        source_meal_index: sourceMealIndex,
        target_day_index: targetDayIndex,
        target_meal_index: targetMealIndex,
      });
    },
    onSuccess: (updatedPlan) => {
      setMealPlan(updatedPlan);
      // No toast for drag - it's obvious what happened
    },
    onError: (error: Error) => {
      toast.error(`Failed to move meal: ${error.message}`);
    },
  });

  // Calculate and store next Monday's date, then show week context modal
  const showWeekContextModal = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek; // 0 = Sunday

    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + daysUntilMonday);

    // Format date in local time (avoid timezone issues with toISOString)
    const year = nextMonday.getFullYear();
    const month = String(nextMonday.getMonth() + 1).padStart(2, '0');
    const day = String(nextMonday.getDate()).padStart(2, '0');
    const weekStartDate = `${year}-${month}-${day}`;

    setPendingWeekStartDate(weekStartDate);
    setWeekContextModalOpen(true);
  };

  const handleGenerate = async () => {
    // Check recipe readiness before generating
    try {
      const readiness = await mealPlansAPI.checkReadiness(workspaceId);

      if (!readiness.is_ready) {
        // Show insufficient recipes modal
        setInsufficientData({
          totalCount: readiness.total_count,
          missingMealTypes: readiness.missing_meal_types,
        });
        setInsufficientModalOpen(true);
        return; // Don't proceed with generation
      }
    } catch (error) {
      console.error('Failed to check readiness:', error);
      // On error, proceed with generation (let backend handle it)
    }

    // Show week context modal before generation
    showWeekContextModal();
  };

  // Called from InsufficientRecipesModal "Generate Anyway" button
  const handleGenerateAnyway = () => {
    setInsufficientModalOpen(false);
    showWeekContextModal();
  };

  // Called when user submits or skips the week context modal
  const proceedWithGeneration = (weekContext?: string) => {
    if (!pendingWeekStartDate) return;

    setWeekContextModalOpen(false);

    console.log('✅ Generating meal plan for week starting:', pendingWeekStartDate);
    if (weekContext) {
      console.log('   With week context:', weekContext.slice(0, 50) + '...');
    }

    generateMutation.mutate({
      week_start_date: pendingWeekStartDate,
      week_context: weekContext || undefined,
    });

    setPendingWeekStartDate(null);
  };

  // Helper to collect unique recipe titles from visible days (without recipe_id)
  const getVisibleRecipeTitlesToSave = (): string[] => {
    if (!mealPlan) return [];

    const titles = new Set<string>();

    visibleDayIndices.forEach((dayIndex) => {
      const day = mealPlan.days[dayIndex];
      day.meals.forEach((meal) => {
        // Only include meals without recipe_id (title-only suggestions)
        // Exclude "Eating out" meals since there's no recipe to save
        if (!meal.recipe_id && meal.recipe_title && !meal.recipe_title.toLowerCase().includes('eating out')) {
          titles.add(meal.recipe_title);
        }
      });
    });

    return Array.from(titles);
  };

  // Handle save all visible recipes click
  const handleSaveAllClick = () => {
    const titles = getVisibleRecipeTitlesToSave();

    if (titles.length === 0) {
      toast.info('All visible recipes are already saved to your library.');
      return;
    }

    // Filter out recipes that already exist in library (case-insensitive)
    const existingTitles = new Set(
      (existingRecipes || []).map(r => r.title.toLowerCase())
    );

    const newTitles = titles.filter(
      title => !existingTitles.has(title.toLowerCase())
    );

    if (newTitles.length === 0) {
      toast.info('All visible recipes already exist in your library.');
      return;
    }

    setRecipeTitlesToSave(newTitles);
    setSaveAllModalOpen(true);
  };

  // Handle save all complete - link recipes to meal plan by matching titles
  const handleSaveAllComplete = async (results: SaveAllResult) => {
    setSaveAllModalOpen(false);

    // Invalidate recipes query to refresh
    queryClient.invalidateQueries({ queryKey: ['recipes', workspaceId] });

    if (results.saved > 0 && mealPlan) {
      try {
        // Fetch the latest recipes to get their IDs
        const recipes = await recipesAPI.getAll(workspaceId);

        // Build a map of lowercase title -> recipe for matching
        const recipeByTitle = new Map(
          recipes.map(r => [r.title.toLowerCase(), r])
        );

        // Update meal plan to link recipes by matching titles
        let updated = false;
        const updatedMealPlan = {
          ...mealPlan,
          days: mealPlan.days.map(day => ({
            ...day,
            meals: day.meals.map(meal => {
              // Only update meals without recipe_id
              if (!meal.recipe_id && meal.recipe_title) {
                const matchedRecipe = recipeByTitle.get(meal.recipe_title.toLowerCase());
                if (matchedRecipe) {
                  updated = true;
                  return { ...meal, recipe_id: matchedRecipe.id };
                }
              }
              return meal;
            }),
          })),
        };

        // Save the updated meal plan if any recipes were linked
        if (updated) {
          const savedPlan = await mealPlansAPI.save(workspaceId, updatedMealPlan);
          setMealPlan(savedPlan);
          queryClient.invalidateQueries({ queryKey: ['meal-plans', workspaceId] });
        }
      } catch (error) {
        console.error('Failed to link recipes to meal plan:', error);
        // Non-fatal - recipes are still saved, just not linked
      }
    }

    if (results.failed === 0) {
      toast.success(`Saved ${results.saved} recipes to your library!`);
    } else {
      toast.warning(
        `Saved ${results.saved} of ${results.saved + results.failed} recipes`,
        { description: `${results.failed} failed` }
      );
    }
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

  // Handle swap button click - opens swap modal
  const handleSwapClick = (
    dayIndex: number,
    mealIndex: number,
    mealType: string,
    currentRecipeTitle: string
  ) => {
    setSwapContext({ dayIndex, mealIndex, mealType, currentRecipeTitle });
    setSwapModalOpen(true);
  };

  // Handle selecting a recipe from swap modal
  const handleSwapSelect = (suggestion: AlternativeRecipeSuggestion) => {
    if (!swapContext) return;
    swapMutation.mutate({
      dayIndex: swapContext.dayIndex,
      mealIndex: swapContext.mealIndex,
      newRecipeId: suggestion.recipe.id,
      newRecipeTitle: suggestion.recipe.title,
    });
  };

  // Handle undo swap
  const handleUndoSwap = (dayIndex: number, mealIndex: number) => {
    undoSwapMutation.mutate({ dayIndex, mealIndex });
  };

  // Handle add recipe button click - opens recipe picker modal
  const handleAddRecipeClick = (dayIndex: number, dayLabel: string) => {
    setRecipePickerContext({ dayIndex, dayLabel });
    setRecipePickerOpen(true);
  };

  // Handle selecting a recipe from the picker modal
  const handleRecipePickerSelect = (recipe: Recipe, mealType: string) => {
    if (!recipePickerContext) return;
    addMealMutation.mutate({
      dayIndex: recipePickerContext.dayIndex,
      mealType: mealType,
      recipeId: recipe.id,
      recipeTitle: recipe.title,
    });
  };

  // Handle remove meal click - check if it's the last of its type for the day
  const handleRemoveClick = (
    dayIndex: number,
    mealIndex: number,
    mealType: string,
    recipeTitle: string
  ) => {
    if (!mealPlan) return;

    // Count meals of this type on this day
    const day = mealPlan.days[dayIndex];
    const mealsOfType = day.meals.filter(
      (m) => m.meal_type.toLowerCase() === mealType.toLowerCase()
    );
    const isLastOfType = mealsOfType.length === 1;

    if (isLastOfType) {
      // Show confirmation dialog
      setRemoveContext({
        dayIndex,
        mealIndex,
        mealType,
        recipeTitle,
        isLastOfType: true,
      });
      setRemoveDialogOpen(true);
    } else {
      // Remove directly without confirmation
      removeMealMutation.mutate({ dayIndex, mealIndex });
    }
  };

  // Handle confirmation dialog actions
  const handleRemoveConfirm = (replaceWithEatingOut: boolean) => {
    if (!removeContext) return;
    removeMealMutation.mutate({
      dayIndex: removeContext.dayIndex,
      mealIndex: removeContext.mealIndex,
      replaceWithEatingOut,
      mealType: removeContext.mealType,
    });
  };

  // Handle clicking on an AI-generated meal title (no recipe_id)
  const handleAITitleClick = (
    dayIndex: number,
    mealIndex: number,
    mealType: string,
    recipeTitle: string
  ) => {
    // Skip for "Eating out" meals
    if (recipeTitle.toLowerCase().includes('eating out')) return;

    setGenerateConfirmContext({ dayIndex, mealIndex, mealType, recipeTitle });
    setGenerateConfirmOpen(true);
  };

  // Handle confirming recipe generation from AI title
  const handleGenerateConfirm = () => {
    if (!generateConfirmContext) return;
    setGenerateConfirmOpen(false);
    // Open the generate modal with the context
    setGenerateMealType(generateConfirmContext.mealType);
    setGenerateRecipeTitle(generateConfirmContext.recipeTitle);
    setGenerateMealContext({
      dayIndex: generateConfirmContext.dayIndex,
      mealIndex: generateConfirmContext.mealIndex,
    });
    setGenerateModalOpen(true);
    setGenerateConfirmContext(null);
  };

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (over) {
      const match = (over.id as string).match(/day-(\d+)-meal-(\d+)/);
      if (match) {
        setOverDayIndex(parseInt(match[1], 10));
      }
    } else {
      setOverDayIndex(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    setOverDayIndex(null);

    const { active, over } = event;
    if (!over || active.id === over.id || !mealPlan) return;

    // Parse the drag IDs: format is "day-{dayIndex}-meal-{mealIndex}"
    const activeMatch = (active.id as string).match(/day-(\d+)-meal-(\d+)/);
    const overMatch = (over.id as string).match(/day-(\d+)-meal-(\d+)/);

    if (!activeMatch || !overMatch) return;

    const sourceDayIndex = parseInt(activeMatch[1], 10);
    const sourceMealIndex = parseInt(activeMatch[2], 10);
    const targetDayIndex = parseInt(overMatch[1], 10);
    let targetMealIndex = parseInt(overMatch[2], 10);

    // If moving within the same day and source is before target, adjust index
    if (sourceDayIndex === targetDayIndex && sourceMealIndex < targetMealIndex) {
      targetMealIndex -= 1;
    }

    // Skip if nothing changed
    if (sourceDayIndex === targetDayIndex && sourceMealIndex === targetMealIndex) return;

    moveMealMutation.mutate({
      sourceDayIndex,
      sourceMealIndex,
      targetDayIndex,
      targetMealIndex,
    });
  };

  // Get the meal being dragged for DragOverlay
  const getActiveMeal = () => {
    if (!activeDragId || !mealPlan) return null;
    const match = activeDragId.match(/day-(\d+)-meal-(\d+)/);
    if (!match) return null;
    const dayIndex = parseInt(match[1], 10);
    const mealIndex = parseInt(match[2], 10);
    return mealPlan.days[dayIndex]?.meals[mealIndex] || null;
  };

  // Collect recipe IDs already in the meal plan (for exclusion in alternatives)
  const getExcludedRecipeIds = (): string[] => {
    if (!mealPlan) return [];
    const ids: string[] = [];
    mealPlan.days.forEach((day) => {
      day.meals.forEach((meal) => {
        if (meal.recipe_id) ids.push(meal.recipe_id);
      });
    });
    return ids;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">
          Weekly Meal Plan
        </h1>
        {displayPlan && (
          <p className="text-muted-foreground mt-1">
            Week of {new Date(displayPlan.week_start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        )}
      </div>

      {/* Meal Plan Content */}
      {displayPlan && (
        <>
          {/* Empty State Header - Show prominent generate button when no real plan */}
          {!mealPlan && (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 p-6 rounded-2xl bg-card shadow-soft">
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
              <span className="text-sm text-muted-foreground">or manually add recipes below</span>
            </div>
          )}
          {/* Day Navigator - Minimal sticky header */}
          <div className="sticky top-16 z-40 -mx-4 px-4 py-3 bg-background/95 backdrop-blur-sm border-b border-border/50">
            {/* Mobile: Compact nav with arrows */}
            <div className="flex items-center justify-between md:hidden">
              <button
                onClick={() => canGoPrev && setSelectedDayIndex(selectedDayIndex - 1)}
                disabled={!canGoPrev}
                className={cn(
                  "p-2 -ml-2 rounded-lg transition-colors",
                  canGoPrev ? "text-foreground hover:bg-muted" : "text-muted-foreground/30"
                )}
                aria-label="Previous day"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              <button
                onClick={() => {
                  // Cycle through days on tap
                  setSelectedDayIndex((selectedDayIndex + 1) % 7);
                }}
                className="flex-1 text-center py-1"
              >
                <p className="font-display text-lg font-semibold text-foreground">
                  {formatDate(displayPlan.days[selectedDayIndex].date).dayName}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(displayPlan.days[selectedDayIndex].date).shortDate}
                </p>
              </button>

              <button
                onClick={() => canGoNext && setSelectedDayIndex(selectedDayIndex + 1)}
                disabled={!canGoNext}
                className={cn(
                  "p-2 -mr-2 rounded-lg transition-colors",
                  canGoNext ? "text-foreground hover:bg-muted" : "text-muted-foreground/30"
                )}
                aria-label="Next day"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {/* Mobile: Week dots indicator */}
            <div className="flex justify-center gap-1.5 mt-2 md:hidden">
              {displayPlan.days.map((day, index) => {
                const isSelected = index === selectedDayIndex;
                const isVisible = visibleDayIndices.includes(index);
                return (
                  <button
                    key={day.date}
                    onClick={() => setSelectedDayIndex(index)}
                    className={cn(
                      "w-2 h-2 rounded-full transition-all duration-200",
                      isSelected
                        ? "bg-primary scale-125"
                        : isVisible
                          ? "bg-primary/40"
                          : "bg-muted-foreground/20 hover:bg-muted-foreground/40"
                    )}
                    aria-label={formatDate(day.date).dayName}
                  />
                );
              })}
            </div>

            {/* Desktop: Full week strip */}
            <div className="hidden md:flex items-center justify-between gap-1">
              {displayPlan.days.map((day, index) => {
                const { dayOfWeek, shortDate } = formatDate(day.date);
                const isSelected = index === selectedDayIndex;
                const isVisible = visibleDayIndices.includes(index) && !isSelected;

                return (
                  <button
                    key={day.date}
                    onClick={() => setSelectedDayIndex(index)}
                    className={cn(
                      "flex-1 py-2 px-1 rounded-lg transition-all duration-200 text-center",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : isVisible
                          ? "bg-primary/10 text-primary hover:bg-primary/20"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <p className={cn(
                      "text-xs font-medium uppercase tracking-wide",
                      isSelected ? "text-primary-foreground/80" : ""
                    )}>
                      {dayOfWeek}
                    </p>
                    <p className={cn(
                      "text-sm font-semibold",
                      isSelected ? "text-primary-foreground" : ""
                    )}>
                      {shortDate.split(' ')[1]}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Day View - Responsive Grid (1-3 days) with Drag and Drop */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div
              className="grid gap-6"
              style={{
                gridTemplateColumns: `repeat(${actualVisibleCount}, minmax(0, 1fr))`,
              }}
            >
              {visibleDayIndices.map((dayIndex) => {
                const day = displayPlan.days[dayIndex];
                const { dayName, shortDate } = formatDate(day.date);
                const isFirstDay = dayIndex === selectedDayIndex;
                const mealIds = day.meals.map((_, idx) => `day-${dayIndex}-meal-${idx}`);

                return (
                  <div
                    key={day.date}
                    className={cn(
                      "rounded-2xl bg-card shadow-soft overflow-hidden transition-all duration-200",
                      !isFirstDay && "opacity-95",
                      // Highlight when dragging over this day
                      activeDragId && overDayIndex === dayIndex && "ring-2 ring-primary ring-offset-2 scale-[1.02]"
                    )}
                  >
                    {/* Day Header - Hidden on mobile (navigator sufficient), compact on desktop */}
                    <div className={cn(
                      "hidden md:flex items-center justify-between px-4 py-2.5",
                      isFirstDay
                        ? "bg-primary text-primary-foreground"
                        : "bg-primary/80 text-primary-foreground"
                    )}>
                      <span className="font-display text-base font-semibold">
                        {dayName}
                      </span>
                      <span className={cn(
                        "text-sm",
                        isFirstDay ? "text-primary-foreground/80" : "text-primary-foreground/70"
                      )}>
                        {shortDate}
                      </span>
                    </div>

                    {/* Meals - Sortable within this day */}
                    <div className="p-6 space-y-3">
                      <SortableContext items={mealIds} strategy={verticalListSortingStrategy}>
                        {day.meals.map((meal, mealIdx) => {
                          const isEatingOut = meal.recipe_title.toLowerCase().includes('eating out');
                          const hasRecipe = !!meal.recipe_id;
                          const isAIGenerated = !hasRecipe && !isEatingOut;
                          const isClickable = hasRecipe || isAIGenerated;

                          return (
                            <SortableMeal
                              key={`day-${dayIndex}-meal-${mealIdx}`}
                              id={`day-${dayIndex}-meal-${mealIdx}`}
                              meal={meal}
                              dayIndex={dayIndex}
                              mealIdx={mealIdx}
                              isClickable={isClickable}
                              hasRecipe={hasRecipe}
                              isAIGenerated={isAIGenerated}
                              loadingRecipeId={loadingRecipeId}
                              onRecipeClick={handleRecipeClick}
                              onAITitleClick={handleAITitleClick}
                              onSwapClick={handleSwapClick}
                              onUndoSwap={handleUndoSwap}
                              onRemoveClick={handleRemoveClick}
                              isUndoPending={undoSwapMutation.isPending}
                              isRemovePending={removeMealMutation.isPending}
                            />
                          );
                        })}
                      </SortableContext>

                      {/* Add Recipe Button */}
                      <button
                        onClick={() => handleAddRecipeClick(dayIndex, dayName)}
                        className={cn(
                          "w-full p-3 rounded-lg border-2 border-dashed border-muted-foreground/30",
                          "flex items-center justify-center gap-2",
                          "text-muted-foreground hover:text-primary hover:border-primary/50",
                          "transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
                        )}
                      >
                        <Plus className="h-4 w-4" />
                        <span className="text-sm font-medium">Add Recipe</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Drag Overlay - Shows the dragged item with bounce animation */}
            <DragOverlay dropAnimation={dropAnimation}>
              {activeDragId && getActiveMeal() && (
                <div className="rounded-lg bg-card p-4 shadow-xl ring-2 ring-primary flex items-center gap-3 scale-105">
                  <GripVertical className="h-4 w-4 text-primary" />
                  <p className="text-base font-medium text-foreground">
                    <span className="mr-2">{mealTypeIcons[getActiveMeal()!.meal_type.toLowerCase()]}</span>
                    <span className="text-muted-foreground capitalize">{getActiveMeal()!.meal_type}:</span>
                    {' '}{getActiveMeal()!.recipe_title}
                  </p>
                </div>
              )}
            </DragOverlay>
          </DndContext>

          {/* Action Buttons - Below the meal plan */}
          <div className="flex flex-wrap gap-3 pt-4 sm:justify-end">
            <Button
              variant="outline"
              onClick={isSavingRecipes ? () => setSaveAllModalOpen(true) : handleSaveAllClick}
              className="flex-1 sm:flex-none"
            >
              {isSavingRecipes ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  View Progress
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Save Recipes
                </>
              )}
            </Button>
            <Button
              variant="hero"
              onClick={handleGenerate}
              disabled={generateMutation.isPending}
              className="flex-1 sm:flex-none"
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
        </>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl bg-card py-16 text-center shadow-soft">
          <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-2">No meal plan yet</p>
          <p className="text-sm text-muted-foreground mb-6">
            Generate a personalized weekly meal plan based on your recipes and preferences
          </p>
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

      {/* Swap Recipe Modal */}
      <SwapRecipeModal
        open={swapModalOpen}
        onOpenChange={setSwapModalOpen}
        mealType={swapContext?.mealType || ''}
        currentRecipeTitle={swapContext?.currentRecipeTitle || ''}
        excludeRecipeIds={getExcludedRecipeIds()}
        onSelect={handleSwapSelect}
        isSwapping={swapMutation.isPending}
      />

      {/* Recipe Picker Modal (add recipe from library) */}
      <RecipePickerModal
        open={recipePickerOpen}
        onOpenChange={setRecipePickerOpen}
        dayIndex={recipePickerContext?.dayIndex ?? 0}
        dayLabel={recipePickerContext?.dayLabel ?? ''}
        onSelect={handleRecipePickerSelect}
        isAdding={addMealMutation.isPending}
      />

      {/* Insufficient Recipes Modal (V1 empty state handling) */}
      <InsufficientRecipesModal
        open={insufficientModalOpen}
        onOpenChange={setInsufficientModalOpen}
        totalCount={insufficientData?.totalCount ?? 0}
        missingMealTypes={insufficientData?.missingMealTypes ?? []}
        onGenerateAnyway={handleGenerateAnyway}
        householdSetUp={onboardingStatus?.completed ?? false}
      />

      {/* Week Context Modal (optional input before generation) */}
      <WeekContextModal
        open={weekContextModalOpen}
        onOpenChange={setWeekContextModalOpen}
        onSubmit={(context) => proceedWithGeneration(context)}
        onSkip={() => proceedWithGeneration()}
      />

      {/* Save All Recipes Modal */}
      <SaveAllRecipesModal
        open={saveAllModalOpen}
        onOpenChange={setSaveAllModalOpen}
        recipeTitles={recipeTitlesToSave}
        onComplete={handleSaveAllComplete}
        onProcessingChange={setIsSavingRecipes}
      />

      {/* Remove Meal Confirmation Dialog */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {removeContext?.mealType}?</AlertDialogTitle>
            <AlertDialogDescription>
              This is your only {removeContext?.mealType?.toLowerCase()} for this day.
              Are you eating out instead, or just removing it?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <AlertDialogCancel
              onClick={() => {
                setRemoveDialogOpen(false);
                setRemoveContext(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleRemoveConfirm(false)}
              className="bg-red-600 hover:bg-red-700"
              disabled={removeMealMutation.isPending}
            >
              {removeMealMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Just Remove
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() => handleRemoveConfirm(true)}
              className="bg-primary hover:bg-primary/90"
              disabled={removeMealMutation.isPending}
            >
              {removeMealMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Replace with "Eating Out"
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Generate Recipe Confirmation Dialog (for AI-generated meal titles) */}
      <AlertDialog open={generateConfirmOpen} onOpenChange={setGenerateConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Generate Full Recipe?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-foreground">"{generateConfirmContext?.recipeTitle}"</span> is an AI-suggested meal title.
              Would you like to generate a complete recipe with ingredients and instructions, and save it to your library?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setGenerateConfirmOpen(false);
                setGenerateConfirmContext(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleGenerateConfirm}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Recipe
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MealPlans;

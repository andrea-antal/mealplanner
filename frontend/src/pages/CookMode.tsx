import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { recipesAPI } from '@/lib/api';
import type { CookingStepsResponse } from '@/lib/api';
import { getCurrentWorkspace } from '@/lib/workspace';
import { loadSession, saveSession, clearSession, createSession } from '@/lib/cookingSession';
import type { CookingSession } from '@/lib/cookingSession';
import type { TimerInstance } from '@/components/cooking/CookingTimer';
import { MisEnPlace } from '@/components/cooking/MisEnPlace';
import { StepByStep } from '@/components/cooking/StepByStep';
import { CookingTimer } from '@/components/cooking/CookingTimer';
import { Loader2, ArrowLeft, PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CookMode = () => {
  const { recipeId } = useParams<{ recipeId: string }>();
  const navigate = useNavigate();
  const workspaceId = getCurrentWorkspace();

  const [session, setSession] = useState<CookingSession | null>(null);

  // Redirect if no workspace
  useEffect(() => {
    if (!workspaceId) navigate('/');
  }, [workspaceId, navigate]);

  // Fetch recipe
  const { data: recipe, isLoading: recipeLoading } = useQuery({
    queryKey: ['recipe', workspaceId, recipeId],
    queryFn: () => recipesAPI.getById(workspaceId!, recipeId!),
    enabled: !!workspaceId && !!recipeId,
  });

  // Fetch cooking steps
  const { data: cookingSteps, isLoading: stepsLoading, error: stepsError } = useQuery({
    queryKey: ['cookingSteps', workspaceId, recipeId],
    queryFn: () => recipesAPI.getCookingSteps(workspaceId!, recipeId!),
    enabled: !!workspaceId && !!recipeId,
    staleTime: 1000 * 60 * 30, // Cache for 30 min
  });

  // Initialize or restore session
  useEffect(() => {
    if (!recipeId) return;
    const existing = loadSession(recipeId);
    if (existing) {
      setSession(existing);
    } else {
      setSession(createSession(recipeId));
    }
  }, [recipeId]);

  // Persist session on changes
  useEffect(() => {
    if (session) saveSession(session);
  }, [session]);

  const updateSession = useCallback((updates: Partial<CookingSession>) => {
    setSession((prev) => prev ? { ...prev, ...updates } : prev);
  }, []);

  const handleToggleIngredient = useCallback((ingredient: string) => {
    setSession((prev) => {
      if (!prev) return prev;
      const checked = new Set(prev.checkedIngredients);
      if (checked.has(ingredient)) {
        checked.delete(ingredient);
      } else {
        checked.add(ingredient);
      }
      return { ...prev, checkedIngredients: Array.from(checked) };
    });
  }, []);

  const handleReady = useCallback(() => {
    updateSession({ phase: 'cooking', currentStep: 0 });
  }, [updateSession]);

  const handleStepChange = useCallback((step: number) => {
    updateSession({ currentStep: step });
  }, [updateSession]);

  const handleStartTimer = useCallback((minutes: number, label: string) => {
    setSession((prev) => {
      if (!prev) return prev;
      const newTimer: TimerInstance = {
        id: `timer_${Date.now()}`,
        label,
        totalSeconds: minutes * 60,
        remainingSeconds: minutes * 60,
        isRunning: true,
      };
      return { ...prev, timers: [...prev.timers, newTimer] };
    });
  }, []);

  const handleUpdateTimers = useCallback((timers: TimerInstance[]) => {
    updateSession({ timers });
  }, [updateSession]);

  const handleComplete = useCallback(() => {
    updateSession({ phase: 'done' });
  }, [updateSession]);

  const handleExit = useCallback(() => {
    if (recipeId) clearSession(recipeId);
    navigate(-1);
  }, [recipeId, navigate]);

  const handleStartOver = useCallback(() => {
    if (recipeId) {
      clearSession(recipeId);
      setSession(createSession(recipeId));
    }
  }, [recipeId]);

  if (!workspaceId || !recipeId) return null;

  const isLoading = recipeLoading || stepsLoading;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground">Preparing your cooking steps...</p>
      </div>
    );
  }

  if (stepsError || !recipe || !cookingSteps) {
    return (
      <div className="max-w-lg mx-auto mt-12 text-center space-y-4">
        <h2 className="text-xl font-semibold">Could not load recipe</h2>
        <p className="text-muted-foreground">
          {stepsError instanceof Error ? stepsError.message : 'Recipe not found or steps could not be parsed.'}
        </p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
        </Button>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="max-w-2xl mx-auto pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={handleExit}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-xl font-bold truncate">{recipe.title}</h1>
          <p className="text-sm text-muted-foreground">
            {session.phase === 'prep' ? 'Preparation' : session.phase === 'cooking' ? 'Cooking' : 'Complete'}
          </p>
        </div>
      </div>

      {/* Active Timers (shown in all phases) */}
      {session.timers.length > 0 && (
        <div className="mb-6">
          <CookingTimer timers={session.timers} onUpdateTimers={handleUpdateTimers} />
        </div>
      )}

      {/* Phase: Prep (Mise en Place) */}
      {session.phase === 'prep' && (
        <MisEnPlace
          ingredients={recipe.ingredients}
          equipment={cookingSteps.equipment}
          checkedIngredients={new Set(session.checkedIngredients)}
          onToggleIngredient={handleToggleIngredient}
          onReady={handleReady}
        />
      )}

      {/* Phase: Cooking (Step by Step) */}
      {session.phase === 'cooking' && (
        <StepByStep
          steps={cookingSteps.steps}
          currentStep={session.currentStep}
          onStepChange={handleStepChange}
          onStartTimer={handleStartTimer}
          onComplete={handleComplete}
        />
      )}

      {/* Phase: Done */}
      {session.phase === 'done' && (
        <div className="text-center space-y-6 py-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10">
            <PartyPopper className="h-10 w-10 text-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="font-display text-3xl font-bold">Bon Appetit!</h2>
            <p className="text-muted-foreground text-lg">
              You finished cooking {recipe.title}. Enjoy your meal!
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="outline" onClick={handleStartOver}>
              Cook Again
            </Button>
            <Button onClick={handleExit}>
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CookMode;

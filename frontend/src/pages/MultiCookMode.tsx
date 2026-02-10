import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { recipesAPI } from '@/lib/api';
import type { CookingTimeline, TimelineStep } from '@/lib/api';
import { getCurrentWorkspace } from '@/lib/workspace';
import {
  loadMultiSession, saveMultiSession, clearMultiSession, createMultiSession,
} from '@/lib/cookingSession';
import type { MultiCookSession } from '@/lib/cookingSession';
import type { TimerInstance } from '@/components/cooking/CookingTimer';
import { CookingTimer } from '@/components/cooking/CookingTimer';
import { SimulatedProgress } from '@/components/cooking/SimulatedProgress';
import { CurrentStepCard, getRecipeColor } from '@/components/cooking/CurrentStepCard';
import { UpNextPanel } from '@/components/cooking/UpNextPanel';
import { FullTimeline } from '@/components/cooking/FullTimeline';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ArrowLeft, ChefHat, PartyPopper, ChevronRight, ChevronLeft,
} from 'lucide-react';

const MultiCookMode = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const workspaceId = getCurrentWorkspace();

  const recipeIds = useMemo(() => {
    const ids = searchParams.get('ids');
    return ids ? ids.split(',').filter(Boolean) : [];
  }, [searchParams]);

  const [session, setSession] = useState<MultiCookSession | null>(null);

  useEffect(() => {
    if (!workspaceId) navigate('/');
  }, [workspaceId, navigate]);

  // Fetch the cooking timeline from backend
  const { data: timeline, isLoading, error } = useQuery({
    queryKey: ['cookingTimeline', workspaceId, recipeIds.join(',')],
    queryFn: () => recipesAPI.getCookingTimeline(workspaceId!, recipeIds),
    enabled: !!workspaceId && recipeIds.length >= 2,
    staleTime: Infinity,
  });

  // Build color map: recipe_id -> color_index
  const colorMap = useMemo(() => {
    if (!timeline) return {};
    const map: Record<string, number> = {};
    timeline.recipes.forEach((r) => { map[r.id] = r.color_index; });
    return map;
  }, [timeline]);

  // Initialize or restore session
  useEffect(() => {
    if (recipeIds.length < 2) return;
    const existing = loadMultiSession();
    if (existing && existing.recipeIds.join(',') === recipeIds.join(',')) {
      setSession(existing);
    } else {
      setSession(createMultiSession(recipeIds, null));
    }
  }, [recipeIds]);

  // Persist session
  useEffect(() => {
    if (session) saveMultiSession(session);
  }, [session]);

  const updateSession = useCallback((updates: Partial<MultiCookSession>) => {
    setSession((prev) => prev ? { ...prev, ...updates } : prev);
  }, []);

  const handleToggleIngredient = useCallback((ingredient: string) => {
    setSession((prev) => {
      if (!prev) return prev;
      const checked = new Set(prev.checkedIngredients);
      if (checked.has(ingredient)) checked.delete(ingredient);
      else checked.add(ingredient);
      return { ...prev, checkedIngredients: Array.from(checked) };
    });
  }, []);

  const handleReady = useCallback(() => {
    updateSession({ phase: 'cooking', currentStepIndex: 0 });
  }, [updateSession]);

  const handleNextStep = useCallback(() => {
    if (!session || !timeline) return;
    const nextIndex = session.currentStepIndex + 1;
    if (nextIndex >= timeline.steps.length) {
      updateSession({ phase: 'done' });
    } else {
      updateSession({ currentStepIndex: nextIndex });
    }
  }, [session, timeline, updateSession]);

  const handlePrevStep = useCallback(() => {
    if (!session) return;
    if (session.currentStepIndex > 0) {
      updateSession({ currentStepIndex: session.currentStepIndex - 1 });
    }
  }, [session, updateSession]);

  const handleJumpToStep = useCallback((index: number) => {
    updateSession({ currentStepIndex: index });
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

  const handleExit = useCallback(() => {
    clearMultiSession();
    navigate('/cook');
  }, [navigate]);

  // Clock time calculation
  const getClockTime = useCallback((offsetMinutes: number): string | null => {
    if (!session) return null;
    const startTime = new Date(session.startedAt);
    const stepTime = new Date(startTime.getTime() + offsetMinutes * 60 * 1000);
    return stepTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }, [session]);

  if (!workspaceId || recipeIds.length < 2) {
    return (
      <div className="max-w-lg mx-auto mt-12 text-center space-y-4">
        <h2 className="text-xl font-semibold">Select at least 2 recipes</h2>
        <Button variant="outline" onClick={() => navigate('/cook')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Cook
        </Button>
      </div>
    );
  }

  // Loading
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 max-w-sm mx-auto">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
          <ChefHat className="h-8 w-8 text-primary" />
        </div>
        <div className="text-center space-y-1">
          <h2 className="font-display text-lg font-semibold">
            Creating coordinated timeline
          </h2>
          <p className="text-sm text-muted-foreground">
            Claude is interleaving {recipeIds.length} recipes so everything finishes together...
          </p>
        </div>
        <SimulatedProgress durationSeconds={20} label="Usually takes 15-20 seconds" />
      </div>
    );
  }

  // Error
  if (error || !timeline) {
    return (
      <div className="max-w-lg mx-auto mt-12 text-center space-y-4">
        <h2 className="text-xl font-semibold">Could not create timeline</h2>
        <p className="text-muted-foreground">
          {error instanceof Error ? error.message : 'Failed to create cooking timeline.'}
        </p>
        <Button variant="outline" onClick={() => navigate('/cook')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Cook
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
          <h1 className="font-display text-xl font-bold">Multi-Cook</h1>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {timeline.recipes.map((r) => {
              const color = getRecipeColor(r.color_index);
              return (
                <Badge key={r.id} className={`${color.bg} ${color.text} border-0 text-xs`}>
                  {r.title}
                </Badge>
              );
            })}
          </div>
        </div>
        <span className="text-sm font-medium text-muted-foreground">
          ~{timeline.total_duration_minutes}m
        </span>
      </div>

      {/* Active Timers */}
      {session.timers.length > 0 && (
        <div className="mb-6">
          <CookingTimer timers={session.timers} onUpdateTimers={handleUpdateTimers} />
        </div>
      )}

      {/* Phase: Prep — Combined mise en place */}
      {session.phase === 'prep' && (
        <div className="space-y-6">
          {/* Equipment */}
          {timeline.equipment_needed.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4 shadow-xs space-y-3">
              <h3 className="font-semibold text-sm">Equipment Needed</h3>
              <div className="flex flex-wrap gap-2">
                {timeline.equipment_needed.map((eq) => (
                  <Badge key={eq} variant="secondary" className="capitalize">
                    {eq.replace('_', ' ')}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Ingredients by recipe */}
          {timeline.all_ingredients.map((group) => {
            const color = getRecipeColor(colorMap[group.recipe_id] ?? 0);
            return (
              <div key={group.recipe_id} className="rounded-xl border border-border bg-card p-4 shadow-xs space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${color.bg}`} />
                  {group.recipe_title}
                </h3>
                <div className="space-y-1.5">
                  {group.ingredients.map((ing) => {
                    const key = `${group.recipe_id}:${ing}`;
                    const isChecked = session.checkedIngredients.includes(key);
                    return (
                      <label
                        key={key}
                        className="flex items-center gap-3 cursor-pointer py-1"
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => handleToggleIngredient(key)}
                        />
                        <span className={`text-sm ${isChecked ? 'line-through text-muted-foreground' : ''}`}>
                          {ing}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <Button className="w-full" size="lg" onClick={handleReady}>
            Ready to Cook
          </Button>
        </div>
      )}

      {/* Phase: Cooking — Timeline navigation */}
      {session.phase === 'cooking' && (
        <div className="space-y-4">
          {/* Progress */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Step {session.currentStepIndex + 1} of {timeline.steps.length}</span>
            <span>{Math.round(((session.currentStepIndex + 1) / timeline.steps.length) * 100)}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300"
              style={{ width: `${((session.currentStepIndex + 1) / timeline.steps.length) * 100}%` }}
            />
          </div>

          {/* Current step */}
          <CurrentStepCard
            step={timeline.steps[session.currentStepIndex]}
            colorIndex={colorMap[timeline.steps[session.currentStepIndex].recipe_id] ?? 0}
            clockTime={getClockTime(timeline.steps[session.currentStepIndex].start_offset_minutes)}
            onStartTimer={handleStartTimer}
          />

          {/* Navigation */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              disabled={session.currentStepIndex === 0}
              onClick={handlePrevStep}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              className="flex-1"
              onClick={handleNextStep}
            >
              {session.currentStepIndex === timeline.steps.length - 1 ? 'Finish' : 'Next'}
              {session.currentStepIndex < timeline.steps.length - 1 && (
                <ChevronRight className="h-4 w-4 ml-1" />
              )}
            </Button>
          </div>

          {/* Up next */}
          <UpNextPanel
            steps={timeline.steps.slice(session.currentStepIndex + 1, session.currentStepIndex + 4)}
            colorMap={colorMap}
            getClockTime={getClockTime}
          />

          {/* Full timeline */}
          <FullTimeline
            steps={timeline.steps}
            currentStepIndex={session.currentStepIndex}
            colorMap={colorMap}
            getClockTime={getClockTime}
            onJumpToStep={handleJumpToStep}
          />
        </div>
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
              You finished cooking {timeline.recipes.length} recipes. Enjoy your meal!
            </p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {timeline.recipes.map((r) => {
              const color = getRecipeColor(r.color_index);
              return (
                <Badge key={r.id} className={`${color.bg} ${color.text} border-0`}>
                  {r.title}
                </Badge>
              );
            })}
          </div>
          <Button onClick={handleExit}>
            Done
          </Button>
        </div>
      )}
    </div>
  );
};

export default MultiCookMode;

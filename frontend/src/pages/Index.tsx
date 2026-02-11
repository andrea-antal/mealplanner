import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { householdAPI, onboardingAPI, groceriesAPI, recipesAPI, mealPlansAPI } from '@/lib/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Calendar, UtensilsCrossed, ShoppingBasket, Sparkles, ChefHat,
  Loader2, Smile, Baby, Laugh, ChevronRight, Sun, Sunset, Moon, CloudSun,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ReleaseNotesModal } from '@/components/ReleaseNotesModal';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { cn } from '@/lib/utils';

// Time-of-day greeting
function getGreeting(): { text: string; icon: typeof Sun; subtext: string } {
  const hour = new Date().getHours();
  if (hour < 6) return { text: 'Good night', icon: Moon, subtext: 'Planning ahead?' };
  if (hour < 12) return { text: 'Good morning', icon: Sun, subtext: 'What\'s on the menu today?' };
  if (hour < 17) return { text: 'Good afternoon', icon: CloudSun, subtext: 'Time to plan dinner?' };
  if (hour < 21) return { text: 'Good evening', icon: Sunset, subtext: 'What\'s cooking tonight?' };
  return { text: 'Good night', icon: Moon, subtext: 'Planning tomorrow?' };
}

// Stacked action row config
const quickActions = [
  { label: 'Meal Plans', href: '/meal-plans', icon: Calendar },
  { label: 'Groceries', href: '/groceries', icon: ShoppingBasket },
  { label: 'Recipes', href: '/recipes', icon: UtensilsCrossed },
  { label: 'Cook', href: '/cook', icon: ChefHat },
];

const Index = () => {
  const [showReleaseNotes, setShowReleaseNotes] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();

  const workspaceId = user?.workspace_id || null;
  const isReady = isAuthenticated && !!workspaceId;

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthLoading, isAuthenticated, navigate]);

  const { data: householdProfile, isLoading: isLoadingProfile, error: profileError } = useQuery({
    queryKey: ['householdProfile', workspaceId],
    queryFn: () => householdAPI.getProfile(workspaceId!),
    enabled: isReady,
    retry: false,
  });

  const { data: onboardingStatus } = useQuery({
    queryKey: ['onboardingStatus', workspaceId],
    queryFn: () => onboardingAPI.getStatus(workspaceId!),
    enabled: isReady,
  });

  const { data: groceryList } = useQuery({
    queryKey: ['groceries', workspaceId],
    queryFn: () => groceriesAPI.getAll(workspaceId!),
    enabled: isReady,
  });

  const { data: recipes } = useQuery({
    queryKey: ['recipes', workspaceId],
    queryFn: () => recipesAPI.getAll(workspaceId!),
    enabled: isReady,
  });

  const { data: mealPlans } = useQuery({
    queryKey: ['mealPlans', workspaceId],
    queryFn: () => mealPlansAPI.getAll(workspaceId!),
    enabled: isReady,
  });

  const currentMealPlan = useMemo(() => {
    if (!mealPlans || mealPlans.length === 0) return null;
    return [...mealPlans].sort((a, b) =>
      new Date(b.week_start_date).getTime() - new Date(a.week_start_date).getTime()
    )[0];
  }, [mealPlans]);

  const todaysMeals = useMemo(() => {
    if (!currentMealPlan?.days) return [];
    const today = new Date().toISOString().split('T')[0];
    const todayPlan = currentMealPlan.days.find((d: any) => d.date === today);
    return todayPlan?.meals || [];
  }, [currentMealPlan]);

  const shouldShowOnboarding = useMemo(() => {
    if (isLoadingProfile) return false;
    if (householdProfile?.family_members?.length > 0) return false;
    if (!onboardingStatus) return false;
    if (onboardingStatus.completed) return false;
    if (onboardingStatus.permanently_dismissed) return false;
    return true;
  }, [onboardingStatus, householdProfile, isLoadingProfile]);

  useEffect(() => {
    if (shouldShowOnboarding) {
      setShowOnboarding(true);
    }
  }, [shouldShowOnboarding]);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    queryClient.invalidateQueries({ queryKey: ['householdProfile', workspaceId] });
  };

  const handleOnboardingSkip = () => {
    setShowOnboarding(false);
  };

  const formatWeekDisplay = (weekStartDate: string) => {
    const start = new Date(weekStartDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
    const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
    const startDay = start.getDate();
    const endDay = end.getDate();
    if (startMonth === endMonth) return `${startMonth} ${startDay}–${endDay}`;
    return `${startMonth} ${startDay} – ${endMonth} ${endDay}`;
  };

  // Subtitle/badge text for each action
  const actionMeta: Record<string, string | undefined> = {
    '/meal-plans': currentMealPlan ? formatWeekDisplay(currentMealPlan.week_start_date) : undefined,
    '/groceries': groceryList?.items?.length ? `${groceryList.items.length} items` : undefined,
    '/recipes': recipes?.length ? `${recipes.length} saved` : undefined,
  };

  const greeting = getGreeting();
  const GreetingIcon = greeting.icon;

  // === EARLY RETURNS ===

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isReady) return null;

  return (
    <>
      {workspaceId && (
        <OnboardingWizard
          open={showOnboarding}
          onOpenChange={setShowOnboarding}
          workspaceId={workspaceId}
          skippedCount={onboardingStatus?.skipped_count ?? 0}
          onComplete={handleOnboardingComplete}
          onSkip={handleOnboardingSkip}
        />
      )}

      <div className="space-y-8">
        {/* ── Greeting ───────────────────────────────── */}
        <section className="-mx-6 -mt-6 px-6 pt-8 pb-6 bg-gradient-to-b from-primary/[0.06] to-transparent">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
              <GreetingIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-semibold text-foreground leading-tight">
                {greeting.text}
              </h1>
              <p className="text-sm text-muted-foreground">
                {todaysMeals.length > 0
                  ? `${todaysMeals.length} meal${todaysMeals.length > 1 ? 's' : ''} planned today`
                  : greeting.subtext}
              </p>
            </div>
          </div>
        </section>

        {/* ── Quick Actions (stacked wide buttons) ──── */}
        <section className="space-y-2">
          {quickActions.map((action) => {
            const meta = actionMeta[action.href];
            return (
              <Link
                key={action.href}
                to={action.href}
                className="group flex items-center gap-4 w-full px-4 py-3.5 rounded-2xl border border-border/50 bg-card shadow-xs hover:shadow-soft active:scale-[0.99] transition-all"
              >
                <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary/10 flex-shrink-0">
                  <action.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-[15px]">{action.label}</p>
                  {meta && (
                    <p className="text-sm text-muted-foreground">{meta}</p>
                  )}
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors flex-shrink-0" />
              </Link>
            );
          })}
        </section>

        {/* ── Today's Meals (horizontal scroll) ────── */}
        {todaysMeals.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-lg font-semibold text-foreground">
                Today
              </h2>
              <Link
                to="/meal-plans"
                className="flex items-center gap-0.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Full plan
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-6 px-6 pb-1">
              {todaysMeals.map((meal: any, idx: number) => (
                <div
                  key={`${meal.meal_type}-${idx}`}
                  className="flex-shrink-0 w-[180px] rounded-xl border border-border/50 bg-card p-3.5 shadow-xs"
                >
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-primary/80">
                    {meal.meal_type}
                  </span>
                  <p className="mt-1 font-medium text-foreground text-sm leading-snug line-clamp-3">
                    {meal.recipe_title || 'Untitled'}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Household ──────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-semibold text-foreground">
              Your Household
            </h2>
            {householdProfile?.family_members?.length > 0 && (
              <Link
                to="/household"
                className="flex items-center gap-0.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Edit
                <ChevronRight className="h-4 w-4" />
              </Link>
            )}
          </div>

          {isLoadingProfile && !profileError ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : householdProfile?.family_members?.length > 0 ? (
            <div className="flex gap-8 overflow-x-auto scrollbar-hide -mx-6 px-6 pb-1">
              {householdProfile.family_members.map((member: any) => {
                const AgeIcon = member.age_group === 'toddler' ? Baby
                  : member.age_group === 'child' ? Laugh
                  : Smile;
                return (
                  <Link
                    key={member.name}
                    to="/household"
                    className="flex flex-col items-center gap-1.5 flex-shrink-0 group"
                  >
                    <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 group-hover:bg-primary/15 transition-colors">
                      <AgeIcon className="h-7 w-7 text-primary" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground">{member.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{member.age_group}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-6 text-center">
              <p className="text-muted-foreground mb-3">No household members yet</p>
              <Button variant="secondary" size="sm" asChild>
                <Link to="/household">Add Members</Link>
              </Button>
            </div>
          )}
        </section>

        {/* ── What's New ─────────────────────────────── */}
        <div className="text-center pt-2 pb-4">
          <button
            onClick={() => setShowReleaseNotes(true)}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Sparkles className="h-4 w-4" />
            What's New
          </button>
        </div>
      </div>

      <ReleaseNotesModal
        open={showReleaseNotes}
        onOpenChange={setShowReleaseNotes}
      />
    </>
  );
};

export default Index;

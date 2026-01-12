import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { householdAPI, onboardingAPI, groceriesAPI, recipesAPI, mealPlansAPI } from '@/lib/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, UtensilsCrossed, Users, ShoppingBasket, Sparkles, ChefHat, Loader2, Smile, Baby, Laugh } from 'lucide-react';
import { getCurrentWorkspace } from '@/lib/workspace';
import { WorkspaceSelector } from '@/components/workspace/WorkspaceSelector';
import { ReleaseNotesModal } from '@/components/ReleaseNotesModal';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';

const Index = () => {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [showWorkspaceSelector, setShowWorkspaceSelector] = useState(false);
  const [showReleaseNotes, setShowReleaseNotes] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const queryClient = useQueryClient();

  // Check for workspace on mount
  useEffect(() => {
    const currentWorkspace = getCurrentWorkspace();
    if (currentWorkspace) {
      setWorkspaceId(currentWorkspace);
    } else {
      setShowWorkspaceSelector(true);
    }
  }, []);

  // Handle workspace selection
  const handleWorkspaceSelected = (selectedWorkspaceId: string) => {
    setWorkspaceId(selectedWorkspaceId);
    setShowWorkspaceSelector(false);
  };

  // Fetch household profile from backend (only when workspace is set)
  const { data: householdProfile, isLoading: isLoadingProfile, error: profileError } = useQuery({
    queryKey: ['householdProfile', workspaceId],
    queryFn: () => householdAPI.getProfile(workspaceId!),
    enabled: !!workspaceId, // Only run query when workspace is set
    retry: false, // Don't retry on 404 - just means no profile yet
  });

  // Fetch onboarding status (only when workspace is set)
  const { data: onboardingStatus } = useQuery({
    queryKey: ['onboardingStatus', workspaceId],
    queryFn: () => onboardingAPI.getStatus(workspaceId!),
    enabled: !!workspaceId,
  });

  // Fetch groceries for tally
  const { data: groceryList } = useQuery({
    queryKey: ['groceries', workspaceId],
    queryFn: () => groceriesAPI.getAll(workspaceId!),
    enabled: !!workspaceId,
  });

  // Fetch recipes for tally
  const { data: recipes } = useQuery({
    queryKey: ['recipes', workspaceId],
    queryFn: () => recipesAPI.getAll(workspaceId!),
    enabled: !!workspaceId,
  });

  // Fetch meal plans to show current week
  const { data: mealPlans } = useQuery({
    queryKey: ['mealPlans', workspaceId],
    queryFn: () => mealPlansAPI.getAll(workspaceId!),
    enabled: !!workspaceId,
  });

  // Get the most recent meal plan
  const currentMealPlan = useMemo(() => {
    if (!mealPlans || mealPlans.length === 0) return null;
    // Sort by week_start_date descending and get the most recent
    return [...mealPlans].sort((a, b) =>
      new Date(b.week_start_date).getTime() - new Date(a.week_start_date).getTime()
    )[0];
  }, [mealPlans]);

  // Format the week display (e.g., "Jan 6-12")
  const formatWeekDisplay = (weekStartDate: string) => {
    const start = new Date(weekStartDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);

    const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
    const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
    const startDay = start.getDate();
    const endDay = end.getDate();

    if (startMonth === endMonth) {
      return `${startMonth} ${startDay}-${endDay}`;
    }
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
  };

  // Determine if we should show onboarding
  // Never show if user already has household data (prevents data wipe)
  const shouldShowOnboarding = useMemo(() => {
    // Don't show if still loading or if user has existing family members
    if (isLoadingProfile) return false;
    if (householdProfile?.family_members?.length > 0) return false;
    // Standard onboarding status checks
    if (!onboardingStatus) return false;
    if (onboardingStatus.completed) return false;
    if (onboardingStatus.permanently_dismissed) return false;
    return true;
  }, [onboardingStatus, householdProfile, isLoadingProfile]);

  // Show onboarding when appropriate (after workspace is selected, not already showing)
  useEffect(() => {
    if (shouldShowOnboarding && !showWorkspaceSelector) {
      setShowOnboarding(true);
    }
  }, [shouldShowOnboarding, showWorkspaceSelector]);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    // Refresh household profile to show updated data
    queryClient.invalidateQueries({ queryKey: ['householdProfile', workspaceId] });
  };

  const handleOnboardingSkip = () => {
    setShowOnboarding(false);
  };

  return (
    <>
      {/* Workspace Selector Modal (for first-time users) */}
      <WorkspaceSelector
        open={showWorkspaceSelector}
        onWorkspaceSelected={handleWorkspaceSelected}
      />

      {/* Onboarding Wizard Modal (for new users after workspace selection) */}
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

      <div className="space-y-12">
        {/* Get Started */}
        <section>
          <h2 className="font-display text-2xl font-semibold text-foreground mb-6 text-balance">
            Get Started
          </h2>

          {/* Conditional CTA Button - Hidden pending feature flag (see Linear backlog)
          <div className="mb-6">
            {currentMealPlan ? (
              <Button asChild size="lg" className="w-full">
                <Link to="/meal-plans">
                  <Calendar className="h-5 w-5 mr-2" />
                  View Meal Plan
                </Link>
              </Button>
            ) : (groceryList?.items?.length || 0) > (recipes?.length || 0) ? (
              <Button asChild size="lg" className="w-full">
                <Link to="/groceries">
                  <ShoppingBasket className="h-5 w-5 mr-2" />
                  View Groceries
                </Link>
              </Button>
            ) : (
              <Button asChild size="lg" className="w-full">
                <Link to="/recipes">
                  <UtensilsCrossed className="h-5 w-5 mr-2" />
                  View Recipes
                </Link>
              </Button>
            )}
          </div>
          */}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Plan */}
          <Link
            to="/meal-plans"
            className="group flex flex-col items-center gap-3 p-4 rounded-2xl hover:bg-card"
          >
            <div className="flex items-center justify-center size-20 md:size-24 rounded-2xl bg-primary shadow-sm">
              <Calendar className="size-10 md:size-12 text-primary-foreground" />
            </div>
            <div className="text-center">
              <span className="text-sm font-semibold text-muted-foreground group-hover:text-foreground block">Plan</span>
              {currentMealPlan && (
                <span className="text-xs text-muted-foreground">{formatWeekDisplay(currentMealPlan.week_start_date)}</span>
              )}
            </div>
          </Link>

          {/* Groceries */}
          <Link
            to="/groceries"
            className="group flex flex-col items-center gap-3 p-4 rounded-2xl hover:bg-card"
          >
            <div className="flex items-center justify-center size-20 md:size-24 rounded-2xl bg-primary shadow-sm">
              <ShoppingBasket className="size-10 md:size-12 text-primary-foreground" />
            </div>
            <div className="text-center">
              <span className="text-sm font-semibold text-muted-foreground group-hover:text-foreground block">Groceries</span>
              {groceryList?.items && groceryList.items.length > 0 && (
                <span className="text-xs text-muted-foreground">{groceryList.items.length} items</span>
              )}
            </div>
          </Link>

          {/* Recipes */}
          <Link
            to="/recipes"
            className="group flex flex-col items-center gap-3 p-4 rounded-2xl hover:bg-card"
          >
            <div className="flex items-center justify-center size-20 md:size-24 rounded-2xl bg-primary shadow-sm">
              <UtensilsCrossed className="size-10 md:size-12 text-primary-foreground" />
            </div>
            <div className="text-center">
              <span className="text-sm font-semibold text-muted-foreground group-hover:text-foreground block">Recipes</span>
              {recipes && recipes.length > 0 && (
                <span className="text-xs text-muted-foreground">{recipes.length} saved</span>
              )}
            </div>
          </Link>

          {/* Cook */}
          <Link
            to="/cook"
            className="group flex flex-col items-center gap-3 p-4 rounded-2xl hover:bg-card"
          >
            <div className="flex items-center justify-center size-20 md:size-24 rounded-2xl bg-primary shadow-sm">
              <ChefHat className="size-10 md:size-12 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold text-muted-foreground group-hover:text-foreground text-center">Cook</span>
          </Link>
        </div>
      </section>

      {/* Household Members Preview */}
      <section>
        <h2 className="font-display text-2xl font-semibold text-foreground mb-6 text-balance">
          Your Household
        </h2>
        {isLoadingProfile && !profileError ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : householdProfile?.family_members && householdProfile.family_members.length > 0 ? (
          <div className="grid grid-cols-4 gap-4">
            {householdProfile.family_members.map((member) => {
              const AgeIcon = member.age_group === 'toddler' ? Baby
                : member.age_group === 'child' ? Laugh
                : Smile;
              return (
                <Link
                  key={member.name}
                  to="/household"
                  className="group flex flex-col items-center gap-3 p-4 rounded-2xl hover:bg-card"
                >
                  <div className="flex items-center justify-center size-12">
                    <AgeIcon className="size-10 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-muted-foreground group-hover:text-foreground">{member.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{member.age_group}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl bg-card p-6 text-center">
            <p className="text-muted-foreground mb-4">No household members added yet</p>
            <Button variant="secondary" asChild>
              <Link to="/household">
                Add Members
              </Link>
            </Button>
          </div>
        )}
      </section>

      {/* What's New Link */}
      <div className="text-center pt-4">
        <button
          onClick={() => setShowReleaseNotes(true)}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Sparkles className="h-4 w-4" />
          What's New
        </button>
      </div>
    </div>

    {/* Release Notes Modal */}
    <ReleaseNotesModal
      open={showReleaseNotes}
      onOpenChange={setShowReleaseNotes}
    />
    </>
  );
};

export default Index;

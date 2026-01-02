import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { householdAPI, onboardingAPI } from '@/lib/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, UtensilsCrossed, Users, Carrot, Sparkles, ArrowRight, Loader2 } from 'lucide-react';
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

  // Determine if we should show onboarding
  const shouldShowOnboarding = useMemo(() => {
    if (!onboardingStatus) return false;
    if (onboardingStatus.completed) return false;
    if (onboardingStatus.permanently_dismissed) return false;
    return true;
  }, [onboardingStatus]);

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
          <h2 className="font-display text-2xl font-semibold text-foreground mb-6">
            Get Started
          </h2>
        <div className="flex gap-4 flex-wrap lg:flex-nowrap">
          <Link
            to="/groceries"
            className="group flex flex-1 min-w-[140px] flex-col items-center gap-3 rounded-2xl bg-card p-5 shadow-soft transition-all duration-300 hover:shadow-medium hover:-translate-y-1"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <Carrot className="h-6 w-6" />
            </div>
            <span className="font-medium text-foreground text-sm">Edit Groceries</span>
          </Link>

          <Link
            to="/recipes"
            className="group flex flex-1 min-w-[140px] flex-col items-center gap-3 rounded-2xl bg-card p-5 shadow-soft transition-all duration-300 hover:shadow-medium hover:-translate-y-1"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
              <UtensilsCrossed className="h-6 w-6" />
            </div>
            <span className="font-medium text-foreground text-sm">Manage Recipes</span>
          </Link>

          <Link
            to="/meal-plans"
            className="group flex flex-1 min-w-[140px] flex-col items-center gap-3 rounded-2xl bg-card p-5 shadow-soft transition-all duration-300 hover:shadow-medium hover:-translate-y-1"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
              <Calendar className="h-6 w-6" />
            </div>
            <span className="font-medium text-foreground text-sm">View Meal Plans</span>
          </Link>

          <Link
            to="/household"
            className="group flex flex-1 min-w-[140px] flex-col items-center gap-3 rounded-2xl bg-card p-5 shadow-soft transition-all duration-300 hover:shadow-medium hover:-translate-y-1"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
              <Users className="h-6 w-6" />
            </div>
            <span className="font-medium text-foreground text-sm">Update Profile</span>
          </Link>
        </div>
      </section>

      {/* Family Members Preview */}
      <section className="animate-slide-up" style={{ animationDelay: '0.4s' }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl font-semibold text-foreground">
            Your Family
          </h2>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/household">
              Edit
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        {isLoadingProfile && !profileError ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : householdProfile?.family_members && householdProfile.family_members.length > 0 ? (
          <div className="flex flex-wrap gap-4">
            {householdProfile.family_members.map((member) => (
              <div
                key={member.name}
                className="flex items-center gap-3 rounded-2xl bg-card px-5 py-4 shadow-soft"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-display font-semibold">
                  {member.name[0]}
                </div>
                <div>
                  <p className="font-medium text-foreground">{member.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{member.age_group}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-card p-6 text-center">
            <p className="text-muted-foreground mb-4">No family members added yet</p>
            <Button variant="secondary" asChild>
              <Link to="/household">
                Add Family Members
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

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChefHat, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { onboardingAPI, FamilyMember, OnboardingSubmission } from '@/lib/api';

// Step components
import {
  WelcomeStep,
  SkillLevelStep,
  CookingFrequencyStep,
  KitchenEquipmentStep,
  PantryStockStep,
  PrimaryGoalStep,
  CuisinePreferencesStep,
  DietaryGoalsStep,
  HouseholdMembersStep,
  StarterContentStep,
} from './steps';

interface OnboardingWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  skippedCount: number;
  onComplete: () => void;
  onSkip: () => void;
}

export interface OnboardingState {
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
  cookingFrequency: 'daily' | 'few_times_week' | 'few_times_month' | 'rarely';
  kitchenEquipmentLevel: 'minimal' | 'basic' | 'standard' | 'well_equipped';
  pantryStockLevel: 'minimal' | 'moderate' | 'well_stocked';
  primaryGoal: 'grocery_management' | 'recipe_library' | 'household_preferences' | 'meal_planning';
  cuisinePreferences: string[];
  dietaryGoals: 'meal_prep' | 'cook_fresh' | 'mixed';
  dietaryPatterns: string[];
  householdMembers: FamilyMember[];
  starterContentChoice: 'meal_plan' | 'starter_recipes' | 'skip' | null;
}

const INITIAL_STATE: OnboardingState = {
  skillLevel: 'intermediate',
  cookingFrequency: 'few_times_week',
  kitchenEquipmentLevel: 'basic',
  pantryStockLevel: 'moderate',
  primaryGoal: 'meal_planning',
  cuisinePreferences: [],
  dietaryGoals: 'mixed',
  dietaryPatterns: [],
  householdMembers: [],
  starterContentChoice: null,
};

const STEP_TITLES = [
  'Welcome',
  'Cooking Experience',
  'Cooking Frequency',
  'Kitchen Setup',
  'Pantry Stock',
  'Your Goals',
  'Cuisine Preferences',
  'Dietary Preferences',
  'Household Members',
  'Get Started',
];

const TOTAL_STEPS = STEP_TITLES.length;

export function OnboardingWizard({
  open,
  onOpenChange,
  workspaceId,
  skippedCount,
  onComplete,
  onSkip,
}: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [state, setState] = useState<OnboardingState>(INITIAL_STATE);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const queryClient = useQueryClient();

  const submitMutation = useMutation({
    mutationFn: (data: OnboardingSubmission) => onboardingAPI.submit(workspaceId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['onboardingStatus', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['householdProfile', workspaceId] });

      // Show appropriate toast based on starter content choice
      if (variables.starter_content_choice === 'meal_plan') {
        toast.success('Welcome! Generating your meal plan in the background...');
      } else if (variables.starter_content_choice === 'starter_recipes') {
        toast.success('Welcome! Adding starter recipes to your library...');
      } else {
        toast.success('Welcome! Your profile has been set up.');
      }

      onComplete();
    },
    onError: (error) => {
      toast.error(`Failed to save profile: ${error.message}`);
    },
  });

  const skipMutation = useMutation({
    mutationFn: (permanent: boolean) => onboardingAPI.skip(workspaceId, permanent),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboardingStatus', workspaceId] });
      onSkip();
    },
    onError: (error) => {
      toast.error(`Failed to skip: ${error.message}`);
    },
  });

  const updateField = <K extends keyof OnboardingState>(field: K, value: OnboardingState[K]) => {
    setState((prev) => ({ ...prev, [field]: value }));
  };

  const canProceed = (): boolean => {
    // Step 9 (index 8) requires at least one household member
    if (currentStep === 8) {
      return state.householdMembers.length > 0;
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      // Submit onboarding
      const submission: OnboardingSubmission = {
        skill_level: state.skillLevel,
        cooking_frequency: state.cookingFrequency,
        kitchen_equipment_level: state.kitchenEquipmentLevel,
        pantry_stock_level: state.pantryStockLevel,
        primary_goal: state.primaryGoal,
        cuisine_preferences: state.cuisinePreferences,
        dietary_goals: state.dietaryGoals,
        dietary_patterns: state.dietaryPatterns,
        household_members: state.householdMembers,
        starter_content_choice: state.starterContentChoice || 'skip',
      };
      submitMutation.mutate(submission);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    if (skippedCount >= 1) {
      // Second skip - show confirmation for permanent dismiss
      setShowSkipConfirm(true);
    } else {
      // First skip
      skipMutation.mutate(false);
    }
  };

  const handleSkipConfirm = (permanent: boolean) => {
    setShowSkipConfirm(false);
    skipMutation.mutate(permanent);
  };

  const progressPercent = ((currentStep + 1) / TOTAL_STEPS) * 100;

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <WelcomeStep />;
      case 1:
        return (
          <SkillLevelStep
            value={state.skillLevel}
            onChange={(value) => updateField('skillLevel', value)}
          />
        );
      case 2:
        return (
          <CookingFrequencyStep
            value={state.cookingFrequency}
            onChange={(value) => updateField('cookingFrequency', value)}
          />
        );
      case 3:
        return (
          <KitchenEquipmentStep
            value={state.kitchenEquipmentLevel}
            onChange={(value) => updateField('kitchenEquipmentLevel', value)}
          />
        );
      case 4:
        return (
          <PantryStockStep
            value={state.pantryStockLevel}
            onChange={(value) => updateField('pantryStockLevel', value)}
          />
        );
      case 5:
        return (
          <PrimaryGoalStep
            value={state.primaryGoal}
            onChange={(value) => updateField('primaryGoal', value)}
          />
        );
      case 6:
        return (
          <CuisinePreferencesStep
            value={state.cuisinePreferences}
            onChange={(value) => updateField('cuisinePreferences', value)}
          />
        );
      case 7:
        return (
          <DietaryGoalsStep
            dietaryGoals={state.dietaryGoals}
            dietaryPatterns={state.dietaryPatterns}
            onDietaryGoalsChange={(value) => updateField('dietaryGoals', value)}
            onDietaryPatternsChange={(value) => updateField('dietaryPatterns', value)}
          />
        );
      case 8:
        return (
          <HouseholdMembersStep
            value={state.householdMembers}
            onChange={(value) => updateField('householdMembers', value)}
          />
        );
      case 9:
        return (
          <StarterContentStep
            value={state.starterContentChoice}
            onChange={(value) => updateField('starterContentChoice', value)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
          data-testid="onboarding-wizard"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ChefHat className="h-5 w-5 text-primary" />
              {STEP_TITLES[currentStep]}
            </DialogTitle>
            <DialogDescription>
              Step {currentStep + 1} of {TOTAL_STEPS}
            </DialogDescription>
          </DialogHeader>

          {/* Progress bar */}
          <div className="space-y-1">
            <Progress value={progressPercent} className="h-2" />
          </div>

          {/* Step content */}
          <div className="flex-1 overflow-y-auto py-4 min-h-[280px]">
            {renderStep()}
          </div>

          <DialogFooter className="border-t pt-4 flex-col sm:flex-row gap-2">
            <Button
              variant="ghost"
              onClick={handleSkip}
              disabled={skipMutation.isPending}
              className="sm:mr-auto"
            >
              Skip for now
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 0}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <Button
                onClick={handleNext}
                disabled={!canProceed() || submitMutation.isPending}
              >
                {submitMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Saving...
                  </>
                ) : currentStep === TOTAL_STEPS - 1 ? (
                  'Complete Setup'
                ) : currentStep === 0 ? (
                  <>
                    Get Started
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Skip confirmation dialog */}
      <AlertDialog open={showSkipConfirm} onOpenChange={setShowSkipConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Skip setup?</AlertDialogTitle>
            <AlertDialogDescription>
              Would you like to skip setup permanently? You can always configure your
              household profile later from the Profile page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleSkipConfirm(false)}>
              Skip for now
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() => handleSkipConfirm(true)}
              className="bg-muted text-muted-foreground hover:bg-muted/80"
            >
              Don't show again
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

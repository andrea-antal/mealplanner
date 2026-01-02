import { ChefHat, Utensils, Calendar, Users } from 'lucide-react';

export function WelcomeStep() {
  return (
    <div className="space-y-6 text-center py-4">
      <div className="flex justify-center">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
          <ChefHat className="h-8 w-8 text-primary" />
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-xl font-semibold">Welcome to Meal Planner!</h3>
        <p className="text-muted-foreground">
          Let's set up your profile so we can personalize your experience.
          This will only take a couple of minutes.
        </p>
      </div>

      <div className="grid gap-4 text-left pt-4">
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Utensils className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-medium text-sm">Your Cooking Style</p>
            <p className="text-sm text-muted-foreground">
              Tell us about your skill level and kitchen setup
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Calendar className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-medium text-sm">Your Preferences</p>
            <p className="text-sm text-muted-foreground">
              Share your favorite cuisines and dietary needs
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-medium text-sm">Your Household</p>
            <p className="text-sm text-muted-foreground">
              Add members so we can plan meals for everyone
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

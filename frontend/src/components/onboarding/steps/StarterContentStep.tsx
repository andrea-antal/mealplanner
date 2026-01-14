import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Calendar, ChefHat, Sparkles } from 'lucide-react';

type StarterContentChoice = 'meal_plan' | 'starter_recipes' | 'skip';

interface StarterContentStepProps {
  value: StarterContentChoice | null;
  onChange: (value: StarterContentChoice) => void;
}

const OPTIONS = [
  {
    value: 'meal_plan' as const,
    label: 'Generate a Meal Plan',
    description: 'Get a personalized meal plan for next week based on your preferences',
    icon: Calendar,
    recommended: true,
  },
  {
    value: 'starter_recipes' as const,
    label: 'Add Starter Recipes',
    description: 'Add 5-6 recipes to your library based on your cuisine preferences',
    icon: ChefHat,
    recommended: false,
  },
  {
    value: 'skip' as const,
    label: 'Start from scratch',
    description: "I'll add my own recipes and create meal plans later",
    icon: Sparkles,
    recommended: false,
  },
];

export function StarterContentStep({ value, onChange }: StarterContentStepProps) {
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground">
        Would you like us to help you get started? We can create some initial content based on your preferences.
      </p>

      <RadioGroup
        value={value || ''}
        onValueChange={(val) => onChange(val as StarterContentChoice)}
        className="space-y-3"
      >
        {OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSkip = option.value === 'skip';

          return (
            <div
              key={option.value}
              className={`flex items-start space-x-3 ${isSkip ? 'pt-2 border-t' : ''}`}
            >
              <RadioGroupItem
                value={option.value}
                id={option.value}
                className="mt-1"
              />
              <Label
                htmlFor={option.value}
                className="flex-1 cursor-pointer space-y-1"
              >
                <div className="flex items-center gap-2 font-medium">
                  <Icon className={`h-4 w-4 ${isSkip ? 'text-muted-foreground' : 'text-primary'}`} />
                  <span className={isSkip ? 'text-muted-foreground' : ''}>
                    {option.label}
                  </span>
                  {option.recommended && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      Recommended
                    </span>
                  )}
                </div>
                <p className={`text-sm font-normal ${isSkip ? 'text-muted-foreground/70' : 'text-muted-foreground'}`}>
                  {option.description}
                </p>
              </Label>
            </div>
          );
        })}
      </RadioGroup>

      <p className="text-xs text-muted-foreground mt-4">
        Content will be generated in the background after you complete setup.
      </p>
    </div>
  );
}

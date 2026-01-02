import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ShoppingCart, BookOpen, Users, Calendar } from 'lucide-react';

interface PrimaryGoalStepProps {
  value: 'grocery_management' | 'recipe_library' | 'household_preferences' | 'meal_planning';
  onChange: (value: 'grocery_management' | 'recipe_library' | 'household_preferences' | 'meal_planning') => void;
}

const GOALS = [
  {
    value: 'grocery_management' as const,
    label: 'Grocery Management',
    description: 'Track groceries, reduce waste, manage expiration dates',
    icon: ShoppingCart,
  },
  {
    value: 'recipe_library' as const,
    label: 'Recipe Library',
    description: 'Save and organize recipes, get AI-generated suggestions',
    icon: BookOpen,
  },
  {
    value: 'household_preferences' as const,
    label: 'Household Preferences',
    description: 'Manage dietary needs and preferences for my household',
    icon: Users,
  },
  {
    value: 'meal_planning' as const,
    label: 'Meal Planning',
    description: 'Plan weekly meals that work for everyone',
    icon: Calendar,
  },
];

export function PrimaryGoalStep({ value, onChange }: PrimaryGoalStepProps) {
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground">
        What's your main goal for using the app? (You can use all features, but this helps us prioritize.)
      </p>

      <RadioGroup value={value} onValueChange={onChange} className="space-y-3">
        {GOALS.map((goal) => {
          const Icon = goal.icon;
          return (
            <div key={goal.value} className="flex items-start space-x-3">
              <RadioGroupItem value={goal.value} id={goal.value} className="mt-1" />
              <Label
                htmlFor={goal.value}
                className="flex-1 cursor-pointer space-y-1"
              >
                <div className="flex items-center gap-2 font-medium">
                  <Icon className="h-4 w-4 text-primary" />
                  {goal.label}
                </div>
                <p className="text-sm text-muted-foreground font-normal">
                  {goal.description}
                </p>
              </Label>
            </div>
          );
        })}
      </RadioGroup>
    </div>
  );
}

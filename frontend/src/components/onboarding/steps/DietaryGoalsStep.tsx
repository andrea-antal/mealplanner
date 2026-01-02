import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Clock, Flame, Shuffle } from 'lucide-react';

interface DietaryGoalsStepProps {
  dietaryGoals: 'meal_prep' | 'cook_fresh' | 'mixed';
  dietaryPatterns: string[];
  onDietaryGoalsChange: (value: 'meal_prep' | 'cook_fresh' | 'mixed') => void;
  onDietaryPatternsChange: (value: string[]) => void;
}

const MEAL_APPROACHES = [
  {
    value: 'meal_prep' as const,
    label: 'Meal Prep',
    description: 'Batch cook on weekends, reheat during the week',
    icon: Clock,
  },
  {
    value: 'cook_fresh' as const,
    label: 'Cook Fresh',
    description: 'Prefer to cook fresh meals each day',
    icon: Flame,
  },
  {
    value: 'mixed' as const,
    label: 'Mixed Approach',
    description: 'Combination of meal prep and fresh cooking',
    icon: Shuffle,
  },
];

const DIETARY_PATTERNS = [
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'pescatarian', label: 'Pescatarian' },
  { value: 'keto', label: 'Keto' },
  { value: 'low_carb', label: 'Low Carb' },
  { value: 'high_protein', label: 'High Protein' },
  { value: 'gluten_free', label: 'Gluten Free' },
  { value: 'dairy_free', label: 'Dairy Free' },
];

export function DietaryGoalsStep({
  dietaryGoals,
  dietaryPatterns,
  onDietaryGoalsChange,
  onDietaryPatternsChange,
}: DietaryGoalsStepProps) {
  const togglePattern = (pattern: string) => {
    if (dietaryPatterns.includes(pattern)) {
      onDietaryPatternsChange(dietaryPatterns.filter((p) => p !== pattern));
    } else {
      onDietaryPatternsChange([...dietaryPatterns, pattern]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Meal approach */}
      <div className="space-y-3">
        <p className="text-muted-foreground">
          How do you prefer to approach cooking?
        </p>

        <RadioGroup value={dietaryGoals} onValueChange={onDietaryGoalsChange} className="space-y-2">
          {MEAL_APPROACHES.map((approach) => {
            const Icon = approach.icon;
            return (
              <div key={approach.value} className="flex items-start space-x-3">
                <RadioGroupItem value={approach.value} id={approach.value} className="mt-1" />
                <Label
                  htmlFor={approach.value}
                  className="flex-1 cursor-pointer space-y-0.5"
                >
                  <div className="flex items-center gap-2 font-medium">
                    <Icon className="h-4 w-4 text-primary" />
                    {approach.label}
                  </div>
                  <p className="text-sm text-muted-foreground font-normal">
                    {approach.description}
                  </p>
                </Label>
              </div>
            );
          })}
        </RadioGroup>
      </div>

      {/* Dietary patterns */}
      <div className="space-y-3">
        <p className="text-muted-foreground">
          Any dietary patterns to consider? (Optional)
        </p>

        <div className="grid grid-cols-2 gap-3">
          {DIETARY_PATTERNS.map((pattern) => (
            <div key={pattern.value} className="flex items-center space-x-2">
              <Checkbox
                id={pattern.value}
                checked={dietaryPatterns.includes(pattern.value)}
                onCheckedChange={() => togglePattern(pattern.value)}
              />
              <Label htmlFor={pattern.value} className="cursor-pointer">
                {pattern.label}
              </Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { BookOpen, Utensils, ChefHat } from 'lucide-react';

interface SkillLevelStepProps {
  value: 'beginner' | 'intermediate' | 'advanced';
  onChange: (value: 'beginner' | 'intermediate' | 'advanced') => void;
}

const SKILL_LEVELS = [
  {
    value: 'beginner' as const,
    label: 'Beginner',
    description: 'Learning the basics, following recipes step-by-step',
    icon: BookOpen,
  },
  {
    value: 'intermediate' as const,
    label: 'Intermediate',
    description: 'Comfortable with most recipes, can make substitutions',
    icon: Utensils,
  },
  {
    value: 'advanced' as const,
    label: 'Advanced',
    description: 'Can improvise, create dishes, and adapt on the fly',
    icon: ChefHat,
  },
];

export function SkillLevelStep({ value, onChange }: SkillLevelStepProps) {
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground">
        What's your cooking skill level? This helps us suggest recipes that match your experience.
      </p>

      <RadioGroup value={value} onValueChange={onChange} className="space-y-3">
        {SKILL_LEVELS.map((level) => {
          const Icon = level.icon;
          return (
            <div key={level.value} className="flex items-start space-x-3">
              <RadioGroupItem value={level.value} id={level.value} className="mt-1" />
              <Label
                htmlFor={level.value}
                className="flex-1 cursor-pointer space-y-1"
              >
                <div className="flex items-center gap-2 font-medium">
                  <Icon className="h-4 w-4 text-primary" />
                  {level.label}
                </div>
                <p className="text-sm text-muted-foreground font-normal">
                  {level.description}
                </p>
              </Label>
            </div>
          );
        })}
      </RadioGroup>
    </div>
  );
}

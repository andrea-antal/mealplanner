import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Zap, Flame, CookingPot, Sparkles } from 'lucide-react';

interface KitchenEquipmentStepProps {
  value: 'minimal' | 'basic' | 'standard' | 'well_equipped';
  onChange: (value: 'minimal' | 'basic' | 'standard' | 'well_equipped') => void;
}

const EQUIPMENT_LEVELS = [
  {
    value: 'minimal' as const,
    label: 'Minimal',
    description: 'Microwave, basic pots and pans',
    icon: Zap,
  },
  {
    value: 'basic' as const,
    label: 'Basic',
    description: 'Microwave, oven, stovetop, essential cookware',
    icon: Flame,
  },
  {
    value: 'standard' as const,
    label: 'Standard',
    description: 'Full kitchen with blender, mixer, and various appliances',
    icon: CookingPot,
  },
  {
    value: 'well_equipped' as const,
    label: 'Well Equipped',
    description: 'Instant Pot, food processor, stand mixer, and more',
    icon: Sparkles,
  },
];

export function KitchenEquipmentStep({ value, onChange }: KitchenEquipmentStepProps) {
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground">
        How would you describe your kitchen setup? This helps us recommend recipes you can actually make.
      </p>

      <RadioGroup value={value} onValueChange={onChange} className="space-y-3">
        {EQUIPMENT_LEVELS.map((level) => {
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

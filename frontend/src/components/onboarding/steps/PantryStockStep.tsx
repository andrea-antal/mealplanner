import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Package, PackageOpen, Archive } from 'lucide-react';

interface PantryStockStepProps {
  value: 'minimal' | 'moderate' | 'well_stocked';
  onChange: (value: 'minimal' | 'moderate' | 'well_stocked') => void;
}

const PANTRY_LEVELS = [
  {
    value: 'minimal' as const,
    label: 'Minimal',
    description: 'Salt, pepper, and a few basics - I buy most things per recipe',
    icon: Package,
  },
  {
    value: 'moderate' as const,
    label: 'Moderate',
    description: 'Common spices, oils, and staples like pasta, rice, canned goods',
    icon: PackageOpen,
  },
  {
    value: 'well_stocked' as const,
    label: 'Well Stocked',
    description: 'Extensive spice collection, various grains, specialty ingredients',
    icon: Archive,
  },
];

export function PantryStockStep({ value, onChange }: PantryStockStepProps) {
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground">
        How stocked is your pantry? This helps us understand what ingredients you typically have on hand.
      </p>

      <RadioGroup value={value} onValueChange={onChange} className="space-y-3">
        {PANTRY_LEVELS.map((level) => {
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

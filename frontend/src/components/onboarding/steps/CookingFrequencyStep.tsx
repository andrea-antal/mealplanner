import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Clock, CalendarDays, Calendar, CalendarOff } from 'lucide-react';

interface CookingFrequencyStepProps {
  value: 'daily' | 'few_times_week' | 'few_times_month' | 'rarely';
  onChange: (value: 'daily' | 'few_times_week' | 'few_times_month' | 'rarely') => void;
}

const FREQUENCIES = [
  {
    value: 'daily' as const,
    label: 'Daily',
    description: 'I cook most days of the week',
    icon: Clock,
  },
  {
    value: 'few_times_week' as const,
    label: 'A few times a week',
    description: 'I cook 2-4 times per week',
    icon: CalendarDays,
  },
  {
    value: 'few_times_month' as const,
    label: 'A few times a month',
    description: 'I cook occasionally, maybe weekly',
    icon: Calendar,
  },
  {
    value: 'rarely' as const,
    label: 'Rarely',
    description: 'I cook occasionally or am just getting started',
    icon: CalendarOff,
  },
];

export function CookingFrequencyStep({ value, onChange }: CookingFrequencyStepProps) {
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground">
        How often do you typically cook at home?
      </p>

      <RadioGroup value={value} onValueChange={onChange} className="space-y-3">
        {FREQUENCIES.map((freq) => {
          const Icon = freq.icon;
          return (
            <div key={freq.value} className="flex items-start space-x-3">
              <RadioGroupItem value={freq.value} id={freq.value} className="mt-1" />
              <Label
                htmlFor={freq.value}
                className="flex-1 cursor-pointer space-y-1"
              >
                <div className="flex items-center gap-2 font-medium">
                  <Icon className="h-4 w-4 text-primary" />
                  {freq.label}
                </div>
                <p className="text-sm text-muted-foreground font-normal">
                  {freq.description}
                </p>
              </Label>
            </div>
          );
        })}
      </RadioGroup>
    </div>
  );
}

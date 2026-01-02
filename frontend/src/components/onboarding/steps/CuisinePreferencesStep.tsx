import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';

interface CuisinePreferencesStepProps {
  value: string[];
  onChange: (value: string[]) => void;
}

const CUISINE_OPTIONS = [
  { value: 'italian', label: 'Italian' },
  { value: 'mexican', label: 'Mexican' },
  { value: 'chinese', label: 'Chinese' },
  { value: 'korean', label: 'Korean' },
  { value: 'japanese', label: 'Japanese' },
  { value: 'greek', label: 'Greek' },
  { value: 'indian', label: 'Indian' },
  { value: 'thai', label: 'Thai' },
  { value: 'mediterranean', label: 'Mediterranean' },
  { value: 'american', label: 'American' },
];

export function CuisinePreferencesStep({ value, onChange }: CuisinePreferencesStepProps) {
  const [customCuisine, setCustomCuisine] = useState('');

  const toggleCuisine = (cuisine: string) => {
    if (value.includes(cuisine)) {
      onChange(value.filter((c) => c !== cuisine));
    } else {
      onChange([...value, cuisine]);
    }
  };

  const addCustomCuisine = () => {
    const trimmed = customCuisine.trim().toLowerCase();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
      setCustomCuisine('');
    }
  };

  const removeCustomCuisine = (cuisine: string) => {
    onChange(value.filter((c) => c !== cuisine));
  };

  // Separate standard cuisines from custom ones
  const standardCuisineValues = CUISINE_OPTIONS.map((c) => c.value);
  const customCuisines = value.filter((c) => !standardCuisineValues.includes(c));

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground">
        What cuisines do you enjoy? Select all that apply. (Optional)
      </p>

      <div className="grid grid-cols-2 gap-3">
        {CUISINE_OPTIONS.map((cuisine) => (
          <div key={cuisine.value} className="flex items-center space-x-2">
            <Checkbox
              id={cuisine.value}
              checked={value.includes(cuisine.value)}
              onCheckedChange={() => toggleCuisine(cuisine.value)}
            />
            <Label htmlFor={cuisine.value} className="cursor-pointer">
              {cuisine.label}
            </Label>
          </div>
        ))}
      </div>

      {/* Custom cuisines */}
      {customCuisines.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2">
          {customCuisines.map((cuisine) => (
            <span
              key={cuisine}
              className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-full text-sm"
            >
              {cuisine}
              <button
                type="button"
                onClick={() => removeCustomCuisine(cuisine)}
                className="hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Add custom cuisine */}
      <div className="flex gap-2 pt-2">
        <Input
          placeholder="Add other cuisine (e.g., Hungarian, Vietnamese)"
          value={customCuisine}
          onChange={(e) => setCustomCuisine(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addCustomCuisine();
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={addCustomCuisine}
          disabled={!customCuisine.trim()}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

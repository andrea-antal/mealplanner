import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Sparkles, Settings2, Loader2, Users, BookOpen, ChefHat } from 'lucide-react';
import { householdAPI, type GenerationConfig, type MemberWeight } from '@/lib/api';

const APPLIANCE_OPTIONS = [
  { id: 'oven', label: 'Oven' },
  { id: 'stovetop', label: 'Stovetop' },
  { id: 'slow_cooker', label: 'Slow Cooker' },
  { id: 'instant_pot', label: 'Instant Pot' },
  { id: 'air_fryer', label: 'Air Fryer' },
  { id: 'grill', label: 'Grill' },
] as const;

interface GenerationConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  onGenerate: (config: GenerationConfig) => void;
}

export function GenerationConfigModal({
  open,
  onOpenChange,
  workspaceId,
  onGenerate,
}: GenerationConfigModalProps) {
  // Fetch household profile to get family members
  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['household-profile', workspaceId],
    queryFn: () => householdAPI.getProfile(workspaceId),
    enabled: open && !!workspaceId,
  });

  // State
  const [memberWeights, setMemberWeights] = useState<MemberWeight[]>([]);
  const [recipeSource, setRecipeSource] = useState<'library_only' | 'ai_generated_only' | 'mix'>('mix');
  const [selectedAppliances, setSelectedAppliances] = useState<string[]>([]);

  // Initialize member weights when profile loads
  useEffect(() => {
    if (profile?.family_members && profile.family_members.length > 0) {
      setMemberWeights(
        profile.family_members.map((member) => ({
          name: member.name,
          weight: 50,
        }))
      );
    }
  }, [profile]);

  // Initialize appliances from profile cooking preferences
  useEffect(() => {
    if (profile?.cooking_preferences?.available_appliances) {
      setSelectedAppliances(profile.cooking_preferences.available_appliances);
    }
  }, [profile]);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setRecipeSource('mix');
      // Weights and appliances will reinitialize from profile via their own useEffects
    }
  }, [open]);

  const handleWeightChange = (memberName: string, value: number[]) => {
    setMemberWeights((prev) =>
      prev.map((mw) =>
        mw.name === memberName ? { ...mw, weight: value[0] } : mw
      )
    );
  };

  const handleApplianceToggle = (applianceId: string) => {
    setSelectedAppliances((prev) =>
      prev.includes(applianceId)
        ? prev.filter((a) => a !== applianceId)
        : [...prev, applianceId]
    );
  };

  const handleGenerate = () => {
    const config: GenerationConfig = {};

    // Only include weights if they were customized (not all 50)
    const hasCustomWeights = memberWeights.some((mw) => mw.weight !== 50);
    if (hasCustomWeights && memberWeights.length > 0) {
      config.member_weights = memberWeights;
    }

    // Only include recipe source if not default
    if (recipeSource !== 'mix') {
      config.recipe_source = recipeSource;
    } else {
      config.recipe_source = 'mix';
    }

    // Only include appliances if selection differs from default
    if (selectedAppliances.length > 0) {
      config.appliances = selectedAppliances;
    }

    onGenerate(config);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            Generation Settings
          </DialogTitle>
          <DialogDescription>
            Customize how the AI generates your meal plan
          </DialogDescription>
        </DialogHeader>

        {isLoadingProfile ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6 py-2">
            {/* Member Preference Weights */}
            {memberWeights.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">
                    Preference Weights
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Adjust how much each person's food preferences influence the plan.
                  Higher values mean their likes and dislikes matter more.
                </p>
                <div className="space-y-4">
                  {memberWeights.map((mw) => (
                    <div key={mw.name} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">{mw.name}</Label>
                        <span className="text-xs font-mono text-muted-foreground tabular-nums w-8 text-right">
                          {mw.weight}
                        </span>
                      </div>
                      <Slider
                        value={[mw.weight]}
                        min={0}
                        max={100}
                        step={5}
                        onValueChange={(value) =>
                          handleWeightChange(mw.name, value)
                        }
                        className="w-full"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recipe Source */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">
                  Recipe Source
                </h3>
              </div>
              <RadioGroup
                value={recipeSource}
                onValueChange={(val) =>
                  setRecipeSource(
                    val as 'library_only' | 'ai_generated_only' | 'mix'
                  )
                }
                className="space-y-2"
              >
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="mix" id="source-mix" />
                  <Label htmlFor="source-mix" className="text-sm font-normal cursor-pointer">
                    Mix (recommended) -- Use library recipes when available, AI fills gaps
                  </Label>
                </div>
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="library_only" id="source-library" />
                  <Label
                    htmlFor="source-library"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Library Only -- Only use your saved recipes
                  </Label>
                </div>
                <div className="flex items-center space-x-3">
                  <RadioGroupItem
                    value="ai_generated_only"
                    id="source-ai"
                  />
                  <Label htmlFor="source-ai" className="text-sm font-normal cursor-pointer">
                    AI-Generated Only -- All new suggestions, no library recipes
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Appliance Selection */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ChefHat className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">
                  Available Appliances
                </h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Only recipes using these appliances will be included.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {APPLIANCE_OPTIONS.map((appliance) => (
                  <div
                    key={appliance.id}
                    className="flex items-center space-x-2"
                  >
                    <Checkbox
                      id={`appliance-${appliance.id}`}
                      checked={selectedAppliances.includes(appliance.id)}
                      onCheckedChange={() =>
                        handleApplianceToggle(appliance.id)
                      }
                    />
                    <Label
                      htmlFor={`appliance-${appliance.id}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {appliance.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Action button */}
        <div className="flex justify-end pt-2 border-t">
          <Button
            type="button"
            variant="default"
            onClick={handleGenerate}
            disabled={isLoadingProfile}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Generate with These Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

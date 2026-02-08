import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { householdAPI, type HouseholdProfile } from '@/lib/api';
import { getCurrentWorkspace } from '@/lib/workspace';
import { Loader2, Check, AlertCircle } from 'lucide-react';
import { useAutoSave } from '@/hooks/useAutoSave';

const CookingPreferences = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const workspaceId = getCurrentWorkspace();

  // Redirect to home if no workspace is set
  useEffect(() => {
    if (!workspaceId) {
      navigate('/');
    }
  }, [workspaceId, navigate]);

  if (!workspaceId) {
    return null;
  }

  const [profile, setProfile] = useState<HouseholdProfile | null>(null);

  // Fetch household profile from backend
  const { data: fetchedProfile, isLoading, error } = useQuery({
    queryKey: ['householdProfile', workspaceId],
    queryFn: () => householdAPI.getProfile(workspaceId),
    retry: false,
  });

  // Update local state when data is fetched
  useEffect(() => {
    if (fetchedProfile) {
      setProfile(fetchedProfile);
    } else if (error && error.message.includes('404')) {
      const emptyProfile: HouseholdProfile = {
        family_members: [],
        daycare_rules: {
          no_nuts: false,
          no_honey: false,
          must_be_cold: false,
        },
        cooking_preferences: {
          available_appliances: [],
          preferred_methods: [],
          skill_level: 'intermediate',
          max_active_cooking_time_weeknight: 30,
          max_active_cooking_time_weekend: 60,
        },
        preferences: {
          weeknight_priority: 'speed',
          weekend_priority: 'variety',
        },
      };
      setProfile(emptyProfile);
    }
  }, [fetchedProfile, error]);

  // Auto-save callback
  const handleAutoSave = useCallback(async (data: HouseholdProfile) => {
    const savedProfile = await householdAPI.updateProfile(workspaceId, data);
    queryClient.setQueryData(['householdProfile', workspaceId], savedProfile);
  }, [workspaceId, queryClient]);

  // Auto-save hook
  const { status: saveStatus } = useAutoSave({
    data: profile,
    originalData: fetchedProfile,
    onSave: handleAutoSave,
    debounceMs: 800,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !error.message.includes('404')) {
    return (
      <div className="rounded-xl bg-destructive/10 p-6 text-destructive">
        <h2 className="font-semibold mb-2">Error loading profile</h2>
        <p className="text-sm">{error instanceof Error ? error.message : 'Unknown error'}</p>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  // Helper to render save status indicator
  const renderSaveStatus = () => {
    switch (saveStatus) {
      case 'saving':
        return (
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Saving...
          </span>
        );
      case 'saved':
        return (
          <span className="inline-flex items-center gap-1.5 text-sm text-emerald-600">
            <Check className="h-3.5 w-3.5" />
            Saved
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1.5 text-sm text-destructive">
            <AlertCircle className="h-3.5 w-3.5" />
            Failed to save
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Cooking Preferences
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure your cooking skills, time constraints, and available equipment.
          </p>
        </div>
        {renderSaveStatus()}
      </div>

        {/* Cooking Preferences */}
        <section className="rounded-xl bg-card border border-border p-6 shadow-xs space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Skill Level</Label>
              <Select
                value={profile.cooking_preferences.skill_level}
                onValueChange={(value) =>
                  setProfile((prev) => prev ? ({
                    ...prev,
                    cooking_preferences: {
                      ...prev.cooking_preferences,
                      skill_level: value as 'beginner' | 'intermediate' | 'advanced',
                    },
                  }) : null)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Max Weeknight Cooking Time (minutes)</Label>
              <Input
                type="number"
                value={profile.cooking_preferences.max_active_cooking_time_weeknight}
                onChange={(e) =>
                  setProfile((prev) => prev ? ({
                    ...prev,
                    cooking_preferences: {
                      ...prev.cooking_preferences,
                      max_active_cooking_time_weeknight: parseInt(e.target.value) || 0,
                    },
                  }) : null)
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Max Weekend Cooking Time (minutes)</Label>
              <Input
                type="number"
                value={profile.cooking_preferences.max_active_cooking_time_weekend}
                onChange={(e) =>
                  setProfile((prev) => prev ? ({
                    ...prev,
                    cooking_preferences: {
                      ...prev.cooking_preferences,
                      max_active_cooking_time_weekend: parseInt(e.target.value) || 0,
                    },
                  }) : null)
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Weeknight Priority</Label>
              <Select
                value={profile.preferences.weeknight_priority}
                onValueChange={(value) =>
                  setProfile((prev) => prev ? ({
                    ...prev,
                    preferences: {
                      ...prev.preferences,
                      weeknight_priority: value,
                    },
                  }) : null)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quick">Quick meals</SelectItem>
                  <SelectItem value="batch-cookable">Batch cookable</SelectItem>
                  <SelectItem value="minimal-prep">Minimal prep</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Available Appliances</Label>
            <div className="flex flex-wrap gap-2">
              {['oven', 'instant_pot', 'blender', 'food_processor', 'microwave'].map((appliance) => (
                <Badge
                  key={appliance}
                  variant={profile.cooking_preferences.available_appliances.includes(appliance) ? 'default' : 'outline'}
                  className="cursor-pointer capitalize"
                  onClick={() =>
                    setProfile((prev) => prev ? ({
                      ...prev,
                      cooking_preferences: {
                        ...prev.cooking_preferences,
                        available_appliances: prev.cooking_preferences.available_appliances.includes(appliance)
                          ? prev.cooking_preferences.available_appliances.filter((a: string) => a !== appliance)
                          : [...prev.cooking_preferences.available_appliances, appliance],
                      },
                    }) : null)
                  }
                >
                  {appliance.replace('_', ' ')}
                </Badge>
              ))}
            </div>
          </div>
        </section>

        </div>
  );
};

export default CookingPreferences;

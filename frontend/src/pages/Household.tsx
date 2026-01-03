import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
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
import { householdAPI, type HouseholdProfile, type FamilyMember } from '@/lib/api';
import { getCurrentWorkspace } from '@/lib/workspace';
import { Plus, Trash2, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const Household = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const workspaceId = getCurrentWorkspace();

  // Redirect to home if no workspace is set (defense in depth)
  useEffect(() => {
    if (!workspaceId) {
      navigate('/');
    }
  }, [workspaceId, navigate]);

  // Don't render if no workspace
  if (!workspaceId) {
    return null;
  }

  const [profile, setProfile] = useState<HouseholdProfile | null>(null);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberAgeGroup, setNewMemberAgeGroup] = useState<FamilyMember['age_group']>('adult');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Fetch household profile from backend
  const { data: fetchedProfile, isLoading, error } = useQuery({
    queryKey: ['householdProfile', workspaceId],
    queryFn: () => householdAPI.getProfile(workspaceId),
    retry: false, // Don't retry on 404 - just means no profile yet
  });

  // Update local state when data is fetched, or initialize empty profile if 404
  useEffect(() => {
    if (fetchedProfile) {
      setProfile(fetchedProfile);
      setHasUnsavedChanges(false); // Reset unsaved changes when fresh data is loaded
    } else if (error && error.message.includes('404')) {
      // No profile exists yet - initialize with empty profile
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

  // Detect unsaved changes by comparing current profile with fetched profile
  useEffect(() => {
    if (!profile || !fetchedProfile) {
      setHasUnsavedChanges(false);
      return;
    }

    const hasChanges = JSON.stringify(profile) !== JSON.stringify(fetchedProfile);
    setHasUnsavedChanges(hasChanges);
  }, [profile, fetchedProfile]);

  // Mutation to save profile to backend
  const saveMutation = useMutation({
    mutationFn: (updatedProfile: HouseholdProfile) => householdAPI.updateProfile(workspaceId, updatedProfile),
    onSuccess: (savedProfile) => {
      queryClient.setQueryData(['householdProfile', workspaceId], savedProfile);
      setProfile(savedProfile);
      toast.success('Profile saved successfully!');
    },
    onError: (error: Error) => {
      toast.error(`Failed to save profile: ${error.message}`);
    },
  });

  const addFamilyMember = () => {
    if (!newMemberName.trim() || !profile) return;
    const newMember: FamilyMember = {
      name: newMemberName.trim(),
      age_group: newMemberAgeGroup,
      allergies: [],
      dislikes: [],
      preferences: [],
    };
    setProfile((prev) => prev ? ({
      ...prev,
      family_members: [...prev.family_members, newMember],
    }) : null);
    setNewMemberName('');
    setNewMemberAgeGroup('adult');
    toast.success(`${newMember.name} added to family`);
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    addFamilyMember();
  };

  const removeFamilyMember = (name: string) => {
    if (!profile) return;
    setProfile((prev) => prev ? ({
      ...prev,
      family_members: prev.family_members.filter((m) => m.name !== name),
    }) : null);
    toast.success(`${name} removed from family`);
  };

  const updateMemberPreferencesText = (name: string, rawText: string) => {
    // Update raw text immediately (allows typing spaces)
    if (!profile) return;
    setProfile((prev) => prev ? ({
      ...prev,
      family_members: prev.family_members.map((m) =>
        m.name === name ? { ...m, preferences: [rawText] } : m  // Store as single-item array temporarily
      ),
    }) : null);
  };

  const parseMemberPreferences = (name: string) => {
    // Parse comma-separated text into array on blur
    if (!profile) return;
    const member = profile.family_members.find(m => m.name === name);
    if (!member || !member.preferences || member.preferences.length === 0) return;

    const rawText = member.preferences[0] || '';
    const preferences = rawText
      .split(',')
      .map(p => p.trim())
      .filter(p => p.length > 0);

    setProfile((prev) => prev ? ({
      ...prev,
      family_members: prev.family_members.map((m) =>
        m.name === name ? { ...m, preferences } : m
      ),
    }) : null);
  };

  const updateMemberAllergiesText = (name: string, rawText: string) => {
    if (!profile) return;
    setProfile((prev) => prev ? ({
      ...prev,
      family_members: prev.family_members.map((m) =>
        m.name === name ? { ...m, allergies: [rawText] } : m
      ),
    }) : null);
  };

  const parseMemberAllergies = (name: string) => {
    if (!profile) return;
    const member = profile.family_members.find(m => m.name === name);
    if (!member || !member.allergies || member.allergies.length === 0) return;

    const rawText = member.allergies[0] || '';
    const allergies = rawText
      .split(',')
      .map(p => p.trim())
      .filter(p => p.length > 0);

    setProfile((prev) => prev ? ({
      ...prev,
      family_members: prev.family_members.map((m) =>
        m.name === name ? { ...m, allergies } : m
      ),
    }) : null);
  };

  const updateMemberDislikesText = (name: string, rawText: string) => {
    if (!profile) return;
    setProfile((prev) => prev ? ({
      ...prev,
      family_members: prev.family_members.map((m) =>
        m.name === name ? { ...m, dislikes: [rawText] } : m
      ),
    }) : null);
  };

  const parseMemberDislikes = (name: string) => {
    if (!profile) return;
    const member = profile.family_members.find(m => m.name === name);
    if (!member || !member.dislikes || member.dislikes.length === 0) return;

    const rawText = member.dislikes[0] || '';
    const dislikes = rawText
      .split(',')
      .map(p => p.trim())
      .filter(p => p.length > 0);

    setProfile((prev) => prev ? ({
      ...prev,
      family_members: prev.family_members.map((m) =>
        m.name === name ? { ...m, dislikes } : m
      ),
    }) : null);
  };

  const saveProfile = () => {
    if (!profile) return;
    saveMutation.mutate(profile);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Only show error if it's not a 404 (404 means no profile yet, which is handled above)
  if (error && !error.message.includes('404')) {
    return (
      <div className="rounded-2xl bg-destructive/10 p-6 text-destructive">
        <h2 className="font-semibold mb-2">Error loading household profile</h2>
        <p className="text-sm">{error instanceof Error ? error.message : 'Unknown error'}</p>
        <p className="text-sm mt-2">Make sure your backend is running at http://localhost:8000</p>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  // Render unsaved changes banner into the slot in AppLayout
  const bannerSlot = document.getElementById('unsaved-banner-slot');
  const unsavedBanner = hasUnsavedChanges && bannerSlot ? createPortal(
    <div className="fixed top-16 left-0 right-0 z-40 bg-orange-50 dark:bg-orange-950/95 border-b border-orange-200 dark:border-orange-800 p-3 flex items-center justify-center gap-3 shadow-md backdrop-blur-sm">
      <div className="flex items-center gap-3 max-w-4xl w-full px-8">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
            You have unsaved changes — remember to click{' '}
            <a
              href="#save-changes-section"
              className="underline hover:text-orange-900 dark:hover:text-orange-100 transition-colors"
            >
              Save Changes
            </a>{' '}
            at the bottom of the page.
          </p>
        </div>
      </div>
    </div>,
    bannerSlot
  ) : null;

  return (
    <>
      {unsavedBanner}
      <div className="space-y-8 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Household Profile
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure your cooking preferences, family members and constraints/preferences.
          </p>
        </div>

        {/* Cooking Preferences */}
      <section className="rounded-2xl bg-card p-6 shadow-soft space-y-6">
        <h2 className="font-display text-xl font-semibold text-foreground">
          Cooking Preferences
        </h2>

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

      {/* Family Members */}
      <section className="rounded-2xl bg-card p-6 shadow-soft space-y-6">
        <h2 className="font-display text-xl font-semibold text-foreground">
          Family Members
        </h2>

        <div className="space-y-4">
          {profile.family_members.map((member: FamilyMember) => (
            <div
              key={member.name}
              className="flex flex-col md:flex-row md:items-center gap-4 p-4 rounded-xl bg-muted/50"
            >
              <div className="flex items-center gap-3 w-full md:w-auto">
                <p className="flex-1 md:flex-none font-medium text-foreground">
                  {member.name}{' '}
                  <span className="text-muted-foreground">
                    ({member.age_group.charAt(0).toUpperCase() + member.age_group.slice(1)})
                  </span>
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFamilyMember(member.name)}
                  className="md:hidden"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <div className="flex-1 w-full md:w-auto">
                <div className="flex flex-wrap gap-1 mt-1">
                  {member.allergies.length > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      Allergic: {member.allergies.join(', ')}
                    </Badge>
                  )}
                  {member.dislikes.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      Dislikes: {member.dislikes.join(', ')}
                    </Badge>
                  )}
                  {member.preferences && member.preferences.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      Preferences: {member.preferences.join(', ')}
                    </Badge>
                  )}
                </div>
                <div className="mt-2 space-y-2">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      Allergies
                    </label>
                    <Input
                      placeholder="e.g., peanuts, shellfish, tree nuts"
                      value={member.allergies?.join(', ') || ''}
                      onChange={(e) => updateMemberAllergiesText(member.name, e.target.value)}
                      onBlur={() => parseMemberAllergies(member.name)}
                      className="text-sm h-8 placeholder:italic"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      Dislikes
                    </label>
                    <Input
                      placeholder="e.g., mushrooms, cilantro, olives"
                      value={member.dislikes?.join(', ') || ''}
                      onChange={(e) => updateMemberDislikesText(member.name, e.target.value)}
                      onBlur={() => parseMemberDislikes(member.name)}
                      className="text-sm h-8 placeholder:italic"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      Dietary Preferences
                    </label>
                    <Input
                      placeholder="e.g., vegetarian, lactose-intolerant, low-carb"
                      value={member.preferences?.join(', ') || ''}
                      onChange={(e) => updateMemberPreferencesText(member.name, e.target.value)}
                      onBlur={() => parseMemberPreferences(member.name)}
                      className="text-sm h-8 placeholder:italic"
                    />
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeFamilyMember(member.name)}
                className="hidden md:inline-flex"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>

        <form onSubmit={handleAddMember} className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="Add family member..."
            value={newMemberName}
            onChange={(e) => setNewMemberName(e.target.value)}
            className="flex-1"
          />
          <Select
            value={newMemberAgeGroup}
            onValueChange={(value) => setNewMemberAgeGroup(value as FamilyMember['age_group'])}
          >
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="toddler">Toddler</SelectItem>
              <SelectItem value="child">Child</SelectItem>
              <SelectItem value="adult">Adult</SelectItem>
            </SelectContent>
          </Select>
          <Button type="submit" disabled={!newMemberName.trim()}>
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </form>
      </section>

      {/* Daycare Rules - Hardcoded (not editable in v0.1) */}
      <section className="rounded-2xl bg-card p-6 shadow-soft space-y-6">
        <h2 className="font-display text-xl font-semibold text-foreground">
          Daycare Rules
        </h2>
        <p className="text-sm text-muted-foreground">
          These rules are enforced for daycare meals and snacks
        </p>
        <p className="text-sm text-amber-600 font-medium">
          Note: This section cannot be changed currently.
        </p>

        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Badge variant="destructive" className="text-xs">Required</Badge>
            <span className="text-sm font-medium">No chocolate</span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Badge variant="destructive" className="text-xs">Required</Badge>
            <span className="text-sm font-medium">No nuts (peanuts, cashews, almonds, etc)</span>
          </div>
        </div>
      </section>

      {/* Save Changes Button */}
      <div id="save-changes-section" className="flex justify-center md:justify-end pt-6 border-t">
        <Button
          variant="hero"
          size="lg"
          onClick={saveProfile}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
    </>
  );
};

export default Household;

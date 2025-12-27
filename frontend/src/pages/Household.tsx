import { useState, useEffect } from 'react';
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
      age_group: 'adult',
      allergies: [],
      dislikes: [],
      preferences: [],
    };
    setProfile((prev) => prev ? ({
      ...prev,
      family_members: [...prev.family_members, newMember],
    }) : null);
    setNewMemberName('');
    toast.success(`${newMember.name} added to family`);
  };

  const removeFamilyMember = (name: string) => {
    if (!profile) return;
    setProfile((prev) => prev ? ({
      ...prev,
      family_members: prev.family_members.filter((m) => m.name !== name),
    }) : null);
    toast.success(`${name} removed from family`);
  };

  const updateMemberAgeGroup = (name: string, age_group: FamilyMember['age_group']) => {
    if (!profile) return;
    setProfile((prev) => prev ? ({
      ...prev,
      family_members: prev.family_members.map((m) =>
        m.name === name ? { ...m, age_group } : m
      ),
    }) : null);
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

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Household Profile
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure your family's dietary constraints and preferences
          </p>
        </div>

        <Button
          variant="hero"
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

      {/* Family Members */}
      <section className="rounded-2xl bg-card p-6 shadow-soft space-y-6">
        <h2 className="font-display text-xl font-semibold text-foreground">
          Family Members
        </h2>

        <div className="space-y-4">
          {profile.family_members.map((member: FamilyMember) => (
            <div
              key={member.name}
              className="flex items-center gap-4 p-4 rounded-xl bg-muted/50"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-display font-semibold">
                {member.name[0]}
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">{member.name}</p>
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
                    <Input
                      placeholder="Add allergies (e.g., peanuts, shellfish)..."
                      value={member.allergies?.join(', ') || ''}
                      onChange={(e) => updateMemberAllergiesText(member.name, e.target.value)}
                      onBlur={() => parseMemberAllergies(member.name)}
                      className="text-sm h-8"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Allergies (strict exclusions for safety)
                    </p>
                  </div>
                  <div>
                    <Input
                      placeholder="Add dislikes (e.g., mushrooms, cilantro)..."
                      value={member.dislikes?.join(', ') || ''}
                      onChange={(e) => updateMemberDislikesText(member.name, e.target.value)}
                      onBlur={() => parseMemberDislikes(member.name)}
                      className="text-sm h-8"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Dislikes (strong preferences to avoid)
                    </p>
                  </div>
                  <div>
                    <Input
                      placeholder="Add dietary preferences (e.g., lactose-intolerant, pescetarian)..."
                      value={member.preferences?.join(', ') || ''}
                      onChange={(e) => updateMemberPreferencesText(member.name, e.target.value)}
                      onBlur={() => parseMemberPreferences(member.name)}
                      className="text-sm h-8"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Dietary patterns/guidelines (e.g., mostly pescetarian, low-carb)
                    </p>
                  </div>
                </div>
              </div>
              <Select
                value={member.age_group}
                onValueChange={(value) =>
                  updateMemberAgeGroup(member.name, value as FamilyMember['age_group'])
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="toddler">Toddler</SelectItem>
                  <SelectItem value="child">Child</SelectItem>
                  <SelectItem value="adult">Adult</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeFamilyMember(member.name)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Add family member..."
            value={newMemberName}
            onChange={(e) => setNewMemberName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addFamilyMember()}
          />
          <Button onClick={addFamilyMember} disabled={!newMemberName.trim()}>
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>
      </section>

      {/* Daycare Rules - Hardcoded (not editable in v0.1) */}
      <section className="rounded-2xl bg-card p-6 shadow-soft space-y-6">
        <h2 className="font-display text-xl font-semibold text-foreground">
          Daycare Rules
        </h2>
        <p className="text-sm text-muted-foreground">
          These rules are enforced for daycare meals and snacks
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
    </div>
  );
};

export default Household;

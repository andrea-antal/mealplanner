import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { householdAPI, type HouseholdProfile, type FamilyMember } from '@/lib/api';
import { getCurrentWorkspace } from '@/lib/workspace';
import { Plus, Trash2, Loader2, Check, AlertCircle, X, Baby, Smile, Laugh, School, ChevronDown, Users } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAutoSave, type SaveStatus } from '@/hooks/useAutoSave';

type DietaryCategory = 'allergy' | 'dislike' | 'like' | 'diet';

// Placeholder text based on selected category
const placeholderByCategory: Record<DietaryCategory, string> = {
  allergy: 'e.g., peanuts, shellfish...',
  dislike: 'e.g., mushrooms, cilantro...',
  like: 'e.g., pasta, chicken, broccoli...',
  diet: 'e.g., lactose free, gluten free...',
};

// Age group icons - yellow icons without background
const ageGroupIcons: Record<FamilyMember['age_group'], React.ReactNode> = {
  toddler: <Baby className="h-8 w-8 text-primary" />,
  child: <Laugh className="h-8 w-8 text-primary" />,
  adult: <Smile className="h-8 w-8 text-primary" />,
};

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
  const [memberToDelete, setMemberToDelete] = useState<string | null>(null);

  // Custom food rule state
  const [customRulesExpanded, setCustomRulesExpanded] = useState(false);
  const [newCustomRule, setNewCustomRule] = useState('');

  // Member input state: tracks input value and selected category per member
  const [memberInputs, setMemberInputs] = useState<Record<string, { value: string; category: DietaryCategory }>>({});

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
          no_peanuts_only: false,
          no_chocolate: false,
          no_honey: false,
          must_be_cold: false,
          custom_rules: [],
          daycare_days: [],
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

  const addFamilyMember = () => {
    if (!newMemberName.trim() || !profile) return;
    const newMember: FamilyMember = {
      name: newMemberName.trim(),
      age_group: newMemberAgeGroup,
      allergies: [],
      dislikes: [],
      likes: [],
      diet: [],
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

  // Get or initialize member input state
  const getMemberInput = (name: string) => {
    return memberInputs[name] || { value: '', category: 'allergy' as DietaryCategory };
  };

  // Update member input value
  const updateMemberInput = (name: string, value: string) => {
    setMemberInputs((prev) => ({
      ...prev,
      [name]: { ...getMemberInput(name), value },
    }));
  };

  // Update member input category
  const updateMemberCategory = (name: string, category: DietaryCategory) => {
    setMemberInputs((prev) => ({
      ...prev,
      [name]: { ...getMemberInput(name), category },
    }));
  };

  // Add a tag to a member's dietary info
  const addMemberTag = (memberName: string, category: DietaryCategory, tagValue: string) => {
    if (!profile || !tagValue.trim()) return;

    const trimmedValue = tagValue.trim();

    setProfile((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        family_members: prev.family_members.map((m) => {
          if (m.name !== memberName) return m;

          switch (category) {
            case 'allergy':
              if (m.allergies.includes(trimmedValue)) return m;
              return { ...m, allergies: [...m.allergies, trimmedValue] };
            case 'dislike':
              if (m.dislikes.includes(trimmedValue)) return m;
              return { ...m, dislikes: [...m.dislikes, trimmedValue] };
            case 'like':
              if (m.likes?.includes(trimmedValue)) return m;
              return { ...m, likes: [...(m.likes || []), trimmedValue] };
            case 'diet':
              if (m.diet?.includes(trimmedValue)) return m;
              return { ...m, diet: [...(m.diet || []), trimmedValue] };
            default:
              return m;
          }
        }),
      };
    });

    // Clear input after adding
    setMemberInputs((prev) => ({
      ...prev,
      [memberName]: { ...getMemberInput(memberName), value: '' },
    }));
  };

  // Remove a tag from a member's dietary info
  const removeMemberTag = (memberName: string, category: DietaryCategory, tagValue: string) => {
    if (!profile) return;

    setProfile((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        family_members: prev.family_members.map((m) => {
          if (m.name !== memberName) return m;

          switch (category) {
            case 'allergy':
              return { ...m, allergies: m.allergies.filter((a) => a !== tagValue) };
            case 'dislike':
              return { ...m, dislikes: m.dislikes.filter((d) => d !== tagValue) };
            case 'like':
              return { ...m, likes: (m.likes || []).filter((l) => l !== tagValue) };
            case 'diet':
              return { ...m, diet: (m.diet || []).filter((d) => d !== tagValue) };
            default:
              return m;
          }
        }),
      };
    });
  };

  // Handle input submission (Enter key or blur with value)
  const handleMemberInputSubmit = (memberName: string) => {
    const input = getMemberInput(memberName);
    if (input.value.trim()) {
      addMemberTag(memberName, input.category, input.value);
    }
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
      <div className="rounded-xl bg-destructive/10 p-6 text-destructive">
        <h2 className="font-semibold mb-2">Error loading household profile</h2>
        <p className="text-sm">{error instanceof Error ? error.message : 'Unknown error'}</p>
        <p className="text-sm mt-2">Make sure your backend is running at http://localhost:8000</p>
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
            Household Profile
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your household members and their dietary needs.
          </p>
        </div>
        {renderSaveStatus()}
      </div>

      {/* Household Members */}
      <section className="space-y-6">
        <div>
          <h2 className="font-display text-xl font-semibold text-foreground flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Household Members
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            ⚠️ Allergies · 🤢 Dislikes · 😋 Likes · 🍽️ Diet
          </p>
        </div>

        <div className="space-y-4">
          {profile.family_members.map((member: FamilyMember) => {
            const memberInput = getMemberInput(member.name);
            const hasAnyData = member.allergies.length > 0 || member.dislikes.length > 0 || (member.likes?.length || 0) > 0 || (member.diet?.length || 0) > 0;

            return (
              <div
                key={member.name}
                className="rounded-xl bg-card border border-border overflow-hidden shadow-xs"
              >
                {/* Card Header - Name with age icon */}
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div title={member.age_group.charAt(0).toUpperCase() + member.age_group.slice(1)}>
                      {ageGroupIcons[member.age_group]}
                    </div>
                    <h3 className="font-display text-lg font-semibold text-foreground">
                      {member.name}
                    </h3>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setMemberToDelete(member.name)}
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    aria-label={`Delete ${member.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Card Body - Categorized Tags and Input */}
                <div className="px-4 py-4 space-y-4">
                  {/* Existing data as emoji-prefixed tags */}
                  {hasAnyData && (
                    <div className="flex flex-wrap gap-1.5">
                      {/* Allergies - Red */}
                      {member.allergies.map((allergy) => (
                        <Badge
                          key={`allergy-${allergy}`}
                          variant="destructive"
                          className="text-xs pr-1 gap-1"
                        >
                          ⚠️ {allergy}
                          <button
                            onClick={() => removeMemberTag(member.name, 'allergy', allergy)}
                            className="ml-0.5 rounded-full hover:bg-white/20 p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                      {/* Dislikes - White */}
                      {member.dislikes.map((dislike) => (
                        <Badge
                          key={`dislike-${dislike}`}
                          variant="outline"
                          className="text-xs pr-1 gap-1 bg-background"
                        >
                          🤢 {dislike}
                          <button
                            onClick={() => removeMemberTag(member.name, 'dislike', dislike)}
                            className="ml-0.5 rounded-full hover:bg-foreground/10 p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                      {/* Likes - White */}
                      {(member.likes || []).map((like) => (
                        <Badge
                          key={`like-${like}`}
                          variant="outline"
                          className="text-xs pr-1 gap-1 bg-background"
                        >
                          😋 {like}
                          <button
                            onClick={() => removeMemberTag(member.name, 'like', like)}
                            className="ml-0.5 rounded-full hover:bg-foreground/10 p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                      {/* Diet - White */}
                      {(member.diet || []).map((d) => (
                        <Badge
                          key={`diet-${d}`}
                          variant="outline"
                          className="text-xs pr-1 gap-1 bg-background"
                        >
                          🍽️ {d}
                          <button
                            onClick={() => removeMemberTag(member.name, 'diet', d)}
                            className="ml-0.5 rounded-full hover:bg-foreground/10 p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Unified input with category selector */}
                  <div className="flex gap-2">
                    <Select
                      value={memberInput.category}
                      onValueChange={(value) => updateMemberCategory(member.name, value as DietaryCategory)}
                    >
                      <SelectTrigger className="w-28 h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="allergy">Allergy</SelectItem>
                        <SelectItem value="dislike">Dislike</SelectItem>
                        <SelectItem value="like">Like</SelectItem>
                        <SelectItem value="diet">Diet</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder={placeholderByCategory[memberInput.category]}
                      value={memberInput.value}
                      onChange={(e) => updateMemberInput(member.name, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleMemberInputSubmit(member.name);
                        }
                      }}
                      className="flex-1 h-9 text-sm placeholder:italic placeholder:text-muted-foreground/40"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleMemberInputSubmit(member.name)}
                      disabled={!memberInput.value.trim()}
                      className="h-9 px-3"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
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
          <Button type="submit" variant="outline" disabled={!newMemberName.trim()}>
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </form>
      </section>

      {/* Daycare/School Setup */}
      <section className="space-y-6">
        <div>
          <h2 className="font-display text-xl font-semibold text-foreground flex items-center gap-2">
            <School className="h-5 w-5 text-primary" />
            Daycare/School Setup
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configure rules for packed lunches and snacks for children attending daycare or school
          </p>
        </div>

        {/* Days of the Week Selector */}
        <div className="rounded-xl bg-card border border-border p-4 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-foreground">Attendance Days</h3>
              <p className="text-xs text-muted-foreground">Select which days your child attends daycare/school</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
                const allSelected = weekdays.every(day => profile.daycare_rules.daycare_days.includes(day));
                setProfile(prev => prev ? {
                  ...prev,
                  daycare_rules: {
                    ...prev.daycare_rules,
                    daycare_days: allSelected ? [] : weekdays,
                  },
                } : null);
                toast.success(allSelected ? 'Cleared all days' : 'Selected weekdays (Mon-Fri)');
              }}
            >
              {['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].every(
                day => profile.daycare_rules.daycare_days.includes(day)
              ) ? 'Clear All' : 'Weekdays'}
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => {
              const isSelected = profile.daycare_rules.daycare_days.includes(day);
              const isWeekend = day === 'saturday' || day === 'sunday';
              return (
                <button
                  key={day}
                  onClick={() => {
                    const dayName = day.charAt(0).toUpperCase() + day.slice(1);
                    setProfile(prev => {
                      if (!prev) return null;
                      const currentDays = prev.daycare_rules.daycare_days;
                      const newDays = isSelected
                        ? currentDays.filter(d => d !== day)
                        : [...currentDays, day];
                      return {
                        ...prev,
                        daycare_rules: {
                          ...prev.daycare_rules,
                          daycare_days: newDays,
                        },
                      };
                    });
                    toast.success(isSelected ? `Removed ${dayName}` : `Added ${dayName}`);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isSelected
                      ? 'bg-primary text-primary-foreground'
                      : isWeekend
                        ? 'bg-muted/50 text-muted-foreground/70 hover:bg-muted/60'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {day.charAt(0).toUpperCase() + day.slice(1, 3)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Food Rules */}
        <div className="rounded-xl bg-card border border-border p-4 shadow-xs space-y-4">
          <div>
            <h3 className="font-medium text-foreground">Food Rules</h3>
            <p className="text-xs text-muted-foreground">Toggle rules that apply to packed meals</p>
          </div>

          <div className="space-y-4">
            {/* No Nuts (all) */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="no-nuts" className="text-sm font-medium">No nuts</Label>
                <p className="text-xs text-muted-foreground">All tree nuts and peanuts prohibited</p>
              </div>
              <Switch
                id="no-nuts"
                checked={profile.daycare_rules.no_nuts}
                onCheckedChange={(checked) => {
                  setProfile(prev => prev ? {
                    ...prev,
                    daycare_rules: {
                      ...prev.daycare_rules,
                      no_nuts: checked,
                      // If enabling no_nuts, disable no_peanuts_only (they're mutually exclusive)
                      no_peanuts_only: checked ? false : prev.daycare_rules.no_peanuts_only,
                    },
                  } : null);
                  toast.success(checked ? 'No nuts rule enabled' : 'No nuts rule disabled');
                }}
              />
            </div>

            {/* No Peanuts Only */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="no-peanuts" className="text-sm font-medium">No peanuts only</Label>
                <p className="text-xs text-muted-foreground">Peanuts prohibited, tree nuts allowed</p>
              </div>
              <Switch
                id="no-peanuts"
                checked={profile.daycare_rules.no_peanuts_only}
                disabled={profile.daycare_rules.no_nuts}
                onCheckedChange={(checked) => {
                  setProfile(prev => prev ? {
                    ...prev,
                    daycare_rules: {
                      ...prev.daycare_rules,
                      no_peanuts_only: checked,
                    },
                  } : null);
                  toast.success(checked ? 'No peanuts rule enabled' : 'No peanuts rule disabled');
                }}
              />
            </div>

            {/* No Chocolate */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="no-chocolate" className="text-sm font-medium">No chocolate</Label>
                <p className="text-xs text-muted-foreground">No chocolate or cocoa products</p>
              </div>
              <Switch
                id="no-chocolate"
                checked={profile.daycare_rules.no_chocolate}
                onCheckedChange={(checked) => {
                  setProfile(prev => prev ? {
                    ...prev,
                    daycare_rules: {
                      ...prev.daycare_rules,
                      no_chocolate: checked,
                    },
                  } : null);
                  toast.success(checked ? 'No chocolate rule enabled' : 'No chocolate rule disabled');
                }}
              />
            </div>

            {/* No Honey */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="no-honey" className="text-sm font-medium">No honey</Label>
                <p className="text-xs text-muted-foreground">Required for infants under 1 year</p>
              </div>
              <Switch
                id="no-honey"
                checked={profile.daycare_rules.no_honey}
                onCheckedChange={(checked) => {
                  setProfile(prev => prev ? {
                    ...prev,
                    daycare_rules: {
                      ...prev.daycare_rules,
                      no_honey: checked,
                    },
                  } : null);
                  toast.success(checked ? 'No honey rule enabled' : 'No honey rule disabled');
                }}
              />
            </div>

            {/* Must be cold */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="must-be-cold" className="text-sm font-medium">Must be served cold</Label>
                <p className="text-xs text-muted-foreground">No heating/microwave available at facility</p>
              </div>
              <Switch
                id="must-be-cold"
                checked={profile.daycare_rules.must_be_cold}
                onCheckedChange={(checked) => {
                  setProfile(prev => prev ? {
                    ...prev,
                    daycare_rules: {
                      ...prev.daycare_rules,
                      must_be_cold: checked,
                    },
                  } : null);
                  toast.success(checked ? 'Cold meals required' : 'Cold meals rule disabled');
                }}
              />
            </div>

            {/* Custom Rules - Collapsible */}
            <div className="pt-2 border-t border-border/50">
              <button
                onClick={() => setCustomRulesExpanded(!customRulesExpanded)}
                className="flex items-center justify-between w-full py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <span>Custom rules {(profile.daycare_rules.custom_rules?.length || 0) > 0 && `(${profile.daycare_rules.custom_rules.length})`}</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${customRulesExpanded ? 'rotate-180' : ''}`} />
              </button>

              {customRulesExpanded && (
                <div className="space-y-3 pt-2">
                  {/* Existing custom rules */}
                  {(profile.daycare_rules.custom_rules?.length || 0) > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {profile.daycare_rules.custom_rules.map((rule) => (
                        <Badge
                          key={rule}
                          variant="secondary"
                          className="text-xs pr-1 gap-1"
                        >
                          {rule}
                          <button
                            onClick={() => {
                              setProfile(prev => prev ? {
                                ...prev,
                                daycare_rules: {
                                  ...prev.daycare_rules,
                                  custom_rules: prev.daycare_rules.custom_rules.filter(r => r !== rule),
                                },
                              } : null);
                              toast.success(`Removed "${rule}"`);
                            }}
                            className="ml-0.5 rounded-full hover:bg-foreground/10 p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Add new custom rule */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g., no spicy food, vegetarian only..."
                      value={newCustomRule}
                      onChange={(e) => setNewCustomRule(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newCustomRule.trim()) {
                          e.preventDefault();
                          const trimmed = newCustomRule.trim();
                          if (!profile.daycare_rules.custom_rules?.includes(trimmed)) {
                            setProfile(prev => prev ? {
                              ...prev,
                              daycare_rules: {
                                ...prev.daycare_rules,
                                custom_rules: [...(prev.daycare_rules.custom_rules || []), trimmed],
                              },
                            } : null);
                            toast.success(`Added "${trimmed}"`);
                          }
                          setNewCustomRule('');
                        }
                      }}
                      className="flex-1 h-9 text-sm"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const trimmed = newCustomRule.trim();
                        if (trimmed && !profile.daycare_rules.custom_rules?.includes(trimmed)) {
                          setProfile(prev => prev ? {
                            ...prev,
                            daycare_rules: {
                              ...prev.daycare_rules,
                              custom_rules: [...(prev.daycare_rules.custom_rules || []), trimmed],
                            },
                          } : null);
                          toast.success(`Added "${trimmed}"`);
                          setNewCustomRule('');
                        }
                      }}
                      disabled={!newCustomRule.trim()}
                      className="h-9 px-3"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!memberToDelete} onOpenChange={(open) => !open && setMemberToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {memberToDelete}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {memberToDelete} from your household, including all their dietary information. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (memberToDelete) {
                  removeFamilyMember(memberToDelete);
                  setMemberToDelete(null);
                }
              }}
              className="border border-input bg-background text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
  );
};

export default Household;

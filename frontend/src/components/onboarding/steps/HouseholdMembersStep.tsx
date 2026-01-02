import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, User, AlertCircle } from 'lucide-react';
import { FamilyMember } from '@/lib/api';

interface HouseholdMembersStepProps {
  value: FamilyMember[];
  onChange: (value: FamilyMember[]) => void;
}

const DEFAULT_MEMBER: Omit<FamilyMember, 'name'> = {
  age_group: 'adult',
  allergies: [],
  dislikes: [],
  preferences: [],
};

export function HouseholdMembersStep({ value, onChange }: HouseholdMembersStepProps) {
  const [newName, setNewName] = useState('');
  const [newAgeGroup, setNewAgeGroup] = useState<'toddler' | 'child' | 'adult'>('adult');

  const addMember = () => {
    if (!newName.trim()) return;

    const member: FamilyMember = {
      name: newName.trim(),
      age_group: newAgeGroup,
      ...DEFAULT_MEMBER,
    };

    onChange([...value, member]);
    setNewName('');
    setNewAgeGroup('adult');
  };

  const removeMember = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const updateMember = (index: number, updates: Partial<FamilyMember>) => {
    onChange(
      value.map((member, i) => (i === index ? { ...member, ...updates } : member))
    );
  };

  const hasMembers = value.length > 0;

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground">
        Who's in your household? Add at least one member to continue.
        You can add more details later.
      </p>

      {/* Validation message */}
      {!hasMembers && (
        <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>Please add at least one household member</span>
        </div>
      )}

      {/* Existing members */}
      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((member, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                <User className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <Input
                  value={member.name}
                  onChange={(e) => updateMember(index, { name: e.target.value })}
                  className="font-medium h-8"
                  placeholder="Name"
                />
              </div>
              <Select
                value={member.age_group}
                onValueChange={(val: 'toddler' | 'child' | 'adult') =>
                  updateMember(index, { age_group: val })
                }
              >
                <SelectTrigger className="w-[110px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="toddler">Toddler</SelectItem>
                  <SelectItem value="child">Child</SelectItem>
                  <SelectItem value="adult">Adult</SelectItem>
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => removeMember(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add new member form */}
      <div className="border-t pt-4">
        <Label className="text-sm font-medium mb-2 block">Add member</Label>
        <div className="flex gap-2">
          <Input
            placeholder="Name (e.g., Mom, Dad, Emma)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addMember();
              }
            }}
            className="flex-1"
          />
          <Select
            value={newAgeGroup}
            onValueChange={(val: 'toddler' | 'child' | 'adult') => setNewAgeGroup(val)}
          >
            <SelectTrigger className="w-[110px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="toddler">Toddler</SelectItem>
              <SelectItem value="child">Child</SelectItem>
              <SelectItem value="adult">Adult</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={addMember}
            disabled={!newName.trim()}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          You can add allergies, dislikes, and preferences later in the Household Profile page.
        </p>
      </div>
    </div>
  );
}

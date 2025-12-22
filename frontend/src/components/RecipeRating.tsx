import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import type { FamilyMember } from '@/lib/api';

interface RecipeRatingProps {
  recipeId: string;
  currentRatings: Record<string, string | null>;
  householdMembers: FamilyMember[];
  onRate: (recipeId: string, memberName: string, rating: string | null) => void;
  disabled?: boolean;
}

/**
 * RecipeRating component displays thumbs up/down buttons for each household member
 * to rate a recipe.
 *
 * Features:
 * - Visual feedback for active ratings (filled buttons)
 * - Click same button to toggle rating off
 * - Disabled state during mutations
 */
export function RecipeRating({
  recipeId,
  currentRatings,
  householdMembers,
  onRate,
  disabled = false,
}: RecipeRatingProps) {
  const handleRating = (memberName: string, rating: 'like' | 'dislike') => {
    // If clicking the same rating, toggle it off (set to null)
    const currentRating = currentRatings[memberName];
    const newRating = currentRating === rating ? null : rating;
    onRate(recipeId, memberName, newRating);
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-semibold">Household Ratings</Label>

      {/* Horizontal grid of rating cards */}
      <div className="grid grid-cols-3 gap-3">
        {householdMembers.map((member) => {
          const rating = currentRatings[member.name];
          const isLiked = rating === 'like';
          const isDisliked = rating === 'dislike';

          return (
            <div
              key={member.name}
              className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/30 border border-border"
            >
              {/* Member name at top */}
              <span className="text-sm font-medium text-center">
                {member.name}
              </span>

              {/* Icon-only buttons side-by-side */}
              <div className="flex gap-2">
                <Button
                  variant={isLiked ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleRating(member.name, 'like')}
                  disabled={disabled}
                  className={`w-10 h-10 p-0 ${
                    isLiked
                      ? 'bg-green-600 hover:bg-green-600 border-green-600 text-white'
                      : 'hover:bg-green-600 hover:text-white hover:border-green-600'
                  }`}
                >
                  <ThumbsUp className="h-4 w-4" />
                </Button>
                <Button
                  variant={isDisliked ? 'destructive' : 'outline'}
                  size="sm"
                  onClick={() => handleRating(member.name, 'dislike')}
                  disabled={disabled}
                  className={`w-10 h-10 p-0 ${
                    !isDisliked ? 'hover:bg-destructive hover:text-destructive-foreground hover:border-destructive' : ''
                  }`}
                >
                  <ThumbsDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground mt-2">
        Ratings help personalize your meal plans. Click the same button again to remove your rating.
      </p>
    </div>
  );
}

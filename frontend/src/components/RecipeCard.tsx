import { Clock, Users, Sparkles, ThumbsUp, ThumbsDown, ExternalLink } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import type { Recipe } from '@/lib/api';
import { recipesAPI, householdAPI } from '@/lib/api';
import { getCurrentWorkspace } from '@/lib/workspace';

interface RecipeCardProps {
  recipe: Recipe;
  onViewDetails: (recipe: Recipe) => void;
}

// URL validation helper to prevent XSS
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function RecipeCard({ recipe, onViewDetails }: RecipeCardProps) {
  const workspaceId = getCurrentWorkspace()!;

  // Fetch household members
  const { data: household } = useQuery({
    queryKey: ['householdProfile', workspaceId],
    queryFn: () => householdAPI.getProfile(workspaceId),
    staleTime: 60000, // Cache for 1 minute
  });

  // Fetch ratings for this recipe
  const { data: ratings } = useQuery({
    queryKey: ['recipeRatings', workspaceId, recipe.id],
    queryFn: () => recipesAPI.getRatings(workspaceId, recipe.id),
    staleTime: 30000, // Cache for 30 seconds
  });

  // Calculate aggregate ratings
  const likes = ratings ? Object.values(ratings).filter((r) => r === 'like').length : 0;
  const dislikes = ratings ? Object.values(ratings).filter((r) => r === 'dislike').length : 0;
  const hasRatings = likes > 0 || dislikes > 0;

  // Check if all household members liked this recipe
  const totalMembers = household?.family_members.length || 0;
  const lovedByAll = totalMembers > 0 && likes === totalMembers;

  return (
    <div className="rounded-2xl bg-card shadow-soft overflow-hidden transition-all duration-300 hover:shadow-medium group cursor-pointer" onClick={() => onViewDetails(recipe)}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-3">
          <h3 className="font-display text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
            {recipe.title}
          </h3>
          <div className="flex items-center gap-2 shrink-0">
            {recipe.is_generated && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                <Sparkles className="h-3 w-3" />
                <span>AI</span>
              </div>
            )}
            {recipe.source_url && recipe.source_name && isValidUrl(recipe.source_url) && (
              <a
                href={recipe.source_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                aria-label={`View recipe source at ${recipe.source_name} (opens in new tab)`}
                tabIndex={0}
                className="inline-block"
              >
                <Badge variant="outline" className="text-xs gap-1 max-w-[150px] truncate hover:bg-secondary/50 transition-colors">
                  <ExternalLink className="h-3 w-3 shrink-0" />
                  <span className="truncate">{recipe.source_name || 'View Source'}</span>
                </Badge>
              </a>
            )}
            {recipe.source_url && !recipe.source_name && isValidUrl(recipe.source_url) && (
              <a
                href={recipe.source_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                aria-label={`View recipe source (opens in new tab)`}
                tabIndex={0}
                className="inline-block"
              >
                <Badge variant="outline" className="text-xs gap-1 max-w-[150px] truncate hover:bg-secondary/50 transition-colors">
                  <ExternalLink className="h-3 w-3 shrink-0" />
                  <span className="truncate">View Source</span>
                </Badge>
              </a>
            )}
          </div>
        </div>

        {/* Aggregate Ratings Badge */}
        {hasRatings && (
          <div className="flex items-center gap-2 mb-3">
            <Badge
              variant="outline"
              className={`text-xs gap-1 ${
                lovedByAll
                  ? 'bg-green-600 border-green-600 text-white hover:bg-green-600'
                  : ''
              }`}
            >
              <ThumbsUp className="h-3 w-3" />
              {likes}
            </Badge>
            <Badge variant="outline" className="text-xs gap-1">
              <ThumbsDown className="h-3 w-3" />
              {dislikes}
            </Badge>
          </div>
        )}

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            <span>{recipe.prep_time_minutes + recipe.active_cooking_time_minutes} min</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            <span>Serves {recipe.serves}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { recipesAPI, type Recipe } from '@/lib/api';
import { getCurrentWorkspace } from '@/lib/workspace';
import { getActiveSessions } from '@/lib/cookingSession';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search, ChefHat, Loader2, Check, Play, Clock, Users,
} from 'lucide-react';

const CookPage = () => {
  const navigate = useNavigate();
  const workspaceId = getCurrentWorkspace();

  useEffect(() => {
    if (!workspaceId) navigate('/');
  }, [workspaceId, navigate]);

  if (!workspaceId) return null;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Fetch all recipes
  const { data: recipes, isLoading } = useQuery({
    queryKey: ['recipes', workspaceId],
    queryFn: () => recipesAPI.getAll(workspaceId),
  });

  // Check for in-progress cooking sessions
  const activeSessions = useMemo(() => getActiveSessions(), []);

  // Filter recipes by search query
  const filteredRecipes = useMemo(() => {
    if (!recipes) return [];
    if (!searchQuery.trim()) return recipes;
    const q = searchQuery.toLowerCase();
    return recipes.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.tags.some((t) => t.toLowerCase().includes(q)) ||
        r.meal_types.some((mt) => mt.toLowerCase().includes(q))
    );
  }, [recipes, searchQuery]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleStartCooking = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 1) {
      navigate(`/cook/${ids[0]}`);
    } else if (ids.length > 1) {
      navigate(`/cook/multi?ids=${ids.join(',')}`);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-3">
          <ChefHat className="h-8 w-8 text-primary" />
          Cook
        </h1>
        <p className="text-muted-foreground mt-1">
          Select recipes to start cooking. Pick multiple for a coordinated timeline.
        </p>
      </div>

      {/* Active Sessions Banner */}
      {activeSessions.length > 0 && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
          <h3 className="text-sm font-medium text-primary flex items-center gap-2">
            <Play className="h-4 w-4" />
            In-progress cooking sessions
          </h3>
          <div className="flex flex-wrap gap-2">
            {activeSessions.map((s) => (
              <Button
                key={s.recipeId}
                variant="outline"
                size="sm"
                className="border-primary/30 text-primary hover:bg-primary/10"
                onClick={() => navigate(`/cook/${s.recipeId}`)}
              >
                Resume cooking
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search recipes by name or tag..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Recipe Grid */}
      {!isLoading && filteredRecipes.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          {searchQuery ? 'No recipes match your search.' : 'No recipes yet. Add some in the Recipes page!'}
        </div>
      )}

      {!isLoading && filteredRecipes.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRecipes.map((recipe) => {
            const isSelected = selectedIds.has(recipe.id);
            return (
              <button
                key={recipe.id}
                onClick={() => toggleSelect(recipe.id)}
                className={`
                  text-left rounded-xl border p-4 transition-all
                  ${isSelected
                    ? 'border-primary bg-primary/5 shadow-soft ring-1 ring-primary/20'
                    : 'border-border bg-card shadow-xs hover:shadow-soft hover:border-border/80'
                  }
                `}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">{recipe.title}</h3>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {recipe.prep_time_minutes + recipe.active_cooking_time_minutes}m
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {recipe.serves}
                      </span>
                    </div>
                  </div>
                  <div
                    className={`
                      flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors
                      ${isSelected
                        ? 'bg-primary border-primary text-primary-foreground'
                        : 'border-muted-foreground/30'
                      }
                    `}
                  >
                    {isSelected && <Check className="h-3.5 w-3.5" />}
                  </div>
                </div>
                {recipe.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {recipe.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                        {tag}
                      </Badge>
                    ))}
                    {recipe.tags.length > 3 && (
                      <span className="text-[10px] text-muted-foreground">
                        +{recipe.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Sticky Start Cooking Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-sm px-4 py-3 shadow-lg">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{selectedIds.size}</span>
              {' '}recipe{selectedIds.size !== 1 ? 's' : ''} selected
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())}>
                Clear
              </Button>
              <Button size="sm" onClick={handleStartCooking}>
                <Play className="h-4 w-4 mr-1.5" />
                Start Cooking
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CookPage;

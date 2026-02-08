import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RecipeCard } from '@/components/RecipeCard';
import { RecipeModal } from '@/components/RecipeModal';
import { RecipeForm } from '@/components/RecipeForm';
import { recipesAPI, householdAPI, type Recipe } from '@/lib/api';
import { getCurrentWorkspace } from '@/lib/workspace';
import { Plus, Search, Filter, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const Recipes = () => {
  const location = useLocation();
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

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const queryClient = useQueryClient();

  // Fetch household profile for member names
  const { data: household, isLoading: householdLoading } = useQuery({
    queryKey: ['householdProfile', workspaceId],
    queryFn: () => householdAPI.getProfile(workspaceId),
    staleTime: 300000, // 5 minutes
  });

  // Fetch recipes from backend
  const { data: recipes, isLoading, error } = useQuery({
    queryKey: ['recipes', workspaceId],
    queryFn: () => recipesAPI.getAll(workspaceId),
  });

  // Extract member name from filter value
  const filterMemberName = selectedFilter.startsWith('member-')
    ? selectedFilter.replace('member-', '')
    : undefined;

  // Fetch favorites for selected member (only when member filter active)
  const { data: favorites, isLoading: favoritesLoading } = useQuery({
    queryKey: ['recipes', 'favorites', workspaceId, filterMemberName],
    queryFn: () => recipesAPI.getFavorites(workspaceId, filterMemberName!),
    enabled: selectedFilter.startsWith('member-'),
    staleTime: 60000, // 1 minute
  });

  // Fetch popular recipes (only when popular filter active)
  const { data: popular, isLoading: popularLoading } = useQuery({
    queryKey: ['recipes', 'popular', workspaceId],
    queryFn: () => recipesAPI.getPopular(workspaceId),
    enabled: selectedFilter === 'popular',
    staleTime: 60000,
  });

  // Fetch all ratings for unrated filter (only when unrated filter active)
  const { data: allRatings, isLoading: ratingsLoading } = useQuery({
    queryKey: ['recipes', 'ratings', workspaceId],
    queryFn: () => recipesAPI.getAllRatings(workspaceId),
    enabled: selectedFilter === 'unrated',
    staleTime: 60000,
  });

  // Auto-open recipe modal if navigated here with a specific recipe ID
  useEffect(() => {
    if (recipes && location.state?.openRecipeId) {
      const recipeToOpen = recipes.find((r) => r.id === location.state.openRecipeId);
      if (recipeToOpen) {
        setSelectedRecipe(recipeToOpen);
        setModalOpen(true);
        // Clear the state so it doesn't reopen on subsequent visits
        window.history.replaceState({}, document.title);
      }
    }
  }, [recipes, location.state]);

  // Create recipe mutation
  const createMutation = useMutation({
    mutationFn: (recipe: Omit<Recipe, 'recipe_id'>) => recipesAPI.create(workspaceId, recipe),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes', workspaceId] });
      toast.success('Recipe added successfully!');
      setFormOpen(false);
    },
    onError: (error: Error) => {
      toast.error(`Failed to add recipe: ${error.message}`);
    },
  });

  // Delete recipe mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => recipesAPI.delete(workspaceId, id),
    onSuccess: () => {
      // Invalidate and refetch recipes
      queryClient.invalidateQueries({ queryKey: ['recipes', workspaceId] });
    },
  });

  // Step 1: Apply type filter to get base filtered set
  let typeFilteredRecipes: Recipe[] = [];

  if (selectedFilter === 'all') {
    typeFilteredRecipes = recipes || [];
  } else if (selectedFilter.startsWith('member-')) {
    typeFilteredRecipes = favorites || [];
  } else if (selectedFilter === 'popular') {
    typeFilteredRecipes = popular || [];
  } else if (selectedFilter === 'unrated') {
    // Filter out recipes that have any ratings
    const ratedRecipeIds = new Set(
      allRatings?.map(r => r.recipe_id) || []
    );
    typeFilteredRecipes = (recipes || []).filter(
      r => !ratedRecipeIds.has(r.id)
    );
  }

  // Step 2: Apply text search to type-filtered results
  const filteredRecipes = typeFilteredRecipes.filter((recipe) =>
    recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    recipe.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Determine if we're loading filtered data
  const isFilterLoading =
    (selectedFilter.startsWith('member-') && favoritesLoading) ||
    (selectedFilter === 'popular' && popularLoading) ||
    (selectedFilter === 'unrated' && ratingsLoading);

  const handleViewDetails = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setModalOpen(true);
  };

  const handleDelete = (recipeId: string) => {
    deleteMutation.mutate(recipeId);
  };

  const handleCreateRecipe = (recipe: Recipe) => {
    createMutation.mutate(recipe);
  };

  if (isLoading || isFilterLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-destructive/10 p-6 text-destructive">
        <h2 className="font-semibold mb-2">Error loading recipes</h2>
        <p className="text-sm">{error instanceof Error ? error.message : 'Unknown error'}</p>
        <p className="text-sm mt-2">Make sure your backend is running at http://localhost:8000</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Recipe Library
          </h1>
          <p className="text-muted-foreground mt-1">
            {recipes?.length || 0} recipes in your collection
          </p>
        </div>

        <Button variant="hero" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Recipe
        </Button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search recipes or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filter Dropdown */}
        <div className="w-full sm:w-56">
          <label className="text-sm font-medium text-muted-foreground block mb-1.5">
            <Filter className="inline h-3.5 w-3.5 mr-1" />
            Filter by
          </label>
          <Select value={selectedFilter} onValueChange={setSelectedFilter}>
            <SelectTrigger disabled={householdLoading}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All recipes</SelectItem>
              <SelectItem value="popular">Liked by all members</SelectItem>
              <SelectItem value="unrated">Not yet rated</SelectItem>
              {household?.family_members.map((member) => (
                <SelectItem key={member.name} value={`member-${member.name}`}>
                  Liked by {member.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Recipe Grid */}
      {filteredRecipes.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRecipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onViewDetails={handleViewDetails}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl bg-card py-16 text-center">
          <p className="text-muted-foreground mb-4">
            No recipes found
            {selectedFilter !== 'all' && ' matching your filters'}
            {searchQuery && ` for "${searchQuery}"`}
          </p>
          <Button
            variant="secondary"
            onClick={() => {
              setSearchQuery('');
              setSelectedFilter('all');
            }}
          >
            Clear {searchQuery && selectedFilter !== 'all' ? 'filters' : searchQuery ? 'search' : 'filter'}
          </Button>
        </div>
      )}

      {/* Recipe Detail Modal */}
      <RecipeModal
        recipe={selectedRecipe}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onDelete={handleDelete}
      />

      {/* Add Recipe Form */}
      <RecipeForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleCreateRecipe}
        workspaceId={workspaceId}
      />
    </div>
  );
};

export default Recipes;

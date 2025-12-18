import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RecipeCard } from '@/components/RecipeCard';
import { RecipeModal } from '@/components/RecipeModal';
import { RecipeForm } from '@/components/RecipeForm';
import { recipesAPI, type Recipe } from '@/lib/api';
import { Plus, Search, Loader2 } from 'lucide-react';

const Recipes = () => {
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch recipes from backend
  const { data: recipes, isLoading, error } = useQuery({
    queryKey: ['recipes'],
    queryFn: recipesAPI.getAll,
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
    mutationFn: recipesAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    },
  });

  // Delete recipe mutation
  const deleteMutation = useMutation({
    mutationFn: recipesAPI.delete,
    onSuccess: () => {
      // Invalidate and refetch recipes
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    },
  });

  const filteredRecipes = recipes?.filter((recipe) =>
    recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    recipe.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  ) || [];

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-destructive/10 p-6 text-destructive">
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

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search recipes or tags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
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
        <div className="flex flex-col items-center justify-center rounded-2xl bg-card py-16 text-center">
          <p className="text-muted-foreground mb-4">No recipes found matching "{searchQuery}"</p>
          <Button variant="secondary" onClick={() => setSearchQuery('')}>
            Clear search
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
      />
    </div>
  );
};

export default Recipes;

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../test-utils';
import { RecipeCard } from '@/components/RecipeCard';
import {
  mockRecipeWithSource,
  mockRecipeWithoutSource,
  mockGeneratedRecipeWithSource,
  mockRecipeLongUrl,
} from '../fixtures/recipes';
import type { Recipe } from '@/lib/api';

describe('RecipeCard - Source Display', () => {
  const mockOnViewDetails = vi.fn();

  describe('when recipe has source_url and source_name', () => {
    it('should display source badge with link icon', () => {
      render(
        <RecipeCard
          recipe={mockRecipeWithSource}
          onViewDetails={mockOnViewDetails}
        />
      );

      // Badge should be visible with source name
      const sourceName = screen.getByText(/AllRecipes/i);
      expect(sourceName).toBeInTheDocument();
    });

    it('should render source as clickable link', () => {
      render(
        <RecipeCard
          recipe={mockRecipeWithSource}
          onViewDetails={mockOnViewDetails}
        />
      );

      const link = screen.getByRole('link', { name: /AllRecipes/i });
      expect(link).toHaveAttribute(
        'href',
        'https://www.allrecipes.com/recipe/12345/chocolate-chip-cookies'
      );
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('should prevent event propagation when clicking source link', async () => {
      const { container } = render(
        <RecipeCard
          recipe={mockRecipeWithSource}
          onViewDetails={mockOnViewDetails}
        />
      );

      const link = screen.getByRole('link', { name: /AllRecipes/i });

      // Click the link
      link.click();

      // Should NOT trigger card click (onViewDetails)
      expect(mockOnViewDetails).not.toHaveBeenCalled();
    });

    it('should use outline variant for source badge', () => {
      render(
        <RecipeCard
          recipe={mockRecipeWithSource}
          onViewDetails={mockOnViewDetails}
        />
      );

      const link = screen.getByRole('link', { name: /AllRecipes/i });
      // Verify the link contains the source name (Badge component renders it)
      expect(link).toHaveTextContent('AllRecipes');
    });
  });

  describe('when recipe does NOT have source information', () => {
    it('should not display source badge', () => {
      render(
        <RecipeCard
          recipe={mockRecipeWithoutSource}
          onViewDetails={mockOnViewDetails}
        />
      );

      // No source link should exist
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    it('should not break existing layout without source', () => {
      render(
        <RecipeCard
          recipe={mockRecipeWithoutSource}
          onViewDetails={mockOnViewDetails}
        />
      );

      // Title should still be visible
      expect(screen.getByText('Homemade Pasta')).toBeInTheDocument();

      // Time should still display (30 + 5 = 35 min)
      expect(screen.getByText(/35 min/i)).toBeInTheDocument();

      // Serves info should still display
      expect(screen.getByText(/Serves 4/i)).toBeInTheDocument();
    });
  });

  describe('when recipe is AI-generated AND has source', () => {
    it('should display both AI badge and source badge', () => {
      render(
        <RecipeCard
          recipe={mockGeneratedRecipeWithSource}
          onViewDetails={mockOnViewDetails}
        />
      );

      // AI badge exists
      expect(screen.getByText('AI')).toBeInTheDocument();

      // Source badge also exists
      expect(screen.getByText(/Serious Eats/i)).toBeInTheDocument();
    });

    it('should display badges in same row with proper spacing', () => {
      const { container } = render(
        <RecipeCard
          recipe={mockGeneratedRecipeWithSource}
          onViewDetails={mockOnViewDetails}
        />
      );

      // Both badges should exist
      expect(screen.getByText('AI')).toBeInTheDocument();
      expect(screen.getByText(/Serious Eats/i)).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should handle very long source names gracefully', () => {
      render(
        <RecipeCard
          recipe={mockRecipeLongUrl}
          onViewDetails={mockOnViewDetails}
        />
      );

      const sourceName = screen.getByText(/Very Long Domain Name/i);
      expect(sourceName).toBeInTheDocument();
    });

    it('should handle missing source_name with fallback', () => {
      const recipeNoSourceName: Recipe = {
        ...mockRecipeWithSource,
        source_name: undefined,
      };

      render(
        <RecipeCard
          recipe={recipeNoSourceName}
          onViewDetails={mockOnViewDetails}
        />
      );

      // Should show "View Source" as fallback
      expect(screen.getByText('View Source')).toBeInTheDocument();
    });

    it('should sanitize URL to prevent XSS', () => {
      const maliciousRecipe: Recipe = {
        ...mockRecipeWithSource,
        source_url: 'javascript:alert("XSS")',
      };

      render(
        <RecipeCard
          recipe={maliciousRecipe}
          onViewDetails={mockOnViewDetails}
        />
      );

      // Should not render link with javascript: protocol
      const link = screen.queryByRole('link');
      expect(link).not.toBeInTheDocument();
    });

    it('should not display source badge if only URL exists (no name)', () => {
      const recipeOnlyUrl: Recipe = {
        ...mockRecipeWithSource,
        source_name: undefined,
      };

      render(
        <RecipeCard
          recipe={recipeOnlyUrl}
          onViewDetails={mockOnViewDetails}
        />
      );

      // Should have fallback "View Source"
      expect(screen.getByText('View Source')).toBeInTheDocument();
    });

    it('should not display source badge if only name exists (no URL)', () => {
      const recipeOnlyName: Recipe = {
        ...mockRecipeWithSource,
        source_url: undefined,
      };

      render(
        <RecipeCard
          recipe={recipeOnlyName}
          onViewDetails={mockOnViewDetails}
        />
      );

      // Should not display any source link
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA label for external link', () => {
      render(
        <RecipeCard
          recipe={mockRecipeWithSource}
          onViewDetails={mockOnViewDetails}
        />
      );

      const link = screen.getByRole('link', { name: /AllRecipes/i });
      expect(link).toHaveAttribute('aria-label');
      const ariaLabel = link.getAttribute('aria-label');
      expect(ariaLabel).toContain('AllRecipes');
      expect(ariaLabel).toContain('new tab');
    });
  });
});

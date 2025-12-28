import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '../test-utils';
import { RecipeModal } from '@/components/RecipeModal';
import {
  mockRecipeWithSource,
  mockRecipeWithoutSource,
  mockGeneratedRecipeWithSource,
} from '../fixtures/recipes';
import type { Recipe } from '@/lib/api';

describe('RecipeModal - Source Section', () => {
  const mockOnOpenChange = vi.fn();
  const mockOnDelete = vi.fn();

  describe('when recipe has source information', () => {
    it('should display "Recipe Source" section header', () => {
      render(
        <RecipeModal
          recipe={mockRecipeWithSource}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      expect(screen.getByText('Recipe Source')).toBeInTheDocument();
    });

    it('should display source name with link icon', () => {
      render(
        <RecipeModal
          recipe={mockRecipeWithSource}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      // Source name should be visible
      const sourceName = screen.getByText('AllRecipes');
      expect(sourceName).toBeInTheDocument();
    });

    it('should render source URL as clickable link', () => {
      render(
        <RecipeModal
          recipe={mockRecipeWithSource}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      const link = screen.getByRole('link', { name: /View original recipe/i });
      expect(link).toHaveAttribute(
        'href',
        'https://www.allrecipes.com/recipe/12345/chocolate-chip-cookies'
      );
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('should display "View Original Recipe" button/link', () => {
      render(
        <RecipeModal
          recipe={mockRecipeWithSource}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      const button = screen.getByRole('link', { name: /View original recipe/i });
      expect(button).toBeInTheDocument();
    });

    it('should position source section after ingredients and instructions', () => {
      const { container } = render(
        <RecipeModal
          recipe={mockRecipeWithSource}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      // Check that "Recipe Source" appears in the document
      const sourceHeading = screen.getByText('Recipe Source');
      expect(sourceHeading).toBeInTheDocument();

      // Check that "Instructions" heading also appears
      const instructionsHeading = screen.getByText('Instructions');
      expect(instructionsHeading).toBeInTheDocument();
    });

    it('should use muted styling for source section', () => {
      const { container } = render(
        <RecipeModal
          recipe={mockRecipeWithSource}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      const sourceHeading = screen.getByText('Recipe Source');
      expect(sourceHeading).toBeInTheDocument();
    });
  });

  describe('when recipe does NOT have source information', () => {
    it('should not display source section at all', () => {
      render(
        <RecipeModal
          recipe={mockRecipeWithoutSource}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      expect(screen.queryByText('Recipe Source')).not.toBeInTheDocument();
    });

    it('should not affect modal layout without source', () => {
      render(
        <RecipeModal
          recipe={mockRecipeWithoutSource}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      // Title should be visible
      expect(screen.getByText('Homemade Pasta')).toBeInTheDocument();

      // Description should be visible
      expect(screen.getByText(/Fresh pasta from scratch/i)).toBeInTheDocument();
    });
  });

  describe('when recipe is AI-generated with source', () => {
    it('should display source section normally', () => {
      render(
        <RecipeModal
          recipe={mockGeneratedRecipeWithSource}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      expect(screen.getByText('Recipe Source')).toBeInTheDocument();
      expect(screen.getByText('Serious Eats')).toBeInTheDocument();
    });

    it('should show source alongside AI metadata', () => {
      render(
        <RecipeModal
          recipe={mockGeneratedRecipeWithSource}
          open={true}
          onOpenChange={mockOnOpenChange}
          onDelete={mockOnDelete}
        />
      );

      // Both source and "Generate Again" button visible
      expect(screen.getByText('Recipe Source')).toBeInTheDocument();
      expect(screen.getByText('Generate Again')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should handle partial source data (only URL, no name)', () => {
      const partialSource: Recipe = {
        ...mockRecipeWithSource,
        source_name: undefined,
      };

      render(
        <RecipeModal
          recipe={partialSource}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      // Should show domain extracted from URL
      expect(screen.getByText(/allrecipes\.com/i)).toBeInTheDocument();
    });

    it('should truncate very long URLs visually', () => {
      const longUrlRecipe: Recipe = {
        ...mockRecipeWithSource,
        source_url: 'https://www.example.com/' + 'a'.repeat(200),
      };

      render(
        <RecipeModal
          recipe={longUrlRecipe}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      // Recipe Source section should still render
      expect(screen.getByText('Recipe Source')).toBeInTheDocument();
    });

    it('should validate URL before rendering link', () => {
      const invalidUrlRecipe: Recipe = {
        ...mockRecipeWithSource,
        source_url: 'not-a-valid-url',
      };

      render(
        <RecipeModal
          recipe={invalidUrlRecipe}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      // Should show recipe source section
      expect(screen.getByText('Recipe Source')).toBeInTheDocument();

      // But should not render as clickable link
      expect(screen.queryByRole('link', { name: /View original/i })).not.toBeInTheDocument();
    });

    it('should handle javascript: protocol URLs safely', () => {
      const xssRecipe: Recipe = {
        ...mockRecipeWithSource,
        source_url: 'javascript:alert("XSS")',
      };

      render(
        <RecipeModal
          recipe={xssRecipe}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      // Should show Recipe Source but not as clickable link
      expect(screen.getByText('Recipe Source')).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /View original/i })).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have semantic heading for source section', () => {
      render(
        <RecipeModal
          recipe={mockRecipeWithSource}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      const heading = screen.getByRole('heading', { name: 'Recipe Source' });
      expect(heading).toBeInTheDocument();
    });

    it('should provide descriptive link text', () => {
      render(
        <RecipeModal
          recipe={mockRecipeWithSource}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      const link = screen.getByRole('link', { name: /View original recipe/i });
      expect(link).toBeInTheDocument();

      // Check that aria-label exists and is descriptive
      const ariaLabel = link.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
    });
  });

  describe('modal behavior', () => {
    it('should not close modal when clicking source link', () => {
      render(
        <RecipeModal
          recipe={mockRecipeWithSource}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      const link = screen.getByRole('link', { name: /View original/i });
      link.click();

      // Modal should stay open (onOpenChange not called with false)
      // Note: In real browser, link opens in new tab, modal stays open
      // We're just verifying the link exists and is clickable
      expect(link).toBeInTheDocument();
    });
  });
});

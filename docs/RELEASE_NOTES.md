---
**Summary**: Release notes for beta testers - what's new, improved, and fixed in each version
**Last Updated**: 2026-01-06
**Status**: Current
**Read This If**: You want to see the latest updates and improvements
---

# What's New in Meal Planner

## Version 0.11.0 - January 6, 2026

### New Features

- **Daycare/School Setup** - Configure packed lunch rules for children attending daycare or school:
  - Select attendance days (weekdays toggle for quick setup)
  - Toggle common food restrictions: no nuts, no peanuts, no chocolate, no honey, cold meals only
  - Add custom rules for your facility's specific requirements

- **Dietary Categories Expanded** - Family member profiles now support four categories:
  - Allergies (medical restrictions)
  - Dislikes (foods to avoid)
  - Likes (favorite foods to include more often)
  - Diet (dietary patterns like lactose-free, vegetarian, etc.)

### Improvements

- **Smarter Meal Plans** - "Eating out" meals are now handled intelligently - no generate button appears and they're excluded from "Save All Recipes"

- **Compact Meal Plan View** - Day headers are now hidden on mobile (the navigator shows the selected day) and use a compact single-line format on desktop

- **Redesigned Home Page** - Navigation tiles are larger and responsive (2x2 grid on mobile), with bolder labels and tallies showing your recipe count and current meal plan week

- **Consistent Delete Dialogs** - Deleting a household member or grocery item now shows a confirmation dialog to prevent accidents

- **iOS Safe Area Support** - Bottom navigation no longer gets cut off on iPhones with home indicators

- **Better Button Hierarchy** - Add buttons now use outline style, delete buttons are consistently styled with red text

---

## Version 0.10.0 - January 5, 2026

### New Features

- **Photo Recipe Capture** - Take a photo of a printed cookbook page or handwritten recipe card and let Claude extract the text! The app uses a two-stage process:
  1. Upload a photo (supports JPEG, PNG, WebP, and iPhone HEIF/HEIC formats)
  2. Review and correct the extracted text - especially useful for handwritten recipes where OCR may need help
  3. Parse into structured recipe fields for final review

- **Handwriting Support** - The OCR engine automatically detects handwritten text and shows appropriate warnings so you know to review more carefully. Works with both neat printing and cursive!

- **Confidence Indicators** - See at a glance how confident the AI is in its text extraction. Low confidence results are highlighted so you know exactly what to double-check

### How It Works

In the "Add Recipe" modal, scroll down to see the new "or upload a photo" section. Drag and drop an image or click to select one. After extraction, you'll see the photo alongside an editable text box - fix any OCR errors, then click "Parse Recipe" to convert it to structured fields.

---

## Version 0.9.1 - January 3, 2026

### Improvements

- **Better New User Guidance** - Trying to generate a meal plan without enough recipes? Instead of a confusing error, you'll now see a helpful message explaining exactly what's needed. The app checks that you have at least one breakfast, one lunch, and one dinner recipe before generating, and guides you to the Recipes page to add what's missing

---

## Version 0.9.0 - January 3, 2026

### New Features

- **Paste Any Recipe** - The "Add Recipe" modal now accepts both URLs and recipe text! Paste a recipe from a website, a blog post, handwritten notes, or even OCR'd text - Claude will parse it into structured fields for you to review and edit

- **Recipe Notes** - Add personal notes to any recipe for tips, modifications, substitutions, or reference links. Notes appear in the recipe detail view, and any URLs you include are automatically clickable

### Improvements

- **Unified Input** - No more separate URL field! The new large text area auto-detects whether you're pasting a URL or recipe text and routes to the right parser

- **Manual Entry Option** - Prefer to type everything yourself? Expand the "Enter manually" section to access all form fields directly

---

## Version 0.8.2 - January 2, 2026

### Improvements

- **Meal Type Checkboxes** - The "Add Recipe" form now uses checkboxes instead of free text for meal types. Select from Breakfast, Lunch, Dinner, Snack, or the new Side Dish option. No more typos or case-sensitivity issues!

- **Better Error Feedback** - When adding a recipe fails, you'll now see a clear error message instead of the form silently closing. The form stays open so you can fix any issues

---

## Version 0.8.1 - December 31, 2025

### Improvements

- **Better Receipt Import** - Redesigned the receipt confirmation screen for easier reviewing:
  - Item names now use full width so you can see longer names without truncation
  - Confidence indicators are now compact colored icons instead of taking up space with text
  - Delete button moved to the top corner for cleaner layout

- **Recover Excluded Items** - When scanning a receipt, non-food items (bags, tax, cleaning supplies) are now tracked separately. If the AI incorrectly excluded something, expand the "Excluded items" section at the bottom to add it back to your list

---

## Version 0.8.0 - December 31, 2025

### New Features

- **Swap Meals in Your Plan** - Don't like a suggested meal? Tap the swap icon to see alternatives from your recipe library, filtered by meal type with match scores. Changed your mind? Use the undo button to restore the original

- **Edit Any Recipe** - New Edit button in the recipe modal lets you modify any recipe's details, ingredients, or instructions

### Improvements

- **Cleaner Recipe Actions** - Streamlined button labels in the recipe modal (Edit, Regenerate, Delete) for a cleaner look

### Bug Fixes

- **Undo Swap Fix** - Fixed an issue where undoing a swap would fail on AI-suggested meals that didn't have a recipe in your library yet

---

## Version 0.7.1 - December 30, 2025

### Bug Fixes

- **Mobile Landscape Nav Dots** - Fixed an issue where scroll indicator dots appeared below the day picker even when all 7 days were visible (e.g., on phones in landscape mode). The dots now hide automatically when the content doesn't need scrolling.

---

## Version 0.7.0 - December 30, 2025

### New Features

- **Mobile-Optimized Meal Plans** - The weekly meal plan view is now fully optimized for mobile! Meal cards now take full width for better readability, and the day picker uses a modern pill-style design with visual scroll indicators

- **Multi-Day Desktop View** - On larger screens, see multiple days at once:
  - 2 days side-by-side on medium screens (1000px+)
  - 3 days side-by-side on large screens (1500px+)
  - The day picker highlights all visible days so you always know what you're looking at

### Improvements

- **Smarter Scroll Indicators** - Gradient fades appear on the edges of the day picker to hint at more content, and they respond dynamically as you scroll (left fade appears when you can scroll back, right fade disappears when you reach the end)

- **Better Day Navigation** - Removed the old arrow buttons in favor of the streamlined day picker - just tap any day to jump to it instantly

---

## How to Use This App

**First Time Here?**
1. **Set up your household** - Add family members with their allergies and preferences
2. **Add groceries** - Use voice, receipt photos, or manual entry
3. **Browse recipes** - Or generate custom recipes from your groceries
4. **Create meal plans** - Let AI create your weekly meal plan automatically!

**Need Help?**
Click the bug button in the bottom-right corner to send us feedback anytime.

---

[View older releases](/docs/RELEASE_NOTES_ARCHIVE.md)

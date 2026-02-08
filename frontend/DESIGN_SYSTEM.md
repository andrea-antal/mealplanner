# Meal Planner Design System v2.0

This document defines the visual language for all feature branches. Reference these tokens and patterns instead of hardcoding values.

## Fonts

| Role | Family | Tailwind Class | Usage |
|------|--------|----------------|-------|
| Body | Inter | `font-sans` | All body text, labels, inputs |
| Display | Fraunces | `font-display` | Headings (h1-h6), hero text, stat values |

Inter includes OpenType features `cv11` and `ss01` enabled globally for improved readability.

## Color Tokens

All colors are CSS custom properties in HSL format, referenced via Tailwind utilities.

### Core Palette

| Token | Light Mode | Tailwind Class | Usage |
|-------|-----------|----------------|-------|
| `--background` | Warm off-white | `bg-background` | Page backgrounds |
| `--foreground` | Near-black warm | `text-foreground` | Primary text |
| `--card` | Pure white | `bg-card` | Card surfaces, elevated elements |
| `--primary` | Amber gold (38 92% 50%) | `bg-primary`, `text-primary` | CTAs, active nav, key actions |
| `--primary-soft` | Light amber tint | `bg-primary-soft` | Soft highlights, hover states |
| `--secondary` | Sage green | `bg-secondary` | Secondary actions, tags |
| `--success` | Green (142 60% 40%) | `bg-success`, `text-success` | Success states, confirmations |
| `--muted` | Warm gray | `bg-muted`, `text-muted-foreground` | Disabled states, secondary text |
| `--accent` | Warm neutral | `bg-accent` | Tertiary highlights, table stripes |
| `--warning` | Amber | `bg-warning` | Warnings, expiry alerts |
| `--destructive` | Tomato red | `bg-destructive` | Delete actions, errors |
| `--border` | Light warm gray | `border-border` | All borders |

### Tag Colors

Used for recipe tags and category badges:

| Tag | Token | Tailwind |
|-----|-------|----------|
| Toddler-friendly | `--tag-toddler` | `bg-tag-toddler` |
| Quick | `--tag-quick` | `bg-tag-quick` |
| Daycare-safe | `--tag-daycare` | `bg-tag-daycare` |
| Approved | `--tag-approved` | `bg-tag-approved` |
| One-pot | `--tag-onepot` | `bg-tag-onepot` |
| Batch-cookable | `--tag-batch` | `bg-tag-batch` |
| Breakfast | `--tag-breakfast` | `bg-tag-breakfast` |
| Leftover | `--tag-leftover` | `bg-tag-leftover` |

## Shadows

Layered shadow system — use sparingly for elevation hierarchy:

| Level | Tailwind | Usage |
|-------|----------|-------|
| `shadow-xs` | `shadow-xs` | Default resting state for cards |
| `shadow-soft` | `shadow-soft` | Hover states, slight emphasis |
| `shadow-medium` | `shadow-medium` | Modals, dropdowns, elevated panels |
| `shadow-lg` | `shadow-lg` | Popovers, floating elements |

## Border Radius

| Token | Value | Tailwind | Usage |
|-------|-------|----------|-------|
| Base | 0.625rem (10px) | `rounded-lg` | Default for cards, inputs |
| sm | 6px | `rounded-sm` | Tags, badges, small elements |
| md | 8px | `rounded-md` | Buttons, form controls |
| xl | 14px | `rounded-xl` | Cards, panels, major containers |
| 2xl | 18px | `rounded-2xl` | Hero elements only |
| 3xl | 24px | `rounded-3xl` | Special decorative elements |

## Component Patterns

### Cards
```
rounded-xl border border-border bg-card shadow-xs
hover: hover:shadow-soft
```

### Icon Containers (in cards/lists)
```
flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10
Icon: h-5 w-5 text-primary
```

### Section Headings
```
<h2 className="font-display text-2xl font-semibold text-foreground mb-5">
```

### Page Spacing
- Between sections: `space-y-10`
- Section heading to content: `mb-5`
- Card interior padding: `p-4`
- Grid gaps: `gap-3` (tight) or `gap-4` (standard)

### Navigation (Active State)
```
Desktop: bg-primary/10 text-primary rounded-md
Mobile: text-primary (no background)
```

### Header
```
border-b border-border/60 bg-card/80 backdrop-blur-lg
Height: h-14
```

### Buttons
- Primary: `bg-primary text-primary-foreground`
- Subtle: `bg-primary/10 text-primary` (for icon buttons, secondary actions)
- Ghost: `text-muted-foreground hover:text-foreground hover:bg-accent`

## Animations

| Name | Tailwind | Duration | Usage |
|------|----------|----------|-------|
| Fade in | `animate-fade-in` | 0.3s | Page content appearance |
| Slide in bottom | `animate-slide-in-bottom` | 0.3s | Cards, list items |
| Accordion down/up | `animate-accordion-down` | 0.2s | Collapsible sections |

## Spacing Scale (Key Values)

| Size | px | Usage |
|------|-----|-------|
| 0.5 | 2px | Tight gaps (icon + label) |
| 1 | 4px | Minimal spacing |
| 1.5 | 6px | Compact component gaps |
| 2 | 8px | Standard element gaps |
| 2.5 | 10px | Card-to-text spacing |
| 3 | 12px | Grid gaps, component spacing |
| 4 | 16px | Card padding, section gaps |
| 5 | 20px | Section heading margin |
| 6 | 24px | Page top/bottom padding |
| 8 | 32px | Large section spacing |
| 10 | 40px | Between page sections |

## Dark Mode

All tokens have dark mode variants. Dark mode is class-based (`.dark` on `<html>`).
Dark palette uses warm charcoal backgrounds with golden amber accents.

## API Module Structure

The API client has been split into domain modules for parallel feature development:

```
src/lib/api/
  client.ts      — Base fetch logic, APIError, handleResponse
  types.ts       — All TypeScript interfaces
  household.ts   — householdAPI, onboardingAPI
  groceries.ts   — groceriesAPI, shoppingListAPI, templatesAPI
  recipes.ts     — recipesAPI
  mealPlans.ts   — mealPlansAPI, healthAPI
  admin.ts       — adminAPI
  index.ts       — Barrel re-export (backward compatible)
```

**For existing code:** `import { recipesAPI } from '@/lib/api'` still works.
**For new features:** Import directly from domain modules to reduce merge conflicts:
```ts
import { recipesAPI } from '@/lib/api/recipes';
import type { Recipe } from '@/lib/api/types';
```

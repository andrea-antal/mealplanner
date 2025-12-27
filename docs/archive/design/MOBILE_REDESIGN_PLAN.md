---
**Summary**: Comprehensive mobile-first redesign plan covering navigation, responsive layouts, touch interactions, and PWA features. Future work not yet implemented.
**Last Updated**: 2025-12-22
**Status**: Archived
**Archived**: 2025-12-25
**Reason**: Future plans not yet implemented; may reference when prioritizing mobile UX
**Read This If**: You're planning mobile UX improvements or PWA implementation
---

# Mobile-First Frontend Redesign Plan

## Executive Summary

This plan outlines a comprehensive mobile-first redesign of the Meal Planner application. The goal is to optimize the user experience for mobile devices while maintaining full desktop functionality. The app already has a solid foundation with shadcn/ui components, Tailwind CSS, and a mobile bottom navigation bar.

---

## Current State Analysis

### ✅ Strengths
1. **Solid component foundation**: Using shadcn/ui with Radix UI primitives
2. **Mobile-aware infrastructure**:
   - Bottom navigation bar for mobile (AppLayout.tsx:59-80)
   - `useIsMobile` hook with 768px breakpoint
   - Tailwind responsive utilities already in use
3. **Consistent styling**: Custom design system with terracotta/sage color palette
4. **Good semantic structure**: Proper use of cards, modals, and spacing

### ⚠️ Pain Points for Mobile

#### 1. **MealPlans Page** (MealPlans.tsx)
- **7-column day selector** (line 265): Too cramped on mobile - days are compressed into tiny columns
- **Arrow navigation with side buttons**: Takes up valuable horizontal space
- **Modal overload**: Multiple modals (RecipeModal, GenerateFromTitleModal, MealPlanGenerationModal) can feel heavy on small screens
- **Fixed padding issues**: Some containers use fixed padding that doesn't scale well

#### 2. **Recipes Page** (Recipes.tsx)
- **Search and filter row** (line 176): Two inputs side-by-side can feel cramped
- **Recipe grid**: `sm:grid-cols-2 lg:grid-cols-3` works but could be optimized for thumb zones
- **RecipeCard height**: Cards could benefit from more compact mobile variant

#### 3. **Household Page** (Household.tsx)
- **Dense forms**: Family member cards (line 236-324) pack a lot of inputs - hard to read/edit on mobile
- **Age group selector width**: `w-32` (line 307) might be too wide on very small screens
- **Form inputs stacked**: Could benefit from better mobile touch targets

#### 4. **Groceries Page** (Groceries.tsx)
- **Advanced form toggle**: `grid-cols-1 sm:grid-cols-2` works well but form could be more thumb-friendly
- **Grocery list items**: Long ingredient names with badges can overflow (line 368-393)
- **Checkbox sizing**: Default size might be too small for easy mobile tapping

#### 5. **Index/Dashboard** (Index.tsx)
- **Quick actions grid**: `flex gap-4 flex-wrap lg:flex-nowrap` (line 52) - works but cards can be too small on narrow screens
- **Hero buttons**: Two buttons in hero (line 27) should stack better on very small screens

#### 6. **RecipeModal** (RecipeModal.tsx)
- **Two-pane split**: Top recipe details + bottom ratings (line 94, 163) - `max-h-[90vh]` can feel cramped
- **Ingredient/instruction lists**: Dense text can be hard to scan on mobile
- **Fixed modal width**: `max-w-2xl` might be too wide on tablets

#### 7. **AppLayout** Navigation
- **Desktop nav**: Hidden on mobile which is good
- **Bottom nav labels**: Small text (line 75) - could be optimized
- **Padding**: `pb-24 md:pb-6` (line 83) - good but could be refined

---

## Design Philosophy

### Mobile-First Principles
1. **Thumb-friendly zones**: Primary actions in the bottom 1/3 of screen
2. **Readable text**: Minimum 16px base font size, generous line height
3. **Generous tap targets**: Minimum 44px × 44px for interactive elements
4. **Single column by default**: Stack elements vertically on mobile
5. **Progressive disclosure**: Hide advanced features behind toggles/accordions
6. **Reduce cognitive load**: One primary action per screen section
7. **Optimize for one-handed use**: Critical actions reachable with thumb

### Breakpoint Strategy
```js
// Current Tailwind breakpoints (maintain these)
sm: 640px   // Small tablets, large phones in landscape
md: 768px   // Tablets (matches useIsMobile breakpoint)
lg: 1024px  // Small laptops
xl: 1280px  // Desktop
2xl: 1536px // Large desktop

// Additional custom breakpoints to consider
xs: 475px   // Small phones (if needed)
```

---

## Implementation Approach: 3 Options

### Option A: Incremental Refinement (Recommended)
**Effort**: Medium | **Risk**: Low | **Timeline**: 1-2 weeks

Keep the existing structure but systematically improve mobile UX:
- Optimize spacing, touch targets, and typography for mobile
- Refactor dense components (MealPlans day selector, Household forms)
- Add mobile-specific variants for complex components
- Use responsive Tailwind utilities more aggressively
- Maintain current routing and component hierarchy

**Pros**:
- Low risk - no architectural changes
- Can ship incremental improvements
- Maintains existing functionality
- Easy to test and validate

**Cons**:
- May not solve fundamental mobile UX issues
- Some components still feel "desktop shrunk down"

---

### Option B: Component-Level Mobile Variants
**Effort**: High | **Risk**: Medium | **Timeline**: 2-3 weeks

Create mobile-optimized variants for key components:
- `MealPlansMobile.tsx` with swipeable day carousel
- `RecipeCardCompact.tsx` for mobile recipe browsing
- `HouseholdFormMobile.tsx` with accordion-based family member editing
- Use `useIsMobile` hook to conditionally render variants
- Desktop keeps current implementation

**Pros**:
- Best of both worlds - optimized for each platform
- Can leverage mobile-specific patterns (swipe, bottom sheets)
- No compromise on desktop experience

**Cons**:
- Duplicate component maintenance
- Larger bundle size (though code splitting can help)
- More testing surface area
- Risk of feature drift between variants

---

### Option C: Responsive Components with Mobile-First CSS
**Effort**: High | **Risk**: High | **Timeline**: 3-4 weeks

Complete redesign using mobile-first responsive components:
- Rebuild components with mobile as the primary design target
- Use CSS Grid/Flexbox with sophisticated responsive patterns
- Leverage shadcn/ui mobile components (Sheet, Drawer, Carousel)
- Replace modals with mobile-friendly Drawers on small screens
- Implement swipe gestures, bottom sheets, pull-to-refresh

**Pros**:
- True mobile-first experience
- Single codebase with unified design system
- Modern mobile UX patterns
- Future-proof architecture

**Cons**:
- Highest effort and risk
- Requires design mockups/specs
- Longer timeline
- Potential for bugs during transition

---

## Recommended Approach: Option A + Select Option B Components

### Hybrid Strategy
1. **Start with Option A** for quick wins across all pages
2. **Apply Option B** selectively to the most problematic components:
   - MealPlans day selector → Swipeable carousel on mobile
   - RecipeModal → Drawer variant on mobile
   - Household forms → Accordion-based mobile layout

This gives 80% of the benefit with 40% of the effort.

---

## Detailed Implementation Plan

### Phase 1: Foundation Improvements (Week 1)

#### 1.1 Enhance Touch Targets & Spacing
**Files**: All pages, all components

```tsx
// BEFORE (example from RecipeCard.tsx)
<div className="p-5">

// AFTER
<div className="p-4 md:p-5">  // Slightly tighter on mobile

// BEFORE (example from Household.tsx - delete button)
<Button variant="ghost" size="icon">
  <Trash2 className="h-4 w-4" />
</Button>

// AFTER - larger tap target
<Button variant="ghost" size="icon" className="h-11 w-11 md:h-10 md:w-10">
  <Trash2 className="h-5 w-5 md:h-4 md:w-4" />
</Button>
```

**Changes**:
- Increase all icon button sizes to minimum 44px on mobile
- Add generous padding to form inputs on mobile (p-3 instead of p-2)
- Increase checkbox size on mobile
- Add more vertical spacing between sections on mobile

---

#### 1.2 Typography Optimization
**Files**: `index.css`, all pages

```css
/* Add to index.css */
@layer base {
  /* Improve mobile readability */
  @media (max-width: 767px) {
    body {
      font-size: 16px; /* Prevent mobile zoom on input focus */
    }

    input, select, textarea {
      font-size: 16px; /* Critical for iOS */
    }
  }
}
```

**Changes**:
- Ensure all inputs are 16px minimum on mobile (prevents iOS zoom)
- Increase line-height for better readability: `leading-relaxed` on mobile text
- Scale down display fonts on mobile: `text-3xl md:text-4xl lg:text-5xl`

---

#### 1.3 Improve AppLayout Mobile Nav
**File**: `AppLayout.tsx`

**Current issues**:
- Bottom nav text is small
- No visual feedback on active state beyond color

**Changes**:
```tsx
// Line 59-80: Enhance bottom nav
<nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-lg md:hidden safe-area-inset-bottom">
  <div className="flex justify-around py-3 px-2">
    {navigation.map((item) => {
      const isActive = location.pathname === item.href;
      return (
        <Link
          key={item.name}
          to={item.href}
          className={cn(
            'flex flex-col items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium transition-all duration-200 min-w-[68px]',
            isActive
              ? 'text-primary bg-primary/10'
              : 'text-muted-foreground active:scale-95'
          )}
        >
          <item.icon className={cn('h-6 w-6', isActive && 'text-primary')} />
          <span className="leading-tight">{item.name}</span>
        </Link>
      );
    })}
  </div>
</nav>
```

**Improvements**:
- Larger icons (h-6 w-6 instead of h-5 w-5)
- Active state background for better visibility
- Add safe area inset for iPhone notch
- Larger tap targets with min-width
- Active scale animation for tactile feedback

---

### Phase 2: Page-Specific Optimizations (Week 1-2)

#### 2.1 MealPlans Page - Mobile Day Selector
**File**: `MealPlans.tsx`

**Problem**: 7-column day grid is cramped on mobile (line 265-297)

**Solution**: Horizontal scrollable day selector on mobile

```tsx
// Replace lines 263-297 with responsive variant

{/* Week Selector - Responsive */}
<div className="rounded-2xl bg-card shadow-soft p-4">
  {/* Mobile: Horizontal scroll */}
  <div className="md:hidden overflow-x-auto -mx-4 px-4">
    <div className="flex gap-2 min-w-min">
      {mealPlan.days.map((day, index) => {
        const { dayOfWeek, shortDate } = formatDate(day.date);
        const isSelected = index === selectedDayIndex;
        const isToday = day.date === today;

        return (
          <button
            key={day.date}
            onClick={() => setSelectedDayIndex(index)}
            className={cn(
              'flex flex-col items-center justify-center px-5 py-3 rounded-xl transition-all duration-200 shrink-0',
              'hover:bg-muted cursor-pointer min-w-[80px]',
              isSelected && 'bg-primary text-primary-foreground shadow-md scale-105'
            )}
          >
            <p className={cn(
              'text-xs font-medium uppercase tracking-wide mb-1',
              isSelected ? 'text-primary-foreground' : 'text-muted-foreground'
            )}>
              {dayOfWeek}
            </p>
            <p className={cn(
              'text-base font-semibold',
              isSelected ? 'text-primary-foreground' : 'text-foreground'
            )}>
              {shortDate.split(' ')[1]}
            </p>
            {isToday && !isSelected && (
              <div className="h-1 w-1 rounded-full bg-primary mt-1" />
            )}
          </button>
        );
      })}
    </div>
  </div>

  {/* Desktop: Grid as before */}
  <div className="hidden md:grid grid-cols-7 gap-2">
    {/* Keep existing desktop implementation */}
  </div>
</div>
```

**Improvements**:
- Horizontal scroll on mobile (easier thumb swipe)
- Larger tap targets (min-w-[80px])
- Better active state visibility
- Visual indicator for "today"

---

#### 2.2 MealPlans Page - Remove Navigation Arrows on Mobile
**File**: `MealPlans.tsx`

**Problem**: Left/right arrow buttons (line 302-395) take up horizontal space

**Solution**: Remove arrows on mobile, rely on day selector

```tsx
{/* Day View with Navigation Arrows */}
<div className="relative">
  <div className="flex items-center gap-4">
    {/* Left Arrow - Hidden on mobile */}
    <div className="hidden md:block shrink-0">
      {!isMonday && (
        <Button variant="outline" size="icon" onClick={handlePrevDay} className="h-12 w-12 rounded-full">
          <ChevronLeft className="h-6 w-6" />
        </Button>
      )}
      {isMonday && <div className="h-12 w-12" />}
    </div>

    {/* Day Card - Full Width */}
    <div className="flex-1">
      {/* Keep existing day card */}
    </div>

    {/* Right Arrow - Hidden on mobile */}
    <div className="hidden md:block shrink-0">
      {!isSunday && (
        <Button variant="outline" size="icon" onClick={handleNextDay} className="h-12 w-12 rounded-full">
          <ChevronRight className="h-6 w-6" />
        </Button>
      )}
      {isSunday && <div className="h-12 w-12" />}
    </div>
  </div>
</div>
```

---

#### 2.3 Recipes Page - Stack Search & Filter on Mobile
**File**: `Recipes.tsx`

**Problem**: Search and filter side-by-side (line 176-210) can feel cramped

**Solution**: Stack vertically on mobile

```tsx
{/* Search & Filter */}
<div className="flex flex-col gap-4 md:flex-row md:items-end md:gap-4">
  {/* Search Input */}
  <div className="relative flex-1 w-full md:max-w-md">
    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    <Input
      placeholder="Search recipes or tags..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      className="pl-10 h-11"
    />
  </div>

  {/* Filter Dropdown */}
  <div className="w-full md:w-56">
    <label className="text-sm font-medium text-muted-foreground block mb-1.5">
      <Filter className="inline h-3.5 w-3.5 mr-1" />
      Filter by
    </label>
    <Select value={selectedFilter} onValueChange={setSelectedFilter}>
      <SelectTrigger disabled={householdLoading} className="h-11">
        <SelectValue />
      </SelectTrigger>
      {/* Keep existing SelectContent */}
    </Select>
  </div>
</div>
```

**Improvements**:
- Full-width inputs on mobile for easier tapping
- Taller inputs (h-11 instead of default h-10)
- Stack vertically for better readability

---

#### 2.4 Household Page - Accordion for Family Members
**File**: `Household.tsx`

**Problem**: Family member cards (line 236-324) show all inputs at once - overwhelming on mobile

**Solution**: Use Accordion component for collapsible sections

```tsx
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

{/* Family Members - Mobile Accordion */}
<div className="space-y-4 md:space-y-4">
  {profile.family_members.map((member: FamilyMember) => (
    <div key={member.name} className="rounded-xl bg-muted/50 overflow-hidden">
      {/* Mobile: Accordion */}
      <div className="md:hidden">
        <Accordion type="single" collapsible>
          <AccordionItem value={member.name} className="border-none">
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <div className="flex items-center gap-3 flex-1">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-display font-semibold">
                  {member.name[0]}
                </div>
                <div className="text-left">
                  <p className="font-medium text-foreground">{member.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{member.age_group}</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              {/* Badges */}
              <div className="flex flex-wrap gap-1 mb-3">
                {/* Keep existing badges */}
              </div>

              {/* Editable fields */}
              <div className="space-y-3">
                {/* Keep existing inputs */}
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-3">
                <Select value={member.age_group} onValueChange={(value) => updateMemberAgeGroup(member.name, value as FamilyMember['age_group'])}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  {/* Keep existing SelectContent */}
                </Select>
                <Button variant="ghost" size="icon" onClick={() => removeFamilyMember(member.name)}>
                  <Trash2 className="h-5 w-5 text-destructive" />
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Desktop: Expanded view as before */}
      <div className="hidden md:flex items-center gap-4 p-4">
        {/* Keep existing desktop layout */}
      </div>
    </div>
  ))}
</div>
```

**Improvements**:
- Accordion reduces visual clutter on mobile
- Tap to expand/edit
- Desktop keeps expanded view for efficiency
- Larger delete button tap target

---

#### 2.5 Groceries Page - Improve List Items
**File**: `Groceries.tsx`

**Problem**: Grocery items (line 350-406) can have overflow with long names + badges

**Solution**: Better truncation and stacking on mobile

```tsx
<li
  key={item.name}
  className="flex items-start gap-3 px-4 py-4 hover:bg-muted/50 transition-colors"
>
  <div className="flex items-start gap-3 flex-1 min-w-0">
    <Checkbox
      id={`ingredient-${item.name}`}
      checked={selectedIngredients.includes(item.name)}
      onCheckedChange={() => toggleIngredientSelection(item.name)}
      className="mt-1 h-5 w-5"  // Larger checkbox
    />
    <label
      htmlFor={`ingredient-${item.name}`}
      className="flex-1 min-w-0 cursor-pointer"
    >
      <div className="flex items-center gap-3 mb-1">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary shrink-0">
          <ShoppingBasket className="h-5 w-5 text-secondary-foreground" />
        </div>
        <span className="text-base font-medium text-foreground capitalize truncate flex-1">
          {item.name}
        </span>
      </div>

      {/* Stack badges vertically on mobile */}
      <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:gap-2 md:flex-wrap ml-13">
        {item.purchase_date && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3 shrink-0" />
            <span className="truncate">Purchased {new Date(item.purchase_date).toLocaleDateString()}</span>
          </span>
        )}
        {showExpiryWarning && daysUntilExpiry !== null && (
          <span className={cn('text-xs px-2 py-1 rounded-full border inline-flex items-center gap-1 max-w-full', getExpiryBadgeClass(daysUntilExpiry))}>
            <span className="truncate">
              {/* Keep existing expiry text */}
            </span>
          </span>
        )}
      </div>
    </label>
  </div>
  <Button
    variant="ghost"
    size="icon"
    onClick={() => removeGrocery(item.name)}
    className="text-muted-foreground hover:text-destructive shrink-0 h-11 w-11"
    disabled={deleteMutation.isPending}
  >
    <X className="h-5 w-5" />
  </Button>
</li>
```

**Improvements**:
- Larger checkbox (h-5 w-5)
- Better truncation for long names
- Stack badges vertically on mobile for readability
- Larger delete button

---

#### 2.6 RecipeModal - Drawer on Mobile
**File**: `RecipeModal.tsx`

**Problem**: Full-screen dialog on mobile (line 89) with split panes can feel cramped

**Solution**: Use Sheet/Drawer component for mobile-native experience

```tsx
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';

export function RecipeModal({ recipe, open, onOpenChange, onDelete }: RecipeModalProps) {
  const isMobile = useIsMobile();
  // ... existing code ...

  const content = (
    <>
      {/* Recipe Details */}
      <div className="flex-1 overflow-y-auto px-6 space-y-6">
        {/* Keep existing content */}
      </div>

      {/* Ratings & Actions */}
      <div className="shrink-0 border-t border-border bg-muted/30 px-6 py-6 space-y-6">
        {/* Keep existing content */}
      </div>
    </>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[90vh] flex flex-col p-0 rounded-t-3xl">
          <SheetHeader className="px-6 pt-6 pb-4 shrink-0">
            <SheetTitle className="font-display text-2xl">{recipe?.title}</SheetTitle>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <DialogTitle className="font-display text-2xl">{recipe?.title}</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
```

**Improvements**:
- Bottom sheet on mobile (more natural gesture)
- Rounded top corners for polish
- Dialog on desktop for consistency
- Same content, different container

---

### Phase 3: Polish & Testing (Week 2)

#### 3.1 Add Mobile Gestures (Optional Enhancement)
**Effort**: Medium | **Value**: High

Consider adding for MealPlans day selector:
- Swipe gestures to navigate days (using `react-swipeable` or `embla-carousel`)
- Pull-to-refresh on lists (using native browser APIs)

#### 3.2 Performance Optimization
- Lazy load modals and heavy components
- Use `React.memo` for RecipeCard to prevent unnecessary re-renders
- Optimize images if added in future
- Test on slower mobile devices

#### 3.3 Accessibility Audit
- Ensure all interactive elements have proper ARIA labels
- Test keyboard navigation on desktop
- Test screen reader on mobile (VoiceOver/TalkBack)
- Verify color contrast ratios meet WCAG AA standards

#### 3.4 Cross-Device Testing
**Devices to test**:
- iPhone SE (small screen - 375px width)
- iPhone 14 Pro (standard - 393px width)
- iPhone 14 Pro Max (large - 430px width)
- iPad Mini (tablet - 768px width)
- Android phones (various sizes via Chrome DevTools)

---

## Alternative Patterns to Consider

### 1. Bottom Sheet for Actions (instead of modals)
Use `Sheet` component from shadcn/ui for all modals on mobile:
- Recipe generation
- Add grocery item
- Family member editing

**Pros**: More mobile-native feel
**Cons**: More code changes

### 2. Tab Bar vs Bottom Nav
Current: Fixed bottom nav with 5 items
Alternative: Use Tabs component for main navigation

**Pros**: More compact, can show active content
**Cons**: Less clear navigation hierarchy

### 3. Floating Action Button (FAB)
Add FAB for primary actions (Generate Meal Plan, Add Recipe, Add Grocery)

**Pros**: Thumb-friendly, clear primary action
**Cons**: Can obscure content, not part of current design system

### 4. Swipeable Cards
Replace MealPlans day cards with a swipeable carousel (like Tinder)

**Pros**: Fun, engaging interaction
**Cons**: Less accessible, harder to overview week

---

## Technical Considerations

### Bundle Size Impact
- **Option A**: Minimal impact (~5KB increase for mobile-specific CSS)
- **Option B**: Moderate impact (~20-30KB for duplicate components)
- **Option C**: Large impact if not careful (~50KB+ for new libraries)

**Mitigation**:
- Use dynamic imports for modals: `lazy(() => import('./RecipeModal'))`
- Code split by route
- Tree-shake unused shadcn/ui components

### Browser Support
- Target: iOS Safari 14+, Chrome Android 90+
- Use `@supports` queries for advanced CSS
- Polyfill for older devices if analytics show need

### State Management
- Current: React Query for server state, local state for UI
- **No changes needed** - architecture supports mobile patterns

### Testing Strategy
1. **Unit tests**: Existing tests should still pass
2. **Visual regression**: Use Chromatic or Percy for screenshot diffs
3. **E2E tests**: Add Playwright tests for mobile viewports
4. **Manual QA**: Test on real devices, not just emulators

---

## Migration Strategy

### Low-Risk Rollout
1. **Feature flag**: Add `MOBILE_REDESIGN_ENABLED` flag
2. **A/B test**: 10% mobile users → 50% → 100%
3. **Rollback plan**: Keep old components in codebase for 1 sprint
4. **User feedback**: Add feedback widget for mobile users

### Breaking Changes
**None expected** - all changes are additive/refinements

---

## Success Metrics

### Quantitative
- [ ] **Tap target compliance**: 100% of buttons ≥44px × 44px on mobile
- [ ] **Lighthouse mobile score**: ≥90 (currently unknown, measure baseline)
- [ ] **Font size compliance**: No text <16px on mobile inputs
- [ ] **Viewport coverage**: Works on 320px (iPhone SE) to 768px (iPad)

### Qualitative
- [ ] **User testing**: 5 mobile users can complete core tasks without frustration
- [ ] **Visual consistency**: Mobile feels cohesive, not "desktop shrunk"
- [ ] **Performance**: No jank on scroll/interactions
- [ ] **Accessibility**: Passes automated audit (aXe, Lighthouse)

---

## Questions for You (User Input Needed)

Before proceeding with implementation, please clarify:

1. **Timeline**: Do you need this done ASAP, or can we take 2-3 weeks for quality?

2. **Target devices**: What devices do you and your household primarily use?
   - Small phones (iPhone SE, Android <6")?
   - Standard phones (iPhone 14, Pixel)?
   - Large phones (iPhone Pro Max, Android phablets)?
   - Tablets (iPad)?

3. **Feature priority**: Which pages are used most on mobile?
   - If MealPlans is primary → prioritize day selector redesign
   - If Groceries is primary → prioritize list UX
   - If Recipes is primary → prioritize card grid + modal

4. **Design preferences**: Any mobile apps you love the UX of? Examples help me match your taste.

5. **Radical changes OK?**: Are you open to patterns like:
   - Bottom sheets instead of modals?
   - Swipe gestures for navigation?
   - Floating action buttons?
   - Or prefer conservative refinements?

6. **Testing resources**: Do you have real devices for testing, or should we rely on browser DevTools?

7. **Dark mode**: I see dark mode CSS in index.css - is this actively used? Should mobile redesign consider it?

---

## Recommended Next Steps

1. **Answer questions above** to refine approach
2. **Choose implementation option**: A, B, or Hybrid (my recommendation)
3. **Review and approve this plan**
4. **I'll start with Phase 1 foundation improvements** (low-risk, high-value)
5. **Iterate based on your feedback**

---

## Appendix: Mobile UX Best Practices Reference

### Touch Target Sizes
- Minimum: 44px × 44px (iOS HIG)
- Recommended: 48px × 48px (Material Design)
- Spacing between: 8px minimum

### Typography
- Body text: 16px minimum (prevents zoom on iOS)
- Headings: Scale appropriately (text-xl on mobile vs text-3xl desktop)
- Line height: 1.5-1.75 for readability
- Max line length: 60-70 characters

### Spacing
- Outer container padding: 16px on mobile
- Between sections: 24-32px on mobile
- Form fields: 12-16px vertical spacing

### Performance
- First Contentful Paint: <1.8s on 3G
- Time to Interactive: <3.8s on 3G
- Cumulative Layout Shift: <0.1
- Total bundle: <200KB (gzipped) for initial load

### Common Mobile Patterns
- **Bottom navigation**: 5 items max
- **Bottom sheets**: For temporary content
- **Floating labels**: For compact forms
- **Infinite scroll**: For long lists (not pagination)
- **Pull to refresh**: For data refresh
- **Swipe actions**: For list item actions

---

## End of Plan

This plan is comprehensive but flexible. We can adjust based on your priorities and constraints. The hybrid approach (Option A + selective Option B) gives us the best balance of effort vs. impact.

Ready to move forward when you give the green light! 🚀

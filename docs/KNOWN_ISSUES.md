---
**Summary**: Active bugs, limitations, and technical debt. Updated frequently to track current issues.
**Last Updated**: 2026-02-08
**Status**: Current
**Read This If**: You're debugging, planning bug fixes, or need to know current limitations
---

# Known Issues & Bugs

This document tracks known issues that need to be fixed in future sprints.

## Active Issues

### 1. Daycare Meals Generated on Weekends
**Priority**: Medium
**Discovered**: 2025-12-19
**Status**: Open

**Description**:
Saturday is generating two lunches (one for Nathan/daycare, one for family) plus a snack, when it should only have family meals. Daycare meals should only be generated Monday-Friday.

**Expected Behavior**:
- **Monday-Friday**: Nathan gets daycare lunch + daycare snack (separate from family meals)
- **Saturday-Sunday**: Only family meals (no daycare-specific meals)

**Actual Behavior**:
- Saturday is generating daycare lunch for Nathan in addition to family lunch

**Investigation Needed**:
- Review Claude prompt instructions for weekend vs weekday distinction
- Check if Claude is correctly interpreting day of week
- May need to explicitly state "no daycare on weekends" in prompt
- Consider adding day-of-week context to each day in the prompt

**Workaround**:
None currently - users can manually ignore the extra daycare lunch on weekends.

**Related Files**:
- `backend/app/services/claude_service.py` (lines 241-245: daycare requirements)
- `backend/app/services/claude_service.py` (lines 276-277: weekday/weekend meal structure)

---

### 2. Orphaned Recipe Ratings After Member Deletion
**Priority**: Low
**Discovered**: 2025-12-22
**Status**: Open

**Description**:
When a household member is deleted from the household profile, their ratings on recipes persist in the `recipe_ratings.json` file but are no longer displayed in the UI. This creates invisible/orphaned rating data.

**Expected Behavior**:
One of the following:
- **Option A**: When a member is deleted, automatically clean up their ratings from all recipes
- **Option B**: Display orphaned ratings with "(deleted member)" label
- **Option C**: Provide admin UI to view and clean up orphaned ratings

**Actual Behavior**:
- Member ratings remain in `recipe_ratings.json` after member deletion
- UI only displays ratings for current household members
- Aggregate counts (e.g., "2👍 1👎") may appear incomplete to users who knew there were more ratings

**Example**:
1. Household has members: Andrea, Adam, Nathan
2. Recipe X has ratings: Andrea (like), Adam (dislike), Nathan (like)
3. Nathan is removed from household
4. Recipe X still shows only Andrea (like), Adam (dislike) in UI
5. But `recipe_ratings.json` still contains Nathan's "like" rating

**Impact**:
- Low user impact - orphaned data is invisible in UI
- Potential confusion if member is re-added later (old ratings resurface)
- Data hygiene issue - stale references in database

**Workaround**:
Manually edit `backend/data/recipe_ratings.json` to remove deleted member's ratings.

**Potential Fix**:
Add a cleanup hook when updating household profile:
- `POST /household/profile` endpoint checks for removed members
- Iterates through all recipe ratings
- Removes ratings from deleted members
- Logs cleanup action

**Related Files**:
- `backend/data/recipe_ratings.json` (rating storage)
- `backend/app/routers/household.py` (household update endpoint)
- `backend/app/routers/recipes.py` (lines 47-83: GET /ratings endpoint)
- `frontend/src/components/RecipeRating.tsx` (rating display)

**Future Considerations**:
- Consider soft-delete pattern (mark members as inactive instead of deleting)
- Add data migration script to clean up orphaned ratings in existing data

---

### 3. Favicon Looks Like Santa Hat Instead of Carrot
**Priority**: Low (Design Polish)
**Discovered**: 2025-12-26
**Status**: Open

**Description**:
The custom SVG favicon created during the mobile redesign doesn't render clearly at small sizes (16x16px, 32x32px). The hand-drawn carrot icon looks more like a Santa hat due to poor rendering at favicon sizes.

**Expected Behavior**:
- Clear, recognizable carrot icon at all sizes
- Matches groceries-first theme
- Professional appearance in browser tab

**Actual Behavior**:
- SVG carrot appears ambiguous at small sizes
- Looks like a Santa hat rather than a carrot

**Potential Fixes**:
- **Option A**: Use a professional icon library (e.g., export from Lucide React's Carrot icon as SVG)
- **Option B**: Simplify the hand-drawn SVG to work better at small sizes (fewer details, clearer silhouette)
- **Option C**: Use an emoji-based favicon: `🥕` (simple, universally recognized)
- **Option D**: Generate multi-size favicon with proper .ico format for different resolutions

**Workaround**:
Current favicon works functionally, just not aesthetically ideal.

**Related Files**:
- `/frontend/public/favicon.svg` (current hand-drawn SVG)
- `/frontend/index.html` (lines 11-12: favicon references)

**Recommended Fix**:
Option A - Export Lucide's Carrot icon as optimized SVG, or use a favicon generator service for professional multi-size output.

---

### 4. Backend Tests Hang Locally
**Priority**: Medium
**Discovered**: 2026-02-08
**Status**: Open

**Description**:
Running `pytest` locally hangs during import of `app.main`. The backend imports trigger connections to external services (Supabase, ChromaDB) that block without the production environment. Tests pass in CI (Railway) where all services are available.

**Workaround**:
- Use `npm run build` in frontend for TypeScript checking
- Rely on CI for backend test execution
- For local testing, individual modules can be tested by mocking external connections

**Related Files**:
- `backend/app/main.py` (top-level imports that trigger connections)

---

### 5. Recipe Photos: R2 Bucket Not Configured
**Priority**: Medium
**Discovered**: 2026-02-08
**Status**: Open

**Description**:
The photo upload feature uses Cloudflare R2 for storage, but the R2 bucket hasn't been configured yet. The code has env var placeholders (`R2_BUCKET_NAME`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT_URL`) and falls back to local filesystem storage when these aren't set.

**Impact**:
- Photo uploads will use local filesystem in production (not persisted across Railway deploys)
- Web-scraped photos (og:image URLs) still work since they're just URL references

**Fix Required**:
Configure Cloudflare R2 bucket and set environment variables in Railway.

---

### 6. Large Frontend Bundle Size
**Priority**: Low
**Discovered**: 2026-02-08
**Status**: Open

**Description**:
Frontend bundle is 1,114 KB after minification (321 KB gzipped). Vite warns about chunks larger than 500 KB. This grew with the addition of 6 new features.

**Potential Fixes**:
- Code-split with dynamic `import()` for Cook Mode page, Generation Config modal
- Use `build.rollupOptions.output.manualChunks` for vendor splitting
- Lazy-load measurement density data

---

## Resolved Issues

### Week Starting on Sunday Instead of Monday
**Resolved**: 2025-12-19

**Issue**: Week selector was displaying Sunday as first day instead of Monday.

**Root Cause**:
1. Frontend was using `toISOString()` which converts to UTC, causing timezone shifts in date calculation
2. `formatDate()` was parsing ISO strings as UTC midnight, then converting to local time, shifting dates backward in timezones behind UTC (e.g., PST)

**Fix**:
1. Updated `handleGenerate()` to format dates using local time components instead of `toISOString()`
2. Updated `formatDate()` to parse date strings as local time using `new Date(year, month-1, day)`

**Files Modified**:
- `frontend/src/pages/MealPlans.tsx` (lines 113-124, 136-138)

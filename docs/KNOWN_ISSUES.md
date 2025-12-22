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

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

---
**Summary**: Documentation governance rules and conventions for maintaining organized, token-efficient docs in the mealplanner project.
**Last Updated**: 2025-12-25
**Status**: Current
**Read This If**: You're creating new documentation or unsure about structure
---

# Documentation Standards & Conventions

## Purpose
Prevent documentation debt through clear conventions and mandatory checks before creating new files.

---

## 🚨 Golden Rules

### Rule #1: Check INDEX.md First
**BEFORE creating any new documentation file:**
1. Read `docs/INDEX.md` completely
2. Check if a similar doc already exists
3. If unsure, ask the human
4. Update INDEX.md when adding new docs

**Common Duplicates to Watch For:**
- Sprint summaries → Use CHANGELOG.md or archive old sprints
- Handoff documents → Only ONE active HANDOFF.md should exist
- Implementation plans → Archive after sprint completes
- Feature specs → Check if PRODUCT_REQUIREMENTS.md covers it

### Rule #2: Metadata Headers Are Mandatory
Every markdown file MUST start with:
```markdown
---
**Summary**: [2-3 line description]
**Last Updated**: [YYYY-MM-DD]
**Status**: [Current | Reference | Archived]
**Read This If**: [You want to know about...]
---
```

### Rule #3: Update, Don't Duplicate
- **Existing doc covers your topic?** → Update it with new information
- **Doc is outdated?** → Archive it, then create new one
- **Doc is too large?** → Split into logical sections OR create summary doc

---

## 📁 File Organization

### Directory Structure
```
docs/
├── INDEX.md                    # Master table of contents (REQUIRED)
├── DOC_STANDARDS.md           # This file
├── HANDOFF.md                 # Latest session summary (ONLY ONE)
├── CURRENT_STATE.md           # Quick feature inventory
├── GETTING_STARTED.md         # New developer guide
├── PROJECT_CONTEXT.md         # Full project history
├── PRODUCT_REQUIREMENTS.md    # Product vision
├── CHANGELOG.md               # Chronological features
├── KNOWN_ISSUES.md           # Active bugs
│
├── reference/                 # Technical references
│   ├── FRONTEND_FEATURES.md
│   └── CLAUDE_CONTEXT.md
│
└── archive/                   # Historical docs
    ├── sprints/              # Completed sprint docs
    │   ├── SPRINT_HISTORY.md
    │   ├── SPRINT_4_PHASE_1_TDD_PLAN.md
    │   └── ...
    └── design/               # Historical design docs
        ├── IMPLEMENTATION_PLAN.md
        └── MOBILE_REDESIGN_PLAN.md
```

### Naming Conventions
- **UPPERCASE.md**: Project-level docs (INDEX, HANDOFF, CHANGELOG)
- **PascalCase.md**: Feature/technical docs (rare, prefer descriptive names)
- **SCREAMING_SNAKE_CASE.md**: Core reference docs (PRODUCT_REQUIREMENTS, KNOWN_ISSUES)
- **snake_case/**: Directory names (archive/, reference/)

---

## 📝 Document Types & Lifecycle

### 1. Living Documents (Always Current)
**Location**: `docs/` root
**Update Frequency**: Every session or sprint
**Examples**: HANDOFF.md, CURRENT_STATE.md, KNOWN_ISSUES.md, CHANGELOG.md

**Rules**:
- Must have `Status: Current` in metadata
- Update `Last Updated` date when modified
- Never archive while still relevant

### 2. Reference Documents (Stable)
**Location**: `docs/` root or `docs/reference/`
**Update Frequency**: Rarely (only for corrections or major changes)
**Examples**: PROJECT_CONTEXT.md, PRODUCT_REQUIREMENTS.md, FRONTEND_FEATURES.md

**Rules**:
- Must have `Status: Reference` in metadata
- Do NOT update for every small change
- Archive only if completely obsolete

### 3. Planning Documents (Temporary)
**Location**: `docs/` root during sprint, `docs/archive/sprints/` after completion
**Update Frequency**: During sprint only
**Examples**: TDD plans, implementation plans, sprint completion docs

**Lifecycle**:
1. Create during sprint planning
2. Mark `Status: Current` while sprint is active
3. Move to `archive/sprints/` when sprint completes
4. Update metadata to `Status: Archived`
5. Add archive reason (e.g., "Sprint complete, details in CHANGELOG")

### 4. Design Documents (Aspirational)
**Location**: `docs/archive/design/` (create here directly)
**Update Frequency**: Never (future plans)
**Examples**: MOBILE_REDESIGN_PLAN.md

**Rules**:
- Create directly in archive if not yet implementing
- Mark `Status: Archived` with reason "Future plans, not yet implemented"
- Move to `docs/` root when actively working on it

---

## 🗑️ Archival & Deletion Rules

### When to Archive
- ✅ Sprint/phase is complete
- ✅ Information is fully captured in CHANGELOG.md
- ✅ Doc is more than 6 months old and not referenced
- ✅ Doc has been superseded by newer doc

### When to Delete
- ✅ Exact duplicate with older date
- ✅ Empty or stub file never completed
- ✅ Accidentally created file
- ✅ Test/scratch file

### How to Archive
1. Move file to appropriate `archive/` subdirectory
2. Update metadata:
   ```markdown
   **Status**: Archived
   **Archived**: 2025-12-25
   **Reason**: [Why it was archived]
   ```
3. Update INDEX.md with archive entry
4. Add to "Deleted Files" section if deleted instead

### How to Delete
1. Add entry to INDEX.md "Deleted Files" section:
   ```markdown
   **[OLD] filename.md**
   - ❌ Deleted: 2025-12-25
   - 📝 Reason: [Why it was deleted]
   - ✅ Replaced by: [New file if applicable]
   ```
2. Delete the file
3. Commit with message: "docs: Delete duplicate [filename]"

---

## 🎯 Token Efficiency Guidelines

### Size Limits (Soft)
- Quick reference docs: < 100 lines
- Implementation guides: < 500 lines
- Historical records: < 1,500 lines (archive if larger)

### Strategies for Large Docs
1. **Split by topic**: Create multiple focused docs instead of one mega-doc
2. **Create summary**: Write 50-line summary with "See X for details"
3. **Archive old sections**: Move completed sprints to archive
4. **Use INDEX.md**: Add context so readers skip irrelevant docs

### Anti-Patterns to Avoid
- ❌ Copy-pasting between CHANGELOG and sprint docs
- ❌ Multiple handoff files from different sessions
- ❌ "backup" versions of the same file
- ❌ Planning docs that never get archived

---

## ✅ Pre-Commit Checklist

Before committing documentation changes:

- [ ] Metadata header present and up-to-date?
- [ ] INDEX.md updated with new/moved/deleted files?
- [ ] No duplicate content with existing docs?
- [ ] File in correct location (root vs reference vs archive)?
- [ ] If archiving: metadata shows reason and date?
- [ ] If deleting: added to "Deleted Files" in INDEX.md?

---

## 🤖 Claude Code Integration

### For Claude: Mandatory Pre-Documentation Checks

**BEFORE creating ANY new .md file:**
```
1. Read docs/INDEX.md completely
2. Search for keywords related to your planned doc
3. If similar doc exists:
   - Option A: Update existing doc
   - Option B: Ask human if new doc is needed
4. If creating new doc:
   - Add metadata header
   - Update INDEX.md immediately
   - Categorize correctly (root vs reference vs archive)
```

**BEFORE archiving sprint docs:**
```
1. Verify sprint details are in CHANGELOG.md
2. Add archive metadata (date, reason)
3. Move to archive/sprints/
4. Update INDEX.md
5. Commit with "docs: Archive [filename]"
```

**BEFORE updating HANDOFF.md:**
```
1. Check for duplicate HANDOFF files (root vs docs/)
2. Use docs/HANDOFF.md only
3. Update "Last Updated" date
4. Include session date at top
```

---

## 📚 Examples

### Good: Updating Existing Doc
```
User: "Add Sprint 5 completion notes"
Claude:
1. Reads CHANGELOG.md (already exists)
2. Adds Sprint 5 entry
3. Updates "Last Updated" date
4. No new file created ✅
```

### Bad: Creating Duplicate
```
User: "Document Sprint 5"
Claude:
1. Creates SPRINT_5_SUMMARY.md ❌
2. Doesn't check INDEX.md ❌
3. Duplicates content already in CHANGELOG.md ❌
```

### Good: Archiving After Sprint
```
User: "Sprint 4 Phase 2 is done"
Claude:
1. Verifies details are in CHANGELOG.md ✅
2. Moves SPRINT_4_PHASE_2_TDD_PLAN.md to archive/sprints/ ✅
3. Updates metadata with archive date and reason ✅
4. Updates INDEX.md ✅
```

---

## 🔄 Quarterly Review

Every 3 months, review:
- [ ] Are archived docs still needed? (Delete after 1 year if unused)
- [ ] Are reference docs still accurate?
- [ ] Is INDEX.md structure still logical?
- [ ] Any docs > 1,500 lines that should be split?

---

**Last Updated**: 2025-12-25
**Maintained By**: Human + Claude Code
**Questions?**: Ask before breaking conventions

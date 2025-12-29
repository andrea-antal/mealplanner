# Documentation Index

**Last Updated**: 2025-12-28
**Purpose**: Single source of truth for all documentation

---

## ⚠️ Before Creating New Documentation

**REQUIRED**: Check this index first to prevent duplicates!

**Common Pitfall**: Multiple files covering the same topic (e.g., sprint plans, handoffs)
**Solution**: Update existing docs OR check with human before creating new files

See [DOC_STANDARDS.md](DOC_STANDARDS.md) for full documentation conventions.

---

## 🚀 Start Here

### For Quick Context (New Session)
- **[HANDOFF.md](HANDOFF.md)** - Latest session summary *(Current)*
  - 🎯 Starting a new session or resuming work
  - ⚠️ Only ONE handoff file should exist - update this file, don't create new ones

### For New Developers
- **[GETTING_STARTED.md](GETTING_STARTED.md)** - Quick setup guide *(Current)*
  - 🎯 First time setting up the project

### For Current State
- **[CURRENT_STATE.md](CURRENT_STATE.md)** - Feature inventory *(Current)*
  - 🎯 Quick overview of what's working now

---

## 📋 Project Overview

### Core Documentation
- **[PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md)** - Product vision & user stories *(Reference)*
  - 🎯 Understanding product goals and scope

- **[CHANGELOG.md](CHANGELOG.md)** - Chronological feature history *(Current)*
  - 🎯 Detailed implementation notes, technical decisions, file changes by sprint

### User-Facing Documentation
- **[RELEASE_NOTES.md](RELEASE_NOTES.md)** - Release notes for beta testers *(Current)*
  - 🎯 View latest features, improvements, and bug fixes in user-friendly language
  - ⚠️ Written for non-technical users - friendly tone with emoji
  - 📦 Displayed in app as modal dialog on each release
  - ✨ Auto-shows when new version detected (workspace-scoped tracking)

### Standards & Conventions
- **[DOC_STANDARDS.md](DOC_STANDARDS.md)** - Documentation governance *(Current)*
  - 🎯 Creating new docs, naming conventions, archival rules

---

## 📚 Reference Docs

### Technical Reference
- **[reference/FRONTEND_FEATURES.md](reference/FRONTEND_FEATURES.md)** - Frontend tech stack *(Reference)*
  - 🎯 React, TypeScript, shadcn-ui component details

- **[reference/CLAUDE_CONTEXT.md](reference/CLAUDE_CONTEXT.md)** - Guide for Claude AI *(Reference)*
  - 🎯 Working with Claude Code on this project

### Active Issues
- **[KNOWN_ISSUES.md](KNOWN_ISSUES.md)** - Current bugs and limitations *(Current)*
  - 🎯 Debugging or planning bug fixes

---

## 📦 Archive

**Note**: Archived docs are kept for historical reference but are not actively maintained.

### Sprint Documentation
*Sprint details are authoritative in CHANGELOG.md. These are archived planning docs.*

- **[archive/sprints/SPRINT_HISTORY.md](archive/sprints/SPRINT_HISTORY.md)** - Sprints 1-3 summary *(Archived 2025-12-25)*
- **[archive/sprints/SPRINT_PLAN.md](archive/sprints/SPRINT_PLAN.md)** - Original sprint plans *(Archived 2025-12-25)*
- **[archive/sprints/SPRINT_4_PHASE_1_IMPLEMENTATION_PLAN.md](archive/sprints/SPRINT_4_PHASE_1_IMPLEMENTATION_PLAN.md)** - Waterfall plan (never used) *(Archived 2025-12-25)*
- **[archive/sprints/SPRINT_4_PHASE_1_TDD_PLAN.md](archive/sprints/SPRINT_4_PHASE_1_TDD_PLAN.md)** - Voice input TDD plan *(Archived 2025-12-25)*
- **[archive/sprints/SPRINT_4_PHASE_2_TDD_PLAN.md](archive/sprints/SPRINT_4_PHASE_2_TDD_PLAN.md)** - Receipt OCR TDD plan *(Archived 2025-12-25)*
- **[archive/sprints/SPRINT_4_PHASE_1_COMPLETION.md](archive/sprints/SPRINT_4_PHASE_1_COMPLETION.md)** - Phase 1 completion *(Archived 2025-12-25)*

### Design Documents
- **[archive/design/IMPLEMENTATION_PLAN.md](archive/design/IMPLEMENTATION_PLAN.md)** - Original 8-phase plan *(Archived 2025-12-25)*
- **[archive/design/MOBILE_REDESIGN_PLAN.md](archive/design/MOBILE_REDESIGN_PLAN.md)** - Future mobile plans *(Archived 2025-12-25)*

---

## 🗂️ Deleted Files

**[OLD] /HANDOFF.md** (root directory)
- ❌ Deleted: 2025-12-25
- 📝 Reason: Duplicate of docs/HANDOFF.md with older date (Dec 22 vs Dec 25)
- ✅ Replaced by: docs/HANDOFF.md (most recent version)

---

## 📊 Documentation Statistics

**Total Documentation**: ~10,000 lines
- **Active (root)**: ~2,000 lines (20%)
- **Reference**: ~750 lines (7%)
- **Archived**: ~7,200 lines (72%)

**Token Efficiency Gains**:
- Archived 7,200 lines of one-time planning docs
- Deleted PROJECT_CONTEXT.md (539 lines - redundant with CHANGELOG)
- Created 75-line quick reference (CURRENT_STATE.md)
- Prevented duplicate handoff files (400 lines saved)
- **Net reduction in active context**: ~91% for typical sessions

---

## 🔄 Maintenance Schedule

**Every Session**:
- [ ] Update HANDOFF.md (don't create new one!)
- [ ] Update "Last Updated" dates on modified docs
- [ ] Check for new files that should be in INDEX.md

**After Sprint Completion**:
- [ ] Update CHANGELOG.md with sprint details
- [ ] Archive sprint planning docs (move to archive/sprints/)
- [ ] Update CURRENT_STATE.md
- [ ] Update INDEX.md with archived files

**Quarterly** (Every 3 months):
- [ ] Review archived docs (delete after 1 year if unused)
- [ ] Verify reference docs are still accurate
- [ ] Check if any docs exceed soft size limits
- [ ] Update INDEX.md structure if needed

---

**Last Updated**: 2025-12-25
**Maintained By**: Human + Claude Code
**Questions?**: Consult DOC_STANDARDS.md or ask before creating new files

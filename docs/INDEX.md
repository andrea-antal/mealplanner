# Documentation Index

**Last Updated**: 2025-12-25
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
- **[HANDOFF.md](HANDOFF.md)** - Latest session summary, immediate next steps
  - 📊 Size: 400 lines | Updated: 2025-12-25 | Status: Current
  - 🎯 Read this if: Starting a new session or resuming work
  - ⚠️ **IMPORTANT**: Only ONE handoff file should exist. Update this file, don't create new ones.

### For New Developers
- **[GETTING_STARTED.md](GETTING_STARTED.md)** - Quick setup guide
  - 📊 Size: ~100 lines | Updated: 2025-12-25 | Status: Current
  - 🎯 Read this if: First time setting up the project

### For Current State
- **[CURRENT_STATE.md](CURRENT_STATE.md)** - What's working right now
  - 📊 Size: ~75 lines | Updated: 2025-12-25 | Status: Current
  - 🎯 Read this if: You need a quick feature inventory

---

## 📋 Project Overview

### Core Documentation
- **[PROJECT_CONTEXT.md](PROJECT_CONTEXT.md)** - Complete development history
  - 📊 Size: 532 lines | Updated: 2025-12-18 | Status: Reference
  - 🎯 Read this if: You want the full project journey from inception
  - 📝 Contains: All sprint details, technical decisions, architecture evolution

- **[PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md)** - Product vision & user stories
  - 📊 Size: 228 lines | Updated: 2025-12-04 | Status: Reference
  - 🎯 Read this if: You need to understand product goals and scope

- **[CHANGELOG.md](CHANGELOG.md)** - Chronological feature history
  - 📊 Size: 1,401 lines | Updated: 2025-12-25 | Status: Current
  - 🎯 Read this if: You need detailed implementation notes for specific features
  - 📝 Contains: Technical decisions, test results, file changes by sprint

### Standards & Conventions
- **[DOC_STANDARDS.md](DOC_STANDARDS.md)** - Documentation governance
  - 📊 Size: 253 lines | Updated: 2025-12-25 | Status: Current
  - 🎯 Read this if: Creating new docs or unsure about structure
  - 📝 Contains: Naming conventions, metadata requirements, when to archive

---

## 📚 Reference Docs

### Technical Reference
- **[reference/FRONTEND_FEATURES.md](reference/FRONTEND_FEATURES.md)** - Frontend tech stack
  - 📊 Size: 218 lines | Updated: 2025-12-03 | Status: Reference
  - 🎯 Read this if: You need React, TypeScript, shadcn-ui component details

- **[reference/CLAUDE_CONTEXT.md](reference/CLAUDE_CONTEXT.md)** - Guide for Claude AI
  - 📊 Size: 506 lines | Updated: 2025-12-04 | Status: Reference
  - 🎯 Read this if: Working with Claude Code on this project

### Active Issues
- **[KNOWN_ISSUES.md](KNOWN_ISSUES.md)** - Current bugs and limitations
  - 📊 Size: 106 lines | Updated: 2025-12-22 | Status: Current
  - 🎯 Read this if: Debugging or planning bug fixes

---

## 📦 Archive

**Note**: Archived docs are kept for historical reference but are not actively maintained.

### Sprint Documentation
*Sprint details are authoritative in CHANGELOG.md. These are archived planning docs.*

- **[archive/sprints/SPRINT_HISTORY.md](archive/sprints/SPRINT_HISTORY.md)** - Sprints 1-3 summary
  - 📊 Size: 502 lines | Archived: 2025-12-25
  - 📝 Reason: Duplicates CHANGELOG content
  - 🎯 Read this if: You need historical context on early sprints (1-3)

- **[archive/sprints/SPRINT_PLAN.md](archive/sprints/SPRINT_PLAN.md)** - Original sprint plans
  - 📊 Size: 436 lines | Archived: 2025-12-25
  - 📝 Reason: Historical planning document; Sprint 4+ evolved to TDD approach
  - 🎯 Read this if: You want to see original sprint planning methodology

- **[archive/sprints/SPRINT_4_PHASE_1_IMPLEMENTATION_PLAN.md](archive/sprints/SPRINT_4_PHASE_1_IMPLEMENTATION_PLAN.md)** - Waterfall plan (NEVER USED)
  - 📊 Size: 1,877 lines | Archived: 2025-12-25
  - 📝 Reason: **Never used - TDD plan chosen instead**
  - 🎯 Read this if: You want to compare waterfall vs TDD planning approaches

- **[archive/sprints/SPRINT_4_PHASE_1_TDD_PLAN.md](archive/sprints/SPRINT_4_PHASE_1_TDD_PLAN.md)** - Voice input TDD plan
  - 📊 Size: 725 lines | Archived: 2025-12-25
  - 📝 Reason: Sprint complete, details in CHANGELOG
  - 🎯 Read this if: You want to see the TDD methodology used for voice input

- **[archive/sprints/SPRINT_4_PHASE_2_TDD_PLAN.md](archive/sprints/SPRINT_4_PHASE_2_TDD_PLAN.md)** - Receipt OCR TDD plan
  - 📊 Size: 1,451 lines | Archived: 2025-12-25
  - 📝 Reason: Sprint complete, details in CHANGELOG
  - 🎯 Read this if: You want to see the TDD methodology used for receipt OCR

- **[archive/sprints/SPRINT_4_PHASE_1_COMPLETION.md](archive/sprints/SPRINT_4_PHASE_1_COMPLETION.md)** - Phase 1 completion summary
  - 📊 Size: 451 lines | Archived: 2025-12-25
  - 📝 Reason: Covered in CHANGELOG
  - 🎯 Read this if: You want the original completion summary (before CHANGELOG integration)

### Design Documents
- **[archive/design/IMPLEMENTATION_PLAN.md](archive/design/IMPLEMENTATION_PLAN.md)** - Original 8-phase plan
  - 📊 Size: 841 lines | Archived: 2025-12-25
  - 📝 Reason: Original implementation complete (Phases 1-6); now historical
  - 🎯 Read this if: You want to understand the original project architecture and phased approach

- **[archive/design/MOBILE_REDESIGN_PLAN.md](archive/design/MOBILE_REDESIGN_PLAN.md)** - Future mobile plans
  - 📊 Size: 831 lines | Archived: 2025-12-25
  - 📝 Reason: Future plans not yet implemented
  - 🎯 Read this if: You're planning mobile UX improvements or PWA implementation

---

## 🗂️ Deleted Files

**[OLD] /HANDOFF.md** (root directory)
- ❌ Deleted: 2025-12-25
- 📝 Reason: Duplicate of docs/HANDOFF.md with older date (Dec 22 vs Dec 25)
- ✅ Replaced by: docs/HANDOFF.md (most recent version)

---

## 📊 Documentation Statistics

**Total Documentation**: ~10,500 lines
- **Active (root)**: ~2,500 lines (24%)
- **Reference**: ~750 lines (7%)
- **Archived**: ~7,200 lines (69%)

**Token Efficiency Gains**:
- Archived 7,200 lines of one-time planning docs
- Created 75-line quick reference (CURRENT_STATE.md)
- Prevented duplicate handoff files (400 lines saved)
- **Net reduction in active context**: ~90% for typical sessions

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

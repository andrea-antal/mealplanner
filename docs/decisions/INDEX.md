# Architecture Decision Records

This folder contains Architecture Decision Records (ADRs) documenting significant design decisions in the Meal Planner codebase.

## What is an ADR?

An ADR captures a design decision along with its context and consequences. They help:
- **New contributors** understand why things are built a certain way
- **Future you** remember the reasoning behind decisions
- **Reviewers** evaluate if assumptions still hold when making changes

## Format

Each ADR follows this template:
- **Status**: Proposed / Accepted / Deprecated / Superseded
- **Context**: What problem are we solving?
- **Decision**: What did we decide?
- **Alternatives Considered**: What else could we have done?
- **Consequences**: What are the tradeoffs?

## Index

| ID | Title | Status | Date |
|----|-------|--------|------|
| [001](./001-starter-recipe-titles.md) | Starter Recipe Title Selection | Accepted | 2026-01-14 |
| [002](./002-onboarding-background-tasks.md) | Onboarding Background Task Pattern | Accepted | 2026-01-14 |
| [003](./003-progress-modal-simulation.md) | Progress Modal Simulation vs Real Progress | Accepted | 2026-01-14 |

## Adding New ADRs

1. Copy the template from `_template.md`
2. Number sequentially (e.g., `004-feature-name.md`)
3. Add to the index table above
4. Get review if the decision is significant

## When to Write an ADR

Write an ADR when:
- Choosing between multiple valid approaches
- Making a tradeoff (speed vs accuracy, simplicity vs flexibility)
- Building something that might surprise future developers
- The "why" isn't obvious from the code alone

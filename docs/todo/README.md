# TODO Documentation

This folder contains detailed documentation for planned features and enhancements that are not part of the current development phase.

## Purpose

- Document future features with complete implementation details
- Provide reference for when features are ready to be implemented
- Track dependencies, effort estimates, and priorities
- Maintain a backlog of ideas and improvements

## Documents

### [auth-enhancements.md](./auth-enhancements.md)

**Status**: Planned for post-Phase 1
**Priority**: Medium
**Effort**: 6-8 hours

Comprehensive guide for implementing:

- **Forgot Password**: Email-based password reset flow with secure tokens
- **Google OAuth**: Social login with Google accounts

Includes:

- Complete implementation steps
- Code examples and schemas
- Security considerations
- Testing checklists
- Environment setup instructions
- Recommended implementation order

### [legacy-plan-hooks-cleanup.md](./legacy-plan-hooks-cleanup.md)

**Status**: Planned
**Priority**: Low
**Effort**: 1-2 hours

Removal of confirmed-dead legacy plan-save code surfaced during the superset
save-bug fix:

- 4 dead server actions (`savePlanAllDays`, `syncPlanDayExercises`,
  `copyWorkoutToPlanDay`, `updatePlanDay`)
- 3 dead mutation hooks (`useSyncPlanDayExercises`, `useCopyWorkoutToPlanDay`,
  `useUpdatePlanDay`)
- Associated unused Zod schemas/types

The live builder routes everything through `save-all-days` →
`planService.saveAllDays`. Includes the keep-list (`copyPlan`,
`createPlanForClient`) and step-by-step removal instructions.

## How to Use

1. Review documents when planning next development phase
2. Follow step-by-step implementation guides
3. Check off items as they are completed
4. Update status and notes as needed

## Adding New TODOs

When adding new planned features:

1. Create a new `.md` file in this directory
2. Use a clear, descriptive filename (kebab-case)
3. Include these sections:
   - **Overview**: What is the feature?
   - **Requirements**: What's needed to implement?
   - **Implementation Steps**: How to build it?
   - **Testing**: How to verify it works?
   - **Effort Estimate**: How long will it take?
   - **Dependencies**: What else is needed first?
   - **Priority**: When should this be done?
4. Update this README with a link and summary

## Template Structure

```markdown
# Feature Name - TODO

**Created**: YYYY-MM-DD
**Status**: Planned | In Progress | On Hold | Completed
**Priority**: Low | Medium | High | Critical
**Estimated Effort**: X hours/days

## Overview

Brief description of the feature

## Requirements

- Requirement 1
- Requirement 2

## Implementation Steps

1. Step 1
2. Step 2

## Testing

- [ ] Test case 1
- [ ] Test case 2

## Dependencies

- Dependency 1
- Dependency 2

## Notes

Additional context or considerations
```

---

**Last Updated**: 2026-06-21

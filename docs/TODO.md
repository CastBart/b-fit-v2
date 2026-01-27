# B-Fit TODO List

This document tracks deferred tasks, improvements, and future enhancements for the B-Fit project.

**Last Updated**: 2026-01-27

---

## High Priority

_No high priority items currently_

---

## Medium Priority

_No medium priority items currently_

---

## Low Priority (Developer Experience)

### Task 2.7: Environment Variables Management

**Status**: Deferred from Phase 1, Week 2
**Estimated Effort**: 1-2 hours
**Related Documentation**: `docs/phase-breakdowns/phase-1-foundation.md`

**Description**: Developer experience improvement for easy local setup.

**What needs to be done:**

1. **Create `.env.example` template** with all required environment variables:
   - Database variables (DATABASE_URL, POSTGRES_URL, POSTGRES_PRISMA_URL, etc.)
   - NextAuth variables (NEXTAUTH_URL, NEXTAUTH_SECRET)
   - Future variables (Stripe keys, etc.)
   - Include helpful comments for each variable explaining what it's for

2. **Document environment setup in README.md**:
   - Add comprehensive "Environment Setup" section
   - Document how to obtain each environment variable (Vercel dashboard, Neon, etc.)
   - Step-by-step setup instructions for new developers
   - Include links to Vercel, Neon, and other service documentation

3. **Create setup scripts**:
   - `scripts/setup.sh` (bash for Unix/Mac)
   - `scripts/setup.bat` (batch for Windows)
   - Script should:
     - Copy `.env.example` to `.env.local`
     - Guide user to fill in values (or prompt interactively)
     - Run `npx prisma migrate dev`
     - Run `npx prisma generate`
     - Verify setup is complete
     - Print success message with next steps

**Acceptance Criteria**:

- [ ] `.env.example` file created with all current variables
- [ ] README.md updated with "Environment Setup" section
- [ ] Setup scripts created and tested on both Windows and Unix
- [ ] New developer can set up local environment in under 10 minutes
- [ ] Documentation includes troubleshooting section for common issues

**Why Deferred**: Non-critical task. All core functionality is working. This can be completed later when polishing for team onboarding or open-source release.

**Files to Create/Modify**:

- `.env.example` (new)
- `README.md` (update)
- `scripts/setup.sh` (new)
- `scripts/setup.bat` (new)

---

## Future Enhancements

_Items to consider for future phases_

### Analytics Dashboard

- Volume tracking (total weight lifted per workout/week/month)
- Personal records (PRs) tracking
- Adherence metrics (workout completion rates)
- Progress charts and visualizations

### AI Workout Generator

- Generate workouts based on user goals, equipment, and time
- Suggest exercise substitutions
- Progressive overload recommendations

### PWA Offline Support

- Enable offline workout tracking
- Sync data when connection is restored
- Cache workout data for offline access

### Async Messaging

- PT-to-client messaging system
- Media uploads (form check videos, progress photos)
- Contextual to workouts/sessions/plans

### Nutrition Tracking

- Meal logging
- Macro/calorie tracking
- Integration with workout data

---

## Completed Items

_Completed TODO items are archived here for reference_

_None yet_

---

## Notes

- This TODO list is separate from the main phase breakdowns
- Items here are either deferred from phases or future enhancements
- Priority levels: High (blocking), Medium (important), Low (nice-to-have)
- Estimated effort: Small (< 2 hours), Medium (2-6 hours), Large (> 6 hours)

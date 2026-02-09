# Phase 3: Multi-Role Features

**Goal**: Transform B-Fit from a single-user fitness app into a multi-role platform supporting PT-Client relationships, workout/plan assignment, session history browsing, and role lifecycle management.

**Branch**: `feature/phase-3-multi-role`
**Last Updated**: 2026-02-09

---

## Design Decisions

- **Invite system**: Shareable link/code (no email service needed)
- **PT Branding**: Deferred to a later phase
- **ExerciseHistory model**: Skipped - computing PRs on-the-fly from session data
- **Plan assignment**: Included alongside workout assignment (copy-on-assign)

---

## Implementation Plan (9 Chunks)

### Chunk 1: RBAC Utility ✅

**Goal**: Centralize scattered role checks into a reusable utility.

| Step | Action                                                                                                | File                         | Status |
| ---- | ----------------------------------------------------------------------------------------------------- | ---------------------------- | ------ |
| 1.1  | Create RBAC permissions map + `hasPermission()`, `requirePermission()`, `requireRole()` helpers       | `src/lib/auth/rbac.ts` (NEW) | ✅     |
| 1.2  | Refactor inline role checks in `exercises.ts`, `workouts.ts`, `plans.ts` to use `requirePermission()` | Server action files          | ✅     |

**Notes**:

- Uses `success` boolean as discriminant for proper TypeScript type narrowing
- Permission map covers: exercise, workout, plan, session CRUD + assignment + client management
- `AuthResult` union type: `{ success: true; userId: string; role: UserRole }` or `{ success: false; error: string }`

---

### Chunk 2: Session History Page ✅

**Goal**: Build session history browsing using existing backend (`getUserSessions()`, `useSessions()`, `CompletedSessionDrawer`).

| Step | Action                                                                                             | File                                                            | Status |
| ---- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------ |
| 2.1  | Create SessionHistoryCard - name, date, duration, exercise count, volume, status badge             | `src/components/features/sessions/SessionHistoryCard.tsx` (NEW) | ✅     |
| 2.2  | Create Session History page - search, status filter, paginated grid, CompletedSessionDrawer detail | `src/app/(dashboard)/sessions/page.tsx` (NEW)                   | ✅     |

**Reuses**: `useSessions()` hook, `CompletedSessionDrawer`, `mapSessionToCompletedData()`, `formatDuration()`

---

### Chunk 3: PR Enhancement ✅

**Goal**: Highlight PR achievements in session completion summary.

| Step | Action                                                                                            | File                                                          | Status |
| ---- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ------ |
| 3.1  | Add `detectSessionPRs(userId, sessionId)` - per-session weight PR detection vs all prior sessions | `src/lib/analytics/pr-detection.ts`                           | ✅     |
| 3.2  | Create server action wrapper `getSessionPRs(sessionId)`                                           | `src/server/actions/sessions.ts`                              | ✅     |
| 3.3  | Add optional `prs` prop to CompletedSessionDrawer, render trophy badges section                   | `src/components/features/sessions/CompletedSessionDrawer.tsx` | ✅     |
| 3.4  | Wire PR detection into session completion flow (both banner and settings drawer paths)            | `src/app/(dashboard)/session/page.tsx`                        | ✅     |

**Notes**:

- Uses raw SQL (`Prisma.$queryRaw`) for efficient aggregation
- PR detection is non-blocking - failures silently skip (PRs are enhancement, not critical path)
- New types: `SessionPR`, `SessionPRDisplay`

---

### Chunk 4: ClientRelationship Schema & Server Actions ✅

**Goal**: Database model and core server actions for PT-client relationships.

| Step | Action                                                                     | File                                  | Status |
| ---- | -------------------------------------------------------------------------- | ------------------------------------- | ------ |
| 4.1  | Add `RelationshipStatus` enum + `ClientRelationship` model. Run migration. | `prisma/schema.prisma`                | ✅     |
| 4.2  | Create client types                                                        | `src/types/client.ts` (NEW)           | ✅     |
| 4.3  | Create Zod schemas for all client operations                               | `src/lib/validations/client.ts` (NEW) | ✅     |
| 4.4  | Create client server actions (10 actions)                                  | `src/server/actions/clients.ts` (NEW) | ✅     |
| 4.5  | Update JWT callback to handle `trigger: 'update'` for role changes         | `src/lib/auth/auth.config.ts`         | ✅     |

**Server Actions Created**:

- PT-facing: `getMyClients()`, `getClientDetail()`, `getClientSessions()`, `inviteClient()`
- Invitation: `getInvitation()`, `acceptInvitation()`, `rejectInvitation()`
- Shared: `endRelationship()`
- Client-facing: `getMyPT()`, `getPendingInvitations()`

**Key Logic**:

- `inviteClient()`: PT-only, creates PENDING relationship with unique `inviteCode`, deduplicates by email
- `acceptInvitation()`: Transaction - set clientId + ACTIVE + update user role to CLIENT. Enforces one-PT constraint.
- `endRelationship()`: Either party. Transaction - set ENDED + revert client to PERSONAL if no other active relationships

**Schema**: `ClientRelationship` with `ptId`, `clientId?`, `status`, `inviteCode` (unique), `clientEmail?`, timestamps. Unique constraint on `[ptId, clientId]`.

---

### Chunk 5: Workout & Plan Assignment ✅

**Goal**: PT can assign workouts/plans to clients via deep copy.

| Step | Action                                                                                      | File                             | Status |
| ---- | ------------------------------------------------------------------------------------------- | -------------------------------- | ------ |
| 5.1  | Add `assignWorkoutToClient()` - verify relationship, deep copy via existing `copyWorkout()` | `src/server/actions/workouts.ts` | ✅     |
| 5.2  | Add `assignPlanToClient()` - same pattern via existing `copyPlan()`                         | `src/server/actions/plans.ts`    | ✅     |
| 5.3  | Update `getWorkoutById()` - PT fallback: check active relationship for read access          | `src/server/actions/workouts.ts` | ✅     |
| 5.4  | Update `getSessionById()` - same PT fallback                                                | `src/server/actions/sessions.ts` | ✅     |
| 5.5  | Update `getPlanById()` - same PT fallback                                                   | `src/server/actions/plans.ts`    | ✅     |

---

### Chunk 6: Client Management UI (Pending)

**Goal**: PT-facing pages to manage clients, invite, and assign.

| Step | Action                                                                         | File                                                              |
| ---- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| 6.1  | Create `useClients(filters?)` query hook                                       | `src/hooks/queries/useClients.ts` (NEW)                           |
| 6.2  | Create `useClientDetail(clientId)` query hook                                  | `src/hooks/queries/useClientDetail.ts` (NEW)                      |
| 6.3  | Create `useInvitation(inviteCode)` query hook                                  | `src/hooks/queries/useInvitation.ts` (NEW)                        |
| 6.4  | Create client mutation hooks                                                   | `src/hooks/mutations/useClientMutations.ts` (NEW)                 |
| 6.5  | Create `ClientCard` component                                                  | `src/components/features/clients/ClientCard.tsx` (NEW)            |
| 6.6  | Create `InviteClientDrawer` - generate link, copy to clipboard                 | `src/components/features/clients/InviteClientDrawer.tsx` (NEW)    |
| 6.7  | Create `AssignWorkoutDrawer` - list PT's workouts, assign button               | `src/components/features/clients/AssignWorkoutDrawer.tsx` (NEW)   |
| 6.8  | Create `AssignPlanDrawer` - same pattern for plans                             | `src/components/features/clients/AssignPlanDrawer.tsx` (NEW)      |
| 6.9  | Create `EndRelationshipDialog` - AlertDialog with confirm                      | `src/components/features/clients/EndRelationshipDialog.tsx` (NEW) |
| 6.10 | Create Clients List page - search, filter, grid, invite drawer                 | `src/app/(dashboard)/clients/page.tsx` (NEW)                      |
| 6.11 | Create Client Detail page - info, tabs (workouts, plans, sessions), assignment | `src/app/(dashboard)/clients/[id]/page.tsx` (NEW)                 |
| 6.12 | Create Invite Acceptance page - PT info, accept/decline buttons                | `src/app/(dashboard)/invite/[code]/page.tsx` (NEW)                |
| 6.13 | Update middleware matcher for new routes                                       | `src/middleware.ts`                                               |

---

### Chunk 7: Role Upgrade Flow (Pending)

**Goal**: PERSONAL users can upgrade to PT role.

| Step | Action                                                                                 | File                                            |
| ---- | -------------------------------------------------------------------------------------- | ----------------------------------------------- |
| 7.1  | Create user validation schemas (`updateProfileSchema`)                                 | `src/lib/validations/user.ts` (NEW)             |
| 7.2  | Create user server actions: `getUserProfile()`, `upgradeToPT()`, `updateUserProfile()` | `src/server/actions/users.ts` (NEW)             |
| 7.3  | Create mutation hooks: `useUpgradeToPT()`, `useUpdateProfile()`                        | `src/hooks/mutations/useUserMutations.ts` (NEW) |
| 7.4  | Create Settings page - profile info, role-conditional upgrade/status cards             | `src/app/(dashboard)/settings/page.tsx` (NEW)   |
| 7.5  | Add Settings nav item to sidebar (all roles)                                           | `src/components/layouts/Sidebar.tsx`            |

---

### Chunk 8: Client-Side Experience & Dashboard (Pending)

**Goal**: Polish CLIENT role UX and role-aware dashboard.

| Step | Action                                                                                       | File                                     |
| ---- | -------------------------------------------------------------------------------------------- | ---------------------------------------- |
| 8.1  | Create `useMyPT()` query hook                                                                | `src/hooks/queries/useMyPT.ts` (NEW)     |
| 8.2  | Dashboard role-awareness: CLIENT sees "Your Trainer" card, PT sees "My Clients" quick action | `src/app/(dashboard)/dashboard/page.tsx` |
| 8.3  | Show "Assigned" badge on client workouts where `copiedFromId !== null`                       | `src/app/(dashboard)/workouts/page.tsx`  |
| 8.4  | Hide "Create" buttons on workouts/plans pages for CLIENT role                                | `workouts/page.tsx`, `plans/page.tsx`    |

---

### Chunk 9: Polish & Edge Cases (Pending)

**Goal**: Handle role transitions, stale JWT, UI guards.

| Step | Action                                                                  | File                            |
| ---- | ----------------------------------------------------------------------- | ------------------------------- |
| 9.1  | Verify all role-changing actions call `revalidatePath('/')`             | Multiple server actions         |
| 9.2  | Add client-side role guards on `/clients` pages (redirect non-PT/ORG)   | Client pages                    |
| 9.3  | Deduplicate PENDING invites for same email in `inviteClient()`          | `src/server/actions/clients.ts` |
| 9.4  | Verify CLIENT cannot create workouts/plans/exercises (RBAC + hidden UI) | Multiple files                  |
| 9.5  | Update documentation                                                    | `docs/phase-breakdowns/`        |

---

## Chunk Dependencies

```
Chunk 1 (RBAC) ─────────────┐
Chunk 2 (Session History) ───┤  (parallel - no deps)
Chunk 3 (PR Enhancement) ────┘
         │
         v
Chunk 4 (ClientRelationship Schema + Actions) ← depends on Chunk 1
         │
         v
Chunk 5 (Assignment) ← depends on Chunk 4
         │
         v
Chunk 6 (Client UI) ← depends on Chunks 4, 5
         │
Chunk 7 (Role Upgrade) ← depends on Chunk 1 (can parallel with 5-6)
         │
         v
Chunk 8 (Client Experience) ← depends on Chunks 4, 7
         │
         v
Chunk 9 (Polish) ← depends on all
```

---

## Completion Checklist

### Session Features

- [x] Session completion flow working (Phase 2)
- [x] PR detection functional (Chunk 3)
- [x] Session history page complete (Chunk 2)

### PT-Client Relationships

- [x] ClientRelationship schema complete (Chunk 4)
- [x] Invite/accept/reject/end server actions (Chunk 4)
- [x] Workout assignment via copy-on-assign (Chunk 5)
- [x] Plan assignment via copy-on-assign (Chunk 5)
- [x] PT read access fallback for client data (Chunk 5)
- [x] RBAC utility enforced on create actions (Chunk 1)
- [ ] Client management UI pages (Chunk 6)
- [ ] Invite acceptance page (Chunk 6)

### Role Management

- [ ] Role upgrade flow (PERSONAL to PT) (Chunk 7)
- [ ] Settings page with role info (Chunk 7)
- [x] End relationship with role reversion (Chunk 4)
- [x] JWT update callback for role changes (Chunk 4)

### Client Experience

- [ ] Dashboard role-awareness (Chunk 8)
- [ ] "Assigned" badges on client workouts (Chunk 8)
- [ ] Hidden create buttons for CLIENT (Chunk 8)
- [ ] Role guards on protected routes (Chunk 9)

---

## Files Created (Chunks 1-5)

```
src/lib/auth/rbac.ts                                    - RBAC permissions map + helpers
src/app/(dashboard)/sessions/page.tsx                   - Session History page
src/components/features/sessions/SessionHistoryCard.tsx  - Session card component
src/types/client.ts                                     - Client relationship types
src/lib/validations/client.ts                           - Client Zod schemas
src/server/actions/clients.ts                           - All client server actions
prisma/migrations/20260209204756_add_client_relationship/ - DB migration
```

## Files Modified (Chunks 1-5)

```
prisma/schema.prisma                                    - ClientRelationship model + RelationshipStatus enum
src/lib/auth/auth.config.ts                            - JWT callback for trigger:'update' role changes
src/server/actions/exercises.ts                        - RBAC refactor (requirePermission)
src/server/actions/workouts.ts                         - RBAC + assignWorkoutToClient + PT read access
src/server/actions/plans.ts                            - RBAC + assignPlanToClient + PT read access
src/server/actions/sessions.ts                         - getSessionPRs + PT read access on getSessionById
src/lib/analytics/pr-detection.ts                      - detectSessionPRs function + SessionPR type
src/components/features/sessions/CompletedSessionDrawer.tsx - SessionPRDisplay type + PR trophy section
src/app/(dashboard)/session/page.tsx                   - fetchAndAttachPRs in both completion paths
```

---

## Risks & Mitigations

| Risk                                | Mitigation                                                                              |
| ----------------------------------- | --------------------------------------------------------------------------------------- |
| Schema migration                    | Only ADDS new table + optional User relations. Non-destructive.                         |
| Stale JWT after role change         | `trigger: 'update'` in JWT callback + `update({ role })` from client + `revalidatePath` |
| Race condition on invite acceptance | Prisma transaction + `@@unique([ptId, clientId])` constraint                            |
| One client, one PT                  | Check for existing ACTIVE relationship in `acceptInvitation()`                          |
| Data loss on relationship end       | Copy-on-assign means client owns their data. Only status + role change.                 |

---

**Next Phase**: Phase 4 - Payments & Subscriptions

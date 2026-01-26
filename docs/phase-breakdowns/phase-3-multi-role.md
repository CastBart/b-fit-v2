# Phase 3: Multi-Role Features - Detailed Task Breakdown

**Duration**: 3 weeks (Weeks 7-9)
**Goal**: Implement PT-Client relationships, workout assignment, and role-based features

---

## Week 7: Session Completion & History

### Task 7.1: Complete Session Flow

**Priority**: Critical
**Estimated Effort**: 5-6 hours

#### Sub-tasks:
1. **Implement Complete Session Logic**
   - [ ] Update `completeSession()` in `src/server/actions/sessions.ts`
   - [ ] Calculate `totalVolume` (sets × reps × weight)
   - [ ] Calculate `duration` (completedAt - startedAt)
   - [ ] Set status to COMPLETED
   - [ ] Generate session summary

2. **Create Session Summary Page**
   - [ ] Create `src/app/sessions/[id]/summary/page.tsx`
   - [ ] Display total volume, duration, exercises completed
   - [ ] Show new PRs achieved
   - [ ] "Finish" button to return to workouts

**Acceptance Criteria**:
- ✅ Session completes successfully
- ✅ Summary displays correct stats
- ✅ New PRs highlighted

---

### Task 7.2: ExerciseHistory Aggregation

**Priority**: Critical
**Estimated Effort**: 6-7 hours

#### Sub-tasks:
1. **Add ExerciseHistory Model**
   - [ ] Add to Prisma schema
   - [ ] Run migration
   - File: `prisma/schema.prisma`

2. **Implement PR Detection**
   - [ ] Create `src/lib/analytics/pr-detection.ts`
   - [ ] Check for new PRs on session completion:
     - Max weight × reps
     - Max volume (single set)
     - Max total volume (all sets)
   - [ ] Update ExerciseHistory personalRecords JSON

3. **Update Volume History**
   - [ ] Append session volume to volumeHistory array
   - [ ] Keep last 100 entries

**Acceptance Criteria**:
- ✅ PRs detected correctly
- ✅ ExerciseHistory updated on completion
- ✅ Volume history tracks over time

---

### Task 7.3: Personal Session History Page

**Priority**: High
**Estimated Effort**: 5-6 hours

#### Sub-tasks:
1. **Create History Page**
   - [ ] Create `src/app/sessions/history/page.tsx`
   - [ ] List all completed sessions
   - [ ] Sort by date (most recent first)
   - [ ] Filter by workout, date range

2. **Session History Card**
   - [ ] Create `src/components/features/sessions/SessionHistoryCard.tsx`
   - [ ] Display: workout name, date, duration, volume
   - [ ] Click to view detailed summary

**Acceptance Criteria**:
- ✅ History page shows all sessions
- ✅ Can filter by workout
- ✅ Can view session details

---

## Week 8: PT-Client Relationships

### Task 8.1: ClientRelationship Schema

**Priority**: Critical
**Estimated Effort**: 2-3 hours

#### Sub-tasks:
1. **Add ClientRelationship Model**
   - [ ] Add to Prisma schema
   - [ ] Fields: ptId, clientId, status, startedAt, endedAt
   - [ ] Run migration

**Acceptance Criteria**:
- ✅ ClientRelationship table created
- ✅ Relations to User configured

---

### Task 8.2: Invite Client Flow

**Priority**: Critical
**Estimated Effort**: 6-7 hours

#### Sub-tasks:
1. **Create Invite Server Action**
   - [ ] Create `src/server/actions/clients.ts`
   - [ ] `inviteClient(email)` - Create PENDING relationship
   - [ ] Send invitation email (future: use Resend)

2. **Create PT Clients Page**
   - [ ] Create `src/app/pt/clients/page.tsx`
   - [ ] List active clients
   - [ ] "Invite Client" button
   - File: `src/app/pt/clients/page.tsx`

3. **Invite Client Dialog**
   - [ ] Create `src/components/features/clients/InviteClientDialog.tsx`
   - [ ] Email input
   - [ ] Send invitation

**Acceptance Criteria**:
- ✅ PT can invite clients by email
- ✅ Relationship created as PENDING
- ✅ Invitation sent (or logged for now)

---

### Task 8.3: Client Acceptance Workflow

**Priority**: High
**Estimated Effort**: 5-6 hours

#### Sub-tasks:
1. **Create Accept Invitation Page**
   - [ ] Create `src/app/invitations/[id]/page.tsx`
   - [ ] Show PT details
   - [ ] Accept/Reject buttons

2. **Implement Accept/Reject Actions**
   - [ ] `acceptInvitation()` - Set status to ACTIVE, update client role
   - [ ] `rejectInvitation()` - Delete relationship
   - File: `src/server/actions/clients.ts`

**Acceptance Criteria**:
- ✅ Client can accept invitation
- ✅ Client role updated to CLIENT
- ✅ Relationship active

---

### Task 8.4: Workout Assignment (Copy-on-Assign)

**Priority**: Critical
**Estimated Effort**: 7-8 hours

#### Sub-tasks:
1. **Create Assign Workout Action**
   - [ ] `assignWorkoutToClient(workoutId, clientId)` in `src/server/actions/workouts.ts`
   - [ ] Create deep copy of workout
   - [ ] Set copiedFromId, createdById = clientId

2. **Create Assignment UI**
   - [ ] Create `src/app/pt/clients/[id]/page.tsx`
   - [ ] Client profile with assigned workouts
   - [ ] "Assign Workout" button
   - [ ] Select from PT's workouts

3. **Client Workout View**
   - [ ] Create `src/app/workouts/assigned/page.tsx`
   - [ ] Show assigned workouts (createdById = clientId, copiedFromId !== null)

**Acceptance Criteria**:
- ✅ PT can assign workouts to clients
- ✅ Workout copied correctly
- ✅ Client can view assigned workouts
- ✅ Client cannot edit workout structure

---

### Task 8.5: RBAC Middleware

**Priority**: Critical
**Estimated Effort**: 5-6 hours

#### Sub-tasks:
1. **Create RBAC Utility**
   - [ ] Create `src/lib/auth/rbac.ts`
   - [ ] Check user role
   - [ ] Check resource ownership
   - [ ] Check PT-client relationship

2. **Apply to Server Actions**
   - [ ] Add RBAC checks to all workout/session actions
   - [ ] PT can read client data
   - [ ] PT can edit assigned workouts
   - [ ] Client can only view assigned workouts

**Acceptance Criteria**:
- ✅ RBAC enforced on all operations
- ✅ PT has correct access to client data
- ✅ Client cannot access unauthorized data

---

## Week 9: Role Management & Branding

### Task 9.1: BrandingSettings Schema

**Priority**: High
**Estimated Effort**: 2-3 hours

#### Sub-tasks:
1. **Add BrandingSettings Model**
   - [ ] Add to Prisma schema
   - [ ] Fields: ptId, logoUrl, primaryColor, accentColor
   - [ ] Run migration

**Acceptance Criteria**:
- ✅ BrandingSettings table created
- ✅ One-to-one relation with User (PT)

---

### Task 9.2: Role Upgrade Flow

**Priority**: Critical
**Estimated Effort**: 6-7 hours

#### Sub-tasks:
1. **Create Upgrade Page**
   - [ ] Create `src/app/upgrade/page.tsx`
   - [ ] Show PT features and pricing
   - [ ] "Upgrade to PT" button

2. **Implement Upgrade Action**
   - [ ] `upgradeToPT()` in `src/server/actions/users.ts`
   - [ ] Create Stripe checkout session (placeholder for Phase 4)
   - [ ] Update user role to PT
   - [ ] Set clientCapacity

**Acceptance Criteria**:
- ✅ User can upgrade to PT
- ✅ Role updated correctly
- ✅ PT capabilities unlocked

---

### Task 9.3: PT Branding Editor

**Priority**: Medium
**Estimated Effort**: 5-6 hours

#### Sub-tasks:
1. **Create Branding Settings Page**
   - [ ] Create `src/app/pt/branding/page.tsx`
   - [ ] Logo upload (future: use Vercel Blob)
   - [ ] Color pickers for primary/accent

2. **Apply Branding to Client View**
   - [ ] Read PT's branding settings
   - [ ] Apply colors to client UI
   - [ ] Show PT logo in client dashboard

**Acceptance Criteria**:
- ✅ PT can customize branding
- ✅ Branding applies to client view
- ✅ Colors update in real-time

---

### Task 9.4: End Relationship Flow

**Priority**: High
**Estimated Effort**: 4-5 hours

#### Sub-tasks:
1. **Create End Relationship Action**
   - [ ] `endClientRelationship()` in `src/server/actions/clients.ts`
   - [ ] Set status to ENDED
   - [ ] Update client role to PERSONAL
   - [ ] Retain client's workout copies and data

2. **Add End Relationship UI**
   - [ ] Add "End Relationship" button in PT client view
   - [ ] Confirmation dialog
   - [ ] Notify client

**Acceptance Criteria**:
- ✅ PT can end relationship
- ✅ Client role reverts to PERSONAL
- ✅ Client retains all data
- ✅ Client can now create own workouts

---

## Phase 3 Completion Checklist

### Session Features
- [ ] Session completion flow working
- [ ] PR detection functional
- [ ] ExerciseHistory updated correctly
- [ ] Session history page complete

### PT-Client Relationships
- [ ] ClientRelationship schema complete
- [ ] Invite/accept flow working
- [ ] Workout assignment (copy-on-assign) functional
- [ ] RBAC middleware enforced

### Role Management
- [ ] Role upgrade flow working
- [ ] PT branding customization
- [ ] End relationship flow complete
- [ ] Client-to-Personal conversion working

---

**Last Updated**: 2026-01-26
**Next Phase**: Phase 4 - Payments & Subscriptions

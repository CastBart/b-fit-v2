# Phase 5: Advanced Features - Detailed Task Breakdown

**Duration**: 3 weeks (Weeks 12-14)
**Goal**: Add messaging, media uploads, analytics, and plans

---

## Week 12: Messaging & Media

### Task 12.1: Message Schema

**Priority**: Critical
**Estimated Effort**: 2-3 hours

#### Sub-tasks:

1. **Add Message Model**
   - [ ] Add Message model to Prisma schema
   - [ ] Fields: senderId, recipientId, content, mediaUrl, readAt, workoutId, sessionId, planId
   - [ ] Run migration

**Acceptance Criteria**:

- ✅ Message table created
- ✅ Relations configured

---

### Task 12.2: Send Message Server Action

**Priority**: Critical
**Estimated Effort**: 4-5 hours

#### Sub-tasks:

1. **Create Messaging Actions**
   - [ ] Create `src/server/actions/messages.ts`
   - [ ] `sendMessage(recipientId, content, contextId)` - Create message
   - [ ] `getConversation(userId)` - Get messages between users
   - [ ] `markAsRead(messageId)` - Mark message read

**Acceptance Criteria**:

- ✅ Can send messages
- ✅ Can retrieve conversation
- ✅ Can mark as read

---

### Task 12.3: Conversation Thread UI

**Priority**: High
**Estimated Effort**: 6-7 hours

#### Sub-tasks:

1. **Create Messages Page**
   - [ ] Create `src/app/messages/page.tsx`
   - [ ] List conversations (group by recipient/sender)
   - [ ] Unread count badge

2. **Create Conversation View**
   - [ ] Create `src/app/messages/[userId]/page.tsx`
   - [ ] Display message thread
   - [ ] Input to send new message
   - [ ] Auto-scroll to latest

3. **Message Component**
   - [ ] Create `src/components/features/messages/Message.tsx`
   - [ ] Bubble design (sent vs received)
   - [ ] Timestamp
   - [ ] Read status

**Acceptance Criteria**:

- ✅ Can view all conversations
- ✅ Can view individual thread
- ✅ Can send messages in real-time

---

### Task 12.4: Vercel Blob Media Upload

**Priority**: High
**Estimated Effort**: 6-7 hours

#### Sub-tasks:

1. **Set Up Vercel Blob**
   - [ ] Enable Vercel Blob in dashboard
   - [ ] Install: `npm install @vercel/blob`
   - [ ] Add BLOB_READ_WRITE_TOKEN to environment

2. **Create Upload Server Action**
   - [ ] Create `src/server/actions/upload.ts`
   - [ ] `uploadImage(file)`:
     - Upload to Vercel Blob
     - Return public URL

3. **Create Upload Component**
   - [ ] Create `src/components/features/messages/MediaUpload.tsx`
   - [ ] Image picker
   - [ ] Upload progress
   - [ ] Preview uploaded image

**Acceptance Criteria**:

- ✅ Can upload images to Vercel Blob
- ✅ URL returned and stored
- ✅ Images display in messages

---

### Task 12.5: Media Viewer

**Priority**: Medium
**Estimated Effort**: 3-4 hours

#### Sub-tasks:

1. **Create Media Viewer Component**
   - [ ] Create `src/components/features/messages/MediaViewer.tsx`
   - [ ] Click to open full-size image
   - [ ] Dialog/modal with zoom

**Acceptance Criteria**:

- ✅ Images clickable to enlarge
- ✅ Full-size view in modal

---

### Task 12.6: Contextual Comments

**Priority**: Medium
**Estimated Effort**: 5-6 hours

#### Sub-tasks:

1. **Add Comments to Workout/Session/Plan**
   - [ ] Add "Comment" button in workout detail view
   - [ ] Link message to context (workoutId, sessionId, planId)
   - [ ] Display comments inline

**Acceptance Criteria**:

- ✅ Can comment on workouts
- ✅ Can comment on sessions
- ✅ Comments linked to context

---

## Week 13: Advanced Analytics

### Task 13.1: Volume Calculation Logic

**Priority**: Critical
**Estimated Effort**: 5-6 hours

#### Sub-tasks:

1. **Create Analytics Utilities**
   - [ ] Create `src/lib/analytics/volume.ts`
   - [ ] `calculateSessionVolume(sessionSets)` - Total volume
   - [ ] `calculateExerciseVolume(exerciseId, dateRange)` - Volume over time

2. **Aggregate on Session Completion**
   - [ ] Update ExerciseHistory volumeHistory on session complete

**Acceptance Criteria**:

- ✅ Volume calculated correctly
- ✅ Volume history updated

---

### Task 13.2: Volume Progression Charts

**Priority**: High
**Estimated Effort**: 6-7 hours

#### Sub-tasks:

1. **Install Recharts**
   - [ ] Install: `npm install recharts`

2. **Create Volume Chart Component**
   - [ ] Create `src/components/features/analytics/VolumeChart.tsx`
   - [ ] Line chart showing volume over time
   - [ ] Filter by exercise

**Acceptance Criteria**:

- ✅ Chart displays volume progression
- ✅ Can filter by exercise
- ✅ Responsive chart

---

### Task 13.3: PR Detection Algorithm

**Priority**: High
**Estimated Effort**: 5-6 hours

#### Sub-tasks:

1. **Enhance PR Detection**
   - [ ] Update `src/lib/analytics/pr-detection.ts`
   - [ ] Detect PRs for all metric types:
     - Weight × Reps
     - Duration
     - Distance
     - Total volume
   - [ ] Store in ExerciseHistory.personalRecords JSON

**Acceptance Criteria**:

- ✅ PRs detected for all metric types
- ✅ PRs stored correctly
- ✅ PRs displayed in session summary

---

### Task 13.4: Adherence Calculation

**Priority**: Medium
**Estimated Effort**: 4-5 hours

#### Sub-tasks:

1. **Calculate Adherence**
   - [ ] Create `src/lib/analytics/adherence.ts`
   - [ ] Calculate % of scheduled workouts completed
   - [ ] Calculate workout frequency (sessions/week)

2. **Display Adherence**
   - [ ] Add adherence widget to dashboard
   - [ ] Show weekly/monthly adherence %

**Acceptance Criteria**:

- ✅ Adherence calculated correctly
- ✅ Displayed in dashboard

---

### Task 13.5: Analytics Dashboard

**Priority**: High
**Estimated Effort**: 7-8 hours

#### Sub-tasks:

1. **Create Personal Analytics Page**
   - [ ] Create `src/app/analytics/page.tsx`
   - [ ] Widgets:
     - Total volume (last 30 days)
     - Recent PRs
     - Workout frequency
     - Volume progression chart

2. **PT Client Analytics View**
   - [ ] Create `src/app/pt/clients/[id]/analytics/page.tsx`
   - [ ] Show client's analytics
   - [ ] Compare client performance over time

**Acceptance Criteria**:

- ✅ Personal analytics page complete
- ✅ PT can view client analytics
- ✅ Charts and widgets functional

---

### Task 13.6: Exercise Comparison View

**Priority**: Medium
**Estimated Effort**: 5-6 hours

#### Sub-tasks:

1. **Create Comparison Page**
   - [ ] Create `src/app/analytics/compare/page.tsx`
   - [ ] Select multiple exercises
   - [ ] Display volume charts side-by-side

**Acceptance Criteria**:

- ✅ Can compare exercises
- ✅ Charts display correctly

---

## Week 14: Plans & Organisation Features

### Task 14.1: Plan Schema

**Priority**: Critical
**Estimated Effort**: 2-3 hours

#### Sub-tasks:

1. **Add Plan and PlanWorkout Models**
   - [ ] Add to Prisma schema
   - [ ] Fields: name, description, durationWeeks, daysPerWeek, isActive
   - [ ] Run migration

**Acceptance Criteria**:

- ✅ Plan tables created
- ✅ Relations configured

---

### Task 14.2: Plan CRUD Server Actions

**Priority**: Critical
**Estimated Effort**: 5-6 hours

#### Sub-tasks:

1. **Create Plan Actions**
   - [ ] Create `src/server/actions/plans.ts`
   - [ ] `createPlan()`, `getPlan()`, `updatePlan()`, `deletePlan()`
   - [ ] `addWorkoutToPlan(planId, workoutId, dayNumber)`
   - [ ] `activatePlan(planId)` - Set as active plan

**Acceptance Criteria**:

- ✅ Can create and manage plans
- ✅ Can add workouts to plans
- ✅ Can activate plan

---

### Task 14.3: Plan Builder UI

**Priority**: High
**Estimated Effort**: 7-8 hours

#### Sub-tasks:

1. **Create Plan Builder Page**
   - [ ] Create `src/app/plans/builder/page.tsx`
   - [ ] Calendar view (days × weeks)
   - [ ] Drag workouts onto days
   - [ ] Save plan

**Acceptance Criteria**:

- ✅ Plan builder functional
- ✅ Can assign workouts to days
- ✅ Plan saves correctly

---

### Task 14.4: Plan Assignment Flow

**Priority**: High
**Estimated Effort**: 5-6 hours

#### Sub-tasks:

1. **Assign Plan to Client**
   - [ ] `assignPlanToClient(planId, clientId)` in `src/server/actions/plans.ts`
   - [ ] Copy plan and associated workouts
   - [ ] Set as client's active plan

2. **Client Plan View**
   - [ ] Create `src/app/plans/active/page.tsx`
   - [ ] Display current week's workouts
   - [ ] Mark completed workouts

**Acceptance Criteria**:

- ✅ PT can assign plans to clients
- ✅ Client can view active plan
- ✅ Workouts marked as completed

---

### Task 14.5: Organisation User Role

**Priority**: Medium
**Estimated Effort**: 6-7 hours

#### Sub-tasks:

1. **Add Organisation Model**
   - [ ] Add Organisation and OrganisationBranding models
   - [ ] Run migration

2. **Organisation Dashboard**
   - [ ] Create `src/app/org/dashboard/page.tsx`
   - [ ] Show all PTs in organisation
   - [ ] Aggregate client count

**Acceptance Criteria**:

- ✅ Organisation model created
- ✅ Dashboard shows PTs
- ✅ Can view aggregate stats

---

### Task 14.6: PT Seat Management

**Priority**: Medium
**Estimated Effort**: 4-5 hours

#### Sub-tasks:

1. **Add/Remove PTs**
   - [ ] `invitePT(email)` in `src/server/actions/organisation.ts`
   - [ ] `removePT(ptId)` - Remove PT from organisation
   - [ ] Update organisation subscription

**Acceptance Criteria**:

- ✅ Can invite PTs to organisation
- ✅ Can remove PTs
- ✅ Subscription updated

---

### Task 14.7: Organisation Admin Panel

**Priority**: Medium
**Estimated Effort**: 5-6 hours

#### Sub-tasks:

1. **Create Admin Panel**
   - [ ] Create `src/app/org/admin/page.tsx`
   - [ ] Manage PT seats
   - [ ] Manage organisation branding
   - [ ] View billing

**Acceptance Criteria**:

- ✅ Admin panel functional
- ✅ Can manage PTs
- ✅ Can manage branding

---

## Phase 5 Completion Checklist

### Messaging & Media

- [ ] Message schema complete
- [ ] Conversation UI functional
- [ ] Vercel Blob media upload working
- [ ] Contextual comments implemented

### Analytics

- [ ] Volume calculations correct
- [ ] Progression charts working
- [ ] PR detection functional
- [ ] Adherence metrics displayed
- [ ] Analytics dashboards complete

### Plans

- [ ] Plan schema complete
- [ ] Plan builder functional
- [ ] Plan assignment working
- [ ] Client plan view complete

### Organisation

- [ ] Organisation features implemented
- [ ] PT seat management working
- [ ] Aggregate analytics displayed

---

**Last Updated**: 2026-01-26
**Next Phase**: Phase 6 - Polish & Launch

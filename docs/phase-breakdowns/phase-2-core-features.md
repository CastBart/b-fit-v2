# Phase 2: Core Features - Detailed Task Breakdown

**Duration**: 4 weeks (Weeks 3-6)
**Goal**: Build exercise library, workout builder, and live session functionality

---

## Week 3: Exercise Library

### Task 3.1: Complete Exercise Schema ✅ COMPLETED

**Priority**: Critical
**Estimated Effort**: 2-3 hours
**Dependencies**: Phase 1 complete
**Completion Date**: 2026-01-28

#### Sub-tasks:

1. **Add Exercise Model to Prisma Schema**
   - [x] Add complete Exercise model with all enums
   - [x] Run migration: `npx prisma migrate dev --name add_exercise_model`
   - File: `prisma/schema.prisma`

2. **Create Exercise Types**
   - [x] Create `src/types/exercise.ts` with TypeScript types from Prisma
   - File: `src/types/exercise.ts`

**Acceptance Criteria**:

- ✅ Exercise table created in database
- ✅ All enums defined (MuscleGroup, EquipmentType, etc.)
- ✅ Types exported for use in app

**Implementation Notes**:

- Migration: `20260128190145_add_exercise_model`
- Created 6 enums: ExerciseType, MetricType, MuscleGroup, EquipmentType, MovementPattern, DifficultyLevel
- Exercise model includes: categorization, ownership tracking, JSON instructions, secondary muscle groups array
- Added performance indexes on: createdById, isDefault, equipmentType, exerciseType, primaryMuscleGroup
- TypeScript types include display labels for all enums

---

### Task 3.2: Create Exercise Seed Data

**Priority**: High
**Estimated Effort**: 3-4 hours
**Dependencies**: Task 3.1

#### Sub-tasks:

1. **Create Seed File**
   - [ ] Create `prisma/seed.ts` with 50 default exercises
   - [ ] Include variety: compound lifts, isolation, cardio
   - File: `prisma/seed.ts`

2. **Run Seed**
   - [ ] Add seed script to `package.json`
   - [ ] Run: `npx prisma db seed`
   - [ ] Verify exercises in database

**Acceptance Criteria**:

- ✅ 50+ default exercises seeded
- ✅ Covers all major muscle groups
- ✅ All marked as `isDefault: true`

---

### Task 3.3: Exercise CRUD Server Actions

**Priority**: Critical
**Estimated Effort**: 4-5 hours
**Dependencies**: Task 3.1

#### Sub-tasks:

1. **Create Server Actions**
   - [ ] Create `src/server/actions/exercises.ts`:
     - `getExercises()` - List with filters
     - `getExerciseById()` - Single exercise
     - `createExercise()` - Create new (Personal/PT only)
     - `updateExercise()` - Update owned exercise
     - `deleteExercise()` - Delete owned exercise
   - File: `src/server/actions/exercises.ts`

2. **Add Validation Schemas**
   - [ ] Create `src/lib/validations/exercise.ts` with Zod schemas
   - File: `src/lib/validations/exercise.ts`

3. **Implement RBAC Checks**
   - [ ] Only Personal/PT can create
   - [ ] Only owner can edit/delete
   - [ ] All can view default exercises

**Acceptance Criteria**:

- ✅ All CRUD operations work
- ✅ Validation prevents invalid data
- ✅ RBAC enforced correctly

---

### Task 3.4: Exercise Search/Filter UI

**Priority**: High
**Estimated Effort**: 5-6 hours
**Dependencies**: Task 3.3

#### Sub-tasks:

1. **Create Exercise List Page**
   - [ ] Create `src/app/exercises/page.tsx`
   - [ ] Display grid of exercise cards
   - [ ] Pagination (20 per page)
   - File: `src/app/exercises/page.tsx`

2. **Create Filter Components**
   - [ ] Search by name
   - [ ] Filter by muscle group
   - [ ] Filter by equipment type
   - [ ] Filter by difficulty level
   - File: `src/components/features/exercises/ExerciseFilters.tsx`

3. **Create Exercise Card**
   - [ ] Display exercise name, image placeholder, muscle group
   - [ ] Click to view details
   - File: `src/components/features/exercises/ExerciseCard.tsx`

**Acceptance Criteria**:

- ✅ Exercise list displays all exercises
- ✅ Filters work correctly
- ✅ Search finds exercises by name
- ✅ Responsive grid layout

---

### Task 3.5: Exercise Detail View

**Priority**: Medium
**Estimated Effort**: 3-4 hours
**Dependencies**: Task 3.4

#### Sub-tasks:

1. **Create Detail Page**
   - [ ] Create `src/app/exercises/[id]/page.tsx`
   - [ ] Display all exercise details
   - [ ] Show instructions
   - File: `src/app/exercises/[id]/page.tsx`

2. **Add Edit/Delete Actions**
   - [ ] Edit button (owner only)
   - [ ] Delete button (owner only)
   - [ ] Confirm delete dialog

**Acceptance Criteria**:

- ✅ Detail page shows all exercise info
- ✅ Owner can edit/delete
- ✅ Non-owners cannot modify

---

## Week 4: Workout Builder (Part 1)

### Task 4.1: Workout & WorkoutExercise Schema

**Priority**: Critical
**Estimated Effort**: 2-3 hours
**Dependencies**: Task 3.1

#### Sub-tasks:

1. **Add Workout Models**
   - [ ] Add Workout and WorkoutExercise models to Prisma
   - [ ] Run migration
   - Files: `prisma/schema.prisma`

**Acceptance Criteria**:

- ✅ Workout and WorkoutExercise tables created
- ✅ Relations configured correctly

---

### Task 4.2: Workout CRUD Server Actions

**Priority**: Critical
**Estimated Effort**: 4-5 hours
**Dependencies**: Task 4.1

#### Sub-tasks:

1. **Create Server Actions**
   - [ ] Create `src/server/actions/workouts.ts`:
     - `getWorkouts()` - List user's workouts
     - `getWorkoutById()` - Single workout with exercises
     - `createWorkout()` - Create workout
     - `updateWorkout()` - Update workout
     - `deleteWorkout()` - Delete workout
     - `addExerciseToWorkout()` - Add exercise
     - `updateWorkoutExercise()` - Update sets/reps
     - `removeExerciseFromWorkout()` - Remove exercise
     - `reorderExercises()` - Update order
   - File: `src/server/actions/workouts.ts`

2. **Add Validation**
   - [ ] Create `src/lib/validations/workout.ts`
   - File: `src/lib/validations/workout.ts`

**Acceptance Criteria**:

- ✅ All workout CRUD operations work
- ✅ Exercises can be added/removed/reordered

---

### Task 4.3: Workout Builder Page Skeleton

**Priority**: High
**Estimated Effort**: 4-5 hours
**Dependencies**: Task 4.2

#### Sub-tasks:

1. **Create Workout Builder Page**
   - [ ] Create `src/app/workouts/builder/page.tsx`
   - [ ] Three-column layout:
     - Left: Exercise library
     - Center: Workout exercises
     - Right: Exercise configuration
   - File: `src/app/workouts/builder/page.tsx`

2. **Create Layout Components**
   - [ ] Exercise selector panel
   - [ ] Workout exercises list
   - [ ] Configuration panel
   - Files: `src/components/features/workouts/`

**Acceptance Criteria**:

- ✅ Layout renders correctly
- ✅ Responsive on mobile/desktop
- ✅ Panels can be toggled

---

### Task 4.4: Drag-and-Drop Exercise Selector

**Priority**: High
**Estimated Effort**: 6-7 hours
**Dependencies**: Task 4.3

#### Sub-tasks:

1. **Install DnD Kit**
   - [ ] Install: `npm install @dnd-kit/core @dnd-kit/sortable`

2. **Implement Draggable Exercises**
   - [ ] Create draggable exercise items
   - [ ] Create drop zone for workout
   - [ ] Handle drag events
   - File: `src/components/features/workouts/WorkoutBuilder.tsx`

3. **Update State on Drop**
   - [ ] Call `addExerciseToWorkout()` server action
   - [ ] Optimistic update

**Acceptance Criteria**:

- ✅ Can drag exercises from library to workout
- ✅ Visual feedback during drag
- ✅ Exercises added to workout

---

### Task 4.5: Exercise Ordering & Supersets

**Priority**: High
**Estimated Effort**: 5-6 hours
**Dependencies**: Task 4.4

#### Sub-tasks:

1. **Implement Sortable List**
   - [ ] Make workout exercises sortable
   - [ ] Update order on drag end
   - [ ] Call `reorderExercises()` server action

2. **Add Superset Grouping**
   - [ ] Group button to create superset
   - [ ] Visual indication of grouped exercises
   - [ ] Assign same `groupId` to grouped exercises
   - File: `src/components/features/workouts/SupersetGroup.tsx`

**Acceptance Criteria**:

- ✅ Exercises can be reordered
- ✅ Supersets can be created
- ✅ Supersets visually distinct

---

## Week 5: Workout Builder (Part 2)

### Task 5.1: Set/Rep/Weight Configuration

**Priority**: Critical
**Estimated Effort**: 4-5 hours
**Dependencies**: Task 4.5

#### Sub-tasks:

1. **Create Configuration Panel**
   - [ ] Sets input
   - [ ] Reps input
   - [ ] Weight input
   - [ ] Rest timer input
   - File: `src/components/features/workouts/ExerciseConfig.tsx`

2. **Update WorkoutExercise**
   - [ ] Call `updateWorkoutExercise()` on change
   - [ ] Debounce updates

**Acceptance Criteria**:

- ✅ Can configure sets/reps/weight per exercise
- ✅ Changes saved to database
- ✅ Default values pre-filled

---

### Task 5.2: Exercise Notes

**Priority**: Medium
**Estimated Effort**: 2-3 hours
**Dependencies**: Task 5.1

#### Sub-tasks:

1. **Add Notes Field**
   - [ ] Textarea for notes per exercise
   - [ ] Save to `WorkoutExercise.notes`
   - File: `src/components/features/workouts/ExerciseNotes.tsx`

**Acceptance Criteria**:

- ✅ Notes can be added per exercise
- ✅ Notes persist

---

### Task 5.3: Workout List View

**Priority**: High
**Estimated Effort**: 4-5 hours
**Dependencies**: Task 4.2

#### Sub-tasks:

1. **Create Workout List Page**
   - [ ] Create `src/app/workouts/page.tsx`
   - [ ] Display user's workouts as cards
   - [ ] "Create New" button
   - File: `src/app/workouts/page.tsx`

2. **Workout Card Component**
   - [ ] Workout name
   - [ ] Exercise count
   - [ ] Last used date
   - [ ] Actions: Edit, Duplicate, Delete, Start
   - File: `src/components/features/workouts/WorkoutCard.tsx`

**Acceptance Criteria**:

- ✅ List shows all user workouts
- ✅ Can start workout from card
- ✅ Actions work correctly

---

### Task 5.4: Workout Detail View

**Priority**: Medium
**Estimated Effort**: 3-4 hours
**Dependencies**: Task 5.3

#### Sub-tasks:

1. **Create Detail Page**
   - [ ] Create `src/app/workouts/[id]/page.tsx`
   - [ ] Show workout details
   - [ ] List all exercises with config
   - [ ] "Start Workout" button
   - File: `src/app/workouts/[id]/page.tsx`

**Acceptance Criteria**:

- ✅ Detail page shows workout
- ✅ Can start workout
- ✅ Can navigate to edit

---

## Week 6: Live Session Mode (Part 1)

### Task 6.1: Session & SessionSet Schema

**Priority**: Critical
**Estimated Effort**: 2-3 hours
**Dependencies**: Task 4.1

#### Sub-tasks:

1. **Add Session Models**
   - [ ] Add TrainingSession and SessionSet models
   - [ ] Run migration
   - File: `prisma/schema.prisma`

**Acceptance Criteria**:

- ✅ Session tables created
- ✅ Relations to Workout configured

---

### Task 6.2: Start Session Server Action

**Priority**: Critical
**Estimated Effort**: 3-4 hours
**Dependencies**: Task 6.1

#### Sub-tasks:

1. **Create Session Actions**
   - [ ] Create `src/server/actions/sessions.ts`:
     - `startSession()` - Create session from workout
     - `getSession()` - Fetch session with sets
     - `completeSet()` - Log set completion
     - `completeSession()` - Finish session
   - File: `src/server/actions/sessions.ts`

**Acceptance Criteria**:

- ✅ Can start session from workout
- ✅ Session created with IN_PROGRESS status

---

### Task 6.3: Session Carousel UI

**Priority**: Critical
**Estimated Effort**: 6-7 hours
**Dependencies**: Task 6.2

#### Sub-tasks:

1. **Install Embla Carousel**
   - [ ] Install: `npm install embla-carousel-react`

2. **Create Session Page**
   - [ ] Create `src/app/sessions/[id]/page.tsx`
   - [ ] Implement carousel for exercises
   - [ ] One exercise visible at a time
   - [ ] Swipe to navigate
   - File: `src/app/sessions/[id]/page.tsx`

3. **Create Exercise Slide**
   - [ ] Exercise name and details
   - [ ] Set logger component
   - [ ] Progress indicator
   - File: `src/components/features/sessions/ExerciseSlide.tsx`

**Acceptance Criteria**:

- ✅ Carousel navigates between exercises
- ✅ Smooth transitions
- ✅ Progress indicator shows position

---

### Task 6.4: Set Logger Component

**Priority**: Critical
**Estimated Effort**: 5-6 hours
**Dependencies**: Task 6.3

#### Sub-tasks:

1. **Create Set Logger**
   - [ ] Create `src/components/features/sessions/SetLogger.tsx`
   - [ ] List of sets for current exercise
   - [ ] Inputs for reps/weight/duration (based on metric type)
   - [ ] Complete button per set
   - File: `src/components/features/sessions/SetLogger.tsx`

2. **Implement Set Completion**
   - [ ] Call `completeSet()` server action
   - [ ] Optimistic update
   - [ ] Visual feedback (checkmark)

**Acceptance Criteria**:

- ✅ Can log reps/weight per set
- ✅ Set marked complete on submission
- ✅ UI updates immediately

---

### Task 6.5: Redux Session State

**Priority**: Critical
**Estimated Effort**: 6-7 hours
**Dependencies**: Task 6.4

#### Sub-tasks:

1. **Install Redux Toolkit**
   - [ ] Install: `npm install @reduxjs/toolkit react-redux`

2. **Create Redux Store**
   - [ ] Create `src/store/store.ts`
   - [ ] Configure store
   - File: `src/store/store.ts`

3. **Create Session Slice**
   - [ ] Create `src/store/slices/sessionSlice.ts`
   - [ ] State: current session, sets, exercise index
   - [ ] Actions: complete set, navigate exercise
   - File: `src/store/slices/sessionSlice.ts`

4. **Integrate with Session Page**
   - [ ] Wrap app with Redux Provider
   - [ ] Load session into Redux on page load
   - [ ] Use Redux state in components

**Acceptance Criteria**:

- ✅ Redux store configured
- ✅ Session state managed in Redux
- ✅ Components read from Redux

---

### Task 6.6: LocalStorage Persistence

**Priority**: High
**Estimated Effort**: 4-5 hours
**Dependencies**: Task 6.5

#### Sub-tasks:

1. **Create Persistence Middleware**
   - [ ] Redux middleware to save state to LocalStorage
   - [ ] Save on every state change
   - File: `src/store/middleware/persistence.ts`

2. **Implement Recovery on Load**
   - [ ] Check LocalStorage on page load
   - [ ] Compare timestamp with DB
   - [ ] Use newer state
   - File: `src/hooks/useSessionRecovery.ts`

**Acceptance Criteria**:

- ✅ Session state saves to LocalStorage
- ✅ State recovers on page refresh
- ✅ No data loss on refresh

---

## Phase 2 Completion Checklist

### Exercise Library

- [x] Exercise schema complete
- [ ] 50+ exercises seeded
- [ ] CRUD operations working
- [ ] Search/filter UI functional

### Workout Builder

- [ ] Workout schema complete
- [ ] Drag-and-drop working
- [ ] Exercise ordering functional
- [ ] Superset grouping working
- [ ] Configuration panel complete

### Live Session

- [ ] Session schema complete
- [ ] Session can be started
- [ ] Carousel UI working
- [ ] Set logging functional
- [ ] Redux state management
- [ ] LocalStorage persistence

---

**Last Updated**: 2026-01-28
**Next Phase**: Phase 3 - Multi-Role Features

# B-Fit Feature Flow Specifications

## Overview

This document details the user flows for all major features in B-Fit, including UI interactions, state changes, and system behaviors.

---

## 1. Workout Builder Flow

### User Story
As a Personal User or PT, I want to create structured workouts with exercises, sets, reps, and supersets so that I can follow them during training sessions.

### Flow Steps

#### 1.1 Navigate to Create Workout

**Entry Points**:
- **Workouts Dashboard**: Primary entry point displaying all existing workouts in a list/grid view
  - "Create Workout" button prominently displayed on dashboard
  - Each workout card shows: name, description preview, exercise count, last used date
- "+" FAB button (mobile/tablet)
- Quick action menu

**Workouts Dashboard Layout**:
```tsx
<WorkoutsPage>
  <PageHeader>
    <Title>My Workouts</Title>
    <CreateWorkoutButton>Create Workout</CreateWorkoutButton>
  </PageHeader>

  <WorkoutsList>
    {workouts.map(workout => (
      <WorkoutCard key={workout.id}>
        <WorkoutName>{workout.name}</WorkoutName>
        <WorkoutMetadata>
          <ExerciseCount>{workout.exercises.length} exercises</ExerciseCount>
          <LastUsed>Last used: {formatDate(workout.lastUsed)}</LastUsed>
        </WorkoutMetadata>
        <QuickStartButton>Quick Start</QuickStartButton>
      </WorkoutCard>
    ))}
  </WorkoutsList>
</WorkoutsPage>
```

**UI State After Click**: Empty workout builder canvas

---

#### 1.2 Enter Workout Metadata
```tsx
<WorkoutMetadataForm>
  <Input name="workoutName" placeholder="e.g., Push Day A" required />
  <Textarea name="description" placeholder="Optional notes about this workout" />
</WorkoutMetadataForm>
```

**Validation**:
- Name: 1-100 characters
- Description: max 500 characters

---

#### 1.3 Add Exercises

**Desktop Devices (>1024px width)**:

Layout: Split-screen design with persistent exercise list

```tsx
<WorkoutBuilder className="grid grid-cols-[400px_1fr]">
  {/* Left Panel - Always Visible */}
  <ExerciseListPanel className="border-r">
    <SearchBar placeholder="Search exercises..." fixed />
    <FilterSection fixed>
      <MuscleGroupFilter />
      <MovementPatternFilter />
      <EquipmentFilter />
      <ExerciseTypeFilter />
      <DifficultyLevelFilter />
    </FilterSection>

    <ScrollableExerciseList>
      {exercises.map(exercise => (
        <ExerciseCard
          key={exercise.id}
          exercise={exercise}
          draggable
          onDragStart={handleDragStart}
          onClick={handleExerciseClick}
          isSelected={selectedExercises.includes(exercise.id)}
        />
      ))}
    </ScrollableExerciseList>

    {/* Add Button - Appears when exercises selected */}
    {selectedExercises.length > 0 && (
      <FixedBottomButton>
        Add ({selectedExercises.length})
      </FixedBottomButton>
    )}
  </ExerciseListPanel>

  {/* Main Section - Workout Builder */}
  <WorkoutBuilderSection>
    <WorkoutMetadataForm>
      <Input name="workoutName" placeholder="e.g., Push Day A" />
      <Textarea name="description" placeholder="Optional notes" />
    </WorkoutMetadataForm>

    <WorkoutExercisesList>
      {workoutExercises.map(exercise => (
        <WorkoutExerciseCard
          key={exercise.id}
          exercise={exercise}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        />
      ))}

      {workoutExercises.length === 0 && (
        <EmptyState>
          <Text>Drag exercises here or select and click Add</Text>
          <Icon name="arrow-left" />
        </EmptyState>
      )}
    </WorkoutExercisesList>
  </WorkoutBuilderSection>
</WorkoutBuilder>
```

**Interaction Methods (Desktop)**:
1. **Drag & Drop**: Drag exercise from left panel directly into workout list
2. **Click Selection**:
   - Click exercise(s) in left panel to select (multi-select with checkboxes)
   - "Add (X)" button appears at bottom of left panel
   - Click to add all selected exercises to workout

---

**Mobile & Tablet Devices (<1024px width)**:

Layout: Drawer-based with "Add Exercise" button

```tsx
<WorkoutBuilder>
  <WorkoutMetadataForm>
    <Input name="workoutName" placeholder="e.g., Push Day A" />
    <Textarea name="description" placeholder="Optional notes" />
  </WorkoutMetadataForm>

  <AddExerciseButton onClick={openExerciseDrawer}>
    + Add Exercise
  </AddExerciseButton>

  <WorkoutExercisesList>
    {workoutExercises.map(exercise => (
      <WorkoutExerciseCard key={exercise.id} exercise={exercise} />
    ))}
  </WorkoutExercisesList>
</WorkoutBuilder>

{/* Exercise Drawer */}
<Drawer open={exerciseDrawerOpen} position="bottom" height="80%">
  <DrawerHeader>
    <SearchBar placeholder="Search exercises..." />
    <FilterButton onClick={openFilters} />
  </DrawerHeader>

  <ScrollableExerciseList>
    {exercises.map(exercise => (
      <ExerciseCard
        key={exercise.id}
        exercise={exercise}
        onClick={handleExerciseToggle}
        isSelected={selectedExercises.includes(exercise.id)}
      />
    ))}
  </ScrollableExerciseList>

  {/* Add Button - Appears when exercises selected */}
  {selectedExercises.length > 0 && (
    <FixedBottomButton>
      ({selectedExercises.length}) Add
    </FixedBottomButton>
  )}
</Drawer>

{/* Filter Drawer */}
<Drawer open={filterDrawerOpen} position="right">
  <MuscleGroupFilter />
  <MovementPatternFilter />
  <EquipmentFilter />
  <ExerciseTypeFilter />
  <DifficultyLevelFilter />
</Drawer>
```

**Filter Options** (Both Desktop & Mobile):
- Muscle Group (Primary + Secondary)
- Movement Pattern
- Equipment Type
- Exercise Type
- Difficulty Level

---

#### 1.4 Configure Exercise Parameters

**Default Configurations by Metric Type**:

When an exercise is added to a workout, it automatically gets 3 sets with the following defaults:

| Metric Type | Default Values |
|-------------|----------------|
| WEIGHT_REPS | weight: 0kg, reps: 10 |
| COUNTER_WEIGHT_REPS | weight: 0kg, reps: 10 |
| REPS | reps: 10 |
| REPS_DURATION | reps: 10, duration: 30 seconds |
| DURATION | duration: 30 seconds |
| DISTANCE_DURATION | distance: 0, duration: 30 seconds |
| WEIGHT_DISTANCE | weight: 0kg, distance: 0 |
| WEIGHT_DURATION | weight: 0kg, duration: 30 seconds |

**UI Layout**:

After adding exercises, display them in a table format:

```tsx
<WorkoutExerciseTable>
  <TableHeader>
    <Column>Exercise</Column>
    <Column>Sets</Column>
    <Column>Metrics</Column>
    <Column>Rest</Column>
    <Column>Actions</Column>
  </TableHeader>

  {workoutExercises.map(exercise => (
    <ExerciseRow key={exercise.id}>
      <ExerciseCell>
        <ExerciseThumbnail src={exercise.thumbnailUrl} />
        <ExerciseName>{exercise.name}</ExerciseName>
      </ExerciseCell>

      <SetsCell>
        <NumberInput
          value={exercise.sets}
          onChange={value => updateExercise(exercise.id, { sets: value })}
        />
      </SetsCell>

      <MetricsCell>
        {/* Clickable metric chips based on metricType */}
        {exercise.metricType === 'WEIGHT_REPS' && (
          <>
            <MetricChip
              label="Weight"
              value={exercise.weight}
              unit="kg"
              onClick={() => openMetricEditor(exercise.id, 'weight')}
            />
            <MetricChip
              label="Reps"
              value={exercise.reps}
              onClick={() => openMetricEditor(exercise.id, 'reps')}
            />
          </>
        )}
        {/* Similar for other metric types */}
      </MetricsCell>

      <RestCell>
        <NumberInput
          value={exercise.restSeconds}
          suffix="sec"
          onChange={value => updateExercise(exercise.id, { restSeconds: value })}
        />
      </RestCell>

      <ActionsCell>
        <IconButton icon="drag-handle" />
        <IconButton icon="more-options" onClick={() => openExerciseOptions(exercise.id)} />
      </ActionsCell>
    </ExerciseRow>
  ))}
</WorkoutExerciseTable>
```

**Metric Editor Modal**:
```tsx
<MetricEditorModal exercise={selectedExercise}>
  <Title>Configure {selectedMetric}</Title>

  {/* Dynamic inputs based on metric type */}
  <MetricInputs metricType={exercise.metricType}>
    {/* Weight + Reps example */}
    <NumberInput label="Weight (kg)" value={weight} step={2.5} />
    <NumberInput label="Reps" value={reps} min={1} max={100} />
  </MetricInputs>

  <SaveButton onClick={saveMetricChanges}>Save</SaveButton>
</MetricEditorModal>
```

---

#### 1.5 Reorder Exercises

**Interaction**: Drag and drop exercises in list using drag handle

**Library**: DnD Kit

**Important**: Reordering an exercise invokes the Superset Manager to check adjacent exercise superset states (see section 1.6 for details).

```typescript
function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event

  if (over && active.id !== over.id) {
    const oldIndex = exercises.findIndex(ex => ex.id === active.id)
    const newIndex = exercises.findIndex(ex => ex.id === over.id)

    const reordered = arrayMove(exercises, oldIndex, newIndex)

    // Update order field for each exercise
    const withUpdatedOrder = reordered.map((ex, index) => ({
      ...ex,
      order: index
    }))

    setExercises(withUpdatedOrder)

    // IMPORTANT: Invoke Superset Manager on dragged exercise
    checkSupersetState(active.id, newIndex, withUpdatedOrder)
  }
}
```

---

#### 1.6 Create Superset

**Superset Manager Utility**

Supersets are managed through a dedicated utility that handles all superset operations. A superset is defined as a group of exercises that share the same `supersetId` and are adjacent to each other in the workout order.

**User Flow**:

1. User clicks on exercise name in workout builder
2. Exercise options drawer appears
3. User selects "Superset" option
4. Superset drawer opens with context-aware options

**Superset Manager Logic**:

The Superset Manager presents different options based on:
- Whether the selected exercise is currently in a superset
- The position of the exercise in the workout (first, last, or middle)
- The superset state of adjacent exercises

```typescript
interface SupersetManagerOptions {
  exerciseId: string
  currentSupersetId: string | null
  position: 'first' | 'last' | 'middle'
  previousExercise?: {
    id: string
    supersetId: string | null
  }
  nextExercise?: {
    id: string
    supersetId: string | null
  }
}

function getSupersetOptions(options: SupersetManagerOptions): SupersetOption[] {
  const { currentSupersetId, position, previousExercise, nextExercise } = options

  // Exercise is NOT in a superset
  if (!currentSupersetId) {
    if (position === 'first') {
      return [{ action: 'superset-with-next', label: 'Superset with next' }]
    }

    if (position === 'last') {
      return [{ action: 'superset-with-previous', label: 'Superset with previous' }]
    }

    // Middle position
    return [
      { action: 'superset-with-next', label: 'Superset with next' },
      { action: 'superset-with-previous', label: 'Superset with previous' }
    ]
  }

  // Exercise IS in a superset
  if (currentSupersetId) {
    const options: SupersetOption[] = []

    if (position === 'first') {
      options.push({ action: 'remove-from-previous', label: 'Remove from superset' })
    }

    if (position === 'last') {
      options.push({ action: 'remove-from-previous', label: 'Remove from superset' })
    }

    if (position === 'middle') {
      // Check previous exercise
      if (previousExercise) {
        if (!previousExercise.supersetId || previousExercise.supersetId !== currentSupersetId) {
          options.push({ action: 'superset-with-previous', label: 'Superset with previous' })
        } else {
          options.push({ action: 'remove-from-previous', label: 'Remove from previous' })
        }
      }

      // Check next exercise
      if (nextExercise) {
        if (!nextExercise.supersetId || nextExercise.supersetId !== currentSupersetId) {
          options.push({ action: 'superset-with-next', label: 'Superset with next' })
        } else {
          options.push({ action: 'remove-from-previous', label: 'Remove from next' })
        }
      }
    }

    return options
  }
}
```

**Superset Actions**:

```typescript
// Create superset with next exercise
function supersetWithNext(exerciseId: string, exercises: WorkoutExercise[]) {
  const currentIndex = exercises.findIndex(ex => ex.id === exerciseId)
  const nextExercise = exercises[currentIndex + 1]

  if (!nextExercise) return

  // If next already has superset, join it
  if (nextExercise.supersetId) {
    updateExercise(exerciseId, { supersetId: nextExercise.supersetId })
  } else {
    // Create new superset
    const newSupersetId = generateId()
    updateExercise(exerciseId, { supersetId: newSupersetId })
    updateExercise(nextExercise.id, { supersetId: newSupersetId })
  }
}

// Create superset with previous exercise
function supersetWithPrevious(exerciseId: string, exercises: WorkoutExercise[]) {
  const currentIndex = exercises.findIndex(ex => ex.id === exerciseId)
  const previousExercise = exercises[currentIndex - 1]

  if (!previousExercise) return

  // If previous already has superset, join it
  if (previousExercise.supersetId) {
    updateExercise(exerciseId, { supersetId: previousExercise.supersetId })
  } else {
    // Create new superset
    const newSupersetId = generateId()
    updateExercise(exerciseId, { supersetId: newSupersetId })
    updateExercise(previousExercise.id, { supersetId: newSupersetId })
  }
}

// Remove exercise from superset
function removeFromSuperset(exerciseId: string, exercises: WorkoutExercise[]) {
  const exercise = exercises.find(ex => ex.id === exerciseId)
  if (!exercise || !exercise.supersetId) return

  const supersetId = exercise.supersetId

  // Remove superset ID from current exercise
  updateExercise(exerciseId, { supersetId: null })

  // Check if superset still has multiple exercises
  const remainingInSuperset = exercises.filter(
    ex => ex.id !== exerciseId && ex.supersetId === supersetId
  )

  // If only one exercise remains, remove its superset ID too
  if (remainingInSuperset.length === 1) {
    updateExercise(remainingInSuperset[0].id, { supersetId: null })
  }
}
```

**Drag & Drop Superset Behavior**:

When an exercise is dragged and reordered:

```typescript
function handleExerciseDragEnd(draggedExerciseId: string, newIndex: number, exercises: WorkoutExercise[]) {
  const draggedExercise = exercises.find(ex => ex.id === draggedExerciseId)
  if (!draggedExercise) return

  // Reorder first
  const reordered = reorderExercises(exercises, draggedExerciseId, newIndex)

  // Check adjacent exercises at new position
  const previousExercise = reordered[newIndex - 1]
  const nextExercise = reordered[newIndex + 1]

  // Case 1: Dropped between exercises with same superset ID
  if (previousExercise?.supersetId &&
      nextExercise?.supersetId &&
      previousExercise.supersetId === nextExercise.supersetId) {

    // Join the existing superset
    updateExercise(draggedExerciseId, { supersetId: previousExercise.supersetId })
  }

  // Case 2: Dropped between exercises with different/no superset IDs
  else {
    // Check if dragged exercise should stay in its superset
    const adjacentHasSameSuperset =
      (previousExercise?.supersetId === draggedExercise.supersetId) ||
      (nextExercise?.supersetId === draggedExercise.supersetId)

    // If no adjacent exercise shares the superset, remove from superset
    if (!adjacentHasSameSuperset) {
      removeFromSuperset(draggedExerciseId, reordered)
    }
  }

  setExercises(reordered)
}
```

**UI Visual Indicators**:

```tsx
<WorkoutExerciseCard exercise={exercise}>
  {/* Superset indicator */}
  {exercise.supersetId && (
    <SupersetBadge>
      <SupersetIcon />
      <SupersetLabel>Superset</SupersetLabel>
    </SupersetBadge>
  )}

  {/* Visual grouping for adjacent exercises in same superset */}
  {exercise.supersetId && nextExercise?.supersetId === exercise.supersetId && (
    <SupersetConnector />
  )}
</WorkoutExerciseCard>
```

---

#### 1.7 Save Workout

**Trigger**: Click "Save" button

**Validation**:
- At least 1 exercise required
- All exercises have valid sets/reps

**Action**:
```typescript
const result = await createWorkout({
  name: workoutName,
  description,
  exercises: exercises.map(ex => ({
    exerciseId: ex.id,
    order: ex.order,
    groupId: ex.groupId,
    sets: ex.sets,
    reps: ex.reps,
    weight: ex.weight,
    restSeconds: ex.restSeconds,
    notes: ex.notes
  }))
})

if (result.success) {
  router.push(`/workouts/${result.data.id}`)
}
```

**Success**:
- Redirect to workout detail page
- Show success toast
- Workout appears in workout list

---

## 2. Live Session Flow

### User Story
As a user, I want to start a workout session and log my sets in real-time with minimal friction so that I can track my performance during training.

### Flow Steps

#### 2.1 Start Session

**Entry Points**:
1. **Workout Details Page** → "Start Workout" button
2. **Workouts Dashboard** → "Quick Start" button on workout card (bypasses details page)

**Quick Start Flow**:
```typescript
// From Workouts Dashboard
function handleQuickStart(workoutId: string) {
  const result = await startSession({ workoutId })

  if (result.success) {
    // Navigate directly to live session (skip workout details)
    router.push(`/sessions/${result.data.id}`)

    // Initialize Redux state
    dispatch(loadSession(result.data))

    // Initialize local storage backup
    localStorage.setItem(`session-${result.data.id}`, JSON.stringify({
      timestamp: Date.now(),
      data: result.data
    }))
  }
}
```

**Standard Start Flow**:
```typescript
// From Workout Details Page
function handleStartWorkout(workoutId: string) {
  // Same as quick start, but user has seen workout details first
  const result = await startSession({ workoutId })
  // ... same implementation
}
```

**Session Created**:
- Status: `IN_PROGRESS`
- Pre-populate expected exercises with `instanceId`
- Load into Redux store
- Create local storage backup

---

#### 2.2 Session UI Layout

**Current Exercise Strategy**:
- When session starts, the first exercise is always the "current" exercise
- All UI elements respond to the current exercise state
- Navigation changes the current exercise

```tsx
<SessionLayout>
  <SessionHeader>
    <WorkoutName>{workout.name}</WorkoutName>
    <ElapsedTime startTime={session.startedAt} />

    {/* Settings button instead of exit */}
    <SettingsButton onClick={openSessionSettings} />
  </SessionHeader>

  {/* Exercise Carousel - Clickable */}
  <ExerciseCarousel
    currentIndex={currentExerciseIndex}
    onSlideClick={handleExerciseClick}
    onSwipe={handleSwipeNavigation}
  >
    {session.exercises.map((exercise, index) => (
      <ExerciseSlide
        key={exercise.instanceId}
        exercise={exercise}
        isCurrent={index === currentExerciseIndex}
        onClick={() => setCurrentExerciseIndex(index)}
      />
    ))}
  </ExerciseCarousel>

  {/* Set Logger for Current Exercise */}
  <SetLogger
    exercise={currentExercise}
    onSetComplete={handleSetComplete}
  />

  {/* Footer: Exercise History (not navigation buttons) */}
  <SessionFooter>
    <ExerciseHistory exerciseId={currentExercise.id}>
      <SectionTitle>Last Performance</SectionTitle>
      {lastSession && (
        <HistoryDetails>
          <SessionDate>{formatDate(lastSession.date)}</SessionDate>
          <SetsList>
            {lastSession.sets.map((set, index) => (
              <SetHistoryItem key={index}>
                Set {index + 1}: {set.weight}kg × {set.reps} reps
              </SetHistoryItem>
            ))}
          </SetsList>
        </HistoryDetails>
      )}
    </ExerciseHistory>
  </SessionFooter>
</SessionLayout>
```

**Session Settings Drawer**:

```tsx
<Drawer open={settingsDrawerOpen} position="right">
  <DrawerHeader>Session Settings</DrawerHeader>

  <SettingsSection>
    <InfoRow label="Started">
      <DateDisplay>
        {formatDay(session.startedAt)}, {formatDate(session.startedAt)}
      </DateDisplay>
      <TimeDisplay>{formatTime(session.startedAt)}</TimeDisplay>
    </InfoRow>

    <InfoRow label="Duration">
      <Duration>{formatDuration(elapsed)}</Duration>
    </InfoRow>
  </SettingsSection>

  <ActionsSection>
    <ActionButton onClick={handleCompleteSession}>
      Complete Session
    </ActionButton>

    <ActionButton onClick={handlePauseSession} variant="secondary">
      {isPaused ? 'Resume' : 'Pause'} Timer
    </ActionButton>

    <ActionButton onClick={handleCancelSession} variant="destructive">
      Cancel Session
    </ActionButton>
  </ActionsSection>
</Drawer>
```

**Navigation Methods**:
1. Click exercise in carousel → Sets current exercise
2. Swipe left/right on carousel → Changes current exercise
3. Swipe up/down on main section → Changes current exercise

---

#### 2.3 Log Set

**Set Logging Table UI**:

```tsx
<SetLogger metricType={exercise.metricType}>
  <Table>
    <TableHeader>
      <Column>Set</Column>
      {/* Metric columns based on metricType */}
      {metricType === 'WEIGHT_REPS' && (
        <>
          <Column>Weight (kg)</Column>
          <Column>Reps</Column>
        </>
      )}
      {/* Spanner icon for set management */}
      <Column>
        <IconButton
          icon="spanner"
          onClick={openSetDrawer}
          aria-label="Manage sets"
        />
      </Column>
    </TableHeader>

    <TableBody>
      {sets.map((set, index) => (
        <SetRow key={index} completed={set.completed}>
          <SetNumber>{index + 1}</SetNumber>

          {/* Metric inputs */}
          {metricType === 'WEIGHT_REPS' && (
            <>
              <WeightInput
                value={set.weight}
                onChange={value => updateSet(index, { weight: value })}
                disabled={set.completed}
              />
              <RepsInput
                value={set.reps}
                onChange={value => updateSet(index, { reps: value })}
                disabled={set.completed}
              />
            </>
          )}

          {/* Checkbox for completion */}
          <Checkbox
            checked={set.completed}
            onClick={() => handleSetComplete(index)}
            variant={set.completed ? 'success' : 'default'}
          />
        </SetRow>
      ))}
    </TableBody>
  </Table>

  {/* Last performance indicator below table */}
  <LastPerformance>
    Last time: {lastPerformance.weight}kg × {lastPerformance.reps} reps
  </LastPerformance>
</SetLogger>
```

**Set Management Drawer**:

```tsx
<Drawer open={setDrawerOpen} position="bottom">
  <DrawerHeader>Manage Sets</DrawerHeader>

  <SetCounter>
    <Label>Sets</Label>
    <CounterControls>
      <IconButton
        icon="minus"
        onClick={removeSet}
        disabled={sets.length <= 1}
      />
      <Count>{sets.length}</Count>
      <IconButton
        icon="plus"
        onClick={addSet}
      />
    </CounterControls>
  </SetCounter>

  {/* Undo last set - only shows if sets completed */}
  {hasCompletedSets && (
    <UndoButton onClick={undoLastSet}>
      Undo Last Set
    </UndoButton>
  )}
</Drawer>
```

**On Set Complete Logic**:

```typescript
async function handleSetComplete(setIndex: number) {
  const currentSet = sets[setIndex]

  // 1. Mark set as complete (optimistic update)
  dispatch(completeSet({
    sessionId,
    exerciseId: currentExercise.id,
    instanceId: currentExercise.instanceId,
    setNumber: setIndex + 1,
    ...currentSet
  }))

  // 2. Update local storage
  saveToLocalStorage(sessionId, getState())

  // 3. Background sync to database
  debouncedSync(sessionId, currentSet)

  // 4. Visual feedback
  playHaptic()
  showSetCompletedAnimation()

  // 5. Check superset state
  if (currentExercise.supersetId) {
    // Move to next exercise in superset
    const nextInSuperset = findNextExerciseInSuperset(
      currentExercise.supersetId,
      currentExerciseIndex
    )

    if (nextInSuperset) {
      setCurrentExerciseIndex(nextInSuperset.index)
      return // Don't start rest timer yet
    }
  }

  // 6. Start rest timer (if not in superset or last in superset)
  startRestTimer(currentExercise.restSeconds)
}
```

---

#### 2.4 Rest Timer

**Trigger**: After completing a set (or last set in superset)

**Default Rest Times by Exercise Type**:
- **SMALL**: 1 minute 30 seconds (90s)
- **MEDIUM**: 2 minutes (120s)
- **LARGE**: 3 minutes (180s)
- **STABILITY**: 1 minute 30 seconds (90s)
- **CARDIO**: 2 minutes (120s)

**Superset Rest Behavior**:
```typescript
function handleSetComplete(set: SetData) {
  // Mark set complete
  completeSet(set)

  // Check if exercise is in superset
  if (currentExercise.supersetId) {
    const nextExerciseInSuperset = getNextExerciseInSuperset(
      currentExercise.supersetId,
      currentExerciseIndex
    )

    // If there's a next exercise in superset, move to it (no rest)
    if (nextExerciseInSuperset) {
      setCurrentExerciseIndex(nextExerciseInSuperset.index)
      return
    }

    // This is the last exercise in superset - start rest
    startRestTimer(getRestTimeForExerciseType(currentExercise.exerciseType))
  } else {
    // Not in superset - start rest immediately
    startRestTimer(getRestTimeForExerciseType(currentExercise.exerciseType))
  }
}

function getRestTimeForExerciseType(exerciseType: ExerciseType): number {
  const restTimes = {
    SMALL: 90,
    MEDIUM: 120,
    LARGE: 180,
    STABILITY: 90,
    CARDIO: 120
  }
  return restTimes[exerciseType]
}
```

**UI**:
```tsx
<RestTimer duration={restSeconds} onComplete={playAlert}>
  {(secondsRemaining) => (
    <CircularProgress value={(secondsRemaining / restSeconds) * 100}>
      <CountdownText>{formatTime(secondsRemaining)}</CountdownText>
    </CircularProgress>
  )}
  <Controls>
    <SkipRestButton onClick={skipRest}>Skip</SkipRestButton>
    <AddTimeButton onClick={() => addTime(30)}>+30s</AddTimeButton>
  </Controls>
</RestTimer>
```

**Timer End**:
- Play audio alert
- Vibrate (if supported)
- Show ready notification

---

#### 2.5 Navigate Between Exercises

**Current Exercise Strategy**:
The application maintains a `currentExerciseIndex` state that determines which exercise is active.

**Navigation Methods**:
1. **Swipe left/right on carousel** → Changes current exercise
2. **Click exercise in carousel** → Sets as current exercise
3. **Swipe up/down on main content area** → Changes current exercise

**State Update**:
```typescript
function setCurrentExercise(index: number) {
  if (index < 0 || index >= exercises.length) return

  setCurrentExerciseIndex(index)

  // Update URL (optional, for shareable/refreshable state)
  router.push(`/sessions/${sessionId}?exercise=${index}`, { shallow: true })

  // Scroll carousel to show current exercise
  carouselRef.current?.scrollTo(index)
}

function handleCarouselSwipe(direction: 'left' | 'right') {
  const newIndex = direction === 'right'
    ? currentExerciseIndex + 1
    : currentExerciseIndex - 1

  setCurrentExercise(newIndex)
}

function handleExerciseClick(index: number) {
  setCurrentExercise(index)
}
```

**Footer Content**:
The footer displays exercise history for the **current exercise**, not navigation buttons.

```tsx
<SessionFooter>
  <ExerciseHistory exerciseId={currentExercise.id}>
    <SectionTitle>Last Time</SectionTitle>
    {lastSession ? (
      <HistoryDetails>
        <Date>{formatRelativeDate(lastSession.date)}</Date>
        <SetsList>
          {lastSession.sets.map((set, i) => (
            <Set key={i}>
              {set.weight}kg × {set.reps} reps
            </Set>
          ))}
        </SetsList>
      </HistoryDetails>
    ) : (
      <EmptyState>No previous data</EmptyState>
    )}
  </ExerciseHistory>
</SessionFooter>
```

---

#### 2.6 Handle Page Refresh

**Session State to Persist**:
- Session metadata (id, status, startedAt, workoutId)
- All completed sets with timestamps
- Current exercise index
- Current set index for each exercise
- Rest timer state (if active)

**On Page Load**:
```typescript
useEffect(() => {
  async function recoverSession() {
    // 1. Load from database
    const dbSession = await getSessionById(sessionId)

    // 2. Load from localStorage
    const localData = localStorage.getItem(`session-${sessionId}`)
    const localSession = localData ? JSON.parse(localData) : null

    // 3. Compare timestamps, use newer
    const dbTimestamp = new Date(dbSession.updatedAt).getTime()
    const localTimestamp = localSession?.timestamp || 0

    if (localTimestamp > dbTimestamp) {
      // Local is newer - use local and sync to DB
      dispatch(loadSession(localSession.data))
      await syncSessionState(sessionId, localSession.data)
    } else {
      // DB is current
      dispatch(loadSession(dbSession))
    }

    // 4. Restore UI state
    if (dbSession.currentExerciseIndex !== undefined) {
      setCurrentExerciseIndex(dbSession.currentExerciseIndex)
    }
  }

  recoverSession()
}, [sessionId])
```

**Local Storage Backup Structure**:
```typescript
interface SessionBackup {
  timestamp: number
  data: {
    id: string
    status: SessionStatus
    startedAt: string
    workoutId: string
    currentExerciseIndex: number
    exercises: {
      instanceId: string
      exerciseId: string
      currentSetIndex: number
      sets: Array<{
        setNumber: number
        completed: boolean
        completedAt?: string
        weight?: number
        reps?: number
        // ... other metrics
      }>
    }[]
    restTimer?: {
      active: boolean
      startedAt: string
      duration: number
    }
  }
}
```

**Auto-save Triggers**:
- After completing any set
- After adding/removing sets
- After changing current exercise
- Every 30 seconds (heartbeat)

---

#### 2.7 Complete Session

**Exercise Complete State**:

An exercise is marked as "complete" when all of its sets are completed:

```typescript
function isExerciseComplete(exercise: SessionExercise): boolean {
  return exercise.sets.every(set => set.completed)
}

function areAllExercisesComplete(exercises: SessionExercise[]): boolean {
  return exercises.every(isExerciseComplete)
}
```

**Complete Session Button Visibility**:

```typescript
// Show complete button only when all exercises are complete
const showCompleteButton = areAllExercisesComplete(session.exercises)
```

**Dynamic Recalculation**:

The complete state is recalculated whenever sets are added or removed:

```typescript
function handleAddSet(exerciseId: string) {
  addSetToExercise(exerciseId)

  // Recalculate completion state
  const allComplete = areAllExercisesComplete(updatedExercises)
  setShowCompleteButton(allComplete)
}

function handleRemoveSet(exerciseId: string) {
  removeSetFromExercise(exerciseId)

  // Recalculate completion state
  const allComplete = areAllExercisesComplete(updatedExercises)
  setShowCompleteButton(allComplete)
}
```

**Complete Session UI**:

```tsx
{/* Floating Complete Button - shows when all exercises done */}
{showCompleteButton && (
  <FloatingCompleteButton onClick={openCompleteDialog}>
    <CheckIcon />
    Complete Session
  </FloatingCompleteButton>
)}
```

**Complete Session via Settings**:

Session settings drawer always shows "Complete Session" option:

```tsx
<Drawer open={settingsDrawerOpen}>
  <DrawerHeader>Session Settings</DrawerHeader>

  <SessionInfo>
    <InfoRow label="Started">{formatDateTime(session.startedAt)}</InfoRow>
    <InfoRow label="Duration">{formatDuration(elapsed)}</InfoRow>
  </SessionInfo>

  <ActionsSection>
    {/* Complete - always available */}
    <ActionButton onClick={handleCompleteFromSettings}>
      Complete Session
    </ActionButton>

    <ActionButton onClick={handlePause} variant="secondary">
      {isPaused ? 'Resume' : 'Pause'}
    </ActionButton>

    {/* Cancel - deletes session entirely */}
    <ActionButton onClick={handleCancel} variant="destructive">
      Cancel Session
    </ActionButton>
  </ActionsSection>
</Drawer>
```

**Complete with Incomplete Sets**:

If user tries to complete via settings when not all sets are done:

```typescript
async function handleCompleteFromSettings() {
  const allComplete = areAllExercisesComplete(session.exercises)

  if (!allComplete) {
    // Show confirmation dialog
    const confirmed = await showAlertDialog({
      title: 'Incomplete Session',
      message: 'Your session has uncompleted sets. Are you sure you want to complete? Only the completed sets will be stored.',
      actions: [
        { label: 'Cancel', value: false },
        { label: 'Complete Anyway', value: true, variant: 'primary' }
      ]
    })

    if (!confirmed) return
  }

  // Proceed with completion
  await completeSession()
}
```

**Cancel Session**:

Canceling deletes the session record entirely:

```typescript
async function handleCancel() {
  const confirmed = await showAlertDialog({
    title: 'Cancel Session',
    message: 'Are you sure you want to cancel this session? No data will be stored.',
    actions: [
      { label: 'Keep Training', value: false },
      { label: 'Cancel Session', value: true, variant: 'destructive' }
    ]
  })

  if (!confirmed) return

  // Delete session from database
  await deleteSession(sessionId)

  // Clear local storage
  localStorage.removeItem(`session-${sessionId}`)

  // Navigate back to workouts
  router.push('/workouts')

  showToast('Session canceled')
}
```

**Complete Session Action**:

```typescript
async function completeSession() {
  const result = await completeSessionAction(sessionId)

  if (result.success) {
    // Clear local storage
    localStorage.removeItem(`session-${sessionId}`)

    // Navigate to summary
    router.push(`/sessions/${sessionId}/summary`)
  }
}
```

**Backend Processing on Complete**:
1. Mark session as `COMPLETED`
2. Set `completedAt` timestamp
3. Calculate total volume (sum of weight × reps for all completed sets)
4. Detect personal records (PRs)
5. Update `ExerciseHistory` for each exercise
6. Return summary data with PR achievements

---

#### 2.8 Session Summary

```tsx
<SessionSummary session={session} summary={summary}>
  <CompletionBadge>Workout Complete!</CompletionBadge>

  <StatsGrid>
    <Stat label="Duration" value={formatDuration(duration)} icon={<Clock />} />
    <Stat label="Total Volume" value={`${totalVolume}kg`} icon={<Weight />} />
    <Stat label="Exercises" value={exercisesCompleted} icon={<Dumbbell />} />
    <Stat label="Sets" value={totalSets} icon={<CheckCircle />} />
  </StatsGrid>

  {prsAchieved.length > 0 && (
    <PRHighlights>
      <SectionTitle>Personal Records! 🎉</SectionTitle>
      {prsAchieved.map(pr => (
        <PRCard key={pr.exerciseId}>
          <ExerciseName>{pr.exerciseName}</ExerciseName>
          <PRDetails>
            New {pr.prType}: {pr.newRecord}kg
            <Delta>+{pr.newRecord - pr.previousRecord}kg</Delta>
          </PRDetails>
        </PRCard>
      ))}
    </PRHighlights>
  )}

  <ExerciseBreakdown exercises={session.exercises} />

  <Actions>
    <Button onClick={() => router.push('/workouts')}>
      Back to Workouts
    </Button>
    <Button variant="outline" onClick={shareSession}>
      Share
    </Button>
  </Actions>
</SessionSummary>
```

---

## 3. Client Assignment Flow (PT)

### User Story
As a PT, I want to assign workouts and plans to my clients so they can see them in their dashboard and perform them.

### Flow Steps

#### 3.1 Clients Dashboard

**Entry Point**: Main navigation → "Clients"

**Dashboard Layout**:

```tsx
<ClientsDashboard>
  <PageHeader>
    <Title>My Clients</Title>
    <InviteClientButton>+ Invite Client</InviteClientButton>
  </PageHeader>

  <ClientsTable>
    <TableHeader>
      <Column>Name</Column>
      <Column>Email</Column>
      <Column>Status</Column>
      <Column>Workouts</Column>
      <Column>Last Active</Column>
      <Column>Actions</Column>
    </TableHeader>

    <TableBody>
      {clients.map(client => (
        <ClientRow
          key={client.id}
          onClick={() => router.push(`/clients/${client.id}`)}
        >
          <ClientInfo>
            <Avatar src={client.image} />
            <Name>{client.name}</Name>
          </ClientInfo>
          <Email>{client.email}</Email>
          <StatusBadge status={client.status} />
          <WorkoutCount>{client.workoutCount}</WorkoutCount>
          <LastActive>{formatRelativeDate(client.lastActive)}</LastActive>
          <MoreOptionsButton onClick={openClientOptions} />
        </ClientRow>
      ))}
    </TableBody>
  </ClientsTable>
</ClientsDashboard>
```

#### 3.2 Client Profile

**Navigation**: Clients Dashboard → Click client row

**Profile Layout with Tabs**:

```tsx
<ClientProfile client={client}>
  <ProfileHeader>
    <ClientInfo>
      <Avatar src={client.image} size="large" />
      <Details>
        <Name>{client.name}</Name>
        <Email>{client.email}</Email>
        <StatusBadge status={client.status} />
      </Details>
    </ClientInfo>

    <HeaderActions>
      <MessageButton onClick={openMessaging}>Message</MessageButton>
      <MoreOptionsButton />
    </HeaderActions>
  </ProfileHeader>

  <Tabs>
    <Tab label="Overview" />
    <Tab label="Workouts" />
    <Tab label="Plans" />
    <Tab label="Progress" />
    <Tab label="Messages" />
  </Tabs>

  <TabContent />
</ClientProfile>
```

#### 3.3 Workouts Tab

**Layout**:

```tsx
<WorkoutsTab clientId={clientId}>
  <TabHeader>
    <ActionsRow>
      <AssignExistingButton onClick={openWorkoutSelector}>
        Assign Existing Workout
      </AssignExistingButton>
      <CreateBespokeButton onClick={openWorkoutBuilder}>
        Create Bespoke Workout
      </CreateBespokeButton>
    </ActionsRow>
  </TabHeader>

  <WorkoutsList>
    {clientWorkouts.map(workout => (
      <WorkoutCard key={workout.id}>
        <WorkoutHeader>
          <WorkoutName>{workout.name}</WorkoutName>
          <OptionsButton onClick={openWorkoutOptions} />
        </WorkoutHeader>

        <WorkoutMetadata>
          <ExerciseCount>{workout.exercises.length} exercises</ExerciseCount>
          <AssignedDate>Assigned {formatDate(workout.assignedAt)}</AssignedDate>
        </WorkoutMetadata>

        {/* Workout options */}
        <OptionsMenu>
          <MenuItem onClick={() => copyWorkoutAsOwn(workout.id)}>
            Copy as My Own
          </MenuItem>
          <MenuItem onClick={() => editWorkout(workout.id)}>
            Edit Workout
          </MenuItem>
          <MenuItem onClick={() => deleteWorkout(workout.id)} variant="destructive">
            Delete Workout
          </MenuItem>
        </OptionsMenu>
      </WorkoutCard>
    ))}
  </WorkoutsList>
</WorkoutsTab>
```

**Assign Existing Workout Flow**:

```tsx
<Drawer open={workoutSelectorOpen} position="right" width="500px">
  <DrawerHeader>
    <Title>Assign Workouts</Title>
    <SearchBar placeholder="Search workouts..." />
  </DrawerHeader>

  <WorkoutList>
    {ptWorkouts.map(workout => (
      <WorkoutSelectCard
        key={workout.id}
        workout={workout}
        selected={selectedWorkouts.includes(workout.id)}
        onClick={() => toggleWorkoutSelection(workout.id)}
      />
    ))}
  </WorkoutList>

  {selectedWorkouts.length > 0 && (
    <FixedBottomButton onClick={assignSelectedWorkouts}>
      Assign ({selectedWorkouts.length})
    </FixedBottomButton>
  )}
</Drawer>
```

**Assign Action (Copy-on-Assign)**:

```typescript
async function assignSelectedWorkouts() {
  const results = await Promise.all(
    selectedWorkouts.map(workoutId =>
      assignWorkoutToClient({
        workoutId,
        clientId,
        customizations: {} // PT can customize after assignment
      })
    )
  )

  // Each assignment creates a workout copy owned by client
  // with copiedFromId pointing to PT's original workout

  showToast(`${selectedWorkouts.length} workout(s) assigned successfully`)
  closeWorkoutSelector()
  refreshClientWorkouts()
}
```

**Create Bespoke Workout**:

Opens workout builder but stays within client profile context:

```typescript
function openBespokeWorkoutBuilder() {
  // Open workout builder in modal/drawer OR navigate to builder page with context
  router.push(`/workouts/create?clientId=${clientId}`)
}

// After saving, workout is owned by client with PT as creator
```

#### 3.4 Plans Tab

**Layout**:

```tsx
<PlansTab clientId={clientId}>
  <TabHeader>
    <ActionsRow>
      <CopyPTPlansButton onClick={openPlanSelector}>
        Copy PT Plan
      </CopyPTPlansButton>
      <CreateBespokePlanButton onClick={openPlanBuilder}>
        Create Bespoke Plan
      </CreateBespokePlanButton>
    </ActionsRow>
  </TabHeader>

  {/* Active plan always shown first */}
  <PlansSection>
    {activePlan && (
      <ActivePlanCard plan={activePlan}>
        <PlanBadge>Active</PlanBadge>
        <PlanName>{activePlan.name}</PlanName>
        <PlanMetadata>
          <Duration>{activePlan.durationWeeks} weeks</Duration>
          <Progress>Week {activePlan.currentWeek} of {activePlan.durationWeeks}</Progress>
        </PlanMetadata>
      </ActivePlanCard>
    )}

    {/* All other plans */}
    {otherPlans.map(plan => (
      <PlanCard key={plan.id}>
        <PlanHeader>
          <PlanName>{plan.name}</PlanName>
          <OptionsButton onClick={openPlanOptions} />
        </PlanHeader>

        <PlanMetadata>
          <Duration>
            {plan.durationWeeks === 0 ? 'Unlimited' : `${plan.durationWeeks} weeks`}
          </Duration>
        </PlanMetadata>

        {/* Plan options */}
        <OptionsMenu>
          <MenuItem onClick={() => copyPlanAsOwn(plan.id)}>
            Copy as My Own
          </MenuItem>
          <MenuItem onClick={() => editPlan(plan.id)}>
            Edit Plan
          </MenuItem>
          <MenuItem onClick={() => deletePlan(plan.id)} variant="destructive">
            Delete Plan
          </MenuItem>
        </OptionsMenu>
      </PlanCard>
    ))}
  </PlansSection>
</PlansTab>
```

**Copy PT Plans Flow**:

```tsx
<Drawer open={planSelectorOpen} position="right" width="500px">
  <DrawerHeader>
    <Title>Copy PT Plans</Title>
    <SearchBar placeholder="Search plans..." />
  </DrawerHeader>

  <PlanList>
    {ptPlans.map(plan => (
      <PlanSelectCard
        key={plan.id}
        plan={plan}
        selected={selectedPlans.includes(plan.id)}
        onClick={() => togglePlanSelection(plan.id)}
      />
    ))}
  </PlanList>

  {selectedPlans.length > 0 && (
    <FixedBottomButton onClick={copySelectedPlans}>
      Copy ({selectedPlans.length})
    </FixedBottomButton>
  )}
</Drawer>
```

**Copy Plans Action**:

```typescript
async function copySelectedPlans() {
  const results = await Promise.all(
    selectedPlans.map(planId =>
      copyPlanToClient({
        planId,
        clientId
      })
    )
  )

  // Each copy creates a plan owned by client with copiedFromId reference

  showToast(`${selectedPlans.length} plan(s) copied successfully`)
  closePlanSelector()
  refreshClientPlans()
}
```

**Create Bespoke Plan**:

Opens plan builder but stays within client profile context (see section 6 for plan builder details).

---

## 4. Role Upgrade Flow

### User Story
As a Personal User, I want to upgrade to PT so I can manage clients and assign workouts.

### Flow Steps

#### 4.1 Navigate to Upgrade

**Entry Points**:
- Dashboard → "Upgrade to PT" CTA
- Pricing page
- Settings → Subscription

---

#### 4.2 View Pricing Tiers

```tsx
<PricingPage>
  {tiers.map(tier => (
    <PricingCard key={tier.id}>
      <TierName>{tier.name}</TierName>
      <Price>
        ${tier.price}/month
        <AnnualPrice>or ${tier.annualPrice}/year</AnnualPrice>
      </Price>

      <FeatureList>
        {tier.features.map(feature => (
          <Feature key={feature}>{feature}</Feature>
        ))}
      </FeatureList>

      <UpgradeButton
        onClick={() => handleUpgrade(tier.stripePriceId)}
        disabled={currentTier === tier.id}
      >
        {currentTier === tier.id ? 'Current Plan' : 'Upgrade'}
      </UpgradeButton>
    </PricingCard>
  ))}
</PricingPage>
```

---

#### 4.3 Stripe Checkout

```typescript
async function handleUpgrade(priceId: string) {
  const result = await createCheckoutSession(priceId)

  if (result.success) {
    // Redirect to Stripe Checkout
    window.location.href = result.data.url
  }
}
```

**Stripe Checkout**:
- Enter payment details
- Review subscription
- Complete payment

---

#### 4.4 Post-Payment Redirect

**Success URL**: `/dashboard?checkout=success`

**UI**:
```tsx
{searchParams.get('checkout') === 'success' && (
  <SuccessMessage>
    <Title>Welcome to B-Fit PT! 🎉</Title>
    <Message>
      Your subscription is now active. You can now invite clients and assign workouts.
    </Message>
    <OnboardingChecklist>
      <ChecklistItem>Set up your branding</ChecklistItem>
      <ChecklistItem>Invite your first client</ChecklistItem>
      <ChecklistItem>Create a workout template</ChecklistItem>
    </OnboardingChecklist>
  </SuccessMessage>
)}
```

**Backend** (Webhook):
- Update `user.role` to `PT`
- Set `subscriptionTier` and `clientCapacity`
- Create `Subscription` record

---

## 5. Messaging Flow

### User Story
As a client, I want to send messages to my PT about specific workouts or sessions so I can get feedback.

### Flow Steps

#### 5.1 Open Conversation

**Entry Points**:
- Client dashboard → "Message PT" button
- PT client list → Click client → "Message" button
- Workout detail → "Ask about this workout"
- Session summary → "Send to PT"

---

#### 5.2 Compose Message

```tsx
<MessageComposer>
  <MessageInput
    placeholder="Type your message..."
    value={message}
    onChange={setMessage}
    maxLength={2000}
  />

  <MediaUploadButton onClick={openMediaPicker}>
    <CameraIcon />
  </MediaUploadButton>

  {contextWorkout && (
    <AttachedContext>
      <WorkoutLabel>Re: {contextWorkout.name}</WorkoutLabel>
      <RemoveButton onClick={() => setContextWorkout(null)} />
    </AttachedContext>
  )}

  {mediaFile && (
    <MediaPreview>
      <Image src={URL.createObjectURL(mediaFile)} />
      <RemoveButton onClick={() => setMediaFile(null)} />
    </MediaPreview>
  )}

  <SendButton onClick={sendMessage} disabled={!message.trim()}>
    Send
  </SendButton>
</MessageComposer>
```

---

#### 5.3 Upload Media (Optional)

```typescript
async function handleMediaUpload(file: File) {
  // Validate
  if (file.size > 10 * 1024 * 1024) {  // 10MB
    showError('File too large (max 10MB)')
    return
  }

  if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
    showError('Only images and videos allowed')
    return
  }

  // Upload to Vercel Blob
  const formData = new FormData()
  formData.append('file', file)

  const result = await uploadMedia(formData)

  if (result.success) {
    setMediaUrl(result.data.url)
  }
}
```

---

#### 5.4 Send Message

```typescript
async function sendMessage() {
  const result = await sendMessageAction({
    recipientId: pt.id,
    content: message,
    workoutId: contextWorkout?.id,
    sessionId: contextSession?.id,
    mediaUrl: mediaUrl
  })

  if (result.success) {
    // Add to local messages (optimistic)
    dispatch(addMessage(result.data))

    // Clear input
    setMessage('')
    setMediaUrl(null)
    setContextWorkout(null)

    // Scroll to bottom
    scrollToBottom()
  }
}
```

---

#### 5.5 View Conversation

```tsx
<Conversation>
  <ConversationHeader>
    <Avatar src={otherUser.image} />
    <UserName>{otherUser.name}</UserName>
  </ConversationHeader>

  <MessageList>
    {messages.map(msg => (
      <MessageBubble
        key={msg.id}
        message={msg}
        isOwnMessage={msg.senderId === currentUser.id}
      >
        <MessageContent>{msg.content}</MessageContent>

        {msg.mediaUrl && (
          <MediaAttachment src={msg.mediaUrl} />
        )}

        {msg.workoutId && (
          <WorkoutContext workout={msg.workout}>
            <WorkoutName>{msg.workout.name}</WorkoutName>
            <ViewWorkoutButton onClick={() => router.push(`/workouts/${msg.workoutId}`)}>
              View Workout
            </ViewWorkoutButton>
          </WorkoutContext>
        )}

        <Timestamp>{formatRelativeTime(msg.createdAt)}</Timestamp>
      </MessageBubble>
    ))}
  </MessageList>

  <MessageComposer />
</Conversation>
```

---

## 6. Planning Flow

### User Story
As a user (Personal or PT), I want to create multi-day training plans so I can schedule workouts across weeks.

### 6.1 Personal Account - Plans Dashboard

**Entry Point**: Main navigation → "Plans"

**Dashboard Layout**:

```tsx
<PlansDashboard>
  <PageHeader>
    <Title>My Plans</Title>
    <CreatePlanButton>Create Plan</CreatePlanButton>
  </PageHeader>

  {/* Active plan always shown first */}
  <PlansSection>
    {activePlan && (
      <ActivePlanCard plan={activePlan}>
        <PlanBadge>Active</PlanBadge>
        <PlanName>{activePlan.name}</PlanName>
        <PlanDescription>{activePlan.description}</PlanDescription>
        <PlanProgress>
          <ProgressBar value={activePlan.progress} />
          <ProgressText>
            Week {activePlan.currentWeek} of {activePlan.durationWeeks === 0 ? '∞' : activePlan.durationWeeks}
          </ProgressText>
        </PlanProgress>
        <OptionsButton onClick={openPlanOptions} />
      </ActivePlanCard>
    )}

    {/* All other plans */}
    <PlansList>
      {otherPlans.map(plan => (
        <PlanCard
          key={plan.id}
          onClick={() => router.push(`/plans/${plan.id}`)}
        >
          <PlanHeader>
            <PlanName>{plan.name}</PlanName>
            <OptionsButton onClick={openPlanOptions} />
          </PlanHeader>

          <PlanMetadata>
            <Duration>
              {plan.durationWeeks === 0 ? 'Unlimited' : `${plan.durationWeeks} weeks`}
            </Duration>
            <DayCount>{plan.daysPerWeek} days/week</DayCount>
          </PlanMetadata>

          {/* Options */}
          <OptionsMenu>
            <MenuItem onClick={() => deletePlan(plan.id)} variant="destructive">
              Delete Plan
            </MenuItem>
            <MenuItem onClick={() => editPlan(plan.id)}>
              Edit Plan
            </MenuItem>
            <MenuItem onClick={() => copyPlan(plan.id)}>
              Copy Plan
            </MenuItem>
          </OptionsMenu>
        </PlanCard>
      ))}
    </PlansList>
  </PlansSection>
</PlansDashboard>
```

#### 6.2 Create Plan Flow

**Step 1: Select Days Per Week**

```tsx
<CreatePlanStep1>
  <StepHeader>
    <Title>Create Training Plan</Title>
    <Subtitle>How many days per week will you train?</Subtitle>
  </StepHeader>

  <DaySelector>
    {[1, 2, 3, 4, 5, 6, 7].map(days => (
      <DayOption
        key={days}
        selected={selectedDays === days}
        onClick={() => setSelectedDays(days)}
      >
        <DayNumber>{days}</DayNumber>
        <DayLabel>{days === 1 ? 'day' : 'days'}</DayLabel>
      </DayOption>
    ))}
  </DaySelector>

  <NextButton onClick={goToStep2} disabled={!selectedDays}>
    Next
  </NextButton>
</CreatePlanStep1>
```

**Step 2: Select Plan Duration**

```tsx
<CreatePlanStep2>
  <StepHeader>
    <Title>Plan Duration</Title>
    <Subtitle>How long will this plan run?</Subtitle>
  </StepHeader>

  {/* Unlimited first */}
  <DurationOption
    selected={duration === 0}
    onClick={() => setDuration(0)}
    featured
  >
    <DurationLabel>Unlimited</DurationLabel>
    <DurationDescription>No end date, run indefinitely</DurationDescription>
  </DurationOption>

  {/* Week options */}
  <DurationGrid>
    {[...Array(52)].map((_, i) => {
      const weeks = i + 1
      return (
        <DurationOption
          key={weeks}
          selected={duration === weeks}
          onClick={() => setDuration(weeks)}
        >
          <DurationLabel>{weeks} {weeks === 1 ? 'week' : 'weeks'}</DurationLabel>
        </DurationOption>
      )
    })}
  </DurationGrid>

  <Actions>
    <BackButton onClick={goToStep1}>Back</BackButton>
    <CreateButton onClick={createPlan} disabled={duration === null}>
      Create
    </CreateButton>
  </Actions>
</CreatePlanStep2>
```

#### 6.3 Days Planning (Edit Plan)

After creating the plan structure, user is taken to the days planning screen:

```tsx
<PlanBuilder plan={plan}>
  <PlanHeader>
    <PlanName editable>{plan.name}</PlanName>
    <PlanDescription editable>{plan.description}</PlanDescription>
  </PlanHeader>

  {/* Day Carousel - similar to session exercise carousel */}
  <DayCarousel
    currentIndex={currentDayIndex}
    onIndexChange={setCurrentDayIndex}
  >
    {plan.days.map((day, index) => (
      <DaySlide
        key={index}
        day={day}
        isCurrent={index === currentDayIndex}
        onClick={() => setCurrentDayIndex(index)}
      >
        <DayLabel>Day {index + 1}</DayLabel>
        <ExerciseCount>{day.exercises.length} exercises</ExerciseCount>
      </DaySlide>
    ))}
  </DayCarousel>

  {/* Current Day Content */}
  <CurrentDaySection>
    <DayHeader>
      <DayTitle>Day {currentDayIndex + 1}</DayTitle>

      <DayActions>
        <AddExerciseButton onClick={openExerciseSelector}>
          + Add Exercise
        </AddExerciseButton>
        <CopyFromWorkoutButton onClick={openWorkoutSelector}>
          Copy from Workout
        </CopyFromWorkoutButton>
      </DayActions>
    </DayHeader>

    {/* Exercises for current day - same UI as workout builder */}
    <DayExercisesList>
      {currentDay.exercises.map(exercise => (
        <ExerciseCard
          key={exercise.id}
          exercise={exercise}
          draggable
          onReorder={handleReorder}
        />
      ))}

      {currentDay.exercises.length === 0 && (
        <EmptyState>
          <Text>Add exercises to Day {currentDayIndex + 1}</Text>
          <Icon name="plus" />
        </EmptyState>
      )}
    </DayExercisesList>
  </CurrentDaySection>

  <Actions>
    <SaveButton onClick={savePlan}>Save Plan</SaveButton>
  </Actions>
</PlanBuilder>
```

**Copy from Workout Flow**:

```tsx
<Drawer open={workoutSelectorOpen} position="bottom" height="60%">
  <DrawerHeader>
    <Title>Copy Exercises from Workout</Title>
    <SearchBar placeholder="Search workouts..." />
  </DrawerHeader>

  <WorkoutList>
    {workouts.map(workout => (
      <WorkoutCard
        key={workout.id}
        workout={workout}
        onClick={() => copyExercisesFromWorkout(workout.id)}
      >
        <WorkoutName>{workout.name}</WorkoutName>
        <ExerciseCount>{workout.exercises.length} exercises</ExerciseCount>
      </WorkoutCard>
    ))}
  </WorkoutList>
</Drawer>
```

```typescript
async function copyExercisesFromWorkout(workoutId: string) {
  const workout = await getWorkout(workoutId)

  // Copy all exercises from workout to current day
  const copiedExercises = workout.exercises.map(ex => ({
    ...ex,
    id: generateId(), // New ID for plan day
    dayIndex: currentDayIndex
  }))

  // Add to current day
  updateDay(currentDayIndex, {
    exercises: [...currentDay.exercises, ...copiedExercises]
  })

  closeWorkoutSelector()
  showToast(`${copiedExercises.length} exercises copied`)
}
```

**Navigation Between Days**:
1. Click day in carousel → Sets current day
2. Swipe left/right on carousel → Changes current day
3. Swipe up/down on main section → Changes current day

#### 6.4 Plan Details View

**Entry Point**: Plans Dashboard → Click plan card

```tsx
<PlanDetails plan={plan}>
  <PlanHeader>
    <PlanName>{plan.name}</PlanName>
    <PlanDescription>{plan.description}</PlanDescription>
  </PlanHeader>

  <PlanMetadata>
    <MetadataRow label="Duration">
      {plan.durationWeeks === 0 ? 'Unlimited' : `${plan.durationWeeks} weeks`}
    </MetadataRow>
    <MetadataRow label="Days per Week">
      {plan.daysPerWeek}
    </MetadataRow>
    <MetadataRow label="Total Exercises">
      {plan.totalExercises}
    </MetadataRow>
  </PlanMetadata>

  <Actions>
    <ActivatePlanButton onClick={activatePlan}>
      Activate Plan
    </ActivatePlanButton>
    <CopyPlanButton onClick={copyPlan}>
      Copy Plan
    </CopyPlanButton>
    <DeletePlanButton onClick={deletePlan} variant="destructive">
      Delete Plan
    </DeletePlanButton>
    <EditDaysButton onClick={editPlanDays}>
      Edit Days
    </EditDaysButton>
  </Actions>

  {/* Day-by-day breakdown */}
  <DaysList>
    {plan.days.map((day, index) => (
      <DayCard key={index}>
        <DayHeader>
          <DayLabel>Day {index + 1}</DayLabel>
          <ExerciseCount>{day.exercises.length} exercises</ExerciseCount>
        </DayHeader>

        <ExercisesList>
          {day.exercises.map(exercise => (
            <ExerciseListItem key={exercise.id}>
              {exercise.name}
            </ExerciseListItem>
          ))}
        </ExercisesList>
      </DayCard>
    ))}
  </DaysList>
</PlanDetails>
```

**Activate Plan**:

```typescript
async function activatePlan(planId: string) {
  // Business logic: Only one plan can be active at a time
  // Deactivate current active plan (if any)
  if (currentActivePlan) {
    await deactivatePlan(currentActivePlan.id)
  }

  // Activate selected plan
  await updatePlan(planId, { isActive: true, activatedAt: new Date() })

  showToast('Plan activated')
  router.push('/plans')
}
```

#### 6.5 PT Account - Personal Use Plans

**Entry Point**: Main navigation → "Plans"

**Behavior**: Identical to Personal Account (section 6.1-6.4)

PT can create and manage their own training plans with the exact same interface and functionality as Personal users.

#### 6.6 PT Account - Client Plans

**Entry Point**: Clients → Client Profile → Plans Tab

**Behavior**: Same as section 3.4, with full plan builder capability

The plan builder interface is identical to personal use, but:
- Plans are owned by the client
- PT has full edit permissions
- PT can copy their own plans to client

---

**Document Version**: 1.0
**Last Updated**: 2026-01-24

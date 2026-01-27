# B-Fit Exercise Library Specification

## Overview

The exercise library is the foundation of B-Fit, containing 200-300 pre-seeded exercises covering all major movement patterns, muscle groups, and equipment types.

---

## Exercise Type Definitions

### SMALL - Isolation Exercises

**Characteristics**:

- Single joint movement
- Targets one primary muscle
- Lower fatigue impact
- Typically 2-4 sets

**Examples**:

- Bicep curls
- Lateral raises
- Leg curls
- Tricep extensions
- Calf raises

### MEDIUM - Compound Exercises

**Characteristics**:

- Multi-joint movement
- Targets 2-3 muscle groups
- Moderate fatigue impact
- Typically 3-5 sets

**Examples**:

- Bench press
- Barbell rows
- Romanian deadlifts
- Overhead press
- Pull-ups

### LARGE - Major Compounds

**Characteristics**:

- Full-body engagement
- High CNS demand
- Significant fatigue impact
- Typically 3-6 sets
- Often programmed first in workout

**Examples**:

- Back squats
- Conventional deadlifts
- Front squats
- Power cleans
- Snatch

### STABILITY - Core & Stabilization

**Characteristics**:

- Static or controlled movement
- Core engagement
- Balance/stability focus
- Often time-based

**Examples**:

- Planks
- Bird dogs
- Dead bugs
- Pallof press
- Single-leg balance

### CARDIO - Cardiovascular Exercises

**Characteristics**:

- Elevates heart rate
- Aerobic or anaerobic
- Distance or time-based
- Conditioning focus

**Examples**:

- Running
- Rowing
- Assault bike
- Jump rope
- Burpees

---

## Metric Type Definitions

### WEIGHT_REPS

**Format**: Weight (kg/lbs) + Repetitions

**Use Cases**:

- Standard resistance training
- Barbell/dumbbell exercises
- Machine exercises

**Example**: Bench Press - 100kg x 5 reps

**UI Fields**:

- Weight input (number)
- Reps input (number)
- Unit toggle (kg/lbs)

---

### COUNTER_WEIGHT_REPS

**Format**: Assistance Weight + Repetitions

**Use Cases**:

- Assisted pull-ups/dips
- Counterbalance machines
- Weight reduces difficulty

**Example**: Assisted Pull-ups - 20kg assistance x 8 reps

**UI Fields**:

- Assistance weight (number)
- Reps (number)
- Note: "20kg assistance" means 20kg helping

---

### REPS

**Format**: Repetitions only

**Use Cases**:

- Bodyweight exercises
- No external resistance
- Rep count is primary metric

**Example**: Push-ups - 20 reps

**UI Fields**:

- Reps input (number)

---

### REPS_DURATION

**Format**: Repetitions + Time

**Use Cases**:

- Timed holds with movement
- Slow eccentrics
- Tempo-based exercises

**Example**: Slow Push-ups - 10 reps in 30 seconds

**UI Fields**:

- Reps (number)
- Duration (seconds)

---

### DURATION

**Format**: Time only

**Use Cases**:

- Static holds
- Planks
- Wall sits
- Timed intervals

**Example**: Plank - 60 seconds

**UI Fields**:

- Duration input (seconds)
- Optional: Auto-timer with alerts

---

### DISTANCE_DURATION

**Format**: Distance + Time

**Use Cases**:

- Cardio work
- Running, rowing, cycling
- Swimming

**Example**: Running - 5km in 25:00

**UI Fields**:

- Distance (meters/km or miles)
- Duration (minutes:seconds)
- Calculated pace display

---

### WEIGHT_DISTANCE

**Format**: Weight + Distance

**Use Cases**:

- Loaded carries
- Sled pushes/pulls
- Farmer walks

**Example**: Farmer Carry - 50kg x 50 meters

**UI Fields**:

- Weight (kg/lbs)
- Distance (meters/feet)

---

### WEIGHT_DURATION

**Format**: Weight + Time

**Use Cases**:

- Weighted holds
- Loaded carries (timed)
- Isometric holds with weight

**Example**: Weighted Plank - 20kg plate x 45 seconds

**UI Fields**:

- Weight (kg/lbs)
- Duration (seconds)

---

## Exercise Categorization

### Muscle Groups

Exercises are categorized by **primary** and **secondary** muscle groups for accurate filtering and workout balancing.

#### Primary Muscle Group (Required, Single Selection)

Every exercise must have exactly one primary muscle group:

- **CHEST**: Pectorals
- **BACK**: Lats, rhomboids, traps
- **SHOULDERS**: Deltoids
- **BICEPS**: Biceps brachii
- **TRICEPS**: Triceps brachii
- **QUADS**: Quadriceps
- **HAMSTRINGS**: Hamstrings
- **GLUTES**: Gluteus muscles
- **CALVES**: Gastrocnemius, soleus
- **CORE**: Abs, obliques, transverse abdominis
- **FULL_BODY**: Multi-muscle compound movements

#### Secondary Muscle Groups (Optional, Multiple Selection)

Exercises can have zero or more secondary muscle groups from the same list above.

**Examples**:

- Bench Press: Primary = CHEST, Secondary = [TRICEPS, SHOULDERS]
- Pull-ups: Primary = BACK, Secondary = [BICEPS]
- Plank: Primary = CORE, Secondary = []

### Equipment Types

- **BARBELL**: Olympic barbell, EZ bar
- **DUMBBELL**: Single or paired dumbbells
- **KETTLEBELL**: Single or paired kettlebells
- **MACHINE**: Cable machines, smith machine, leg press, etc.
- **CABLE**: Cable crossover, cable columns
- **BODYWEIGHT**: No external resistance
- **RESISTANCE_BAND**: Elastic bands
- **TRX**: Suspension training
- **CARDIO_EQUIPMENT**: Treadmill, rower, bike
- **MISC**: Miscellaneous equipment not fitting other categories

### Movement Patterns

- **PUSH**: Pressing movements (bench, overhead press)
- **PULL**: Pulling movements (rows, pull-ups)
- **SQUAT**: Squatting patterns (back squat, goblet squat)
- **HINGE**: Hip hinge (deadlift, RDL, kettlebell swing)
- **CARRY**: Loaded carries (farmer, waiter, suitcase)
- **CORE**: Core-specific (planks, pallof, dead bugs)
- **LUNGE**: Lunging patterns (forward, reverse, lateral)
- **OLYMPIC**: Olympic lifts (snatch, clean & jerk)

### Difficulty Levels

- **BEGINNER**: Basic movement, low skill requirement
- **INTERMEDIATE**: Moderate complexity, some experience needed
- **ADVANCED**: High skill, significant experience required

---

## Seed Exercise Library

### Sample Exercises (Full list: 200-300 exercises)

#### Chest Exercises

```json
{
  "name": "Barbell Bench Press",
  "exerciseType": "MEDIUM",
  "metricType": "WEIGHT_REPS",
  "primaryMuscleGroup": "CHEST",
  "secondaryMuscleGroups": ["TRICEPS", "SHOULDERS"],
  "equipmentType": "BARBELL",
  "movementPattern": "PUSH",
  "difficultyLevel": "INTERMEDIATE",
  "description": "Lie on bench, lower bar to chest, press up",
  "isDefault": true,
  "instructions": [
    "Lie on a flat bench with feet planted firmly on the ground",
    "Grip the barbell slightly wider than shoulder-width with palms facing away",
    "Unrack the bar and position it directly above your chest with arms fully extended",
    "Lower the bar in a controlled motion to your mid-chest, keeping elbows at about 45 degrees",
    "Press the bar back up explosively until arms are fully extended",
    "Maintain tight core and shoulder blades retracted throughout the movement"
  ]
}

{
  "name": "Dumbbell Flyes",
  "exerciseType": "SMALL",
  "metricType": "WEIGHT_REPS",
  "muscleGroups": ["CHEST"],
  "equipmentType": "DUMBBELL",
  "movementPattern": "PUSH",
  "difficultyLevel": "BEGINNER",
  "description": "Arc dumbbells out and down, squeeze chest to raise",
  "isDefault": true
}

{
  "name": "Push-ups",
  "exerciseType": "MEDIUM",
  "metricType": "REPS",
  "muscleGroups": ["CHEST", "TRICEPS", "SHOULDERS", "CORE"],
  "equipmentType": "BODYWEIGHT",
  "movementPattern": "PUSH",
  "difficultyLevel": "BEGINNER",
  "description": "Standard push-up position, chest to ground",
  "isDefault": true
}
```

#### Back Exercises

```json
{
  "name": "Barbell Row",
  "exerciseType": "MEDIUM",
  "metricType": "WEIGHT_REPS",
  "muscleGroups": ["BACK", "BICEPS"],
  "equipmentType": "BARBELL",
  "movementPattern": "PULL",
  "difficultyLevel": "INTERMEDIATE",
  "description": "Bent over, pull bar to lower chest/upper abdomen",
  "isDefault": true
}

{
  "name": "Pull-ups",
  "exerciseType": "MEDIUM",
  "metricType": "REPS",
  "muscleGroups": ["BACK", "BICEPS"],
  "equipmentType": "BODYWEIGHT",
  "movementPattern": "PULL",
  "difficultyLevel": "INTERMEDIATE",
  "description": "Overhand grip, pull chin over bar",
  "isDefault": true
}

{
  "name": "Assisted Pull-ups",
  "exerciseType": "MEDIUM",
  "metricType": "COUNTER_WEIGHT_REPS",
  "muscleGroups": ["BACK", "BICEPS"],
  "equipmentType": "MACHINE",
  "movementPattern": "PULL",
  "difficultyLevel": "BEGINNER",
  "description": "Machine-assisted pull-ups for progression",
  "isDefault": true
}
```

#### Leg Exercises

```json
{
  "name": "Back Squat",
  "exerciseType": "LARGE",
  "metricType": "WEIGHT_REPS",
  "muscleGroups": ["QUADS", "GLUTES", "CORE"],
  "equipmentType": "BARBELL",
  "movementPattern": "SQUAT",
  "difficultyLevel": "INTERMEDIATE",
  "description": "Barbell on back, squat to parallel or below",
  "isDefault": true
}

{
  "name": "Romanian Deadlift",
  "exerciseType": "MEDIUM",
  "metricType": "WEIGHT_REPS",
  "muscleGroups": ["HAMSTRINGS", "GLUTES", "BACK"],
  "equipmentType": "BARBELL",
  "movementPattern": "HINGE",
  "difficultyLevel": "INTERMEDIATE",
  "description": "Hip hinge with slight knee bend, feel hamstring stretch",
  "isDefault": true
}

{
  "name": "Lunges",
  "exerciseType": "MEDIUM",
  "metricType": "REPS",
  "muscleGroups": ["QUADS", "GLUTES"],
  "equipmentType": "BODYWEIGHT",
  "movementPattern": "LUNGE",
  "difficultyLevel": "BEGINNER",
  "description": "Step forward, lower back knee, push back to start",
  "isDefault": true
}
```

#### Core Exercises

```json
{
  "name": "Plank",
  "exerciseType": "STABILITY",
  "metricType": "DURATION",
  "muscleGroups": ["CORE"],
  "equipmentType": "BODYWEIGHT",
  "movementPattern": "CORE",
  "difficultyLevel": "BEGINNER",
  "description": "Forearm plank, maintain straight body line",
  "isDefault": true
}

{
  "name": "Weighted Plank",
  "exerciseType": "STABILITY",
  "metricType": "WEIGHT_DURATION",
  "muscleGroups": ["CORE"],
  "equipmentType": "DUMBBELL",
  "movementPattern": "CORE",
  "difficultyLevel": "INTERMEDIATE",
  "description": "Plank with weight plate on back",
  "isDefault": true
}

{
  "name": "Dead Bug",
  "exerciseType": "STABILITY",
  "metricType": "REPS",
  "muscleGroups": ["CORE"],
  "equipmentType": "BODYWEIGHT",
  "movementPattern": "CORE",
  "difficultyLevel": "BEGINNER",
  "description": "Supine, alternate arm/leg extensions while maintaining lower back contact",
  "isDefault": true
}
```

#### Cardio Exercises

```json
{
  "name": "Running",
  "exerciseType": "CARDIO",
  "metricType": "DISTANCE_DURATION",
  "muscleGroups": ["FULL_BODY"],
  "equipmentType": "CARDIO_EQUIPMENT",
  "movementPattern": "PUSH",
  "difficultyLevel": "BEGINNER",
  "description": "Treadmill or outdoor running",
  "isDefault": true
}

{
  "name": "Rowing",
  "exerciseType": "CARDIO",
  "metricType": "DISTANCE_DURATION",
  "muscleGroups": ["FULL_BODY", "BACK"],
  "equipmentType": "CARDIO_EQUIPMENT",
  "movementPattern": "PULL",
  "difficultyLevel": "BEGINNER",
  "description": "Rowing machine, full body cardio",
  "isDefault": true
}

{
  "name": "Assault Bike",
  "exerciseType": "CARDIO",
  "metricType": "DURATION",
  "muscleGroups": ["FULL_BODY"],
  "equipmentType": "CARDIO_EQUIPMENT",
  "movementPattern": "PUSH",
  "difficultyLevel": "INTERMEDIATE",
  "description": "Air resistance bike, high intensity",
  "isDefault": true
}
```

#### Olympic Lifts

```json
{
  "name": "Power Clean",
  "exerciseType": "LARGE",
  "metricType": "WEIGHT_REPS",
  "muscleGroups": ["FULL_BODY"],
  "equipmentType": "BARBELL",
  "movementPattern": "OLYMPIC",
  "difficultyLevel": "ADVANCED",
  "description": "Explosive pull from floor to rack position",
  "isDefault": true
}

{
  "name": "Snatch",
  "exerciseType": "LARGE",
  "metricType": "WEIGHT_REPS",
  "muscleGroups": ["FULL_BODY"],
  "equipmentType": "BARBELL",
  "movementPattern": "OLYMPIC",
  "difficultyLevel": "ADVANCED",
  "description": "Single motion pull from floor to overhead",
  "isDefault": true
}
```

---

## Exercise Search & Filtering

### Search Algorithm

```typescript
function searchExercises(query: string, filters: ExerciseFilters) {
  return prisma.exercise.findMany({
    where: {
      AND: [
        // Text search
        {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ],
        },
        // Muscle Group Filter - searches both primary AND secondary
        filters.muscleGroups
          ? {
              OR: [
                { primaryMuscleGroup: { in: filters.muscleGroups } },
                { secondaryMuscleGroups: { hasSome: filters.muscleGroups } },
              ],
            }
          : {},
        // Other filters
        filters.equipmentType ? { equipmentType: filters.equipmentType } : {},
        filters.exerciseType ? { exerciseType: filters.exerciseType } : {},
        filters.difficultyLevel ? { difficultyLevel: filters.difficultyLevel } : {},
        filters.movementPattern ? { movementPattern: filters.movementPattern } : {},
        // Show defaults + user's custom exercises
        {
          OR: [{ isDefault: true }, { createdById: userId }],
        },
      ],
    },
    orderBy: [
      { isDefault: 'desc' }, // Defaults first
      { name: 'asc' },
    ],
  })
}
```

### Filter UI

```tsx
<ExerciseFilters>
  <MuscleGroupSelect multiple />
  <EquipmentTypeSelect />
  <ExerciseTypeSelect />
  <DifficultyLevelSelect />
  <MovementPatternSelect />
</ExerciseFilters>
```

---

## Custom Exercise Creation

### User Creation Flow

1. User clicks "Create Custom Exercise"
2. Form fields:
   - **Name** (required) - Text input
   - **Description** (optional) - Textarea
   - **Exercise Type** (required) - Dropdown
   - **Metric Type** (required) - Dropdown
   - **Primary Muscle Group** (required) - Single-select dropdown
   - **Secondary Muscle Groups** (optional) - Multi-select dropdown
   - **Equipment Type** (required) - Dropdown (includes MISC)
   - **Movement Pattern** (required) - Dropdown
   - **Difficulty Level** (required) - Dropdown
   - **Instructions** (optional) - Array of text inputs
     - User can click "+ Add Instruction" to add items
     - Each instruction has a number and can be reordered using up/down buttons
     - Instructions are stored as an array in order
3. Save as `isDefault: false, createdById: userId`
4. Exercise visible only to creator

### Validation

```typescript
const customExerciseSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
  exerciseType: z.enum(['SMALL', 'MEDIUM', 'LARGE', 'STABILITY', 'CARDIO']),
  metricType: z.enum([
    'WEIGHT_REPS',
    'COUNTER_WEIGHT_REPS',
    'REPS',
    'REPS_DURATION',
    'DURATION',
    'DISTANCE_DURATION',
    'WEIGHT_DISTANCE',
    'WEIGHT_DURATION',
  ]),
  primaryMuscleGroup: z.enum(MUSCLE_GROUPS), // Single selection, required
  secondaryMuscleGroups: z.array(z.enum(MUSCLE_GROUPS)).optional(), // Multiple selection, optional
  equipmentType: z.enum([...EQUIPMENT_TYPES, 'MISC']),
  movementPattern: z.enum(MOVEMENT_PATTERNS),
  difficultyLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
  instructions: z.array(z.string().max(500)).optional(), // Array of instruction strings
})
```

---

## Exercise Card UI Component

### Display Format

Exercise cards vary by context:

**Context 1: General Exercise List (Browse/Search)**

```tsx
<ExerciseCard>
  <ExerciseThumbnail src={exercise.thumbnailUrl} />
  <ExerciseName>{exercise.name}</ExerciseName>
  <MuscleGroupTags>
    <PrimaryTag>{exercise.primaryMuscleGroup}</PrimaryTag>
    {exercise.secondaryMuscleGroups.map((group) => (
      <SecondaryTag key={group}>{group}</SecondaryTag>
    ))}
  </MuscleGroupTags>
  <ExerciseMetadata>
    <EquipmentIcon type={exercise.equipmentType} />
    <DifficultyBadge level={exercise.difficultyLevel} />
  </ExerciseMetadata>
</ExerciseCard>
```

**Context 2: Exercise Selector (Workout/Plan Builder)**

```tsx
<ExerciseCard selectable selected={isSelected} onClick={handleSelect}>
  <Checkbox checked={isSelected} />
  <ExerciseThumbnail src={exercise.thumbnailUrl} size="small" />
  <ExerciseInfo>
    <ExerciseName>{exercise.name}</ExerciseName>
    <QuickInfo>
      {exercise.equipmentType} • {exercise.primaryMuscleGroup}
    </QuickInfo>
  </ExerciseInfo>
</ExerciseCard>
```

**Context 3: Workout Exercise (In Workout Builder)**

```tsx
<ExerciseCard draggable>
  <DragHandle />
  <ExerciseThumbnail src={exercise.thumbnailUrl} />
  <ExerciseDetails>
    <ExerciseName>{exercise.name}</ExerciseName>
    <MetricSummary>
      {exercise.sets} × {exercise.reps} reps @ {exercise.weight}kg
    </MetricSummary>
  </ExerciseDetails>
  <OptionsButton onClick={openExerciseOptions} />
</ExerciseCard>
```

## Exercise Detail View

Exercise details are displayed in a tabbed interface:

```tsx
<ExerciseDetail>
  <ExerciseHeader>
    <ExerciseThumbnail src={exercise.thumbnailUrl} size="large" />
    <HeaderInfo>
      <Name>{exercise.name}</Name>
      <TypeBadge type={exercise.exerciseType} />
    </HeaderInfo>
  </ExerciseHeader>

  <Tabs>
    <Tab label="Info" />
    <Tab label="Instructions" />
    <Tab label="History" />
  </Tabs>

  <TabContent>
    {activeTab === 'info' && <InfoTab />}
    {activeTab === 'instructions' && <InstructionsTab />}
    {activeTab === 'history' && <HistoryTab />}
  </TabContent>
</ExerciseDetail>
```

### Tab 1: Info

```tsx
<InfoTab>
  <InfoRow label="Exercise Type">
    <TypeBadge>{exercise.exerciseType}</TypeBadge>
  </InfoRow>

  <InfoRow label="Metric Type">
    <MetricLabel>{exercise.metricType}</MetricLabel>
  </InfoRow>

  <InfoRow label="Primary Muscle Group">
    <MuscleGroupTag primary>{exercise.primaryMuscleGroup}</MuscleGroupTag>
  </InfoRow>

  {exercise.secondaryMuscleGroups.length > 0 && (
    <InfoRow label="Secondary Muscle Groups">
      <MuscleGroupTags>
        {exercise.secondaryMuscleGroups.map((group) => (
          <MuscleGroupTag key={group}>{group}</MuscleGroupTag>
        ))}
      </MuscleGroupTags>
    </InfoRow>
  )}

  <InfoRow label="Equipment">
    <EquipmentLabel>{exercise.equipmentType}</EquipmentLabel>
  </InfoRow>

  <InfoRow label="Movement Pattern">
    <PatternLabel>{exercise.movementPattern}</PatternLabel>
  </InfoRow>

  <InfoRow label="Difficulty">
    <DifficultyBadge level={exercise.difficultyLevel} />
  </InfoRow>

  {exercise.description && (
    <InfoRow label="Description">
      <Description>{exercise.description}</Description>
    </InfoRow>
  )}
</InfoTab>
```

### Tab 2: Instructions

```tsx
<InstructionsTab>
  {exercise.instructions && exercise.instructions.length > 0 ? (
    <InstructionsList>
      {exercise.instructions.map((instruction, index) => (
        <InstructionItem key={index}>
          <InstructionNumber>{index + 1}</InstructionNumber>
          <InstructionText>{instruction}</InstructionText>
        </InstructionItem>
      ))}
    </InstructionsList>
  ) : (
    <EmptyState>
      <Text>No instructions available for this exercise</Text>
    </EmptyState>
  )}
</InstructionsTab>
```

### Tab 3: History

```tsx
<HistoryTab>
  <HistoryList>
    {exerciseHistory.map((session) => (
      <HistoryCard key={session.id}>
        <SessionHeader>
          <SessionName>{session.workoutName || 'Unnamed Session'}</SessionName>
          <SessionDate>{formatDate(session.date)}</SessionDate>
        </SessionHeader>

        <SetsPerformed>
          {session.sets.map((set, index) => (
            <SetRow key={index}>
              <SetNumber>Set {index + 1}:</SetNumber>
              <SetData>{formatSetData(set, exercise.metricType)}</SetData>
            </SetRow>
          ))}
        </SetsPerformed>

        {session.notes && <SessionNotes>{session.notes}</SessionNotes>}
      </HistoryCard>
    ))}
  </HistoryList>

  {exerciseHistory.length === 0 && (
    <EmptyState>
      <Text>No history for this exercise yet</Text>
      <Subtitle>Complete a workout with this exercise to see your progress</Subtitle>
    </EmptyState>
  )}
</HistoryTab>
```

---

## Data Management

### Seed Script Structure

```typescript
// prisma/seeds/exercises.ts
export const CHEST_EXERCISES = [
  { name: 'Barbell Bench Press', ... },
  { name: 'Dumbbell Bench Press', ... },
  // ... 20+ chest exercises
]

export const BACK_EXERCISES = [...]
export const LEG_EXERCISES = [...]
// ... other categories

export const ALL_EXERCISES = [
  ...CHEST_EXERCISES,
  ...BACK_EXERCISES,
  ...LEG_EXERCISES,
  // ... total 200-300 exercises
]
```

### Seed Execution

```bash
npx prisma db seed
```

### Updates to Seed Library

```typescript
// To update default exercises in future
// 1. Modify seed data
// 2. Run migration to add new defaults
// 3. Existing custom exercises unaffected (isDefault: false)
```

---

**Document Version**: 1.0
**Last Updated**: 2026-01-24

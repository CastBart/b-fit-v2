# B-Fit API Specification

## Overview

B-Fit uses Next.js Server Actions as the primary API pattern, providing type-safe, server-side functions that can be called directly from client components.

---

## Server Action Structure

### Standard Pattern

```typescript
'use server'

import { auth } from '@/lib/auth/next-auth.config'
import { prisma } from '@/lib/db/prisma'
import { schema } from './schema'
import { revalidatePath } from 'next/cache'

export async function actionName(input: ActionInput): Promise<ActionResult<OutputType>> {
  // 1. Authentication
  const session = await auth()
  if (!session?.user) {
    return { success: false, error: 'Unauthorized' }
  }

  // 2. Input Validation (Zod)
  const parsed = schema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'Invalid input', details: parsed.error }
  }

  // 3. Authorization (RBAC)
  if (!hasPermission(session.user.role, 'required:permission')) {
    return { success: false, error: 'Forbidden' }
  }

  // 4. Business Logic
  try {
    const result = await performAction(parsed.data)

    // 5. Cache Revalidation
    revalidatePath('/relevant-path')

    return { success: true, data: result }
  } catch (error) {
    // 6. Error Handling
    console.error('Action failed:', error)
    return { success: false, error: 'Action failed' }
  }
}
```

### Return Type

```typescript
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; details?: unknown }
```

---

## Workout Actions

### createWorkout

**Path**: `features/workouts/actions/create-workout.ts`

```typescript
'use server'

import { z } from 'zod'

const createWorkoutSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  exercises: z.array(z.object({
    exerciseId: z.string(),
    order: z.number().int().min(0),
    groupId: z.string().optional(),
    sets: z.number().int().min(1).max(20),
    reps: z.number().int().min(1).max(100).optional(),
    weight: z.number().min(0).optional(),
    restSeconds: z.number().int().min(0).max(600).default(60)
  })).min(1)
})

export async function createWorkout(
  input: z.infer<typeof createWorkoutSchema>
): Promise<ActionResult<Workout>> {
  // Implementation
}
```

**Usage**:
```typescript
const result = await createWorkout({
  name: 'Push Day',
  exercises: [
    { exerciseId: '...', order: 0, sets: 3, reps: 10 }
  ]
})

if (result.success) {
  console.log('Workout created:', result.data)
} else {
  console.error(result.error)
}
```

---

### updateWorkout

```typescript
export async function updateWorkout(
  workoutId: string,
  updates: Partial<WorkoutInput>
): Promise<ActionResult<Workout>>
```

---

### deleteWorkout

```typescript
export async function deleteWorkout(
  workoutId: string
): Promise<ActionResult<void>>
```

---

### assignWorkoutToClient

```typescript
const assignSchema = z.object({
  workoutId: z.string(),
  clientId: z.string(),
  customizations: z.object({
    exercises: z.array(z.object({
      exerciseId: z.string(),
      sets: z.number().optional(),
      reps: z.number().optional(),
      weight: z.number().optional()
    }))
  }).optional()
})

export async function assignWorkoutToClient(
  input: z.infer<typeof assignSchema>
): Promise<ActionResult<Workout>>

// Creates a copy of workout owned by client
// Applies customizations if provided
// Returns the new workout copy
```

---

### getWorkoutById

```typescript
export async function getWorkoutById(
  workoutId: string
): Promise<ActionResult<WorkoutWithExercises>>

type WorkoutWithExercises = Workout & {
  exercises: (WorkoutExercise & {
    exercise: Exercise
  })[]
}
```

---

### listWorkouts

```typescript
type ListWorkoutsFilters = {
  isTemplate?: boolean
  createdById?: string
  copiedFromId?: string
}

export async function listWorkouts(
  filters?: ListWorkoutsFilters
): Promise<ActionResult<Workout[]>>
```

---

## Session Actions

### startSession

```typescript
const startSessionSchema = z.object({
  workoutId: z.string()
})

export async function startSession(
  input: z.infer<typeof startSessionSchema>
): Promise<ActionResult<SessionWithSets>>

// Creates new TrainingSession record
// Pre-populates expected sets based on workout template
// Returns session with instanceIds for each exercise
```

**Example Response**:
```typescript
{
  success: true,
  data: {
    id: 'session-123',
    workoutId: 'workout-456',
    status: 'IN_PROGRESS',
    startedAt: '2024-...',
    expectedExercises: [
      {
        instanceId: 'instance-1',
        exerciseId: 'ex-1',
        exercise: { name: 'Bench Press', ... },
        targetSets: 3,
        targetReps: 10,
        targetWeight: 100
      },
      // ...
    ]
  }
}
```

---

### updateSessionSet

```typescript
const updateSetSchema = z.object({
  sessionId: z.string(),
  exerciseId: z.string(),
  instanceId: z.string(),
  setNumber: z.number().int().min(1),
  reps: z.number().int().min(0).optional(),
  weight: z.number().min(0).optional(),
  duration: z.number().int().min(0).optional(),
  distance: z.number().min(0).optional(),
  notes: z.string().max(200).optional()
})

export async function updateSessionSet(
  input: z.infer<typeof updateSetSchema>
): Promise<ActionResult<SessionSet>>

// Upsert session set (idempotent by sessionId + instanceId + setNumber)
// Updates completedAt timestamp
// Returns updated set
```

---

### completeSession

```typescript
export async function completeSession(
  sessionId: string
): Promise<ActionResult<SessionSummary>>

// Marks session as COMPLETED
// Calculates total volume
// Updates exercise history (PRs, volume)
// Returns summary with stats
```

**Response**:
```typescript
type SessionSummary = {
  sessionId: string
  completedAt: string
  duration: number  // seconds
  totalVolume: number
  totalSets: number
  exercisesCompleted: number
  prsAchieved: Array<{
    exerciseId: string
    exerciseName: string
    prType: string  // "1RM", "5RM", etc.
    previousRecord: number
    newRecord: number
  }>
}
```

---

### abandonSession

```typescript
export async function abandonSession(
  sessionId: string
): Promise<ActionResult<void>>

// Marks session as ABANDONED
// Preserves completed sets
// Does not update exercise history
```

---

### syncSessionState

```typescript
const syncSchema = z.object({
  sessionId: z.string(),
  state: z.object({
    sets: z.array(z.any()),
    currentExerciseIndex: z.number(),
    timestamp: z.number()
  })
})

export async function syncSessionState(
  input: z.infer<typeof syncSchema>
): Promise<ActionResult<void>>

// Updates session.localStorageBackup
// Allows recovery on refresh
```

---

## Exercise Actions

### createExercise

```typescript
const createExerciseSchema = z.object({
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
    'WEIGHT_DURATION'
  ]),
  muscleGroups: z.array(z.string()).min(1),
  equipmentType: z.string(),
  movementPattern: z.string(),
  difficultyLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'])
})

export async function createExercise(
  input: z.infer<typeof createExerciseSchema>
): Promise<ActionResult<Exercise>>
```

---

### searchExercises

```typescript
type SearchFilters = {
  query?: string
  muscleGroups?: string[]
  equipmentType?: string
  exerciseType?: string
  difficultyLevel?: string
  includeCustom?: boolean
}

export async function searchExercises(
  filters: SearchFilters
): Promise<ActionResult<Exercise[]>>
```

---

### getExerciseHistory

```typescript
export async function getExerciseHistory(
  exerciseId: string
): Promise<ActionResult<ExerciseHistoryData>>

type ExerciseHistoryData = {
  exerciseId: string
  exerciseName: string
  lastPerformed: string | null
  personalRecords: Record<string, { weight: number; date: string }>
  volumeHistory: Array<{ week: string; volume: number }>
  recentSets: SessionSet[]
}
```

---

## User Actions

### updateProfile

```typescript
const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  image: z.string().url().optional()
})

export async function updateProfile(
  updates: z.infer<typeof updateProfileSchema>
): Promise<ActionResult<User>>
```

---

### upgradeToPT

```typescript
export async function upgradeToPT(): Promise<ActionResult<{ checkoutUrl: string }>>

// Creates Stripe checkout session for PT subscription
// Returns checkout URL for redirect
// Webhook updates user.role after payment
```

---

### inviteClient

```typescript
const inviteClientSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100)
})

export async function inviteClient(
  input: z.infer<typeof inviteClientSchema>
): Promise<ActionResult<ClientRelationship>>

// Creates user account for client (if doesn't exist)
// Creates pending ClientRelationship
// Sends invitation email
```

---

### acceptClientInvitation

```typescript
export async function acceptClientInvitation(
  relationshipId: string
): Promise<ActionResult<ClientRelationship>>

// Updates relationship status to ACTIVE
// Grants PT access to client data
```

---

### endClientRelationship

```typescript
const endRelationshipSchema = z.object({
  relationshipId: z.string(),
  convertToPersonal: z.boolean().default(false)
})

export async function endClientRelationship(
  input: z.infer<typeof endRelationshipSchema>
): Promise<ActionResult<void>>

// Marks relationship as ENDED
// If convertToPersonal, upgrades client to PERSONAL role
// Retains client's workout copies
```

---

## Analytics Actions

### getWorkoutAdherence

```typescript
type AdherenceParams = {
  userId?: string  // For PTs viewing client data
  startDate: string
  endDate: string
}

export async function getWorkoutAdherence(
  params: AdherenceParams
): Promise<ActionResult<AdherenceData>>

type AdherenceData = {
  assignedWorkouts: number
  completedSessions: number
  adherenceRate: number  // percentage
  byWeek: Array<{ week: string; rate: number }>
}
```

---

### getVolumeProgression

```typescript
export async function getVolumeProgression(
  params: {
    userId?: string
    exerciseId?: string
    startDate: string
    endDate: string
  }
): Promise<ActionResult<VolumeData>>

type VolumeData = {
  totalVolume: number
  byExercise: Array<{
    exerciseId: string
    exerciseName: string
    volume: number
  }>
  byWeek: Array<{ week: string; volume: number }>
}
```

---

### getPersonalRecords

```typescript
export async function getPersonalRecords(
  userId?: string
): Promise<ActionResult<PRData[]>>

type PRData = {
  exerciseId: string
  exerciseName: string
  records: Array<{
    repRange: string  // "1RM", "5RM", etc.
    weight: number
    achievedAt: string
  }>
}
```

---

## Message Actions

### sendMessage

```typescript
const sendMessageSchema = z.object({
  recipientId: z.string(),
  content: z.string().min(1).max(2000),
  workoutId: z.string().optional(),
  sessionId: z.string().optional(),
  planId: z.string().optional(),
  mediaUrl: z.string().url().optional()
})

export async function sendMessage(
  input: z.infer<typeof sendMessageSchema>
): Promise<ActionResult<Message>>
```

---

### getConversation

```typescript
export async function getConversation(
  otherUserId: string,
  options?: {
    limit?: number
    before?: string  // cursor-based pagination
  }
): Promise<ActionResult<ConversationData>>

type ConversationData = {
  messages: Message[]
  hasMore: boolean
  nextCursor?: string
}
```

---

### uploadMedia

```typescript
export async function uploadMedia(
  formData: FormData
): Promise<ActionResult<{ url: string }>>

// Uploads file to Vercel Blob
// Returns blob URL
// Max size: 10MB
// Allowed types: image/*, video/*
```

---

## Subscription Actions

### createCheckoutSession

```typescript
const checkoutSchema = z.object({
  priceId: z.string(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url()
})

export async function createCheckoutSession(
  input: z.infer<typeof checkoutSchema>
): Promise<ActionResult<{ checkoutUrl: string }>>
```

---

### manageBilling

```typescript
export async function manageBilling(): Promise<ActionResult<{ portalUrl: string }>>

// Creates Stripe customer portal session
// Returns portal URL for redirect
```

---

### upgradeSubscription

```typescript
export async function upgradeSubscription(
  newPriceId: string
): Promise<ActionResult<Subscription>>

// Updates Stripe subscription
// Prorates charges
// Updates local subscription record
```

---

## Error Handling

### Standard Error Codes

```typescript
const ERROR_CODES = {
  UNAUTHORIZED: 'User not authenticated',
  FORBIDDEN: 'User lacks required permissions',
  NOT_FOUND: 'Resource not found',
  INVALID_INPUT: 'Input validation failed',
  CONFLICT: 'Resource conflict (e.g., duplicate)',
  RATE_LIMIT: 'Rate limit exceeded',
  INTERNAL: 'Internal server error'
} as const
```

### Error Response Format

```typescript
{
  success: false,
  error: 'Human-readable error message',
  code: 'ERROR_CODE',
  details?: ZodError | unknown
}
```

---

## Testing Server Actions

### Unit Test Example

```typescript
// features/workouts/actions/create-workout.test.ts
import { createWorkout } from './create-workout'
import { prismaMock } from '@/lib/db/prisma.mock'

describe('createWorkout', () => {
  it('creates workout with exercises', async () => {
    prismaMock.workout.create.mockResolvedValue({
      id: '1',
      name: 'Test Workout',
      ...
    })

    const result = await createWorkout({
      name: 'Test Workout',
      exercises: [{ exerciseId: '1', sets: 3, reps: 10, order: 0 }]
    })

    expect(result.success).toBe(true)
    expect(result.data.name).toBe('Test Workout')
  })

  it('rejects invalid input', async () => {
    const result = await createWorkout({ name: '', exercises: [] })

    expect(result.success).toBe(false)
    expect(result.error).toContain('Invalid input')
  })
})
```

---

**Document Version**: 1.0
**Last Updated**: 2026-01-24

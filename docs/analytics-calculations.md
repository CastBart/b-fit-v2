# B-Fit Analytics Calculations Specification

## Overview

This document defines the formulas and algorithms for all analytics metrics in B-Fit.

---

## 1. Volume Calculation

### Total Volume

**Formula**:

```
Volume = Σ (weight × reps) for all sets
```

**Implementation**:

```typescript
function calculateTotalVolume(sets: SessionSet[]): number {
  return sets.reduce((total, set) => {
    // Only count sets with both weight and reps
    if (set.weight && set.reps) {
      return total + set.weight * set.reps
    }
    return total
  }, 0)
}
```

**Example**:

```
Sets:
  Set 1: 100kg × 10 reps = 1000kg
  Set 2: 100kg × 8 reps = 800kg
  Set 3: 100kg × 6 reps = 600kg

Total Volume = 1000 + 800 + 600 = 2400kg
```

---

### Volume by Exercise

**Formula**:

```
VolumePerExercise = Σ (weight × reps) for sets of specific exercise
```

**Implementation**:

```typescript
function calculateVolumeByExercise(session: TrainingSession): Record<string, number> {
  const volumeMap: Record<string, number> = {}

  session.sets.forEach((set) => {
    if (!volumeMap[set.exerciseId]) {
      volumeMap[set.exerciseId] = 0
    }

    if (set.weight && set.reps) {
      volumeMap[set.exerciseId] += set.weight * set.reps
    }
  })

  return volumeMap
}
```

---

### Volume Progression (Time Series)

**Formula**:

```
WeeklyVolume = Σ (total session volume) for sessions in week
```

**Implementation**:

```typescript
function calculateVolumeProgression(
  sessions: TrainingSession[],
  startDate: Date,
  endDate: Date
): Array<{ week: string; volume: number }> {
  const weeklyVolume: Map<string, number> = new Map()

  sessions
    .filter((session) => session.completedAt >= startDate && session.completedAt <= endDate)
    .forEach((session) => {
      const weekKey = getWeekKey(session.completedAt) // e.g., "2024-W01"

      const currentVolume = weeklyVolume.get(weekKey) || 0
      weeklyVolume.set(weekKey, currentVolume + (session.totalVolume || 0))
    })

  return Array.from(weeklyVolume.entries())
    .map(([week, volume]) => ({ week, volume }))
    .sort((a, b) => a.week.localeCompare(b.week))
}

function getWeekKey(date: Date): string {
  const year = date.getFullYear()
  const weekNumber = getWeekNumber(date)
  return `${year}-W${String(weekNumber).padStart(2, '0')}`
}

function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
}
```

---

## 2. Personal Records (PRs)

### PR Detection Algorithm

**Approach**: Track max weight for different rep ranges

**Rep Range Buckets**:

- 1RM: 1 rep
- 3RM: 2-3 reps
- 5RM: 4-6 reps
- 10RM: 7-12 reps
- 15RM: 13-20 reps
- 20RM+: 20+ reps

**Implementation**:

```typescript
type RepRange = '1RM' | '3RM' | '5RM' | '10RM' | '15RM' | '20RM+'

function getRepRange(reps: number): RepRange {
  if (reps === 1) return '1RM'
  if (reps <= 3) return '3RM'
  if (reps <= 6) return '5RM'
  if (reps <= 12) return '10RM'
  if (reps <= 20) return '15RM'
  return '20RM+'
}

interface PRRecord {
  weight: number
  reps: number
  achievedAt: Date
  sessionId: string
}

type PRHistory = Record<RepRange, PRRecord>

async function detectPRs(
  userId: string,
  exerciseId: string,
  completedSets: SessionSet[]
): Promise<Array<{ repRange: RepRange; newRecord: PRRecord; previousRecord: PRRecord | null }>> {
  // Get existing PR history
  const history = await getExerciseHistory(userId, exerciseId)
  const currentPRs: PRHistory = history.personalRecords || {}

  const newPRs: Array<{
    repRange: RepRange
    newRecord: PRRecord
    previousRecord: PRRecord | null
  }> = []

  // Group sets by rep range
  completedSets.forEach((set) => {
    if (!set.weight || !set.reps) return

    const repRange = getRepRange(set.reps)
    const currentPR = currentPRs[repRange]

    // Check if this is a new PR
    if (!currentPR || set.weight > currentPR.weight) {
      newPRs.push({
        repRange,
        newRecord: {
          weight: set.weight,
          reps: set.reps,
          achievedAt: set.completedAt!,
          sessionId: set.sessionId,
        },
        previousRecord: currentPR || null,
      })

      // Update current PRs for subsequent checks in this session
      currentPRs[repRange] = {
        weight: set.weight,
        reps: set.reps,
        achievedAt: set.completedAt!,
        sessionId: set.sessionId,
      }
    }
  })

  return newPRs
}
```

---

### Estimated 1RM (Epley Formula)

**Formula**:

```
1RM = weight × (1 + reps / 30)
```

**Implementation**:

```typescript
function calculateEstimated1RM(weight: number, reps: number): number {
  if (reps === 1) return weight

  // Epley formula
  const estimated = weight * (1 + reps / 30)

  // Round to nearest 0.5kg
  return Math.round(estimated * 2) / 2
}
```

**Example**:

```
Set: 100kg × 5 reps
1RM = 100 × (1 + 5 / 30)
    = 100 × 1.1667
    = 116.67kg
    ≈ 116.5kg (rounded)
```

---

## 3. Workout Adherence

### Adherence Rate

**Formula**:

```
Adherence = (Completed Sessions / Assigned Workouts) × 100
```

**Implementation**:

```typescript
async function calculateWorkoutAdherence(
  clientId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  adherenceRate: number
  completedSessions: number
  assignedWorkouts: number
}> {
  // Count assigned workouts in period
  const assignedWorkouts = await prisma.workout.count({
    where: {
      createdById: clientId, // Assigned workouts are copied to client
      copiedFromId: { not: null }, // Only count assigned (not self-created)
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
  })

  // Count completed sessions for assigned workouts
  const completedSessions = await prisma.trainingSession.count({
    where: {
      userId: clientId,
      status: 'COMPLETED',
      completedAt: {
        gte: startDate,
        lte: endDate,
      },
      workout: {
        copiedFromId: { not: null },
      },
    },
  })

  const adherenceRate = assignedWorkouts > 0 ? (completedSessions / assignedWorkouts) * 100 : 0

  return {
    adherenceRate: Math.round(adherenceRate * 10) / 10, // Round to 1 decimal
    completedSessions,
    assignedWorkouts,
  }
}
```

**Example**:

```
Assigned Workouts: 12 (3 per week, 4 weeks)
Completed Sessions: 10

Adherence = (10 / 12) × 100 = 83.3%
```

---

### Weekly Adherence Breakdown

**Implementation**:

```typescript
function calculateWeeklyAdherence(
  sessions: TrainingSession[],
  assignments: Workout[]
): Array<{ week: string; rate: number }> {
  const weeklyData = new Map<string, { completed: number; assigned: number }>()

  // Group assignments by week
  assignments.forEach((assignment) => {
    const week = getWeekKey(assignment.createdAt)
    const current = weeklyData.get(week) || { completed: 0, assigned: 0 }
    weeklyData.set(week, { ...current, assigned: current.assigned + 1 })
  })

  // Count completed sessions by week
  sessions
    .filter((s) => s.status === 'COMPLETED')
    .forEach((session) => {
      const week = getWeekKey(session.completedAt!)
      const current = weeklyData.get(week) || { completed: 0, assigned: 0 }
      weeklyData.set(week, { ...current, completed: current.completed + 1 })
    })

  // Calculate rates
  return Array.from(weeklyData.entries())
    .map(([week, data]) => ({
      week,
      rate: data.assigned > 0 ? (data.completed / data.assigned) * 100 : 0,
    }))
    .sort((a, b) => a.week.localeCompare(b.week))
}
```

---

## 4. Session Frequency

### Sessions Per Week

**Formula**:

```
Frequency = Total Sessions / Number of Weeks
```

**Implementation**:

```typescript
function calculateSessionFrequency(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  sessionsPerWeek: number
  totalSessions: number
  weeks: number
}> {
  const sessions = await prisma.trainingSession.count({
    where: {
      userId,
      status: 'COMPLETED',
      completedAt: {
        gte: startDate,
        lte: endDate,
      },
    },
  })

  // Calculate number of weeks
  const weeks = Math.ceil((endDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000))

  const sessionsPerWeek = weeks > 0 ? sessions / weeks : 0

  return {
    sessionsPerWeek: Math.round(sessionsPerWeek * 10) / 10,
    totalSessions: sessions,
    weeks,
  }
}
```

---

### Consistency Score

**Formula**:

```
Consistency = (Weeks with ≥1 session / Total Weeks) × 100
```

**Implementation**:

```typescript
function calculateConsistencyScore(
  sessions: TrainingSession[],
  startDate: Date,
  endDate: Date
): number {
  const weeksWithSessions = new Set<string>()

  sessions.forEach((session) => {
    if (session.status === 'COMPLETED' && session.completedAt) {
      weeksWithSessions.add(getWeekKey(session.completedAt))
    }
  })

  const totalWeeks = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
  )

  const consistency = (weeksWithSessions.size / totalWeeks) * 100

  return Math.round(consistency)
}
```

**Example**:

```
Total Weeks: 12
Weeks with ≥1 session: 10

Consistency = (10 / 12) × 100 = 83%
```

---

## 5. Exercise Distribution

### Muscle Group Coverage

**Implementation**:

```typescript
function calculateMuscleGroupDistribution(
  sessions: TrainingSession[]
): Record<MuscleGroup, number> {
  const distribution: Record<MuscleGroup, number> = {}

  sessions.forEach((session) => {
    session.workout.exercises.forEach((we) => {
      we.exercise.muscleGroups.forEach((muscleGroup) => {
        distribution[muscleGroup] = (distribution[muscleGroup] || 0) + 1
      })
    })
  })

  return distribution
}
```

---

### Volume by Muscle Group

**Implementation**:

```typescript
function calculateVolumeByMuscleGroup(sessions: TrainingSession[]): Record<MuscleGroup, number> {
  const volumeByMuscle: Record<MuscleGroup, number> = {}

  sessions.forEach((session) => {
    session.sets.forEach((set) => {
      if (set.weight && set.reps) {
        const volume = set.weight * set.reps

        set.exercise.muscleGroups.forEach((muscleGroup) => {
          volumeByMuscle[muscleGroup] = (volumeByMuscle[muscleGroup] || 0) + volume
        })
      }
    })
  })

  return volumeByMuscle
}
```

---

## 6. Organisation Aggregates

### Aggregate Client Adherence

**Formula**:

```
OrgAdherence = Σ (Client Adherence) / Number of Clients
```

**Implementation**:

```typescript
async function calculateOrgAdherence(
  orgId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  averageAdherence: number
  clientBreakdown: Array<{ clientId: string; adherence: number }>
}> {
  // Get all PTs in org
  const pts = await prisma.user.findMany({
    where: { orgId, role: 'PT' },
    include: {
      clients: {
        where: { status: 'ACTIVE' },
        include: { client: true },
      },
    },
  })

  // Calculate adherence for each client
  const clientAdherence: Array<{ clientId: string; adherence: number }> = []

  for (const pt of pts) {
    for (const relationship of pt.clients) {
      const { adherenceRate } = await calculateWorkoutAdherence(
        relationship.clientId,
        startDate,
        endDate
      )

      clientAdherence.push({
        clientId: relationship.clientId,
        adherence: adherenceRate,
      })
    }
  }

  const averageAdherence =
    clientAdherence.length > 0
      ? clientAdherence.reduce((sum, c) => sum + c.adherence, 0) / clientAdherence.length
      : 0

  return {
    averageAdherence: Math.round(averageAdherence * 10) / 10,
    clientBreakdown: clientAdherence,
  }
}
```

---

### Aggregate Volume

**Implementation**:

```typescript
async function calculateOrgTotalVolume(
  orgId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  totalVolume: number
  averageVolumePerClient: number
}> {
  const sessions = await prisma.trainingSession.findMany({
    where: {
      user: {
        trainers: {
          some: {
            pt: { orgId },
            status: 'ACTIVE',
          },
        },
      },
      status: 'COMPLETED',
      completedAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      totalVolume: true,
      userId: true,
    },
  })

  const totalVolume = sessions.reduce((sum, s) => sum + (s.totalVolume || 0), 0)

  const uniqueClients = new Set(sessions.map((s) => s.userId)).size

  return {
    totalVolume,
    averageVolumePerClient: uniqueClients > 0 ? totalVolume / uniqueClients : 0,
  }
}
```

---

## 7. Performance Trends

### Relative Strength (Wilks Score)

**Formula** (Simplified):

```
Wilks = (Weight Lifted) / (Body Weight Factor)
```

**Note**: Full Wilks calculation requires body weight and complex coefficients. Simplified version for tracking relative strength trends.

---

### Strength Progress Rate

**Formula**:

```
Progress Rate = (Current 1RM - Starting 1RM) / Starting 1RM × 100
```

**Implementation**:

```typescript
function calculateStrengthProgress(exerciseId: string, history: ExerciseHistory): number {
  const records = Object.values(history.personalRecords || {}).sort(
    (a, b) => new Date(a.achievedAt).getTime() - new Date(b.achievedAt).getTime()
  )

  if (records.length < 2) return 0

  const first = records[0]
  const latest = records[records.length - 1]

  const firstEstimated1RM = calculateEstimated1RM(first.weight, first.reps)
  const latestEstimated1RM = calculateEstimated1RM(latest.weight, latest.reps)

  const progressRate = ((latestEstimated1RM - firstEstimated1RM) / firstEstimated1RM) * 100

  return Math.round(progressRate * 10) / 10
}
```

**Example**:

```
Starting: 100kg × 5 reps → Estimated 1RM: 116.5kg
Current: 110kg × 5 reps → Estimated 1RM: 128kg

Progress = (128 - 116.5) / 116.5 × 100 = 9.9%
```

---

## 8. Data Aggregation Strategy

### Exercise History Update

**Trigger**: On session completion

**Process**:

```typescript
async function updateExerciseHistory(userId: string, sessionId: string) {
  const session = await prisma.trainingSession.findUnique({
    where: { id: sessionId },
    include: {
      sets: {
        include: { exercise: true },
      },
    },
  })

  // Group sets by exercise
  const setsByExercise = groupBy(session.sets, 'exerciseId')

  for (const [exerciseId, sets] of Object.entries(setsByExercise)) {
    // Detect PRs
    const prs = await detectPRs(userId, exerciseId, sets)

    // Calculate volume for this session
    const volumeThisSession = calculateTotalVolume(sets)
    const weekKey = getWeekKey(session.completedAt!)

    // Upsert exercise history
    await prisma.exerciseHistory.upsert({
      where: {
        userId_exerciseId: {
          userId,
          exerciseId,
        },
      },
      create: {
        userId,
        exerciseId,
        personalRecords: prs.reduce(
          (acc, pr) => ({
            ...acc,
            [pr.repRange]: pr.newRecord,
          }),
          {}
        ),
        volumeHistory: [{ week: weekKey, volume: volumeThisSession }],
        lastPerformed: session.completedAt,
      },
      update: {
        personalRecords: {
          /* merge new PRs */
        },
        volumeHistory: {
          /* append week volume */
        },
        lastPerformed: session.completedAt,
      },
    })
  }
}
```

---

## 9. Caching Strategy

### Cache Keys

```typescript
// Cache expensive calculations
const cacheKeys = {
  adherence: (userId: string, start: string, end: string) => `adherence:${userId}:${start}:${end}`,

  volume: (userId: string, start: string, end: string) => `volume:${userId}:${start}:${end}`,

  prs: (userId: string, exerciseId: string) => `prs:${userId}:${exerciseId}`,
}
```

### Cache Invalidation

```typescript
// Invalidate on session completion
async function onSessionComplete(sessionId: string) {
  const session = await getSession(sessionId)

  // Invalidate user's analytics cache
  await cache.del(`adherence:${session.userId}:*`)
  await cache.del(`volume:${session.userId}:*`)

  // Invalidate exercise PR cache
  const exerciseIds = session.sets.map((s) => s.exerciseId)
  for (const exerciseId of exerciseIds) {
    await cache.del(`prs:${session.userId}:${exerciseId}`)
  }
}
```

---

**Document Version**: 1.0
**Last Updated**: 2026-01-24

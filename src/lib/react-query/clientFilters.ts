/**
 * Client-side filtering and pagination utilities.
 *
 * When all data is cached under a single "all" key, page-level query
 * hooks use these functions to slice/filter/paginate in-memory rather
 * than firing a server action per page.
 */

import type { Exercise } from '@prisma/client'
import type { ExerciseListResponse } from '@/types/exercise'
import type { ExerciseFiltersInput } from '@/lib/validations/exercise'
import type { WorkoutListResponse } from '@/types/workout'
import type { WorkoutFiltersInput } from '@/lib/validations/workout'
import type { PlanFiltersInput } from '@/lib/validations/plan'
import type { SessionFiltersInput } from '@/lib/validations/session'
import type { PlanListResponse, SessionListResponse } from '@/types/sync'

// ---------------------------------------------------------------------------
// Exercises
// ---------------------------------------------------------------------------

export function filterExercises(
  all: ExerciseListResponse,
  filters: Partial<ExerciseFiltersInput>,
): ExerciseListResponse {
  let items = all.exercises as Exercise[]

  if (filters.search) {
    const q = filters.search.toLowerCase()
    items = items.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (e.description && e.description.toLowerCase().includes(q)),
    )
  }

  if (filters.primaryMuscleGroups?.length) {
    const set = new Set(filters.primaryMuscleGroups)
    items = items.filter((e) => set.has(e.primaryMuscleGroup))
  }

  if (filters.equipmentTypes?.length) {
    const set = new Set(filters.equipmentTypes)
    items = items.filter((e) => set.has(e.equipmentType))
  }

  if (filters.exerciseTypes?.length) {
    const set = new Set(filters.exerciseTypes)
    items = items.filter((e) => set.has(e.exerciseType))
  }

  if (filters.difficultyLevels?.length) {
    const set = new Set(filters.difficultyLevels)
    items = items.filter((e) => set.has(e.difficultyLevel))
  }

  if (filters.movementPatterns?.length) {
    const set = new Set(filters.movementPatterns)
    items = items.filter((e) => set.has(e.movementPattern))
  }

  if (typeof filters.isDefault === 'boolean') {
    items = items.filter((e) => e.isDefault === filters.isDefault)
  }

  if (typeof filters.isPublic === 'boolean') {
    items = items.filter((e) => e.isPublic === filters.isPublic)
  }

  if (filters.createdById) {
    items = items.filter((e) => e.createdById === filters.createdById)
  }

  const page = filters.page ?? 1
  const limit = filters.limit ?? 20
  const start = (page - 1) * limit
  const paged = items.slice(start, start + limit)

  return {
    exercises: paged,
    total: items.length,
    page,
    limit,
    totalPages: Math.ceil(items.length / limit) || 1,
  }
}

// ---------------------------------------------------------------------------
// Workouts
// ---------------------------------------------------------------------------

export function filterWorkouts(
  all: WorkoutListResponse,
  filters: Partial<WorkoutFiltersInput>,
): WorkoutListResponse {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let items = all.workouts as any[]

  if (filters.search) {
    const q = filters.search.toLowerCase()
    items = items.filter(
      (w) =>
        w.name?.toLowerCase().includes(q) ||
        (w.description && w.description.toLowerCase().includes(q)),
    )
  }

  const page = filters.page ?? 1
  const limit = filters.limit ?? 12
  const start = (page - 1) * limit
  const paged = items.slice(start, start + limit)

  return {
    workouts: paged,
    total: items.length,
    page,
    limit,
    totalPages: Math.ceil(items.length / limit) || 1,
  }
}

// ---------------------------------------------------------------------------
// Plans
// ---------------------------------------------------------------------------

export function filterPlans(
  all: PlanListResponse,
  filters: Partial<PlanFiltersInput>,
): PlanListResponse {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let items = all.plans as any[]

  if (filters.search) {
    const q = filters.search.toLowerCase()
    items = items.filter((p) => {
      return (
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q))
      )
    })
  }

  if (typeof filters.isActive === 'boolean') {
    items = items.filter((p) => p.isActive === filters.isActive)
  }

  const page = filters.page ?? 1
  const limit = filters.limit ?? 12
  const start = (page - 1) * limit
  const paged = items.slice(start, start + limit)

  return {
    plans: paged,
    total: items.length,
    page,
    limit,
    totalPages: Math.ceil(items.length / limit) || 1,
  }
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export function filterSessions(
  all: SessionListResponse,
  filters: Partial<SessionFiltersInput>,
): SessionListResponse {
  let items = all.sessions

  if (filters.search) {
    const q = filters.search.toLowerCase()
    items = items.filter((s) => s.name && s.name.toLowerCase().includes(q))
  }

  if (filters.status) {
    items = items.filter((s) => s.status === filters.status)
  }

  if (filters.workoutId) {
    items = items.filter((s) => s.workoutId === filters.workoutId)
  }

  if (filters.startDate) {
    const start = new Date(filters.startDate)
    items = items.filter((s) => new Date(s.startedAt) >= start)
  }

  if (filters.endDate) {
    const end = new Date(filters.endDate)
    items = items.filter((s) => new Date(s.startedAt) <= end)
  }

  const page = filters.page ?? 1
  const limit = filters.limit ?? 12
  const start = (page - 1) * limit
  const paged = items.slice(start, start + limit)

  return {
    sessions: paged,
    total: items.length,
    page,
    totalPages: Math.ceil(items.length / limit) || 1,
  }
}

import { z } from 'zod'
import { SessionStatus } from '@/types/session'

// ============================================================================
// SESSION VALIDATION SCHEMAS
// ============================================================================

/**
 * Schema for saving a completed session (the single write operation)
 */
export const saveSessionSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID'),
  workoutId: z.string().cuid('Invalid workout ID').nullable(),
  workoutName: z.string().min(1).max(100),
  planId: z.string().cuid('Invalid plan ID').nullable().optional(),
  planDayId: z.string().cuid('Invalid plan day ID').nullable().optional(),
  startTime: z.number().int().positive(),
  completeTime: z.number().int().positive(),
  accumulatedPauseDuration: z.number().int().min(0),
  status: z.nativeEnum(SessionStatus),
  sessionNotes: z.string().max(1000).nullable(),
  exercises: z.array(
    z.object({
      instanceId: z.string().uuid('Invalid instance ID'),
      exerciseId: z.string().cuid('Invalid exercise ID'),
      order: z.number().int().min(0),
      groupId: z.string().uuid().nullable(),
      targetSets: z.number().int().min(1).max(20),
      targetReps: z.number().int().min(1).max(999).nullable(),
      targetWeight: z.number().min(0).max(9999).nullable(),
      targetRestSeconds: z.number().int().min(0).max(600),
      notes: z.string().max(500).nullable(),
      sets: z.array(
        z.object({
          setNumber: z.number().int().min(1),
          weight: z.number().min(0).max(9999).nullable(),
          reps: z.number().int().min(1).max(999).nullable(),
          duration: z.number().int().min(1).max(86400).nullable(), // Max 24 hours
          distance: z.number().int().min(1).max(999999).nullable(), // Max ~999 km
          counterWeight: z.number().min(0).max(9999).nullable(),
          isCompleted: z.boolean(),
          completedAt: z.number().int().positive().nullable(),
        })
      ),
    })
  ),
})

/**
 * Schema for getting a session by ID
 */
export const getSessionByIdSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
})

/**
 * Schema for filtering sessions list
 */
export const sessionFiltersSchema = z.object({
  status: z.nativeEnum(SessionStatus).optional(),
  workoutId: z.string().cuid().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  search: z.string().max(100).optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
})

/**
 * Schema for getting exercise history
 */
export const getExerciseHistorySchema = z.object({
  exerciseId: z.string().cuid('Invalid exercise ID'),
  limit: z.number().int().min(1).max(50).optional().default(10),
})

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type SaveSessionInput = z.infer<typeof saveSessionSchema>
export type GetSessionByIdInput = z.infer<typeof getSessionByIdSchema>
export type SessionFiltersInput = z.infer<typeof sessionFiltersSchema>
export type GetExerciseHistoryInput = z.input<typeof getExerciseHistorySchema>

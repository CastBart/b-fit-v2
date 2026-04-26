import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { auth } from '@/lib/auth/auth.config'
import {
  workoutService,
  WorkoutNotFoundError,
  WorkoutOwnershipError,
} from '@/server/services/workouts'
import { offlineSyncWorkoutExercisesSchema } from '@/lib/validations/workout'

function errorResponse(error: unknown, fallback: string) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { success: false, error: 'Invalid workout exercises payload', issues: error.issues },
      { status: 400 }
    )
  }
  if (error instanceof WorkoutNotFoundError) {
    return NextResponse.json({ success: false, error: error.message }, { status: 404 })
  }
  if (error instanceof WorkoutOwnershipError) {
    return NextResponse.json({ success: false, error: error.message }, { status: 403 })
  }
  console.error(fallback, error)
  return NextResponse.json(
    {
      success: false,
      error: error instanceof Error ? error.message : fallback,
    },
    { status: 500 }
  )
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = offlineSyncWorkoutExercisesSchema.parse(await req.json())
    const result = await workoutService.syncExercises(session.user.id, body)
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    return errorResponse(error, 'POST /api/offline/workouts/exercises failed')
  }
}

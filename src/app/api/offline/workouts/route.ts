import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { auth } from '@/lib/auth/auth.config'
import { requirePermission } from '@/lib/auth/rbac'
import {
  workoutService,
  WorkoutNotFoundError,
  WorkoutOwnershipError,
} from '@/server/services/workouts'
import {
  offlineWorkoutCreateSchema,
  offlineWorkoutUpdateSchema,
  offlineWorkoutDeleteSchema,
} from '@/lib/validations/workout'

function errorResponse(error: unknown, fallback: string) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { success: false, error: 'Invalid workout payload', issues: error.issues },
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
    const authResult = await requirePermission('workout:create')
    if (!authResult.success) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: 403 })
    }

    const body = offlineWorkoutCreateSchema.parse(await req.json())
    const workout = await workoutService.create(authResult.userId, body)
    return NextResponse.json({ success: true, data: workout })
  } catch (error) {
    return errorResponse(error, 'POST /api/offline/workouts failed')
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id, input } = offlineWorkoutUpdateSchema.parse(await req.json())
    const workout = await workoutService.update(session.user.id, id, input)
    return NextResponse.json({ success: true, data: workout })
  } catch (error) {
    return errorResponse(error, 'PATCH /api/offline/workouts failed')
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = offlineWorkoutDeleteSchema.parse(await req.json())
    await workoutService.delete(session.user.id, id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return errorResponse(error, 'DELETE /api/offline/workouts failed')
  }
}

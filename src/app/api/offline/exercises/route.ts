import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { auth } from '@/lib/auth/auth.config'
import { requirePermission } from '@/lib/auth/rbac'
import {
  exerciseService,
  ExerciseNotFoundError,
  ExerciseOwnershipError,
  DefaultExerciseImmutableError,
} from '@/server/services/exercises'
import type { CreateExerciseInput, UpdateExerciseInput } from '@/lib/validations/exercise'

function errorResponse(error: unknown, fallback: string) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { success: false, error: 'Invalid exercise payload', issues: error.issues },
      { status: 400 }
    )
  }
  if (error instanceof ExerciseNotFoundError) {
    return NextResponse.json({ success: false, error: error.message }, { status: 404 })
  }
  if (error instanceof ExerciseOwnershipError) {
    return NextResponse.json({ success: false, error: error.message }, { status: 403 })
  }
  if (error instanceof DefaultExerciseImmutableError) {
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
    const authResult = await requirePermission('exercise:create')
    if (!authResult.success) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: 403 })
    }

    const body = (await req.json()) as CreateExerciseInput
    const exercise = await exerciseService.create(authResult.userId, body)
    return NextResponse.json({ success: true, data: exercise })
  } catch (error) {
    return errorResponse(error, 'POST /api/offline/exercises failed')
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id, input } = (await req.json()) as { id: string; input: UpdateExerciseInput }
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing exercise id' }, { status: 400 })
    }

    const exercise = await exerciseService.update(session.user.id, id, input)
    return NextResponse.json({ success: true, data: exercise })
  } catch (error) {
    return errorResponse(error, 'PATCH /api/offline/exercises failed')
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = (await req.json()) as { id: string }
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing exercise id' }, { status: 400 })
    }

    await exerciseService.delete(session.user.id, id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return errorResponse(error, 'DELETE /api/offline/exercises failed')
  }
}

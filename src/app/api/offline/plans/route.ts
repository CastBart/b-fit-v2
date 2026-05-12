import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { auth } from '@/lib/auth/auth.config'
import { requirePermission } from '@/lib/auth/rbac'
import {
  planService,
  PlanNotFoundError,
  PlanOwnershipError,
  PlanWeekNotFoundError,
} from '@/server/services/plans'
import {
  offlinePlanCreateSchema,
  offlinePlanUpdateSchema,
  offlinePlanDeleteSchema,
} from '@/lib/validations/plan'

function errorResponse(error: unknown, fallback: string) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { success: false, error: 'Invalid plan payload', issues: error.issues },
      { status: 400 }
    )
  }
  if (error instanceof PlanNotFoundError) {
    return NextResponse.json({ success: false, error: error.message }, { status: 404 })
  }
  if (error instanceof PlanOwnershipError) {
    return NextResponse.json({ success: false, error: error.message }, { status: 403 })
  }
  if (error instanceof PlanWeekNotFoundError) {
    return NextResponse.json({ success: false, error: error.message }, { status: 409 })
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
    const authResult = await requirePermission('plan:create')
    if (!authResult.success) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: 403 })
    }

    const body = offlinePlanCreateSchema.parse(await req.json())
    const plan = await planService.create(authResult.userId, body)
    return NextResponse.json({ success: true, data: plan })
  } catch (error) {
    return errorResponse(error, 'POST /api/offline/plans failed')
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id, input } = offlinePlanUpdateSchema.parse(await req.json())
    const plan = await planService.update(session.user.id, id, input)
    return NextResponse.json({ success: true, data: plan })
  } catch (error) {
    return errorResponse(error, 'PATCH /api/offline/plans failed')
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = offlinePlanDeleteSchema.parse(await req.json())
    await planService.delete(session.user.id, id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return errorResponse(error, 'DELETE /api/offline/plans failed')
  }
}

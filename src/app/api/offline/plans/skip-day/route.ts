import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { auth } from '@/lib/auth/auth.config'
import {
  planService,
  PlanNotFoundError,
  PlanOwnershipError,
  PlanWeekNotFoundError,
} from '@/server/services/plans'
import { offlineSkipPlanDaySchema } from '@/lib/validations/plan'

function errorResponse(error: unknown, fallback: string) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { success: false, error: 'Invalid skip-day payload', issues: error.issues },
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
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = offlineSkipPlanDaySchema.parse(await req.json())
    await planService.skipDay(session.user.id, body)
    return NextResponse.json({ success: true })
  } catch (error) {
    return errorResponse(error, 'POST /api/offline/plans/skip-day failed')
  }
}

import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { auth } from '@/lib/auth/auth.config'
import { planService, PlanNotFoundError, PlanOwnershipError } from '@/server/services/plans'
import { offlinePlanActivateSchema } from '@/lib/validations/plan'

function errorResponse(error: unknown, fallback: string) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { success: false, error: 'Invalid activate payload', issues: error.issues },
      { status: 400 }
    )
  }
  if (error instanceof PlanNotFoundError) {
    return NextResponse.json({ success: false, error: error.message }, { status: 404 })
  }
  if (error instanceof PlanOwnershipError) {
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

    const { id } = offlinePlanActivateSchema.parse(await req.json())
    await planService.activate(session.user.id, id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return errorResponse(error, 'POST /api/offline/plans/activate failed')
  }
}

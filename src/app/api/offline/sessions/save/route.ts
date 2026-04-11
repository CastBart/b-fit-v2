import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { auth } from '@/lib/auth/auth.config'
import { sessionService } from '@/server/services/sessions'
import type { SaveSessionPayload } from '@/types/session'

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const payload = (await req.json()) as SaveSessionPayload
    const trainingSession = await sessionService.save(session.user.id, payload)

    return NextResponse.json({ success: true, data: trainingSession.id })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid session payload', issues: error.issues },
        { status: 400 }
      )
    }
    console.error('POST /api/offline/sessions/save failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save session',
      },
      { status: 500 }
    )
  }
}

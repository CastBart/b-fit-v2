'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppSelector } from '@/store/hooks'
import { shouldShowContinueButton } from './continue-session-button.helpers'

export function ContinueSessionButton() {
  const router = useRouter()
  const pathname = usePathname()
  const isActive = useAppSelector((state) => state.session.isActive)
  const isStarting = useAppSelector((state) => state.session.isStarting)
  const workoutName = useAppSelector((state) => state.session.workoutName)

  // Warm the /session route on every dashboard page. Measurements showed the
  // dominant session-start cost (~900ms) is the navigation→mount gap for this
  // heavy client route, not data loading. This component is mounted by the
  // dashboard layout everywhere a session can be started, so prefetching here
  // covers all entry points (dashboard, workouts, plans, sessions) in one
  // place. router.prefetch is cached/idempotent, so repeated calls are cheap.
  useEffect(() => {
    if (pathname !== '/session') router.prefetch('/session')
  }, [router, pathname])

  // Hide while a session is still spinning up: `startSession` sets
  // isActive=true before `router.push('/session')` resolves, so without the
  // isStarting guard this button briefly flashes on the originating page
  // during the navigation gap. `sessionViewLoaded()` clears isStarting once
  // the session page is ready.
  if (!shouldShowContinueButton({ isActive, isStarting, pathname })) return null

  return (
    <Button
      onClick={() => router.push('/session')}
      className="fixed left-1/2 -translate-x-1/2 bottom-20 md:bottom-6 z-40 shadow-lg"
      size="lg"
    >
      <Play className="mr-2 h-4 w-4" />
      {workoutName || 'Continue Session'}
    </Button>
  )
}

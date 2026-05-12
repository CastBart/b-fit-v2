'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { emitter } from '@/lib/pwa/emitter'

// When a workout's tempId is reconciled to a real id, swap the URL if
// the user is currently on /workouts/<tempId> or
// /workouts/builder/<tempId> so future refreshes/back-nav use the real
// id (which is the only one the server knows about).
//
// Lives inside the React tree so it can call router.replace; the
// rewriter module itself runs outside React.
export function useWorkoutTempIdRedirect(): void {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const unsubscribe = emitter.on('workoutIdRewritten', ({ from, to }) => {
      if (!pathname) return
      if (!pathname.includes(from)) return
      router.replace(pathname.replace(from, to))
    })
    return unsubscribe
  }, [pathname, router])
}

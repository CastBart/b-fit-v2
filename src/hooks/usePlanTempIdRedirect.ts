'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { idMap } from '@/lib/pwa/id-map'
import { isTempId } from '@/lib/pwa/temp-id'

// When a plan's tempId is reconciled to a real id, swap the URL so future
// refreshes/back-nav use the real id (which is the only one the server
// knows about).
//
// Two URL surfaces to keep in sync:
//   1. /plans/builder?id=<tempId>&day=N  (single static shell — id lives
//                                          in the search param so the SW
//                                          can cache one entry for all ids)
//   2. /plans/<tempId>          (plan detail page; dynamic segment —
//                                  defensive fallback; this URL isn't
//                                  produced by current flows)
//
// Other query params (notably `day`) are preserved across the swap.
//
// Design: idMap-subscribed polling, NOT emitter-subscribed.
//
// The previous emitter-based design failed for online creates because
// the create's onSuccess (which calls rewritePlanId → emit) often runs
// BEFORE the router.push navigation completes. The emit-time handler
// closure had stale pathname/searchParams (= /plans/create), the swap
// branches failed silently, and the event was never replayed.
//
// idMap.subscribe + a re-render trigger sidesteps that race entirely:
// every time idMap is updated, this hook re-renders, the polling effect
// re-runs with the CURRENT pathname/searchParams (whatever they are at
// re-render time), and swaps the URL if a tempId in the URL has a
// resolved entry. The polling effect ALSO re-runs whenever the URL
// itself changes — covering both the "URL settles after idMap update"
// and "idMap updates after URL settles" timings.
export function usePlanTempIdRedirect(): void {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Force a re-render of the polling effect whenever idMap.set fires.
  // The revision value itself is irrelevant — only its identity change
  // matters as a dep-list trigger.
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    return idMap.subscribe(() => setRevision((r) => r + 1))
  }, [])

  // Polling effect: re-runs on URL change OR idMap change. Reads the
  // CURRENT URL state at run time (not from a captured emit payload),
  // so it's race-immune.
  useEffect(() => {
    if (!pathname) return

    // Builder route: tempId travels in the `id` query param.
    if (pathname === '/plans/builder') {
      const id = searchParams.get('id')
      if (!id || !isTempId(id)) return
      let cancelled = false
      void idMap.get(id).then((realId) => {
        if (cancelled || !realId) return
        if (searchParams.get('id') !== id) return // URL moved on while awaiting IDB
        const next = new URLSearchParams(searchParams.toString())
        next.set('id', realId)
        router.replace(`/plans/builder?${next.toString()}`)
      })
      return () => {
        cancelled = true
      }
    }

    // Path-segment routes (e.g. /plans/<tempId>): scan path segments
    // for any tempId and swap. Defensive — current flows don't navigate
    // here with tempIds, but covers existing direct links.
    const segments = pathname.split('/')
    const tempSegment = segments.find((s) => isTempId(s))
    if (!tempSegment) return
    let cancelled = false
    void idMap.get(tempSegment).then((realId) => {
      if (cancelled || !realId) return
      if (!pathname.includes(tempSegment)) return // URL moved on
      router.replace(pathname.replace(tempSegment, realId))
    })
    return () => {
      cancelled = true
    }
  }, [pathname, searchParams, router, revision])
}

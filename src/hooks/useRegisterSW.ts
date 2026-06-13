'use client'

import { useEffect, useState } from 'react'

type SWState = 'unsupported' | 'pending' | 'active' | 'update-available' | 'error'

export function useRegisterSW() {
  const [state, setState] = useState<SWState>('pending')

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) {
      setState('unsupported')
      return
    }

    // In development we never want a service worker controlling the page —
    // a stale `public/sw.js` (built by the last `next build`) would otherwise
    // serve cached prod UI/data and mask local edits. Serwist's `disable` flag
    // only stops the SW being *rebuilt* in dev; it doesn't stop an already
    // installed one. Actively unregister any leftover worker so the next dev
    // load is clean, then skip registration entirely.
    if (process.env.NODE_ENV !== 'production') {
      void navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => registrations.forEach((registration) => registration.unregister()))
        .catch(() => {})
      setState('unsupported')
      return
    }

    let cancelled = false

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        })

        if (cancelled) return

        if (registration.waiting) {
          setState('update-available')
        } else if (registration.active) {
          setState('active')
        }

        registration.addEventListener('updatefound', () => {
          const installing = registration.installing
          if (!installing) return
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed') {
              setState(navigator.serviceWorker.controller ? 'update-available' : 'active')
            }
          })
        })
      } catch (err) {
        console.error('Service worker registration failed', err)
        if (!cancelled) setState('error')
      }
    }

    void register()

    return () => {
      cancelled = true
    }
  }, [])

  return state
}

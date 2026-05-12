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

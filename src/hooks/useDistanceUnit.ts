'use client'

import { useSyncExternalStore, useCallback } from 'react'
import type { WheelDistanceUnit } from '@/lib/metrics/wheel-steps'

/**
 * Display-unit preference for distance (km/mi).
 *
 * Distance is stored canonically in meters; this only controls how distance is
 * shown/entered in the session UI (set-table header toggle + metric editor).
 * Persisted to localStorage for now — a full per-user DB preference is planned
 * later. A module-level store keeps every distance input/header in sync within
 * the same tab, and a storage listener syncs across tabs.
 */

const STORAGE_KEY = 'bfit.units.distance'
const DEFAULT_UNIT: WheelDistanceUnit = 'km'

const listeners = new Set<() => void>()
let current: WheelDistanceUnit | null = null

function read(): WheelDistanceUnit {
  if (current != null) return current
  if (typeof window === 'undefined') return DEFAULT_UNIT
  const stored = window.localStorage.getItem(STORAGE_KEY)
  current = stored === 'mi' || stored === 'km' ? stored : DEFAULT_UNIT
  return current
}

function write(unit: WheelDistanceUnit) {
  current = unit
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, unit)
  }
  listeners.forEach((l) => l())
}

function subscribe(onChange: () => void) {
  listeners.add(onChange)
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      current = e.newValue === 'mi' || e.newValue === 'km' ? e.newValue : DEFAULT_UNIT
      onChange()
    }
  }
  if (typeof window !== 'undefined') window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(onChange)
    if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage)
  }
}

export function useDistanceUnit(): {
  unit: WheelDistanceUnit
  setUnit: (u: WheelDistanceUnit) => void
  toggleUnit: () => void
} {
  const unit = useSyncExternalStore(subscribe, read, () => DEFAULT_UNIT)
  const setUnit = useCallback((u: WheelDistanceUnit) => write(u), [])
  const toggleUnit = useCallback(() => write(read() === 'km' ? 'mi' : 'km'), [])
  return { unit, setUnit, toggleUnit }
}

'use client'

import { useExerciseIdRewriteBridge } from '@/hooks/useExerciseIdRewriteBridge'
import { usePrefetchCriticalData } from '@/hooks/usePrefetchCriticalData'
import { useRegisterSW } from '@/hooks/useRegisterSW'
import { useWorkoutTempIdRedirect } from '@/hooks/useWorkoutTempIdRedirect'

export function PWAClientBootstrap() {
  useRegisterSW()
  usePrefetchCriticalData()
  useExerciseIdRewriteBridge()
  useWorkoutTempIdRedirect()
  return null
}

'use client'

import { useExerciseIdRewriteBridge } from '@/hooks/useExerciseIdRewriteBridge'
import { usePlanTempIdRedirect } from '@/hooks/usePlanTempIdRedirect'
import { usePrefetchCriticalData } from '@/hooks/usePrefetchCriticalData'
import { useRegisterSW } from '@/hooks/useRegisterSW'
import { useWorkoutTempIdRedirect } from '@/hooks/useWorkoutTempIdRedirect'

export function PWAClientBootstrap() {
  useRegisterSW()
  usePrefetchCriticalData()
  useExerciseIdRewriteBridge()
  useWorkoutTempIdRedirect()
  usePlanTempIdRedirect()
  return null
}

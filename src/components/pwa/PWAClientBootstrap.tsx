'use client'

import { useExerciseIdRewriteBridge } from '@/hooks/useExerciseIdRewriteBridge'
import { usePrefetchCriticalData } from '@/hooks/usePrefetchCriticalData'
import { useRegisterSW } from '@/hooks/useRegisterSW'

export function PWAClientBootstrap() {
  useRegisterSW()
  usePrefetchCriticalData()
  useExerciseIdRewriteBridge()
  return null
}

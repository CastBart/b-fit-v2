/**
 * Plan Builder Route
 *
 * Wraps the PlanBuilderPage component with the plan ID from the URL.
 * Supports ?day=N query param to preselect a specific day.
 * URL: /plans/[id]/builder?day=1
 */

'use client'

import { use } from 'react'
import { PlanBuilderPage } from '@/components/features/plans/PlanBuilderPage'

interface PlanBuilderRouteProps {
  params: Promise<{
    id: string
  }>
  searchParams: Promise<{
    day?: string
  }>
}

export default function PlanBuilderRoute({ params, searchParams }: PlanBuilderRouteProps) {
  const { id } = use(params)
  const { day } = use(searchParams)
  const initialDayIndex = day ? Math.max(0, parseInt(day, 10) - 1) : 0

  return <PlanBuilderPage planId={id} initialDayIndex={initialDayIndex} />
}

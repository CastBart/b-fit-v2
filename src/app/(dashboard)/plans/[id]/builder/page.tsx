/**
 * Plan Builder Route
 *
 * Wraps the PlanBuilderPage component with the plan ID from the URL.
 * URL: /plans/[id]/builder
 */

'use client'

import { use } from 'react'
import { PlanBuilderPage } from '@/components/features/plans/PlanBuilderPage'

interface PlanBuilderRouteProps {
  params: Promise<{
    id: string
  }>
}

export default function PlanBuilderRoute({ params }: PlanBuilderRouteProps) {
  const { id } = use(params)

  return <PlanBuilderPage planId={id} />
}

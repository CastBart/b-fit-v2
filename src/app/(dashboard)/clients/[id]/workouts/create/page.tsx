'use client'

import { use } from 'react'
import WorkoutBuilderPage from '@/app/(dashboard)/workouts/builder/page'

interface CreateWorkoutForClientProps {
  params: Promise<{ id: string }>
}

export default function CreateWorkoutForClientPage({ params }: CreateWorkoutForClientProps) {
  const { id } = use(params)
  return <WorkoutBuilderPage forClientId={id} />
}

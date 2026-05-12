'use client'

import { use } from 'react'
import WorkoutBuilder from '@/app/(dashboard)/workouts/builder/WorkoutBuilder'

interface CreateWorkoutForClientProps {
  params: Promise<{ id: string }>
}

export default function CreateWorkoutForClientPage({ params }: CreateWorkoutForClientProps) {
  const { id } = use(params)
  return <WorkoutBuilder forClientId={id} />
}

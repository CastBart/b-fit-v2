/**
 * Workout Edit Route
 *
 * This route wraps the WorkoutBuilderPage component with an edit workout ID.
 * URL: /workouts/builder/[id]
 */

'use client'

import { use } from 'react'
import WorkoutBuilderPage from '../page'

interface EditWorkoutPageProps {
  params: Promise<{
    id: string
  }>
}

export default function EditWorkoutPage({ params }: EditWorkoutPageProps) {
  const { id } = use(params)

  return <WorkoutBuilderPage editWorkoutId={id} />
}

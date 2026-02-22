'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Dumbbell, Plus, LayoutGrid, List } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { WorkoutRowCard } from '@/components/features/workouts/WorkoutRowCard'
import { WorkoutGridCard } from '@/components/features/workouts/WorkoutGridCard'
import { DeleteWorkoutDialog } from '@/components/features/workouts/DeleteWorkoutDialog'
import { useClientWorkouts } from '@/hooks/queries/useClientDetail'
import { useDeleteWorkout, useDuplicateWorkout } from '@/hooks/mutations/useWorkoutMutations'
import { getWorkoutById } from '@/server/actions/workouts'
import { startWorkoutSession } from '@/lib/utils/session-navigation'
import { useAppDispatch } from '@/store/hooks'

// ============================================================================
// Types & Constants
// ============================================================================

type ViewMode = 'list' | 'grid'

const VIEW_MODE_KEY = 'client-workouts-view-mode'

interface WorkoutWithExerciseCount {
  id: string
  name: string
  description?: string | null
  exerciseCount: number
  isTemplate: boolean
  copiedFrom?: { id: string; name: string } | null
  updatedAt: Date | string
  exercises?: Array<{
    id: string
    exercise: {
      primaryMuscleGroup: string
      secondaryMuscleGroups: string[]
    }
  }>
}

interface ClientWorkoutsTabProps {
  clientId: string
  clientName: string
  onAssignWorkout: () => void
}

// ============================================================================
// Component
// ============================================================================

export function ClientWorkoutsTab({
  clientId,
  clientName,
  onAssignWorkout,
}: ClientWorkoutsTabProps) {
  const router = useRouter()
  const dispatch = useAppDispatch()

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>('list')

  // Start session state
  const [startingWorkoutId, setStartingWorkoutId] = useState<string | null>(null)

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<WorkoutWithExerciseCount | null>(null)

  // Initialize from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(VIEW_MODE_KEY)
      if (stored === 'grid' || stored === 'list') {
        setViewMode(stored)
      }
    }
  }, [])

  // Data fetching
  const { data: clientWorkouts, isLoading } = useClientWorkouts(clientId)

  // Mutations
  const deleteWorkout = useDeleteWorkout()
  const duplicateWorkoutMutation = useDuplicateWorkout()

  // ---- Handlers ----

  const handleViewModeChange = (value: string) => {
    if (value === 'list' || value === 'grid') {
      setViewMode(value)
      localStorage.setItem(VIEW_MODE_KEY, value)
    }
  }

  const handleStart = useCallback(
    async (workoutId: string) => {
      if (startingWorkoutId) return
      setStartingWorkoutId(workoutId)
      try {
        const result = await getWorkoutById(workoutId)
        if (!result.success || !result.data) {
          toast.error(result.error || 'Failed to load workout')
          return
        }
        startWorkoutSession(result.data, dispatch, router)
      } catch {
        toast.error('Failed to start session')
      } finally {
        setStartingWorkoutId(null)
      }
    },
    [startingWorkoutId, dispatch, router]
  )

  const handleDeleteRequest = useCallback(
    (workoutId: string) => {
      const workout = clientWorkouts?.find((w: WorkoutWithExerciseCount) => w.id === workoutId)
      if (workout) setDeleteTarget(workout)
    },
    [clientWorkouts]
  )

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTarget) return
    deleteWorkout.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    })
  }, [deleteTarget, deleteWorkout])

  const handleDuplicate = useCallback(
    (workoutId: string) => {
      duplicateWorkoutMutation.mutate(workoutId)
    },
    [duplicateWorkoutMutation]
  )

  // Shared card props factory
  const cardProps = useCallback(
    (workout: WorkoutWithExerciseCount) => ({
      workout,
      isClient: false,
      isPinned: false,
      showPin: false,
      isStarting: startingWorkoutId === workout.id,
      onStart: handleStart,
      onEdit: (id: string) => router.push(`/workouts/builder/${id}`),
      onClick: (id: string) => router.push(`/workouts/${id}`),
      onTogglePin: () => {},
      onDuplicate: handleDuplicate,
      onDelete: handleDeleteRequest,
    }),
    [startingWorkoutId, handleStart, router, handleDuplicate, handleDeleteRequest]
  )

  // ---- Render ----

  return (
    <>
      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{clientName}&apos;s workouts</p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/clients/${clientId}/workouts/create`)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Workout
          </Button>
          <Button onClick={onAssignWorkout}>
            <Dumbbell className="mr-2 h-4 w-4" />
            Assign Workout
          </Button>
          <ToggleGroup type="single" value={viewMode} onValueChange={handleViewModeChange}>
            <ToggleGroupItem value="list" aria-label="List view" className="px-2.5">
              <List className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="grid" aria-label="Grid view" className="px-2.5">
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && viewMode === 'grid' && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="mt-2 h-4 w-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {isLoading && viewMode === 'list' && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="flex items-center gap-4 p-4">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-4 w-2/3" />
              </div>
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-20" />
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && (!clientWorkouts || clientWorkouts.length === 0) && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-12">
            <Dumbbell className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No workouts yet. Assign or create a workout for {clientName}.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Workout List */}
      {!isLoading && clientWorkouts && clientWorkouts.length > 0 && (
        <>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {clientWorkouts.map((workout) => (
                <WorkoutGridCard key={workout.id} {...cardProps(workout)} />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {clientWorkouts.map((workout) => (
                <WorkoutRowCard key={workout.id} {...cardProps(workout)} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteWorkoutDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        workoutName={deleteTarget?.name ?? ''}
        onConfirm={handleDeleteConfirm}
        isPending={deleteWorkout.isPending}
      />
    </>
  )
}

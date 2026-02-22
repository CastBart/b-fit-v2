/**
 * Workouts List Page
 *
 * Displays user's workouts with switchable Grid/List view,
 * pinned favorites, hover-revealed quick actions, and delete confirmation.
 */

'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Plus, Dumbbell, LayoutGrid, List, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { WorkoutRowCard } from '@/components/features/workouts/WorkoutRowCard'
import { WorkoutGridCard } from '@/components/features/workouts/WorkoutGridCard'
import { DeleteWorkoutDialog } from '@/components/features/workouts/DeleteWorkoutDialog'
import { useWorkouts } from '@/hooks/queries/useWorkouts'
import { useDeleteWorkout, useDuplicateWorkout } from '@/hooks/mutations/useWorkoutMutations'
import { getWorkoutById } from '@/server/actions/workouts'
import { startWorkoutSession } from '@/lib/utils/session-navigation'
import { useAppDispatch } from '@/store/hooks'
import { toast } from 'sonner'

// ============================================================================
// Types & Constants
// ============================================================================

type ViewMode = 'list' | 'grid'

const VIEW_MODE_KEY = 'workouts-view-mode'
const PINNED_KEY = 'pinned-workouts'

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

// ============================================================================
// LocalStorage Helpers
// ============================================================================

function getStoredViewMode(): ViewMode {
  if (typeof window === 'undefined') return 'list'
  const stored = localStorage.getItem(VIEW_MODE_KEY)
  return stored === 'grid' || stored === 'list' ? stored : 'list'
}

function getStoredPinnedIds(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const stored = localStorage.getItem(PINNED_KEY)
    if (!stored) return new Set()
    const parsed = JSON.parse(stored)
    return new Set(Array.isArray(parsed) ? parsed : [])
  } catch {
    return new Set()
  }
}

// ============================================================================
// Page Component
// ============================================================================

export default function WorkoutsPage() {
  const router = useRouter()
  const dispatch = useAppDispatch()
  const { data: session } = useSession()
  const isClient = session?.user?.role === 'CLIENT'

  // Search & pagination
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  // View mode (grid/list)
  const [viewMode, setViewMode] = useState<ViewMode>('list')

  // Pinned workouts
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set())

  // Start session state
  const [startingWorkoutId, setStartingWorkoutId] = useState<string | null>(null)

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<WorkoutWithExerciseCount | null>(null)

  // Initialize from localStorage
  useEffect(() => {
    setViewMode(getStoredViewMode())
    setPinnedIds(getStoredPinnedIds())
  }, [])

  // Data fetching
  const { data, isLoading, error } = useWorkouts({ search, page, limit: 12 })

  // Mutations
  const deleteWorkout = useDeleteWorkout()
  const duplicateWorkoutMutation = useDuplicateWorkout()

  if (error) {
    toast.error('Failed to load workouts')
  }

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

  const handleTogglePin = useCallback((workoutId: string) => {
    setPinnedIds((prev) => {
      const next = new Set(prev)
      if (next.has(workoutId)) {
        next.delete(workoutId)
      } else {
        next.add(workoutId)
      }
      localStorage.setItem(PINNED_KEY, JSON.stringify([...next]))
      return next
    })
  }, [])

  const handleDeleteRequest = useCallback(
    (workoutId: string) => {
      const workout = data?.workouts.find((w: WorkoutWithExerciseCount) => w.id === workoutId)
      if (workout) setDeleteTarget(workout)
    },
    [data?.workouts]
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

  // ---- Derived State ----

  const showPinnedSection = !search && pinnedIds.size > 0

  const { pinnedWorkouts, unpinnedWorkouts } = useMemo(() => {
    if (!data?.workouts) return { pinnedWorkouts: [], unpinnedWorkouts: [] }
    if (!showPinnedSection) return { pinnedWorkouts: [], unpinnedWorkouts: data.workouts }

    const pinned: WorkoutWithExerciseCount[] = []
    const unpinned: WorkoutWithExerciseCount[] = []
    for (const w of data.workouts) {
      if (pinnedIds.has(w.id)) {
        pinned.push(w)
      } else {
        unpinned.push(w)
      }
    }
    return { pinnedWorkouts: pinned, unpinnedWorkouts: unpinned }
  }, [data?.workouts, pinnedIds, showPinnedSection])

  // Shared card props factory
  const cardProps = useCallback(
    (workout: WorkoutWithExerciseCount, pinned: boolean) => ({
      workout,
      isClient,
      isPinned: pinned,
      isStarting: startingWorkoutId === workout.id,
      onStart: handleStart,
      onEdit: (id: string) => router.push(`/workouts/builder/${id}`),
      onClick: (id: string) => router.push(`/workouts/${id}`),
      onTogglePin: handleTogglePin,
      onDuplicate: handleDuplicate,
      onDelete: handleDeleteRequest,
    }),
    [
      isClient,
      startingWorkoutId,
      handleStart,
      router,
      handleTogglePin,
      handleDuplicate,
      handleDeleteRequest,
    ]
  )

  // ---- Render helpers ----

  const renderWorkoutList = (workouts: WorkoutWithExerciseCount[], pinned: boolean) => {
    if (viewMode === 'grid') {
      return (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {workouts.map((workout) => (
            <WorkoutGridCard key={workout.id} {...cardProps(workout, pinned)} />
          ))}
        </div>
      )
    }

    return (
      <div className="space-y-2">
        {workouts.map((workout) => (
          <WorkoutRowCard key={workout.id} {...cardProps(workout, pinned)} />
        ))}
      </div>
    )
  }

  // ---- Render ----

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Workouts</h1>
          <p className="mt-1 text-muted-foreground">Create and manage your workout routines</p>
        </div>
        {!isClient && (
          <Button onClick={() => router.push('/workouts/builder')} className="cursor-pointer">
            <Plus className="mr-2 h-4 w-4" />
            Create Workout
          </Button>
        )}
      </div>

      {/* Toolbar: Search + View Toggle */}
      <div className="mb-6 flex items-center gap-4">
        <Input
          type="search"
          placeholder="Search workouts..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="max-w-md"
        />
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={handleViewModeChange}
          className="ml-auto"
        >
          <ToggleGroupItem value="list" aria-label="List view" className="px-2.5">
            <List className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="grid" aria-label="Grid view" className="px-2.5">
            <LayoutGrid className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Loading State */}
      {isLoading && viewMode === 'grid' && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
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
          {Array.from({ length: 6 }).map((_, i) => (
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
      {!isLoading && data?.workouts.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Dumbbell className="mb-4 h-16 w-16 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No workouts yet</h3>
            <p className="mb-6 text-center text-sm text-muted-foreground">
              {search
                ? 'No workouts match your search.'
                : 'Create your first workout to get started.'}
            </p>
            {!search && !isClient && (
              <Button onClick={() => router.push('/workouts/builder')}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Workout
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Workouts */}
      {!isLoading && data && data.workouts.length > 0 && (
        <>
          {/* Pinned Section */}
          {showPinnedSection && pinnedWorkouts.length > 0 && (
            <div className="mb-6">
              <div className="mb-3 flex items-center gap-2">
                <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                <h2 className="text-sm font-semibold text-muted-foreground">
                  Pinned ({pinnedWorkouts.length})
                </h2>
              </div>
              {renderWorkoutList(pinnedWorkouts, true)}
            </div>
          )}

          {/* "All Workouts" header (only when pinned section is visible) */}
          {showPinnedSection && pinnedWorkouts.length > 0 && unpinnedWorkouts.length > 0 && (
            <div className="mb-3">
              <h2 className="text-sm font-semibold text-muted-foreground">
                All Workouts ({unpinnedWorkouts.length})
              </h2>
            </div>
          )}

          {/* Main Workout List */}
          {renderWorkoutList(unpinnedWorkouts, false)}

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <Button variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {data.page} of {data.totalPages}
              </span>
              <Button
                variant="outline"
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
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
    </div>
  )
}

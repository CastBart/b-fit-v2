'use client'

import { Suspense, useCallback, useMemo, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus } from 'lucide-react'
import { ExerciseCard } from '@/components/features/exercises/ExerciseCard'
import { ExerciseFilterBar } from '@/components/features/exercises/ExerciseFilterBar'
import { ExerciseDrawer } from '@/components/features/exercises/ExerciseDrawer'
import { CreateExerciseDrawer } from '@/components/features/exercises/CreateExerciseDrawer'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useExercises } from '@/hooks/queries/useExercises'
import { useCanCreateExercise } from '@/hooks/useCanCreateExercise'
import type {
  MuscleGroup,
  EquipmentType,
  DifficultyLevel,
  ExerciseType,
  MovementPattern,
} from '@/types/exercise'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'

/* ---------------- helpers ---------------- */

function normalizeArray<T extends string>(values: T[]): T[] {
  return Array.from(new Set(values)).sort() as T[]
}

function parseCsvParam<T extends string>(param: string | null): T[] {
  if (!param) return []
  return param
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean) as T[]
}

/* ---------------- component ---------------- */

function ExercisesContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  /* ---------- drawer state (LOCAL ONLY) ---------- */
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false)

  /* ---------- permissions ---------- */
  const { canCreate } = useCanCreateExercise()

  /* ---------- URL params ---------- */
  const currentPage = Number(searchParams.get('page')) || 1
  const search = searchParams.get('search') || ''

  const muscleGroupsParam = searchParams.get('muscleGroups')
  const exerciseTypesParam = searchParams.get('exerciseTypes')
  const equipmentTypesParam = searchParams.get('equipmentTypes')
  const difficultyLevelsParam = searchParams.get('difficultyLevels')
  const movementPatternsParam = searchParams.get('movementPatterns')

  /* ---------- parsed & memoized filters ---------- */
  const muscleGroups = useMemo(
    () => normalizeArray(parseCsvParam<MuscleGroup>(muscleGroupsParam)),
    [muscleGroupsParam]
  )

  const exerciseTypes = useMemo(
    () => normalizeArray(parseCsvParam<ExerciseType>(exerciseTypesParam)),
    [exerciseTypesParam]
  )

  const equipmentTypes = useMemo(
    () => normalizeArray(parseCsvParam<EquipmentType>(equipmentTypesParam)),
    [equipmentTypesParam]
  )

  const difficultyLevels = useMemo(
    () => normalizeArray(parseCsvParam<DifficultyLevel>(difficultyLevelsParam)),
    [difficultyLevelsParam]
  )

  const movementPatterns = useMemo(
    () => normalizeArray(parseCsvParam<MovementPattern>(movementPatternsParam)),
    [movementPatternsParam]
  )

  /* ---------- params passed to server ---------- */
  const filterParams = useMemo(
    () => ({
      search: search || undefined,
      primaryMuscleGroups: muscleGroups.length ? muscleGroups : undefined,
      exerciseTypes: exerciseTypes.length ? exerciseTypes : undefined,
      equipmentTypes: equipmentTypes.length ? equipmentTypes : undefined,
      difficultyLevels: difficultyLevels.length ? difficultyLevels : undefined,
      movementPatterns: movementPatterns.length ? movementPatterns : undefined,
      page: currentPage,
      limit: 20,
    }),
    [
      search,
      muscleGroups,
      exerciseTypes,
      equipmentTypes,
      difficultyLevels,
      movementPatterns,
      currentPage,
    ]
  )

  /* ---------- STABLE QUERY KEY ---------- */
  const queryKeyParams = useMemo(
    () =>
      JSON.stringify({
        search,
        muscleGroups,
        exerciseTypes,
        equipmentTypes,
        difficultyLevels,
        movementPatterns,
        page: currentPage,
        limit: 20,
      }),
    [
      search,
      muscleGroups,
      exerciseTypes,
      equipmentTypes,
      difficultyLevels,
      movementPatterns,
      currentPage,
    ]
  )

  /* ---------- fetch exercises ---------- */
  const { data, isLoading, error } = useExercises(filterParams, queryKeyParams)

  const exercises = data?.exercises ?? []
  const total = data?.total ?? 0

  /* ---------- error handling ---------- */
  useEffect(() => {
    if (error) {
      toast.error(error.message || 'Failed to load exercises')
    }
  }, [error])

  /* ---------- URL updates ---------- */
  const updateFilters = useCallback(
    (updates: Record<string, string | string[] | undefined>) => {
      const params = new URLSearchParams(searchParams.toString())

      Object.entries(updates).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          const normalized = normalizeArray(value.map(String))
          if (normalized.length) {
            params.set(key, normalized.join(','))
          } else {
            params.delete(key)
          }
          return
        }

        if (value) {
          params.set(key, value)
        } else {
          params.delete(key)
        }
      })

      if (!('page' in updates)) params.set('page', '1')

      const next = params.toString()
      if (next === searchParams.toString()) return

      router.replace(`/exercises?${next}`)
    },
    [router, searchParams]
  )

  /* ---------- handlers ---------- */
  const handleExerciseClick = useCallback((id: string) => {
    setSelectedExerciseId(id)
    setDrawerOpen(true)
  }, [])

  const handleDrawerClose = useCallback((open: boolean) => {
    setDrawerOpen(open)
    if (!open) {
      setTimeout(() => setSelectedExerciseId(null), 300)
    }
  }, [])

  const handleClearFilters = useCallback(() => {
    router.replace('/exercises?page=1')
  }, [router])

  /* ---------- render ---------- */
  return (
    <div className="container mx-auto flex h-[calc(100dvh-4.5rem)] flex-col px-4 pt-4 sm:px-6 sm:pt-6 md:h-[calc(100dvh-1rem)]">
      {/* Page header */}
      <div className="mb-4 shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">Exercises</h1>
          <p className="hidden sm:block mt-1 text-muted-foreground">
            Create and manage your exercise library
          </p>
        </div>
        {canCreate && (
          <Button
            onClick={() => setCreateDrawerOpen(true)}
            className="cursor-pointer h-9 w-9 sm:h-auto sm:w-auto sm:px-4 sm:py-2"
          >
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Create Exercise</span>
          </Button>
        )}
      </div>

      {/* Filter bar */}
      <div className="shrink-0 ">
        <ExerciseFilterBar
          search={search}
          muscleGroups={muscleGroups}
          exerciseTypes={exerciseTypes}
          equipmentTypes={equipmentTypes}
          difficultyLevels={difficultyLevels}
          movementPatterns={movementPatterns}
          onSearchChange={(v) => updateFilters({ search: v || undefined })}
          onMuscleGroupsChange={(v) => updateFilters({ muscleGroups: v })}
          onExerciseTypesChange={(v) => updateFilters({ exerciseTypes: v })}
          onEquipmentTypesChange={(v) => updateFilters({ equipmentTypes: v })}
          onDifficultyLevelsChange={(v) => updateFilters({ difficultyLevels: v })}
          onMovementPatternsChange={(v) => updateFilters({ movementPatterns: v })}
          onClearAll={handleClearFilters}
        />
        <div className="mt-3 border-b" />
      </div>

      {/* Scrollable content */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="pt-4">
          {!isLoading && (
            <p className="mb-4 text-sm text-muted-foreground">
              Showing {exercises.length} of {total}
            </p>
          )}

          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {exercises.map((exercise) => (
                <ExerciseCard
                  key={exercise.id}
                  exercise={exercise}
                  onClick={() => handleExerciseClick(exercise.id)}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {!isLoading && (data?.totalPages ?? 0) > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => updateFilters({ page: String(currentPage - 1) })}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {data?.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= (data?.totalPages ?? 1)}
                onClick={() => updateFilters({ page: String(currentPage + 1) })}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Drawers */}
      <ExerciseDrawer
        exerciseId={selectedExerciseId}
        open={drawerOpen}
        onOpenChange={handleDrawerClose}
      />

      {canCreate && (
        <CreateExerciseDrawer open={createDrawerOpen} onOpenChange={setCreateDrawerOpen} />
      )}
    </div>
  )
}

export default function ExercisesPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <ExercisesContent />
    </Suspense>
  )
}

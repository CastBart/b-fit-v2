'use client'

import { Suspense, useCallback, useMemo, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus } from 'lucide-react'
import { ExerciseCard } from '@/components/features/exercises/ExerciseCard'
import { ExerciseFilters } from '@/components/features/exercises/ExerciseFilters'
import { ExerciseDrawer } from '@/components/features/exercises/ExerciseDrawer'
import { CreateExerciseDrawer } from '@/components/features/exercises/CreateExerciseDrawer'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useExercises } from '@/hooks/queries/useExercises'
import { useCanCreateExercise } from '@/hooks/useCanCreateExercise'
import type { MuscleGroup, EquipmentType, DifficultyLevel } from '@/types/exercise'
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
  const equipmentTypesParam = searchParams.get('equipmentTypes')
  const difficultyLevelsParam = searchParams.get('difficultyLevels')

  /* ---------- parsed & memoized filters ---------- */
  const muscleGroups = useMemo(
    () => normalizeArray(parseCsvParam<MuscleGroup>(muscleGroupsParam)),
    [muscleGroupsParam]
  )

  const equipmentTypes = useMemo(
    () => normalizeArray(parseCsvParam<EquipmentType>(equipmentTypesParam)),
    [equipmentTypesParam]
  )

  const difficultyLevels = useMemo(
    () => normalizeArray(parseCsvParam<DifficultyLevel>(difficultyLevelsParam)),
    [difficultyLevelsParam]
  )

  /* ---------- params passed to server ---------- */
  const filterParams = useMemo(
    () => ({
      search: search || undefined,
      primaryMuscleGroups: muscleGroups.length ? muscleGroups : undefined,
      equipmentTypes: equipmentTypes.length ? equipmentTypes : undefined,
      difficultyLevels: difficultyLevels.length ? difficultyLevels : undefined,
      page: currentPage,
      limit: 20,
    }),
    [search, muscleGroups, equipmentTypes, difficultyLevels, currentPage]
  )

  /* ---------- STABLE QUERY KEY ---------- */
  const queryKeyParams = useMemo(
    () =>
      JSON.stringify({
        search,
        muscleGroups,
        equipmentTypes,
        difficultyLevels,
        page: currentPage,
        limit: 20,
      }),
    [search, muscleGroups, equipmentTypes, difficultyLevels, currentPage]
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
    <div className="space-y-6">
      {/* Header with Create button */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Exercises</h1>
        {canCreate && (
          <Button onClick={() => setCreateDrawerOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Exercise
          </Button>
        )}
      </div>

      <ExerciseFilters
        search={search}
        muscleGroups={muscleGroups}
        equipmentTypes={equipmentTypes}
        difficultyLevels={difficultyLevels}
        onSearchChange={(v) => updateFilters({ search: v || undefined })}
        onMuscleGroupsChange={(v) => updateFilters({ muscleGroups: v })}
        onEquipmentTypesChange={(v) => updateFilters({ equipmentTypes: v })}
        onDifficultyLevelsChange={(v) => updateFilters({ difficultyLevels: v })}
        onClearFilters={handleClearFilters}
      />

      {!isLoading && (
        <p className="text-sm text-muted-foreground">
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
        <div className="flex items-center justify-center gap-2">
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

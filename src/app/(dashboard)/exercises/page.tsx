'use client'

import { Suspense, useCallback, useMemo, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ExerciseCard } from '@/components/features/exercises/ExerciseCard'
import { ExerciseFilters } from '@/components/features/exercises/ExerciseFilters'
import { ExerciseDrawer } from '@/components/features/exercises/ExerciseDrawer'
import { Skeleton } from '@/components/ui/skeleton'
import { useExercises } from '@/hooks/queries/useExercises'
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

      <ExerciseDrawer
        exerciseId={selectedExerciseId}
        open={drawerOpen}
        onOpenChange={handleDrawerClose}
      />
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

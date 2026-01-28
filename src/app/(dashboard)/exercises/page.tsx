// app/dashboard/exercises/page.tsx (or wherever your page lives)
'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ExerciseCard } from '@/components/features/exercises/ExerciseCard'
import { ExerciseFilters } from '@/components/features/exercises/ExerciseFilters'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getExercises } from '@/server/actions/exercises'
import type { ExerciseEntity, MuscleGroup, EquipmentType, DifficultyLevel } from '@/types/exercise'
import { ChevronLeft, ChevronRight, Dumbbell } from 'lucide-react'
import { toast } from 'sonner'

function normalizeArray<T extends string>(values: T[]): T[] {
  return Array.from(new Set(values)).sort() as T[]
}

function parseCsvParam<T extends string>(param: string | null): T[] {
  if (!param) return []
  return param
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean) as T[]
}

function ExercisesContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // State
  const [exercises, setExercises] = useState<ExerciseEntity[]>([])
  const [loading, setLoading] = useState(true)
  const [totalPages, setTotalPages] = useState(0)
  const [total, setTotal] = useState(0)

  // Read URL params (strings as source of truth)
  const currentPage = Number(searchParams.get('page')) || 1
  const search = searchParams.get('search') || ''

  const muscleGroupsParam = searchParams.get('muscleGroups')
  const equipmentTypesParam = searchParams.get('equipmentTypes')
  const difficultyLevelsParam = searchParams.get('difficultyLevels')

  // ✅ Memoize parsed arrays so deps are stable
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

  // Update URL with new filters
  const updateFilters = useCallback(
    (updates: Record<string, string | string[] | undefined>) => {
      const params = new URLSearchParams(searchParams.toString())

      Object.entries(updates).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          const normalized = normalizeArray(value.map(String))
          if (normalized.length > 0) params.set(key, normalized.join(','))
          else params.delete(key)
          return
        }

        if (value && String(value).length > 0) params.set(key, String(value))
        else params.delete(key)
      })

      // Reset to page 1 when filters change (unless explicitly updating page)
      if (!('page' in updates)) {
        params.set('page', '1')
      }

      const next = params.toString()
      const current = searchParams.toString()

      // ✅ Stop no-op navigations
      if (next === current) return

      router.replace(`/exercises?${next}`)
    },
    [searchParams, router]
  )

  // Fetch exercises
  useEffect(() => {
    let cancelled = false

    const fetchExercises = async () => {
      setLoading(true)
      try {
        const result = await getExercises({
          search: search || undefined,
          primaryMuscleGroups: muscleGroups.length ? muscleGroups : undefined,
          equipmentTypes: equipmentTypes.length ? equipmentTypes : undefined,
          difficultyLevels: difficultyLevels.length ? difficultyLevels : undefined,
          page: currentPage,
          limit: 20,
        })

        if (cancelled) return

        if (result.success && result.data) {
          setExercises(result.data.exercises)
          setTotalPages(result.data.totalPages)
          setTotal(result.data.total)
        } else {
          toast.error(result.error || 'Failed to load exercises')
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Error fetching exercises:', error)
          toast.error('An unexpected error occurred')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchExercises()
    return () => {
      cancelled = true
    }
    // ✅ deps are stable thanks to useMemo above
  }, [search, muscleGroups, equipmentTypes, difficultyLevels, currentPage])

  // Filter handlers
  const handleSearchChange = useCallback(
    (value: string) => {
      updateFilters({ search: value || undefined })
    },
    [updateFilters]
  )

  const handleMuscleGroupsChange = useCallback(
    (values: MuscleGroup[]) => {
      updateFilters({ muscleGroups: values })
    },
    [updateFilters]
  )

  const handleEquipmentTypesChange = useCallback(
    (values: EquipmentType[]) => {
      updateFilters({ equipmentTypes: values })
    },
    [updateFilters]
  )

  const handleDifficultyLevelsChange = useCallback(
    (values: DifficultyLevel[]) => {
      updateFilters({ difficultyLevels: values })
    },
    [updateFilters]
  )

  const handleClearFilters = useCallback(() => {
    router.replace('/exercises?page=1')
  }, [router])

  // Pagination handlers
  const handlePreviousPage = useCallback(() => {
    if (currentPage > 1) updateFilters({ page: String(currentPage - 1) })
  }, [currentPage, updateFilters])

  const handleNextPage = useCallback(() => {
    if (currentPage < totalPages) updateFilters({ page: String(currentPage + 1) })
  }, [currentPage, totalPages, updateFilters])

  const handleExerciseClick = useCallback(
    (exerciseId: string) => {
      router.push(`/exercises/${exerciseId}`)
    },
    [router]
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Exercise Library</h1>
        <p className="text-muted-foreground">
          Browse and search through our comprehensive exercise database
        </p>
      </div>

      {/* Filters */}
      <ExerciseFilters
        search={search}
        muscleGroups={muscleGroups}
        equipmentTypes={equipmentTypes}
        difficultyLevels={difficultyLevels}
        onSearchChange={handleSearchChange}
        onMuscleGroupsChange={handleMuscleGroupsChange}
        onEquipmentTypesChange={handleEquipmentTypesChange}
        onDifficultyLevelsChange={handleDifficultyLevelsChange}
        onClearFilters={handleClearFilters}
      />

      {/* Results Count */}
      {!loading && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {exercises.length} of {total} exercises
          </p>
          {totalPages > 1 && (
            <p className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </p>
          )}
        </div>
      )}

      {/* Exercise Grid */}
      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-48 w-full rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : exercises.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <Dumbbell className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-semibold">No exercises found</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Try adjusting your filters or search terms
          </p>
          <Button variant="outline" onClick={handleClearFilters}>
            Clear Filters
          </Button>
        </div>
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
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreviousPage}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pageNum: number
              if (totalPages <= 5) pageNum = i + 1
              else if (currentPage <= 3) pageNum = i + 1
              else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i
              else pageNum = currentPage - 2 + i

              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateFilters({ page: String(pageNum) })}
                  className="h-8 w-8 p-0"
                >
                  {pageNum}
                </Button>
              )
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

export default function ExercisesPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto space-y-6 py-6">
          <div className="space-y-2">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-48 w-full" />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-64 w-full" />
            ))}
          </div>
        </div>
      }
    >
      <ExercisesContent />
    </Suspense>
  )
}

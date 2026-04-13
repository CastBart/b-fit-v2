'use client'

import { Suspense, useCallback, useMemo, useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
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
  const searchParams = useSearchParams()

  /* ---------- drawer state (LOCAL ONLY) ---------- */
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false)

  /* ---------- permissions ---------- */
  const { canCreate } = useCanCreateExercise()

  /* ---------- LOCAL filter state (initialized from URL) ---------- */
  const [currentPage, setCurrentPage] = useState(() => Number(searchParams.get('page')) || 1)
  const [search, setSearch] = useState(() => searchParams.get('search') || '')
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>(
    () => normalizeArray(parseCsvParam<MuscleGroup>(searchParams.get('muscleGroups')))
  )
  const [exerciseTypes, setExerciseTypes] = useState<ExerciseType[]>(
    () => normalizeArray(parseCsvParam<ExerciseType>(searchParams.get('exerciseTypes')))
  )
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>(
    () => normalizeArray(parseCsvParam<EquipmentType>(searchParams.get('equipmentTypes')))
  )
  const [difficultyLevels, setDifficultyLevels] = useState<DifficultyLevel[]>(
    () => normalizeArray(parseCsvParam<DifficultyLevel>(searchParams.get('difficultyLevels')))
  )
  const [movementPatterns, setMovementPatterns] = useState<MovementPattern[]>(
    () => normalizeArray(parseCsvParam<MovementPattern>(searchParams.get('movementPatterns')))
  )

  /* ---------- Sync local state → URL via history.replaceState ---------- */
  // Avoid Next.js router.replace which makes server requests (fails offline).
  const isInitialMount = useRef(true)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (muscleGroups.length) params.set('muscleGroups', muscleGroups.join(','))
    if (exerciseTypes.length) params.set('exerciseTypes', exerciseTypes.join(','))
    if (equipmentTypes.length) params.set('equipmentTypes', equipmentTypes.join(','))
    if (difficultyLevels.length) params.set('difficultyLevels', difficultyLevels.join(','))
    if (movementPatterns.length) params.set('movementPatterns', movementPatterns.join(','))
    params.set('page', String(currentPage))
    const qs = params.toString()
    window.history.replaceState(window.history.state, '', `/exercises?${qs}`)
  }, [search, muscleGroups, exerciseTypes, equipmentTypes, difficultyLevels, movementPatterns, currentPage])

  /* ---------- params passed to query hook ---------- */
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
    [search, muscleGroups, exerciseTypes, equipmentTypes, difficultyLevels, movementPatterns, currentPage]
  )

  /* ---------- fetch exercises ---------- */
  const { data, isLoading, error } = useExercises(filterParams)

  const exercises = data?.exercises ?? []
  const total = data?.total ?? 0

  /* ---------- error handling ---------- */
  useEffect(() => {
    if (error) {
      toast.error(error.message || 'Failed to load exercises')
    }
  }, [error])

  /* ---------- filter update helpers ---------- */
  const handleSearchChange = useCallback((v: string) => {
    setSearch(v)
    setCurrentPage(1)
  }, [])

  const handleMuscleGroupsChange = useCallback((v: MuscleGroup[]) => {
    setMuscleGroups(normalizeArray(v))
    setCurrentPage(1)
  }, [])

  const handleExerciseTypesChange = useCallback((v: ExerciseType[]) => {
    setExerciseTypes(normalizeArray(v))
    setCurrentPage(1)
  }, [])

  const handleEquipmentTypesChange = useCallback((v: EquipmentType[]) => {
    setEquipmentTypes(normalizeArray(v))
    setCurrentPage(1)
  }, [])

  const handleDifficultyLevelsChange = useCallback((v: DifficultyLevel[]) => {
    setDifficultyLevels(normalizeArray(v))
    setCurrentPage(1)
  }, [])

  const handleMovementPatternsChange = useCallback((v: MovementPattern[]) => {
    setMovementPatterns(normalizeArray(v))
    setCurrentPage(1)
  }, [])

  const handleClearFilters = useCallback(() => {
    setSearch('')
    setMuscleGroups([])
    setExerciseTypes([])
    setEquipmentTypes([])
    setDifficultyLevels([])
    setMovementPatterns([])
    setCurrentPage(1)
  }, [])

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
          onSearchChange={handleSearchChange}
          onMuscleGroupsChange={handleMuscleGroupsChange}
          onExerciseTypesChange={handleExerciseTypesChange}
          onEquipmentTypesChange={handleEquipmentTypesChange}
          onDifficultyLevelsChange={handleDifficultyLevelsChange}
          onMovementPatternsChange={handleMovementPatternsChange}
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
                onClick={() => setCurrentPage((p) => p - 1)}
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
                onClick={() => setCurrentPage((p) => p + 1)}
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

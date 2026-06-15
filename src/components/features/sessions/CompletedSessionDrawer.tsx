/**
 * Completed Session Drawer Component
 *
 * Displays a summary of a completed workout session.
 * Can be used for:
 * 1. Showing summary immediately after completing a session
 * 2. Viewing historical sessions from a calendar/list view
 *
 * Features:
 * - Session metadata (name, date, duration)
 * - List of all exercises with their sets
 * - Total stats (sets completed, volume, etc.)
 */

'use client'

import { useMemo } from 'react'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CheckCircle2, Clock, Dumbbell, Calendar, Trophy, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDuration } from '@/lib/utils/format-time'
import { CompletedSessionActionsMenu } from './CompletedSessionActionsMenu'
import { MuscleGroupSetCounts } from '@/components/features/workouts/MuscleGroupSetCounts'
import { computeMuscleGroupSetCounts } from '@/lib/analytics/muscle-set-counts'
import { estimateOneRepMax } from '@/lib/analytics/one-rep-max'
import type { ExerciseType, MetricType, MuscleGroup } from '@prisma/client'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Unified set data for display
 */
export type CompletedSetData = {
  setNumber: number
  weight?: number | null
  reps?: number | null
  duration?: number | null
  distance?: number | null
  counterWeight?: number | null
  rir?: number | null
  isCompleted: boolean
}

/**
 * Unified exercise data for display.
 *
 * Carries the source workout-template target params and the exercise's muscle
 * groups so the drawer can power downstream features that need to rebuild a
 * session from a completed one (repeat session) or compute weighted
 * muscle-group set counts.
 */
export type CompletedExerciseData = {
  id: string
  exerciseId: string
  name: string
  metricType: MetricType
  exerciseType: ExerciseType
  sets: CompletedSetData[]
  notes?: string | null
  // Source workout-template params (for repeat-session)
  targetReps: number | null
  targetWeight: number | null
  targetRestSeconds: number
  groupId: string | null
  // Muscle group data (for weighted set-count breakdowns)
  primaryMuscleGroup: MuscleGroup
  secondaryMuscleGroups: MuscleGroup[]
}

/**
 * Props for the completed session drawer
 * Can accept either just-completed session data or historical session data
 */
export type SessionPRDisplay = {
  exerciseId: string
  exerciseName: string
  prType: string
  newValue: number
  previousValue: number | null
}

export type CompletedSessionData = {
  sessionId: string
  workoutName: string
  startTime: number | Date
  endTime: number | Date
  durationSeconds: number
  exercises: CompletedExerciseData[]
  sessionNotes?: string | null
  prs?: SessionPRDisplay[]
  // Source markers — gate eligibility for "Save as Workout" (Chunk C).
  // workoutId set → session came from an existing workout (ineligible)
  // planId set → plan-day session (still eligible: PlanDay has no workoutId)
  workoutId?: string | null
  planId?: string | null
}

/**
 * One footer button. Each action's onClick is responsible for closing the
 * drawer itself when appropriate — the drawer no longer auto-closes after
 * an action, because some flows (e.g. opening a name dialog on top) need to
 * keep the drawer open.
 */
export type DrawerAction = {
  label: string
  onClick: () => void
  variant?: 'default' | 'outline' | 'secondary'
  disabled?: boolean
}

interface CompletedSessionDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: CompletedSessionData | null
  onClose?: () => void
  actions?: DrawerAction[]
  /**
   * Optional override for the "Repeat Session" action. Supplied by the live
   * just-completed drawer (session page), whose close handler tears down the
   * session and navigates away — so the default repeat flow would conflict.
   * When omitted, the Repeat button self-handles the start.
   */
  onRepeat?: (data: CompletedSessionData) => void
  /** Hide the "Repeat Session" button (e.g. when viewing another user's session). */
  hideRepeat?: boolean
}

// ============================================================================
// COMPONENT
// ============================================================================

export function CompletedSessionDrawer({
  open,
  onOpenChange,
  data,
  onClose,
  actions,
  onRepeat,
  hideRepeat,
}: CompletedSessionDrawerProps) {
  // Calculate session stats
  const stats = useMemo(() => {
    if (!data) return null

    let totalSets = 0
    let completedSets = 0
    let totalVolume = 0
    let totalReps = 0

    data.exercises.forEach((exercise) => {
      exercise.sets.forEach((set) => {
        totalSets++
        if (set.isCompleted) {
          completedSets++
          // Calculate volume (weight * reps)
          if (set.weight && set.reps) {
            totalVolume += set.weight * set.reps
            totalReps += set.reps
          } else if (set.reps) {
            totalReps += set.reps
          }
        }
      })
    })

    return {
      totalExercises: data.exercises.length,
      totalSets,
      completedSets,
      totalVolume,
      totalReps,
      completionRate: totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0,
    }
  }, [data])

  // Weighted set counts per muscle group, from COMPLETED sets only.
  const muscleSetCounts = useMemo(() => {
    if (!data) return []
    return computeMuscleGroupSetCounts(
      data.exercises.map((ex) => ({
        sets: ex.sets.filter((s) => s.isCompleted).length,
        primaryMuscleGroup: ex.primaryMuscleGroup,
        secondaryMuscleGroups: ex.secondaryMuscleGroups,
      }))
    )
  }, [data])

  const handleClose = () => {
    onOpenChange(false)
    onClose?.()
  }

  if (!data) return null

  const startDate = new Date(data.startTime)

  return (
    <Drawer open={open} onOpenChange={onOpenChange} handleOnly repositionInputs={false}>
      <DrawerContent className="custom-drawer-fullscreen justify-self-center">
        <DrawerHeader className="relative pb-2 text-center">
          <DrawerTitle className="text-xl">Workout Complete!</DrawerTitle>
          <DrawerDescription className="text-base">{data.workoutName}</DrawerDescription>
          {/* Session actions (Save as Workout / Repeat) live in a kebab menu
              to the right of the title. Renders null if neither is available. */}
          <div className="absolute right-3 top-3">
            <CompletedSessionActionsMenu data={data} onRepeat={onRepeat} hideRepeat={hideRepeat} />
          </div>
        </DrawerHeader>

        <ScrollArea className="flex-1 px-6">
          <div className="space-y-6 pb-4">
            {/* Session Stats */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                icon={<Clock className="h-4 w-4" />}
                label="Duration"
                value={formatDuration(data.durationSeconds)}
              />
              <StatCard
                icon={<Calendar className="h-4 w-4" />}
                label="Date"
                value={startDate.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              />
              <StatCard
                icon={<Dumbbell className="h-4 w-4" />}
                label="Exercises"
                value={`${stats?.totalExercises || 0}`}
              />
              <StatCard
                icon={<CheckCircle2 className="h-4 w-4" />}
                label="Sets"
                value={`${stats?.completedSets || 0}/${stats?.totalSets || 0}`}
              />
              {stats && stats.totalVolume > 0 && (
                <StatCard
                  icon={<TrendingUp className="h-4 w-4" />}
                  label="Volume"
                  value={`${stats.totalVolume.toLocaleString()} kg`}
                  className="col-span-2"
                />
              )}
            </div>

            {/* PRs Section */}
            {data.prs && data.prs.length > 0 && (
              <>
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-yellow-500" />
                    New Personal Records!
                  </h3>
                  <div className="space-y-2">
                    {data.prs.map((pr) => (
                      <div
                        key={pr.exerciseId}
                        className="flex items-center justify-between rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/30 p-3"
                      >
                        <div className="flex items-center gap-2">
                          <Trophy className="h-4 w-4 text-yellow-500" />
                          <span className="font-medium text-sm">{pr.exerciseName}</span>
                        </div>
                        <div className="text-sm font-semibold">
                          {pr.newValue} kg
                          {pr.previousValue !== null && (
                            <span className="text-muted-foreground font-normal ml-1">
                              (was {pr.previousValue} kg)
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Weighted set counts per muscle group (completed sets only) */}
            <MuscleGroupSetCounts counts={muscleSetCounts} />

            {/* Exercises List */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Exercises
              </h3>
              {data.exercises.map((exercise) => (
                <ExerciseCard key={exercise.id} exercise={exercise} />
              ))}
            </div>

            {/* Session Notes */}
            {data.sessionNotes && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Notes
                  </h3>
                  <p className="text-sm text-muted-foreground">{data.sessionNotes}</p>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        <DrawerFooter className="pt-4">
          {actions && actions.length > 0 ? (
            actions.map((action, idx) => (
              <Button
                key={`${idx}-${action.label}`}
                onClick={action.onClick}
                disabled={action.disabled}
                variant={action.variant ?? 'default'}
                className="w-full"
              >
                {action.label}
              </Button>
            ))
          ) : (
            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string
  className?: string
}

function StatCard({ icon, label, value, className }: StatCardProps) {
  return (
    <div className={cn('flex items-center gap-3 rounded-lg border bg-muted/30 p-2', className)}>
      <div className="text-muted-foreground">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-semibold">{value}</p>
      </div>
    </div>
  )
}

interface ExerciseCardProps {
  exercise: CompletedExerciseData
}

function ExerciseCard({ exercise }: ExerciseCardProps) {
  const completedSets = exercise.sets.filter((s) => s.isCompleted).length
  const totalSets = exercise.sets.length
  const allCompleted = completedSets === totalSets && totalSets > 0

  return (
    <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
      {/* Exercise Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {allCompleted && <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />}
          <span className="font-medium">{exercise.name}</span>
        </div>
        <span className="text-sm text-muted-foreground">
          {completedSets}/{totalSets} sets
        </span>
      </div>

      {/* Sets Table */}
      <div className="space-y-1">
        {exercise.sets.map((set) => (
          <SetRow key={set.setNumber} set={set} metricType={exercise.metricType} />
        ))}
      </div>

      {/* Exercise Notes */}
      {exercise.notes && <p className="text-xs text-muted-foreground italic">{exercise.notes}</p>}
    </div>
  )
}

interface SetRowProps {
  set: CompletedSetData
  metricType: MetricType
}

function SetRow({ set, metricType }: SetRowProps) {
  const valueDisplay = formatSetValue(set, metricType)
  const metaDisplay = set.isCompleted ? formatSetMeta(set, metricType) : null

  return (
    <div
      className={cn(
        'flex items-center justify-between text-sm py-1 px-2 rounded',
        set.isCompleted ? 'bg-muted' : 'bg-muted/50 opacity-60'
      )}
    >
      <span className="text-muted-foreground">Set {set.setNumber}</span>
      <div className="flex items-center gap-2">
        <span className={set.isCompleted ? 'font-medium' : 'text-muted-foreground'}>
          {valueDisplay}
          {metaDisplay && <span className="ml-1 text-xs text-muted-foreground">{metaDisplay}</span>}
        </span>
        {set.isCompleted && <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-400" />}
      </div>
    </div>
  )
}

// ============================================================================
// UTILITIES
// ============================================================================

function formatSetValue(set: CompletedSetData, metricType: MetricType): string {
  if (!set.isCompleted) return '—'

  switch (metricType) {
    case 'WEIGHT_REPS':
      return `${set.weight ?? 0} kg × ${set.reps ?? 0}`
    case 'COUNTER_WEIGHT_REPS':
      return `${set.counterWeight ?? 0} kg assist × ${set.reps ?? 0}`
    case 'REPS':
      return `${set.reps ?? 0} reps`
    case 'REPS_DURATION':
      return `${set.reps ?? 0} reps, ${set.duration ?? 0}s`
    case 'DURATION':
      return `${set.duration ?? 0}s`
    case 'DISTANCE_DURATION':
      return `${set.distance ?? 0}m in ${set.duration ?? 0}s`
    case 'WEIGHT_DISTANCE':
      return `${set.weight ?? 0} kg × ${set.distance ?? 0}m`
    case 'WEIGHT_DURATION':
      return `${set.weight ?? 0} kg × ${set.duration ?? 0}s`
    default:
      return '—'
  }
}

/**
 * Secondary per-set info: RIR (where logged) and estimated 1RM (WEIGHT_REPS only).
 * Returns null when there's nothing extra to show.
 */
function formatSetMeta(set: CompletedSetData, metricType: MetricType): string | null {
  const parts: string[] = []
  if (set.rir != null) parts.push(`RIR ${set.rir}`)
  if (metricType === 'WEIGHT_REPS') {
    const oneRm = estimateOneRepMax(set.weight, set.reps, set.rir)
    if (oneRm != null) parts.push(`1RM ~${oneRm.toFixed(1)}kg`)
  }
  return parts.length > 0 ? `· ${parts.join(' · ')}` : null
}

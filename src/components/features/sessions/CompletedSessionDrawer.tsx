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
  DrawerClose,
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
import type { MetricType } from '@prisma/client'

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
  isCompleted: boolean
}

/**
 * Unified exercise data for display
 */
export type CompletedExerciseData = {
  id: string
  name: string
  metricType: MetricType
  sets: CompletedSetData[]
  notes?: string | null
}

/**
 * Props for the completed session drawer
 * Can accept either just-completed session data or historical session data
 */
export type CompletedSessionData = {
  sessionId: string
  workoutName: string
  startTime: number | Date
  endTime: number | Date
  durationSeconds: number
  exercises: CompletedExerciseData[]
  sessionNotes?: string | null
}

interface CompletedSessionDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: CompletedSessionData | null
  onClose?: () => void
  actionLabel?: string
  onAction?: () => void
}

// ============================================================================
// COMPONENT
// ============================================================================

export function CompletedSessionDrawer({
  open,
  onOpenChange,
  data,
  onClose,
  actionLabel = 'Done',
  onAction,
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

  const handleClose = () => {
    onOpenChange(false)
    onClose?.()
  }

  const handleAction = () => {
    onAction?.()
    handleClose()
  }

  if (!data) return null

  const startDate = new Date(data.startTime)

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="custom-drawer">
        <DrawerHeader className="text-center pb-2">
          <div className="flex justify-center mb-2">
            <div className="rounded-full bg-green-100 dark:bg-green-900 p-3">
              <Trophy className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <DrawerTitle className="text-2xl">Workout Complete!</DrawerTitle>
          <DrawerDescription className="text-base">{data.workoutName}</DrawerDescription>
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

            <Separator />

            {/* Exercises List */}
            <div className="space-y-4">
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
          <Button onClick={handleAction} size="lg" className="w-full">
            {actionLabel}
          </Button>
          <DrawerClose asChild>
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
          </DrawerClose>
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
    <div className={cn('flex items-center gap-3 rounded-lg border bg-muted/30 p-3', className)}>
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
    <div className="rounded-lg border p-4 space-y-3">
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

  return (
    <div
      className={cn(
        'flex items-center justify-between text-sm py-1 px-2 rounded',
        set.isCompleted ? 'bg-green-50 dark:bg-green-950/30' : 'bg-muted/50 opacity-60'
      )}
    >
      <span className="text-muted-foreground">Set {set.setNumber}</span>
      <div className="flex items-center gap-2">
        <span className={set.isCompleted ? 'font-medium' : 'text-muted-foreground'}>
          {valueDisplay}
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

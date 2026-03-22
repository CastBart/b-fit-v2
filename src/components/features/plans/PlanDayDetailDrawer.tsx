'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Check,
  Minus,
  MoreHorizontal,
  Play,
  Clock,
  Calendar,
  Dumbbell,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react'
import { useAppDispatch } from '@/store/hooks'
import { startPlanDaySession } from '@/lib/utils/session-navigation'
import { useActiveSessionGuard } from '@/hooks/useActiveSessionGuard'
import { useSession } from '@/hooks/queries/useSession'
import { PlanDayOptionsDrawer } from '@/components/features/plans/PlanDayOptionsDrawer'
import { formatDuration } from '@/lib/utils/format-time'
import { cn } from '@/lib/utils'
import type { ActivePlanDashboard, DayCompletionInfo } from '@/types/plan'
import type { MetricType } from '@prisma/client'

interface PlanDayDetailDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  day: ActivePlanDashboard['days'][number] | null
  planId: string
  planName: string
  weekNumber: number
  completion: DayCompletionInfo | null
  isActiveWeek: boolean
}

export function PlanDayDetailDrawer({
  open,
  onOpenChange,
  day,
  planId,
  planName,
  weekNumber,
  completion,
  isActiveWeek,
}: PlanDayDetailDrawerProps) {
  const router = useRouter()
  const dispatch = useAppDispatch()
  const { guardedStart } = useActiveSessionGuard()
  const [optionsOpen, setOptionsOpen] = useState(false)

  const isCompleted = completion?.status === 'COMPLETED'
  const sessionId = isCompleted ? completion?.sessionId : undefined

  // Fetch session details when drawer is open for a completed day
  const { data: sessionData, isLoading: isLoadingSession } = useSession(
    open && sessionId ? sessionId : undefined
  )

  if (!day) return null

  const isPending = !completion
  const isSkipped = completion?.status === 'SKIPPED'
  const canStart = isPending && isActiveWeek
  const dayLabel = day.label || `Day ${day.dayNumber}`

  const totalSets = day.exercises.reduce((sum, e) => sum + e.sets, 0)

  const handleStart = () => {
    guardedStart(() => {
      startPlanDaySession(
        {
          planId,
          planDayId: day.id,
          sessionName: dayLabel,
          exercises: day.exercises,
        },
        dispatch,
        router
      )
      onOpenChange(false)
    })
  }

  const handleClose = () => {
    onOpenChange(false)
  }

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange} handleOnly repositionInputs={false}>
        <DrawerContent className="custom-drawer justify-self-center">
          <DrawerHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DrawerTitle className="text-xl">{dayLabel}</DrawerTitle>
                {isCompleted && (
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-0">
                    <Check className="mr-1 h-3 w-3" />
                    Completed
                  </Badge>
                )}
                {isSkipped && (
                  <Badge variant="secondary">
                    <Minus className="mr-1 h-3 w-3" />
                    Skipped
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setOptionsOpen(true)}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
            <DrawerDescription className="hidden">Plan day details</DrawerDescription>
          </DrawerHeader>

          <ScrollArea className="flex-1 px-6">
            <div className="pb-6 space-y-4">
              {/* Meta info */}
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">From: {planName}</p>
                <p className="text-sm text-muted-foreground">Week {weekNumber}</p>
                {isCompleted && completion?.completedAt && (
                  <p className="text-sm text-muted-foreground">
                    Completed {new Date(completion.completedAt).toLocaleDateString()}
                  </p>
                )}
                {isSkipped && completion?.completedAt && (
                  <p className="text-sm text-muted-foreground">
                    Skipped {new Date(completion.completedAt).toLocaleDateString()}
                  </p>
                )}
              </div>

              <Separator />

              {/* Pending day - exercise list */}
              {isPending && day.exercises.length > 0 && (
                <>
                  <p className="text-sm text-muted-foreground">
                    {day.exercises.length} exercises · {totalSets} total sets
                  </p>
                  <div className="space-y-2">
                    {day.exercises.map((exercise) => (
                      <div
                        key={exercise.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <span className="text-sm font-medium">{exercise.exercise.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {exercise.sets}x{exercise.reps ?? '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Completed day - inline session details */}
              {isCompleted && (
                <>
                  {isLoadingSession ? (
                    <CompletedSessionSkeleton />
                  ) : sessionData ? (
                    <CompletedSessionInline session={sessionData} />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {day.exercises.length} exercises · {totalSets} total sets
                    </p>
                  )}
                </>
              )}

              {/* Start button for pending + active week */}
              {canStart && day.exercises.length > 0 && (
                <Button className="w-full" size="lg" onClick={handleStart}>
                  <Play className="mr-2 h-5 w-5" />
                  Start Workout
                </Button>
              )}

              {canStart && day.exercises.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No exercises added to this day yet.
                </p>
              )}
            </div>
          </ScrollArea>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline">Close</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Options Drawer */}
      <PlanDayOptionsDrawer
        open={optionsOpen}
        onOpenChange={setOptionsOpen}
        planId={planId}
        planDayId={day.id}
        dayNumber={day.dayNumber}
        sessionName={dayLabel}
        exercises={day.exercises}
        canStart={canStart && day.exercises.length > 0}
        canSkip={isPending && isActiveWeek}
        onStartSession={() => {
          handleStart()
          setOptionsOpen(false)
        }}
        onClose={() => {
          setOptionsOpen(false)
          handleClose()
        }}
      />
    </>
  )
}

// ============================================================================
// Completed Session Inline Display
// ============================================================================

type SessionWithDetails = {
  id: string
  name: string | null
  startedAt: Date
  completedAt: Date | null
  notes: string | null
  exercises: Array<{
    id: string
    exerciseId: string
    instanceId: string
    order: number
    targetSets: number
    targetReps: number | null
    targetWeight: number | null
    notes: string | null
    exercise: {
      id: string
      name: string
      metricType: string
      exerciseType: string
    }
    sets: Array<{
      id: string
      setNumber: number
      weight: number | null
      reps: number | null
      duration: number | null
      distance: number | null
      counterWeight: number | null
      isCompleted: boolean
    }>
  }>
}

function CompletedSessionInline({ session }: { session: SessionWithDetails }) {
  const stats = useMemo(() => {
    let totalSets = 0
    let completedSets = 0
    let totalVolume = 0

    session.exercises.forEach((exercise) => {
      exercise.sets.forEach((set) => {
        totalSets++
        if (set.isCompleted) {
          completedSets++
          if (set.weight && set.reps) {
            totalVolume += set.weight * set.reps
          }
        }
      })
    })

    const durationSeconds =
      session.startedAt && session.completedAt
        ? Math.floor(
            (new Date(session.completedAt).getTime() - new Date(session.startedAt).getTime()) / 1000
          )
        : 0

    return {
      totalExercises: session.exercises.length,
      totalSets,
      completedSets,
      totalVolume,
      durationSeconds,
    }
  }, [session])

  const startDate = new Date(session.startedAt)

  return (
    <div className="space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<Clock className="h-4 w-4" />}
          label="Duration"
          value={formatDuration(stats.durationSeconds)}
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
          value={`${stats.totalExercises}`}
        />
        <StatCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Sets"
          value={`${stats.completedSets}/${stats.totalSets}`}
        />
        {stats.totalVolume > 0 && (
          <StatCard
            icon={<TrendingUp className="h-4 w-4" />}
            label="Volume"
            value={`${stats.totalVolume.toLocaleString()} kg`}
            className="col-span-2"
          />
        )}
      </div>

      <Separator />

      {/* Exercises */}
      <div className="space-y-4">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          Exercises
        </h3>
        {session.exercises.map((exercise) => (
          <ExerciseCard key={exercise.id} exercise={exercise} />
        ))}
      </div>

      {/* Session Notes */}
      {session.notes && (
        <>
          <Separator />
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Notes
            </h3>
            <p className="text-sm text-muted-foreground">{session.notes}</p>
          </div>
        </>
      )}
    </div>
  )
}

// ============================================================================
// Sub-components (mirroring CompletedSessionDrawer patterns)
// ============================================================================

function StatCard({
  icon,
  label,
  value,
  className,
}: {
  icon: React.ReactNode
  label: string
  value: string
  className?: string
}) {
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

function ExerciseCard({ exercise }: { exercise: SessionWithDetails['exercises'][number] }) {
  const completedSets = exercise.sets.filter((s) => s.isCompleted).length
  const totalSets = exercise.sets.length
  const allCompleted = completedSets === totalSets && totalSets > 0

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {allCompleted && <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />}
          <span className="font-medium">{exercise.exercise.name}</span>
        </div>
        <span className="text-sm text-muted-foreground">
          {completedSets}/{totalSets} sets
        </span>
      </div>

      <div className="space-y-1">
        {exercise.sets.map((set) => (
          <SetRow
            key={set.setNumber}
            set={set}
            metricType={exercise.exercise.metricType as MetricType}
          />
        ))}
      </div>

      {exercise.notes && <p className="text-xs text-muted-foreground italic">{exercise.notes}</p>}
    </div>
  )
}

function SetRow({
  set,
  metricType,
}: {
  set: SessionWithDetails['exercises'][number]['sets'][number]
  metricType: MetricType
}) {
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

function formatSetValue(
  set: SessionWithDetails['exercises'][number]['sets'][number],
  metricType: MetricType
): string {
  if (!set.isCompleted) return '—'

  switch (metricType) {
    case 'WEIGHT_REPS':
      return `${set.weight ?? 0} kg x ${set.reps ?? 0}`
    case 'COUNTER_WEIGHT_REPS':
      return `${set.counterWeight ?? 0} kg assist x ${set.reps ?? 0}`
    case 'REPS':
      return `${set.reps ?? 0} reps`
    case 'REPS_DURATION':
      return `${set.reps ?? 0} reps, ${set.duration ?? 0}s`
    case 'DURATION':
      return `${set.duration ?? 0}s`
    case 'DISTANCE_DURATION':
      return `${set.distance ?? 0}m in ${set.duration ?? 0}s`
    case 'WEIGHT_DISTANCE':
      return `${set.weight ?? 0} kg x ${set.distance ?? 0}m`
    case 'WEIGHT_DURATION':
      return `${set.weight ?? 0} kg x ${set.duration ?? 0}s`
    default:
      return '—'
  }
}

// ============================================================================
// Skeleton
// ============================================================================

function CompletedSessionSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
      <Separator />
      <Skeleton className="h-4 w-20" />
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-24" />
      ))}
    </div>
  )
}

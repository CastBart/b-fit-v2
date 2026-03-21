'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ChevronLeft, ChevronRight, ClipboardList, Check, Minus } from 'lucide-react'
import { useActivePlanDashboard } from '@/hooks/queries/useActivePlanDashboard'
import { PlanDayDetailDrawer } from '@/components/features/plans/PlanDayDetailDrawer'
import type { ActivePlanDashboard, DayCompletionInfo } from '@/types/plan'
import { cn } from '@/lib/utils'

export function ActivePlanSection() {
  const [viewedWeekNumber, setViewedWeekNumber] = useState<number | undefined>(undefined)
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null)

  const { data, isLoading, isError } = useActivePlanDashboard(viewedWeekNumber)

  // Sync viewed week with server data when it loads
  useEffect(() => {
    if (data && 'activeWeekNumber' in data && viewedWeekNumber === undefined) {
      setViewedWeekNumber(data.activeWeekNumber)
    }
  }, [data, viewedWeekNumber])

  if (isLoading) {
    return <ActivePlanSkeleton />
  }

  if (isError || !data) {
    return null
  }

  // No active plan
  if (!('plan' in data) || !data.plan) {
    return <EmptyActivePlan />
  }

  const planData = data as ActivePlanDashboard
  const { plan, weeks, activeWeekNumber, days, weekCompletions } = planData
  const currentViewedWeek = viewedWeekNumber ?? activeWeekNumber

  const maxWeek = weeks.length > 0 ? Math.max(...weeks.map((w) => w.weekNumber)) : 1
  const isActiveWeek = currentViewedWeek === activeWeekNumber

  const completedDaysCount = weekCompletions.length
  const totalDays = days.length

  const getCompletionForDay = (dayId: string): DayCompletionInfo | null => {
    return weekCompletions.find((c) => c.planDayId === dayId) ?? null
  }

  const handlePrevWeek = () => {
    if (currentViewedWeek > 1) {
      setViewedWeekNumber(currentViewedWeek - 1)
    }
  }

  const handleNextWeek = () => {
    if (currentViewedWeek < maxWeek) {
      setViewedWeekNumber(currentViewedWeek + 1)
    }
  }

  const selectedDay = selectedDayIndex !== null ? (days[selectedDayIndex] ?? null) : null

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl lg:text-2xl tracking-tight">
              <ClipboardList className="h-5 w-5" />
              Active Plan
            </CardTitle>
            {/* Week Navigation */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handlePrevWeek}
                disabled={currentViewedWeek <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[90px] text-center">
                Week {currentViewedWeek}
                {plan.durationWeeks > 0 ? ` of ${plan.durationWeeks}` : ''}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleNextWeek}
                disabled={currentViewedWeek >= maxWeek}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">{plan.name}</p>
            <p className="text-xs text-muted-foreground">
              {completedDaysCount} of {totalDays} days complete
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:overflow-x-auto sm:pb-1">
            {days.map((day, index) => {
              const completion = getCompletionForDay(day.id)
              return (
                <DayCard
                  key={day.id}
                  dayNumber={day.dayNumber}
                  label={day.label}
                  exercises={day.exercises}
                  completion={completion}
                  onClick={() => setSelectedDayIndex(index)}
                />
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Day Detail Drawer */}
      <PlanDayDetailDrawer
        open={selectedDayIndex !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedDayIndex(null)
        }}
        day={selectedDay}
        planId={plan.id}
        planName={plan.name}
        weekNumber={currentViewedWeek}
        completion={selectedDay ? getCompletionForDay(selectedDay.id) : null}
        isActiveWeek={isActiveWeek}
      />
    </>
  )
}

// ============================================================================
// Day Card
// ============================================================================

function DayCard({
  dayNumber,
  label,
  exercises,
  completion,
  onClick,
}: {
  dayNumber: number
  label: string | null
  exercises: Array<{ exercise: { name: string } }>
  completion: DayCompletionInfo | null
  onClick: () => void
}) {
  const isCompleted = completion?.status === 'COMPLETED'
  const isSkipped = completion?.status === 'SKIPPED'

  // Build exercise abbreviations: first 2 chars of first 3 exercise names
  const exerciseAbbrevs = exercises.slice(0, 3).map((e) => {
    const name = e.exercise.name
    // Take first 2 uppercase chars, or first 2 chars
    const abbrev = name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
    return abbrev
  })
  const remaining = exercises.length - 3
  const exerciseSummary = exerciseAbbrevs.join(', ') + (remaining > 0 ? ` +${remaining}` : '')

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex min-w-[100px] flex-col gap-1 rounded-lg border p-3 text-left transition-colors hover:bg-accent/50',
        isCompleted && 'border-green-500/50 bg-green-50 dark:bg-green-950/30',
        isSkipped && 'border-muted bg-muted/50'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-bold">{dayNumber}</span>
        {isCompleted && <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />}
        {isSkipped && <Minus className="h-3.5 w-3.5 text-muted-foreground" />}
      </div>
      <span className="text-xs font-medium truncate max-w-[80px]">
        {label || `Day ${dayNumber}`}
      </span>
      {exercises.length > 0 && (
        <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">
          {exerciseSummary}
        </span>
      )}
    </button>
  )
}

// ============================================================================
// Empty State
// ============================================================================

function EmptyActivePlan() {
  const router = useRouter()

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-8">
        <ClipboardList className="h-10 w-10 text-muted-foreground" />
        <div className="text-center">
          <p className="font-medium">No Active Plan</p>
          <p className="text-sm text-muted-foreground">Get started by activating a plan</p>
        </div>
        <Button variant="outline" onClick={() => router.push('/plans')}>
          Browse Plans
        </Button>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Skeleton
// ============================================================================

function ActivePlanSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-28" />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 min-w-[100px]" />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

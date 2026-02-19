'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, Dumbbell, TrendingUp } from 'lucide-react'
import { formatDuration } from '@/lib/utils/format-time'
import type { TrainingSessionWithDetails } from '@/types/session'

interface SessionRowCardProps {
  session: TrainingSessionWithDetails
  onClick?: () => void
}

function getStatusVariant(status: string): 'default' | 'destructive' | 'secondary' {
  if (status === 'COMPLETED') return 'default'
  if (status === 'ABANDONED') return 'destructive'
  return 'secondary'
}

function calcSessionStats(session: TrainingSessionWithDetails) {
  const startTime = new Date(session.startedAt)
  const endTime = session.completedAt ? new Date(session.completedAt) : startTime
  const durationSeconds = Math.round((endTime.getTime() - startTime.getTime()) / 1000)
  const exerciseCount = session.exercises.length
  const completedSets = session.sets?.filter((s) => s.isCompleted).length ?? 0

  let totalVolume = 0
  session.exercises.forEach((exercise) => {
    exercise.sets.forEach((set) => {
      if (set.isCompleted && set.weight && set.reps) {
        totalVolume += set.weight * set.reps
      }
    })
  })

  return { startTime, durationSeconds, exerciseCount, completedSets, totalVolume }
}

export function SessionRowCard({ session, onClick }: SessionRowCardProps) {
  const { startTime, durationSeconds, exerciseCount, completedSets, totalVolume } =
    calcSessionStats(session)

  const statusVariant = getStatusVariant(session.status)

  const dateStr = startTime.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
  const timeStr = startTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  return (
    <Card
      className="group cursor-pointer transition-colors hover:bg-muted/50 hover:border-primary/20"
      onClick={onClick}
    >
      {/* ── Desktop: single-row columns ── */}
      <div className="hidden lg:grid lg:grid-cols-[1fr_auto_auto_auto_auto] items-center gap-6 px-4 py-3">
        {/* Name + date */}
        <div className="min-w-0">
          <p className="font-medium leading-none line-clamp-1">
            {session.name ?? 'Untitled Session'}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {dateStr} at {timeStr}
          </p>
        </div>

        {/* Status */}
        <Badge variant={statusVariant} className="text-xs capitalize">
          {session.status.toLowerCase()}
        </Badge>

        {/* Duration */}
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          <Clock className="mr-1 inline h-3.5 w-3.5" />
          {formatDuration(durationSeconds)}
        </span>

        {/* Exercises */}
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          <Dumbbell className="mr-1 inline h-3.5 w-3.5" />
          {exerciseCount} exercises
        </span>

        {/* Sets + Volume */}
        <div className="flex items-center gap-3 text-sm text-muted-foreground whitespace-nowrap">
          <span>{completedSets} sets</span>
          {totalVolume > 0 && (
            <span>
              <TrendingUp className="mr-1 inline h-3.5 w-3.5" />
              {totalVolume.toLocaleString()} kg
            </span>
          )}
        </div>
      </div>

      {/* ── Mobile: stacked layout ── */}
      <div className="lg:hidden p-3 space-y-1.5">
        {/* Row 1: Name + Status */}
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium leading-none line-clamp-1 flex-1">
            {session.name ?? 'Untitled Session'}
          </p>
          <Badge variant={statusVariant} className="text-xs capitalize shrink-0">
            {session.status.toLowerCase()}
          </Badge>
        </div>

        {/* Row 2: date · duration · exercises · sets · volume */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
          <span className="shrink-0">
            {dateStr} at {timeStr}
          </span>
          <span className="shrink-0">·</span>
          <span className="shrink-0">
            <Clock className="mr-0.5 inline h-3 w-3" />
            {formatDuration(durationSeconds)}
          </span>
          <span className="shrink-0">·</span>
          <span className="shrink-0">
            <Dumbbell className="mr-0.5 inline h-3 w-3" />
            {exerciseCount}
          </span>
          <span className="shrink-0">·</span>
          <span className="shrink-0">{completedSets} sets</span>
          {totalVolume > 0 && (
            <>
              <span className="shrink-0">·</span>
              <span className="shrink-0">
                <TrendingUp className="mr-0.5 inline h-3 w-3" />
                {totalVolume.toLocaleString()} kg
              </span>
            </>
          )}
        </div>
      </div>
    </Card>
  )
}

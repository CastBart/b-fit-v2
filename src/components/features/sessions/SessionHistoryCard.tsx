'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, Dumbbell, TrendingUp, ChevronRight } from 'lucide-react'
import { formatDuration } from '@/lib/utils/format-time'
import type { TrainingSessionWithDetails } from '@/types/session'

interface SessionHistoryCardProps {
  session: TrainingSessionWithDetails
  onClick?: () => void
}

export function SessionHistoryCard({ session, onClick }: SessionHistoryCardProps) {
  const startTime = new Date(session.startedAt)
  const endTime = session.completedAt ? new Date(session.completedAt) : startTime
  const durationSeconds = Math.round((endTime.getTime() - startTime.getTime()) / 1000)

  const exerciseCount = session.exercises.length
  const completedSets = session.sets?.filter((s) => s.isCompleted).length ?? 0

  // Calculate total volume
  let totalVolume = 0
  session.exercises.forEach((exercise) => {
    exercise.sets.forEach((set) => {
      if (set.isCompleted && set.weight && set.reps) {
        totalVolume += set.weight * set.reps
      }
    })
  })

  const statusVariant =
    session.status === 'COMPLETED'
      ? 'default'
      : session.status === 'ABANDONED'
        ? 'destructive'
        : 'secondary'

  return (
    <Card className="group cursor-pointer transition-all hover:shadow-lg" onClick={onClick}>
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold line-clamp-1">{session.name ?? 'Untitled Session'}</h3>
            <p className="text-sm text-muted-foreground">
              {startTime.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
              {' at '}
              {startTime.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              })}
            </p>
          </div>
          <div className="flex items-center gap-2 ml-2">
            <Badge variant={statusVariant} className="text-xs capitalize">
              {session.status.toLowerCase()}
            </Badge>
            <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>{formatDuration(durationSeconds)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Dumbbell className="h-3.5 w-3.5" />
            <span>{exerciseCount} exercises</span>
          </div>
          <div className="flex items-center gap-1">
            <span>{completedSets} sets</span>
          </div>
          {totalVolume > 0 && (
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>{totalVolume.toLocaleString()} kg</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

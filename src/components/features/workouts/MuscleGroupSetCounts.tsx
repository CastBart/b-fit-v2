/**
 * Muscle Group Set Counts
 *
 * Compact breakdown of weighted set counts per muscle group (primary 1.0 /
 * secondary 0.5). Fed by `computeMuscleGroupSetCounts`. Renders nothing when
 * there are no counts.
 *
 * Used on workout preview/detail, plan day/detail, and completed-session views.
 */

'use client'

import { Badge } from '@/components/ui/badge'
import { MuscleGroupLabels } from '@/types/exercise'
import { formatSetCount, type MuscleGroupSetCount } from '@/lib/analytics/muscle-set-counts'
import type { MuscleGroup } from '@prisma/client'

interface MuscleGroupSetCountsProps {
  counts: MuscleGroupSetCount[]
  title?: string
  className?: string
}

export function MuscleGroupSetCounts({
  counts,
  title = 'Sets per muscle group',
  className,
}: MuscleGroupSetCountsProps) {
  if (counts.length === 0) return null

  return (
    <div className={className}>
      <h3 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        {title}
      </h3>
      <div className="flex flex-wrap gap-2">
        {counts.map(({ muscleGroup, sets }) => (
          <Badge key={muscleGroup} variant="secondary" className="font-normal">
            <span className="font-medium">{MuscleGroupLabels[muscleGroup as MuscleGroup]}</span>
            <span className="ml-1.5 text-muted-foreground">{formatSetCount(sets)}</span>
          </Badge>
        ))}
      </div>
    </div>
  )
}

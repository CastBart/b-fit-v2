'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { TrendingUp, Trophy } from 'lucide-react'
import type { PRSummary, PRType } from '@/types/analytics'

const PR_TYPE_LABELS: Record<PRType, string> = {
  WEIGHT: 'Weight',
  DURATION: 'Duration',
  DISTANCE: 'Distance',
  REPS: 'Reps',
  VOLUME: 'Volume',
}

const PR_TYPE_UNITS: Record<PRType, string> = {
  WEIGHT: 'kg',
  DURATION: 's',
  DISTANCE: 'm',
  REPS: 'reps',
  VOLUME: 'kg',
}

interface PRSummaryCardProps {
  data: PRSummary | undefined
  isLoading: boolean
}

export function PRSummaryCard({ data, isLoading }: PRSummaryCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personal Records</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    )
  }

  const totalPRs = data?.totalPRs ?? 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Personal Records</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total PRs */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-yellow-500/10">
            <Trophy className="h-6 w-6 text-yellow-500" />
          </div>
          <div>
            <p className="text-2xl font-bold">{totalPRs}</p>
            <p className="text-sm text-muted-foreground">PRs in this period</p>
          </div>
        </div>

        {/* Recent PRs list */}
        {data && data.recentPRs.length > 0 ? (
          <div className="space-y-2">
            {data.recentPRs.slice(0, 5).map((pr, index) => (
              <div
                key={`${pr.exerciseId}-${pr.prType}-${index}`}
                className="flex items-center justify-between rounded-lg border p-2.5"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <TrendingUp className="h-4 w-4 shrink-0 text-green-500" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{pr.exerciseName}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(pr.date).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-semibold">
                    {pr.value} {PR_TYPE_UNITS[pr.prType]}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {PR_TYPE_LABELS[pr.prType]}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No PRs yet in this period. Keep training!</p>
        )}
      </CardContent>
    </Card>
  )
}

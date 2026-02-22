'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Activity, Calendar, Target } from 'lucide-react'
import type { FrequencyStats, AdherenceStats } from '@/types/analytics'

interface FrequencyCardProps {
  frequency: FrequencyStats | undefined
  adherence: AdherenceStats | null | undefined
  isLoading: boolean
}

export function FrequencyCard({ frequency, adherence, isLoading }: FrequencyCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Training Frequency</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Training Frequency</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Sessions per week */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">Sessions / week</p>
            <p className="text-xl font-bold">{frequency?.sessionsPerWeek ?? 0}</p>
          </div>
        </div>

        {/* Consistency */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-500/10">
            <Calendar className="h-5 w-5 text-green-500" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Consistency</p>
              <p className="text-sm font-medium">{frequency?.consistencyScore ?? 0}%</p>
            </div>
            <div className="mt-1.5 h-2 w-full rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-green-500 transition-all"
                style={{ width: `${Math.min(frequency?.consistencyScore ?? 0, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Plan adherence */}
        {adherence && (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
              <Target className="h-5 w-5 text-blue-500" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Plan Adherence</p>
                <p className="text-sm font-medium">{adherence.adherenceRate}%</p>
              </div>
              <div className="mt-1.5 h-2 w-full rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all"
                  style={{ width: `${Math.min(adherence.adherenceRate, 100)}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {adherence.completedDays} / {adherence.totalDays} plan days
              </p>
            </div>
          </div>
        )}

        {/* Total sessions */}
        <p className="text-xs text-muted-foreground pt-2 border-t">
          {frequency?.totalSessions ?? 0} sessions over {frequency?.weeks ?? 0} weeks
        </p>
      </CardContent>
    </Card>
  )
}

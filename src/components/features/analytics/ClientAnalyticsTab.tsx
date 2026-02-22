'use client'

import { useState } from 'react'
import { useClientAnalytics } from '@/hooks/queries/useAnalytics'
import { DateRangeSelector } from '@/components/features/analytics/DateRangeSelector'
import { VolumeChart } from '@/components/features/analytics/VolumeChart'
import { MuscleGroupChart } from '@/components/features/analytics/MuscleGroupChart'
import { FrequencyCard } from '@/components/features/analytics/FrequencyCard'
import { PRSummaryCard } from '@/components/features/analytics/PRSummaryCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { BarChart3, Dumbbell, PlayCircle, TrendingUp } from 'lucide-react'
import type { DateRangePreset } from '@/types/analytics'

interface ClientAnalyticsTabProps {
  clientId: string
}

export function ClientAnalyticsTab({ clientId }: ClientAnalyticsTabProps) {
  const [dateRange, setDateRange] = useState<DateRangePreset>('30d')
  const { data, isLoading } = useClientAnalytics(clientId, dateRange)

  return (
    <div className="space-y-6">
      {/* Date range selector */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Performance overview</p>
        <DateRangeSelector value={dateRange} onValueChange={setDateRange} />
      </div>

      {/* Mini stats grid */}
      <ClientStatsGrid
        totalWorkouts={data?.totalWorkouts}
        sessionsCompleted={data?.sessionsCompleted}
        totalVolume={data?.totalVolume}
        personalRecords={data?.personalRecords}
        isLoading={isLoading}
      />

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <VolumeChart data={data?.volumeProgression ?? []} isLoading={isLoading} />
        <MuscleGroupChart data={data?.muscleGroupDistribution ?? []} isLoading={isLoading} />
      </div>

      {/* Frequency & PRs */}
      <div className="grid gap-4 md:grid-cols-2">
        <FrequencyCard
          frequency={data?.frequency}
          adherence={data?.adherence}
          isLoading={isLoading}
        />
        <PRSummaryCard data={data?.prSummary} isLoading={isLoading} />
      </div>
    </div>
  )
}

// ============================================================================
// MINI STATS GRID (client-specific, doesn't use useDashboardStats)
// ============================================================================

interface ClientStatsGridProps {
  totalWorkouts: number | undefined
  sessionsCompleted: number | undefined
  totalVolume: number | undefined
  personalRecords: number | undefined
  isLoading: boolean
}

function ClientStatsGrid({
  totalWorkouts,
  sessionsCompleted,
  totalVolume,
  personalRecords,
  isLoading,
}: ClientStatsGridProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-7 w-20 mb-1" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const stats = [
    { title: 'Workouts', value: totalWorkouts ?? 0, icon: Dumbbell },
    { title: 'Sessions', value: sessionsCompleted ?? 0, icon: PlayCircle },
    { title: 'Volume', value: `${(totalVolume ?? 0).toLocaleString()} kg`, icon: BarChart3 },
    { title: 'PRs (month)', value: personalRecords ?? 0, icon: TrendingUp },
  ]

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

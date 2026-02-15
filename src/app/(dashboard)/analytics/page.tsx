'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRightLeft } from 'lucide-react'
import { useAnalyticsOverview, useVolumeProgression } from '@/hooks/queries/useAnalytics'
import { DateRangeSelector } from '@/components/features/analytics/DateRangeSelector'
import { ExerciseFilter } from '@/components/features/analytics/ExerciseFilter'
import { VolumeChart } from '@/components/features/analytics/VolumeChart'
import { MuscleGroupChart } from '@/components/features/analytics/MuscleGroupChart'
import { FrequencyCard } from '@/components/features/analytics/FrequencyCard'
import { PRSummaryCard } from '@/components/features/analytics/PRSummaryCard'
import { StatsGrid } from '@/components/features/dashboard/StatsGrid'
import type { DateRangePreset } from '@/types/analytics'

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRangePreset>('30d')
  const [exerciseId, setExerciseId] = useState<string | undefined>(undefined)

  const { data, isLoading } = useAnalyticsOverview(dateRange)

  // Use separate query for exercise-filtered volume chart
  const { data: filteredVolume, isLoading: volumeLoading } = useVolumeProgression(
    dateRange,
    exerciseId
  )

  // When exercise filter is active, use the filtered data; otherwise use overview data
  const volumeData = exerciseId ? filteredVolume : data?.volumeProgression
  const volumeIsLoading = exerciseId ? volumeLoading : isLoading

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Track your training progress and performance trends.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangeSelector value={dateRange} onValueChange={setDateRange} />
          <Button variant="outline" size="sm" asChild>
            <Link href="/analytics/compare">
              <ArrowRightLeft className="mr-2 h-4 w-4" />
              Compare
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid (reused from dashboard) */}
      <StatsGrid />

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <ExerciseFilter value={exerciseId} onValueChange={setExerciseId} />
          </div>
          <VolumeChart
            data={volumeData ?? []}
            isLoading={volumeIsLoading}
            title={exerciseId ? 'Exercise Volume' : 'Total Volume'}
          />
        </div>
        <MuscleGroupChart data={data?.muscleGroupDistribution ?? []} isLoading={isLoading} />
      </div>

      {/* Frequency & PRs Row */}
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

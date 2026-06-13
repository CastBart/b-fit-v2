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
import { MuscleGroupSetsChart } from '@/components/features/analytics/MuscleGroupSetsChart'
import { FrequencyCard } from '@/components/features/analytics/FrequencyCard'
import { PRSummaryCard } from '@/components/features/analytics/PRSummaryCard'
import { StatsGrid } from '@/components/features/dashboard/StatsGrid'
import type { DateRangePreset } from '@/types/analytics'

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRangePreset>('30d')
  const [exerciseId, setExerciseId] = useState<string | undefined>(undefined)
  const [customStart, setCustomStart] = useState<Date | undefined>(undefined)
  const [customEnd, setCustomEnd] = useState<Date | undefined>(undefined)

  // A custom range only drives queries once both bounds are picked; until then
  // fall back to the default preset so the page still shows data.
  const customReady = dateRange !== 'custom' || (!!customStart && !!customEnd)
  const effectiveRange: DateRangePreset = customReady ? dateRange : '30d'
  const custom = { startDate: customStart, endDate: customEnd }

  const { data, isLoading } = useAnalyticsOverview(effectiveRange, custom)

  // Use separate query for exercise-filtered volume chart
  const { data: filteredVolume, isLoading: volumeLoading } = useVolumeProgression(
    effectiveRange,
    exerciseId,
    custom
  )

  // When exercise filter is active, use the filtered data; otherwise use overview data
  const volumeData = exerciseId ? filteredVolume : data?.volumeProgression
  const volumeIsLoading = exerciseId ? volumeLoading : isLoading

  return (
    <div className="container mx-auto flex h-[calc(100dvh-4.5rem)] flex-col px-4 pt-4 sm:px-6 sm:pt-6 md:h-[calc(100dvh-1rem)]">
      {/* Header */}
      <div className="mb-4 shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="hidden sm:block mt-1 text-muted-foreground">
            Track your training progress and performance trends.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangeSelector
            value={dateRange}
            onValueChange={setDateRange}
            customStart={customStart}
            customEnd={customEnd}
            onCustomRangeChange={(start, end) => {
              setCustomStart(start)
              setCustomEnd(end)
            }}
          />
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

      {/* Set distribution by muscle group */}
      <div className="grid gap-4 md:grid-cols-2">
        <MuscleGroupSetsChart data={data?.muscleGroupSetCounts ?? []} isLoading={isLoading} />
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

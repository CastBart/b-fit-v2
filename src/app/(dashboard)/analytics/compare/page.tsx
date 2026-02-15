'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useExerciseComparison } from '@/hooks/queries/useAnalytics'
import { DateRangeSelector } from '@/components/features/analytics/DateRangeSelector'
import { ExerciseMultiSelect } from '@/components/features/analytics/ExerciseMultiSelect'
import { ComparisonChart } from '@/components/features/analytics/ComparisonChart'
import type { DateRangePreset } from '@/types/analytics'

export default function ExerciseComparisonPage() {
  const [dateRange, setDateRange] = useState<DateRangePreset>('90d')
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([])

  const { data, isLoading } = useExerciseComparison(selectedExerciseIds, dateRange)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/analytics">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Compare Exercises</h1>
            <p className="text-muted-foreground">Compare volume progression across exercises.</p>
          </div>
        </div>
        <DateRangeSelector value={dateRange} onValueChange={setDateRange} />
      </div>

      {/* Layout: selector + chart */}
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <ExerciseMultiSelect
          selected={selectedExerciseIds}
          onSelectedChange={setSelectedExerciseIds}
        />
        <ComparisonChart data={data ?? []} isLoading={isLoading} />
      </div>
    </div>
  )
}

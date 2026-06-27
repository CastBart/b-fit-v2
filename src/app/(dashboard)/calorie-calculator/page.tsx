'use client'

import { useState } from 'react'
import { Calculator } from 'lucide-react'
import type { UserBodyMetrics } from '@prisma/client'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useBodyMetrics } from '@/hooks/queries/useBodyMetrics'
import { useUpsertBodyMetrics } from '@/hooks/mutations/useBodyMetricsMutations'
import { CalorieCalculatorForm } from '@/components/features/calorie-calculator/CalorieCalculatorForm'
import { CalorieResults } from '@/components/features/calorie-calculator/CalorieResults'
import type { BodyMetricsInput, SaveBodyMetricsInput } from '@/lib/validations/calorieMetrics'
import {
  DEFAULT_MACRO_PERCENTAGES,
  type CalorieResult,
  type MacroPercentages,
} from '@/lib/calorie/calculator'

export default function CalorieCalculatorPage() {
  const { data: metrics, isLoading } = useBodyMetrics()

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Calculator className="h-7 w-7" />
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Calorie Calculator</h1>
        </div>
        <p className="mt-1 text-muted-foreground">
          Work out your daily calorie target and macros from your body metrics and goal.
        </p>
      </div>

      {isLoading ? (
        <div className="grid max-w-4xl gap-6 lg:grid-cols-2">
          <Skeleton className="h-[560px] w-full" />
          <Skeleton className="h-[360px] w-full" />
        </div>
      ) : (
        <CalorieCalculatorContent metrics={metrics ?? null} />
      )}
    </div>
  )
}

/**
 * Post-load content. Split out so its `useState` initialisers run only after the
 * saved metrics are available (the parent renders a skeleton while loading).
 */
function CalorieCalculatorContent({ metrics }: { metrics: UserBodyMetrics | null }) {
  const upsertMutation = useUpsertBodyMetrics()
  const [result, setResult] = useState<CalorieResult | null>(null)
  const [percentages, setPercentages] = useState<MacroPercentages>(() =>
    metrics?.proteinPct != null && metrics.carbsPct != null && metrics.fatPct != null
      ? { protein: metrics.proteinPct, carbs: metrics.carbsPct, fat: metrics.fatPct }
      : DEFAULT_MACRO_PERCENTAGES
  )

  const defaultValues = metrics
    ? {
        heightCm: metrics.heightCm,
        weightKg: metrics.weightKg,
        dateOfBirth: new Date(metrics.dateOfBirth),
        sex: metrics.sex,
        activityLevel: metrics.activityLevel,
        goalDirection: metrics.goalDirection,
        weeklyRateLbs: metrics.weeklyRateLbs ?? undefined,
        unitPreference: metrics.unitPreference,
      }
    : undefined

  const total = percentages.protein + percentages.carbs + percentages.fat
  const percentagesValid = total === 100

  const handleSubmit = (data: BodyMetricsInput) => {
    const payload: SaveBodyMetricsInput = {
      ...data,
      proteinPct: percentages.protein,
      carbsPct: percentages.carbs,
      fatPct: percentages.fat,
    }
    upsertMutation.mutate(payload)
  }

  return (
    <div className="grid max-w-4xl gap-6 lg:grid-cols-2">
      <Card>
        <CardContent className="p-6">
          <CalorieCalculatorForm
            defaultValues={defaultValues}
            isSubmitting={upsertMutation.isPending}
            canSubmit={percentagesValid}
            onSubmit={handleSubmit}
            onResultChange={setResult}
          />
        </CardContent>
      </Card>

      <div className="lg:sticky lg:top-6 lg:self-start">
        <CalorieResults
          result={result}
          percentages={percentages}
          onPercentagesChange={setPercentages}
          onReset={() => setPercentages(DEFAULT_MACRO_PERCENTAGES)}
        />
      </div>
    </div>
  )
}

/**
 * Calorie Results
 *
 * Displays the live BMR / TDEE / daily target and an editable macro split.
 * Percentages are controlled by the parent (single source of truth, persisted
 * with the rest of the data); grams are derived from the target calories.
 */

'use client'

import { Flame, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  macrosFromPercentages,
  type CalorieResult,
  type MacroPercentages,
} from '@/lib/calorie/calculator'

interface CalorieResultsProps {
  result: CalorieResult | null
  percentages: MacroPercentages
  onPercentagesChange: (next: MacroPercentages) => void
  onReset?: () => void
}

const MACRO_META = [
  { key: 'protein', label: 'Protein', color: 'text-red-500' },
  { key: 'carbs', label: 'Carbs', color: 'text-amber-500' },
  { key: 'fat', label: 'Fat', color: 'text-blue-500' },
] as const

export function CalorieResults({
  result,
  percentages,
  onPercentagesChange,
  onReset,
}: CalorieResultsProps) {
  const total = percentages.protein + percentages.carbs + percentages.fat
  const totalValid = total === 100
  const grams = result ? macrosFromPercentages(result.targetCalories, percentages) : null

  const handlePctChange = (key: keyof MacroPercentages, value: string) => {
    const parsed = value === '' ? 0 : Math.round(Number(value))
    const clamped = Number.isNaN(parsed) ? 0 : Math.max(0, Math.min(100, parsed))
    onPercentagesChange({ ...percentages, [key]: clamped })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flame className="h-5 w-5" />
          Your daily target
        </CardTitle>
        <CardDescription>Based on the Mifflin-St Jeor equation</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!result ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Fill in your details to see your calorie target.
          </p>
        ) : (
          <>
            {/* Headline target */}
            <div className="rounded-lg bg-muted p-4 text-center">
              <div className="text-4xl font-bold">{result.targetCalories.toLocaleString()}</div>
              <div className="mt-1 text-sm text-muted-foreground">kcal / day</div>
              {result.floorApplied && (
                <div className="mt-2 text-xs text-amber-600">
                  Adjusted up to the {result.targetCalories.toLocaleString()} kcal daily minimum.
                </div>
              )}
            </div>

            {/* BMR + TDEE */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border p-3 text-center">
                <div className="text-xl font-semibold">{result.bmr.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">BMR (at rest)</div>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <div className="text-xl font-semibold">{result.tdee.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">TDEE (maintenance)</div>
              </div>
            </div>
          </>
        )}

        {/* Macros (editable) */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-sm font-medium">Macros</h4>
            {onReset && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2 text-xs"
                onClick={onReset}
              >
                <RotateCcw className="h-3 w-3" />
                Reset
              </Button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {MACRO_META.map(({ key, label, color }) => (
              <div key={key} className="rounded-lg border p-3 text-center">
                <div className={`text-xl font-semibold ${color}`}>
                  {grams ? `${grams[key]}g` : '—'}
                </div>
                <div className="mt-2 flex items-center justify-center gap-1">
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={100}
                    value={percentages[key]}
                    onChange={(e) => handlePctChange(key, e.target.value)}
                    className="h-8 w-14 text-center"
                    aria-label={`${label} percentage`}
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{label}</div>
              </div>
            ))}
          </div>

          <div className="mt-2 text-center text-xs">
            {totalValid ? (
              <span className="text-muted-foreground">Total: 100%</span>
            ) : (
              <span className="font-medium text-destructive">
                Macros must total 100% (currently {total}%)
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

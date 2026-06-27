/**
 * Calorie Calculator Form
 *
 * Captures body metrics + goal and emits live calorie results on every change.
 * Values are stored canonically in metric (and the weekly rate in lb); the
 * metric/imperial toggle only affects the height/weight/rate display inputs.
 */

'use client'

import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ActivityLevel, GoalDirection, Sex, UnitSystem } from '@prisma/client'
import { bodyMetricsSchema, type BodyMetricsInput } from '@/lib/validations/calorieMetrics'
import {
  ActivityLevelLabels,
  GoalDirectionLabels,
  SexLabels,
  calculateCalories,
  type CalorieResult,
} from '@/lib/calorie/calculator'
import { cmToFtIn, ftInToCm, kgToLbs, lbsToKg } from '@/lib/calorie/units'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type FormValues = z.input<typeof bodyMetricsSchema>

interface CalorieCalculatorFormProps {
  defaultValues?: Partial<FormValues>
  isSubmitting?: boolean
  /** When false, the submit button is disabled (e.g. macros don't total 100%). */
  canSubmit?: boolean
  onSubmit: (data: BodyMetricsInput) => void
  /** Fired on every change with the live result (or null if inputs incomplete). */
  onResultChange?: (result: CalorieResult | null) => void
}

const RATE_OPTIONS_LB = [0.5, 1, 1.5, 2]
const RATE_OPTIONS_KG = [0.25, 0.5, 0.75, 1]
const DEFAULT_RATE_LBS = 1

function toDateInputValue(date?: Date): string {
  if (!date) return ''
  return date.toISOString().slice(0, 10)
}

function nearestOption(value: number, options: number[]): number {
  return options.reduce(
    (best, o) => (Math.abs(o - value) < Math.abs(best - value) ? o : best),
    options[0]
  )
}

export function CalorieCalculatorForm({
  defaultValues,
  isSubmitting,
  canSubmit,
  onSubmit,
  onResultChange,
}: CalorieCalculatorFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(bodyMetricsSchema),
    mode: 'onChange',
    defaultValues: {
      sex: Sex.MALE,
      activityLevel: ActivityLevel.MODERATELY_ACTIVE,
      goalDirection: GoalDirection.MAINTAIN,
      weeklyRateLbs: undefined,
      unitPreference: UnitSystem.METRIC,
      ...defaultValues,
    },
  })

  const unit = form.watch('unitPreference') ?? UnitSystem.METRIC
  const goalDirection = form.watch('goalDirection')
  const weeklyRateLbs = form.watch('weeklyRateLbs')

  // Local display state for imperial inputs (kept as strings to avoid rounding jitter).
  // Seeded from saved metric values when the saved preference is imperial.
  const startsImperial = defaultValues?.unitPreference === UnitSystem.IMPERIAL
  const [weightLbs, setWeightLbs] = useState(() =>
    startsImperial && typeof defaultValues?.weightKg === 'number'
      ? String(Math.round(kgToLbs(defaultValues.weightKg)))
      : ''
  )
  const [heightFeet, setHeightFeet] = useState(() =>
    startsImperial && typeof defaultValues?.heightCm === 'number'
      ? String(cmToFtIn(defaultValues.heightCm).feet)
      : ''
  )
  const [heightInches, setHeightInches] = useState(() =>
    startsImperial && typeof defaultValues?.heightCm === 'number'
      ? String(cmToFtIn(defaultValues.heightCm).inches)
      : ''
  )

  // Seed imperial display fields from canonical values when switching to imperial.
  const prevUnit = useRef(unit)
  useEffect(() => {
    if (unit === UnitSystem.IMPERIAL && prevUnit.current !== UnitSystem.IMPERIAL) {
      const kg = form.getValues('weightKg')
      const cm = form.getValues('heightCm')
      if (typeof kg === 'number') setWeightLbs(String(Math.round(kgToLbs(kg))))
      if (typeof cm === 'number') {
        const { feet, inches } = cmToFtIn(cm)
        setHeightFeet(String(feet))
        setHeightInches(String(inches))
      }
    }
    prevUnit.current = unit
  }, [unit, form])

  // Recompute the live result whenever any input changes.
  const watched = form.watch()
  useEffect(() => {
    if (!onResultChange) return
    const { heightCm, weightKg, dateOfBirth, sex, activityLevel, goalDirection, weeklyRateLbs } =
      watched
    const rateOk =
      goalDirection === GoalDirection.MAINTAIN ||
      (typeof weeklyRateLbs === 'number' && weeklyRateLbs > 0)
    if (
      typeof heightCm === 'number' &&
      typeof weightKg === 'number' &&
      dateOfBirth instanceof Date &&
      !Number.isNaN(dateOfBirth.getTime()) &&
      sex &&
      activityLevel &&
      goalDirection &&
      rateOk
    ) {
      onResultChange(
        calculateCalories({
          heightCm,
          weightKg,
          dateOfBirth,
          sex,
          activityLevel,
          goalDirection,
          weeklyRateLbs: typeof weeklyRateLbs === 'number' ? weeklyRateLbs : 0,
        })
      )
    } else {
      onResultChange(null)
    }
  }, [JSON.stringify(watched)])

  const handleWeightLbs = (value: string) => {
    setWeightLbs(value)
    const lbs = parseFloat(value)
    form.setValue('weightKg', Number.isNaN(lbs) ? (undefined as never) : lbsToKg(lbs), {
      shouldValidate: true,
    })
  }

  const syncImperialHeight = (feet: string, inches: string) => {
    const ft = parseFloat(feet)
    const inch = parseFloat(inches)
    const cm = ftInToCm(Number.isNaN(ft) ? 0 : ft, Number.isNaN(inch) ? 0 : inch)
    form.setValue('heightCm', feet === '' && inches === '' ? (undefined as never) : cm, {
      shouldValidate: true,
    })
  }

  const handleDirectionChange = (value: string) => {
    form.setValue('goalDirection', value as GoalDirection, { shouldValidate: true })
    if (value === GoalDirection.MAINTAIN) {
      form.setValue('weeklyRateLbs', undefined, { shouldValidate: true })
    } else if (form.getValues('weeklyRateLbs') == null) {
      form.setValue('weeklyRateLbs', DEFAULT_RATE_LBS, { shouldValidate: true })
    }
  }

  const handleRateChange = (selected: string) => {
    const val = parseFloat(selected)
    const lbs = unit === UnitSystem.METRIC ? kgToLbs(val) : val
    form.setValue('weeklyRateLbs', lbs, { shouldValidate: true })
  }

  // Map the canonical lb rate onto the nearest option in the displayed unit.
  const rateOptions = unit === UnitSystem.METRIC ? RATE_OPTIONS_KG : RATE_OPTIONS_LB
  const rateUnitLabel = unit === UnitSystem.METRIC ? 'kg' : 'lb'
  const rateInUnit =
    typeof weeklyRateLbs === 'number'
      ? unit === UnitSystem.METRIC
        ? lbsToKg(weeklyRateLbs)
        : weeklyRateLbs
      : undefined
  const rateSelectValue = rateInUnit == null ? '' : String(nearestOption(rateInUnit, rateOptions))

  const handleSubmit = (data: FormValues) => {
    onSubmit(data as BodyMetricsInput)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Unit toggle */}
        <FormField
          control={form.control}
          name="unitPreference"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Units</FormLabel>
              <Tabs value={field.value} onValueChange={field.onChange}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value={UnitSystem.METRIC}>Metric (kg/cm)</TabsTrigger>
                  <TabsTrigger value={UnitSystem.IMPERIAL}>Imperial (lb/ft)</TabsTrigger>
                </TabsList>
              </Tabs>
            </FormItem>
          )}
        />

        {/* Height */}
        {unit === UnitSystem.METRIC ? (
          <FormField
            control={form.control}
            name="heightCm"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Height (cm) *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder="e.g., 178"
                    value={field.value ?? ''}
                    onChange={(e) =>
                      field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)
                    }
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <div className="space-y-2">
            <Label className={form.formState.errors.heightCm && 'text-destructive'}>Height *</Label>
            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="ft"
                  value={heightFeet}
                  onChange={(e) => {
                    setHeightFeet(e.target.value)
                    syncImperialHeight(e.target.value, heightInches)
                  }}
                  disabled={isSubmitting}
                />
              </div>
              <div className="flex-1">
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="in"
                  value={heightInches}
                  onChange={(e) => {
                    setHeightInches(e.target.value)
                    syncImperialHeight(heightFeet, e.target.value)
                  }}
                  disabled={isSubmitting}
                />
              </div>
            </div>
            {form.formState.errors.heightCm && (
              <p className="text-sm font-medium text-destructive">
                {form.formState.errors.heightCm.message}
              </p>
            )}
          </div>
        )}

        {/* Weight */}
        {unit === UnitSystem.METRIC ? (
          <FormField
            control={form.control}
            name="weightKg"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Weight (kg) *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder="e.g., 75"
                    value={field.value ?? ''}
                    onChange={(e) =>
                      field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)
                    }
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <div className="space-y-2">
            <Label className={form.formState.errors.weightKg && 'text-destructive'}>
              Weight (lb) *
            </Label>
            <Input
              type="number"
              inputMode="decimal"
              placeholder="e.g., 165"
              value={weightLbs}
              onChange={(e) => handleWeightLbs(e.target.value)}
              disabled={isSubmitting}
            />
            {form.formState.errors.weightKg && (
              <p className="text-sm font-medium text-destructive">
                {form.formState.errors.weightKg.message}
              </p>
            )}
          </div>
        )}

        {/* Date of birth */}
        <FormField
          control={form.control}
          name="dateOfBirth"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date of birth *</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  max={toDateInputValue(new Date())}
                  value={field.value instanceof Date ? toDateInputValue(field.value) : ''}
                  onChange={(e) =>
                    field.onChange(e.target.value === '' ? undefined : new Date(e.target.value))
                  }
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Sex */}
        <FormField
          control={form.control}
          name="sex"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sex *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select sex" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.entries(SexLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Activity level */}
        <FormField
          control={form.control}
          name="activityLevel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Activity level *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select activity level" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.entries(ActivityLevelLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Goal direction */}
        <FormField
          control={form.control}
          name="goalDirection"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Goal *</FormLabel>
              <Select
                onValueChange={handleDirectionChange}
                value={field.value}
                disabled={isSubmitting}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select goal" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.entries(GoalDirectionLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Weekly rate (only when not maintaining) */}
        {goalDirection !== GoalDirection.MAINTAIN && (
          <div className="space-y-2">
            <Label className={form.formState.errors.weeklyRateLbs && 'text-destructive'}>
              Weekly rate *
            </Label>
            <Select
              value={rateSelectValue}
              onValueChange={handleRateChange}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select weekly rate" />
              </SelectTrigger>
              <SelectContent>
                {rateOptions.map((opt) => (
                  <SelectItem key={opt} value={String(opt)}>
                    {opt} {rateUnitLabel} / week
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.weeklyRateLbs && (
              <p className="text-sm font-medium text-destructive">
                {form.formState.errors.weeklyRateLbs.message}
              </p>
            )}
          </div>
        )}

        <Button type="submit" disabled={isSubmitting || canSubmit === false} className="w-full">
          {isSubmitting ? 'Saving...' : 'Save calorie targets'}
        </Button>
      </form>
    </Form>
  )
}

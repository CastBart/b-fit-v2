/**
 * MetricInput — controlled set-metric input used in the session set logger.
 *
 * Values are CANONICAL (kg / count / rir / meters / seconds).
 *
 * - Desktop, simple numeric metrics (weight/reps/rir/counterWeight): native
 *   number input (fast typing, unchanged UX).
 * - Mobile (coarse pointer), and desktop distance/duration (which need
 *   unit/H:M:S handling): a read-only field that opens the metric editor drawer
 *   on tap — the native keyboard never opens for these.
 */

'use client'

import { useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { METRIC_CONFIG, type MetricField } from '@/lib/metrics/metric-config'
import { metersToUnit, DISTANCE_UNIT_META } from '@/lib/metrics/units'
import { formatDuration } from '@/lib/utils/format-time'
import { useIsCoarsePointer } from '@/hooks/useIsCoarsePointer'
import { useDistanceUnit } from '@/hooks/useDistanceUnit'
import { useMetricEditor } from './MetricEditorProvider'

interface MetricInputProps {
  metric: MetricField
  value: number | null | undefined
  onChange: (value: number | undefined) => void
  disabled?: boolean
  className?: string
  /** Provided by SetLogger to open a multi-field editor for the whole set row. */
  onOpenEditor?: () => void
}

function trimZeros(value: number, decimals: number): string {
  let s = value.toFixed(decimals)
  if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '')
  return s
}

export function MetricInput({
  metric,
  value,
  onChange,
  disabled,
  className,
  onOpenEditor,
}: MetricInputProps) {
  const config = METRIC_CONFIG[metric]
  const coarse = useIsCoarsePointer()
  const editor = useMetricEditor()
  const { unit } = useDistanceUnit()

  // Whether this field requires the custom editor regardless of platform.
  const needsEditor = config.mode === 'distance' || config.mode === 'time' || !config.hasKeypad
  const useDrawer = coarse || needsEditor

  const displayText = useCallback((): string => {
    if (value == null || Number.isNaN(value)) return ''
    if (config.mode === 'distance') {
      return trimZeros(metersToUnit(value, unit), DISTANCE_UNIT_META[unit].decimals)
    }
    if (config.mode === 'time') return formatDuration(value)
    return String(value)
  }, [value, config.mode, unit])

  const openSingleField = useCallback(() => {
    editor.open({
      fields: [{ field: metric, config, canonicalValue: value, commit: onChange }],
      index: 0,
    })
  }, [editor, metric, config, value, onChange])

  // Shared min-width floor so every metric column keeps an even base width in
  // the auto-layout set table. Native number inputs used to provide this floor
  // intrinsically; the button/div variants would otherwise collapse to their
  // text width and let header text dictate column widths (reps/RIR squashed).
  const widthFloor = 'min-w-[3.5rem]'

  if (disabled) {
    return (
      <div
        className={cn(
          'flex h-10 w-full items-center justify-center rounded-md text-center text-muted-foreground',
          widthFloor,
          className
        )}
      >
        {displayText() || '–'}
      </div>
    )
  }

  if (useDrawer) {
    return (
      <button
        type="button"
        onClick={onOpenEditor ?? openSingleField}
        className={cn(
          'flex h-10 w-full items-center justify-center rounded-md border border-input bg-background text-center text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          widthFloor,
          className
        )}
      >
        {displayText() || <span className="text-muted-foreground">0</span>}
      </button>
    )
  }

  // Desktop native numeric input for simple metrics.
  return (
    <Input
      type="number"
      inputMode="decimal"
      step={config.integerOnly ? '1' : '0.5'}
      min={config.min}
      placeholder="0"
      value={value == null ? '' : String(value)}
      onChange={(e) => {
        const raw = e.target.value
        if (raw === '') return onChange(undefined)
        const n = Number(raw)
        onChange(Number.isNaN(n) ? undefined : n)
      }}
      className={cn('text-center', widthFloor, className)}
    />
  )
}

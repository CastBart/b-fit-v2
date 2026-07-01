/**
 * MetricEditorDrawer — the on-screen editor for a single set row's metrics.
 *
 * Shows a vertical wheel picker AND a number pad together (RIR is wheel-only).
 * Both edit one shared canonical draft:
 *   - scrolling the wheel sets the draft to that step,
 *   - typing on the keypad updates the draft and re-highlights the wheel.
 *
 * Modes:
 *   - number:   plain kg / count
 *   - distance: m/km/mi toggle, canonical meters (Int on commit)
 *   - time:     HH:MM:SS stopwatch keypad, canonical seconds
 *
 * Multi-field sessions (e.g. weight + reps) expose Prev/Next to move between
 * fields without closing; each move commits the current field.
 */

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Delete } from 'lucide-react'
import { WheelPicker } from './WheelPicker'
import type { EditorSession, EditorField } from './MetricEditorProvider'
import { DISTANCE_UNIT_META, metersToUnit, unitToMeters } from '@/lib/metrics/units'
import { secondsToDigits, digitsToSeconds, formatDigits } from '@/lib/metrics/duration'
import {
  weightSteps,
  repsSteps,
  rirSteps,
  distanceSteps,
  durationSteps,
  type WheelStep,
} from '@/lib/metrics/wheel-steps'
import { useDistanceUnit } from '@/hooks/useDistanceUnit'

interface MetricEditorDrawerProps {
  open: boolean
  session: EditorSession | null
  onOpenChange: (open: boolean) => void
}

// Reserved height for the keypad area (4 rows of h-12 buttons + 3 gap-2 gaps:
// 4*48 + 3*8 = 216px). Keeps the drawer the same height for wheel-only metrics.
const KEYPAD_AREA_HEIGHT = 216

/** Trim a fixed-decimal string of trailing zeros (e.g. "0.10" → "0.1", "5.00" → "5"). */
function trimNum(value: number, decimals: number): string {
  let s = value.toFixed(decimals)
  if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '')
  return s
}

export function MetricEditorDrawer({ open, session, onOpenChange }: MetricEditorDrawerProps) {
  const { unit, toggleUnit } = useDistanceUnit()

  const [index, setIndex] = useState(0)
  const [text, setText] = useState('') // number / distance buffer
  const [digits, setDigits] = useState('') // time stopwatch buffer
  const [wheelOnlyValue, setWheelOnlyValue] = useState<number | undefined>(undefined)
  const [overwriteArmed, setOverwriteArmed] = useState(false)
  // Canonical value per field index. Done commits ALL of these, so editing one
  // metric and switching to another (via the tabs) never drops the first.
  const [drafts, setDrafts] = useState<(number | undefined)[]>([])

  const field = session?.fields[index]
  const config = field?.config
  const mode = config?.mode ?? 'number'
  const decimals = mode === 'distance' ? DISTANCE_UNIT_META[unit].decimals : (config?.decimals ?? 0)

  // Seed the editing buffers (keypad text / time digits / wheel value) for a
  // field from a canonical value.
  const seedBuffers = (f: EditorField, value: number | undefined) => {
    if (!f.config.hasKeypad) {
      setWheelOnlyValue(value ?? undefined)
    } else if (f.config.mode === 'time') {
      setDigits(value == null ? '' : secondsToDigits(value))
    } else if (f.config.mode === 'distance') {
      setText(
        value == null ? '' : trimNum(metersToUnit(value, unit), DISTANCE_UNIT_META[unit].decimals)
      )
    } else {
      setText(value == null ? '' : String(value))
    }
    setOverwriteArmed(value != null)
  }

  // On open (or a new session), seed per-field drafts from each field's current
  // value and load the tapped field into the editing buffers.
  useEffect(() => {
    if (!open || !session) return
    const initial = session.fields.map((f) => f.canonicalValue ?? undefined)
    setDrafts(initial)
    setIndex(session.index)
    const f = session.fields[session.index]
    if (f) seedBuffers(f, initial[session.index])
    // unit intentionally excluded: unit changes are handled by the toggle.
  }, [open, session])

  const clamp = useCallback(
    (value: number | undefined): number | undefined => {
      if (value == null || Number.isNaN(value)) return undefined
      let v = value
      if (config?.min != null) v = Math.max(config.min, v)
      if (config?.max != null) v = Math.min(config.max, v)
      return v
    },
    [config]
  )

  const currentCanonical = useCallback((): number | undefined => {
    if (!config) return undefined
    if (!config.hasKeypad) return clamp(wheelOnlyValue)
    if (config.mode === 'time') {
      if (digits === '') return undefined
      const s = digitsToSeconds(digits)
      return s === 0 ? undefined : clamp(s)
    }
    if (text === '' || text === '.') return undefined
    if (config.mode === 'distance') {
      return clamp(Math.round(unitToMeters(parseFloat(text), unit)))
    }
    return clamp(parseFloat(text))
  }, [config, clamp, wheelOnlyValue, digits, text, unit])

  const steps: WheelStep[] = useMemo(() => {
    if (!field) return []
    switch (field.field) {
      case 'weight':
      case 'counterWeight':
        return weightSteps()
      case 'reps':
        return repsSteps()
      case 'rir':
        return rirSteps()
      case 'distance':
        return distanceSteps(unit)
      case 'duration':
        return durationSteps()
      default:
        return []
    }
  }, [field, unit])

  const handleWheelSelect = useCallback(
    (value: number) => {
      if (!config) return
      if (!config.hasKeypad) {
        setWheelOnlyValue(value)
      } else if (config.mode === 'time') {
        setDigits(secondsToDigits(value))
      } else if (config.mode === 'distance') {
        setText(trimNum(metersToUnit(value, unit), DISTANCE_UNIT_META[unit].decimals))
      } else {
        setText(String(value))
      }
      setOverwriteArmed(false)
    },
    [config, unit]
  )

  // ── Keypad handlers ────────────────────────────────────────────────────────
  const pressDigit = useCallback(
    (d: string) => {
      if (!config) return
      if (config.mode === 'time') {
        setDigits((prev) => (overwriteArmed ? '' : prev).concat(d).slice(-6))
        setOverwriteArmed(false)
        return
      }
      setText((prev) => {
        const base = overwriteArmed ? '' : prev
        const dotIndex = base.indexOf('.')
        if (dotIndex >= 0 && decimals > 0) {
          const frac = base.length - dotIndex - 1
          if (frac >= decimals) return base
        }
        if (base === '0') return d === '0' ? '0' : d
        return base + d
      })
      setOverwriteArmed(false)
    },
    [config, overwriteArmed, decimals]
  )

  const pressDot = useCallback(() => {
    if (!config || config.integerOnly || decimals === 0) return
    setText((prev) => {
      const base = overwriteArmed ? '0' : prev === '' ? '0' : prev
      return base.includes('.') ? base : base + '.'
    })
    setOverwriteArmed(false)
  }, [config, decimals, overwriteArmed])

  const pressBackspace = useCallback(() => {
    setOverwriteArmed(false)
    if (mode === 'time') setDigits((p) => p.slice(0, -1))
    else setText((p) => p.slice(0, -1))
  }, [mode])

  const pressClear = useCallback(() => {
    setOverwriteArmed(false)
    setText('')
    setDigits('')
  }, [])

  const fields = session?.fields ?? []

  // Switch to another field in the set: snapshot the current edit into drafts,
  // then load the target field's draft into the editing buffers.
  const switchTo = (newIndex: number) => {
    if (newIndex === index || !session) return
    const snapshot = currentCanonical()
    setDrafts((prev) => {
      const next = [...prev]
      next[index] = snapshot
      return next
    })
    const target = session.fields[newIndex]
    if (target) seedBuffers(target, drafts[newIndex])
    setIndex(newIndex)
  }

  // Commit EVERY field's draft (snapshotting the field currently being edited),
  // so a single Done saves all metrics the user set in this drawer session.
  const commitAll = () => {
    if (!session) return
    const final = [...drafts]
    final[index] = currentCanonical()
    session.fields.forEach((f, i) => f.commit(final[i]))
  }

  const handleDone = () => {
    commitAll()
    onOpenChange(false)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) commitAll()
    onOpenChange(next)
  }

  const handleToggleUnit = useCallback(() => {
    const meters = currentCanonical()
    const next = unit === 'km' ? 'mi' : 'km'
    toggleUnit()
    setText(
      meters == null ? '' : trimNum(metersToUnit(meters, next), DISTANCE_UNIT_META[next].decimals)
    )
    setOverwriteArmed(false)
  }, [currentCanonical, unit, toggleUnit])

  if (!session || !field || !config) {
    return (
      <Drawer open={open} onOpenChange={handleOpenChange}>
        <DrawerContent />
      </Drawer>
    )
  }

  // Big display string. Wheel-only metrics (e.g. RIR) keep their value in
  // wheelOnlyValue, not the keypad `text` buffer, so read from there.
  const display = !config.hasKeypad
    ? wheelOnlyValue == null
      ? '0'
      : String(wheelOnlyValue)
    : mode === 'time'
      ? formatDigits(digits)
      : text === ''
        ? '0'
        : text
  const unitSuffix =
    field.field === 'weight' || field.field === 'counterWeight'
      ? 'kg'
      : mode === 'distance'
        ? unit
        : ''

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="mx-auto max-w-md">
        <DrawerHeader>
          <DrawerTitle className="sr-only">Edit {config.label}</DrawerTitle>
          <DrawerDescription className="sr-only">
            Use the wheel or keypad to set {config.label}.
          </DrawerDescription>

          {/* Field tabs (multi-metric set) */}
          <div className="flex items-center justify-center gap-2">
            {fields.map((f, i) => (
              <button
                key={f.field}
                type="button"
                onClick={() => switchTo(i)}
                className={cn(
                  'rounded-full px-3 py-1 text-sm font-medium transition-colors',
                  i === index
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {f.config.label}
                {f.field === 'distance' ? ` (${unit})` : ''}
              </button>
            ))}
          </div>
        </DrawerHeader>

        {/* Big value display */}
        <div className="relative flex items-baseline justify-center gap-2 px-4 pb-2">
          <span className="text-4xl font-bold tabular-nums">{display}</span>
          {mode === 'distance' ? (
            <button
              type="button"
              onClick={handleToggleUnit}
              className="rounded-md border border-input px-2 py-1 text-sm font-medium text-muted-foreground"
            >
              {unitSuffix}
            </button>
          ) : (
            unitSuffix && <span className="text-lg text-muted-foreground">{unitSuffix}</span>
          )}
          {config.hasKeypad && (
            <button
              type="button"
              onClick={pressClear}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground"
            >
              Clear
            </button>
          )}
        </div>

        <div className="px-4 pb-2">
          <WheelPicker steps={steps} value={currentCanonical()} onSelect={handleWheelSelect} />
        </div>

        {/* Keypad area — height is always reserved (even for wheel-only metrics
            like RIR) so the drawer never resizes when switching metric types. */}
        <div className="px-4" style={{ minHeight: KEYPAD_AREA_HEIGHT }}>
          {config.hasKeypad && (
            <div className="grid grid-cols-3 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
                <KeypadButton key={d} onClick={() => pressDigit(d)}>
                  {d}
                </KeypadButton>
              ))}
              {mode !== 'time' && !config.integerOnly && decimals > 0 ? (
                <KeypadButton onClick={pressDot}>.</KeypadButton>
              ) : (
                <div aria-hidden />
              )}
              <KeypadButton onClick={() => pressDigit('0')}>0</KeypadButton>
              <KeypadButton onClick={pressBackspace}>
                <Delete className="h-5 w-5" />
              </KeypadButton>
            </div>
          )}
        </div>

        <DrawerFooter>
          {/* Done always commits the field the user is currently on. To set
              another metric, switch via the field tabs above (each switch
              commits the current field first). */}
          <Button onClick={handleDone} className="w-full">
            Done
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

function KeypadButton({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode
  onClick: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-12 items-center justify-center rounded-lg bg-muted text-xl font-semibold active:bg-muted/70',
        className
      )}
    >
      {children}
    </button>
  )
}

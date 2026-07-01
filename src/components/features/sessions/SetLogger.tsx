/**
 * Set Logger Component (Client-First Architecture)
 *
 * Displays the current exercise with:
 * - Exercise name and controls
 * - Set logging table (multi-metric support)
 * - Add/Remove set buttons
 * - Undo last set button
 * - Exercise notes
 * - Active set highlighting (only activeSetNumber shows "complete" button)
 *
 * Metric entry uses <MetricInput>: on mobile it opens the custom metric editor
 * (wheel + keypad) instead of the native keyboard; on desktop simple metrics use
 * a native number input. Values are committed on the editor's Done/advance (not
 * per keystroke). Distance is stored in meters, duration in seconds.
 */

'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Check, CheckCircle2, MoreVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { completeSet, updateSet, updateExerciseNotes } from '@/store/slices/sessionSlice'
import { toast } from 'sonner'
import { SetSettingsDrawer } from './SetSettingsDrawer'
import { LatestHistoryPreview } from './ExerciseHistoryDisplay'
import { MetricInput } from './MetricInput'
import { NotesEditorDrawer } from './NotesEditorDrawer'
import { useMetricEditor, type EditorField, type EditorSession } from './MetricEditorProvider'
import { useIsCoarsePointer } from '@/hooks/useIsCoarsePointer'
import { estimateOneRepMax } from '@/lib/analytics/one-rep-max'
import { METRIC_CONFIG, type MetricField } from '@/lib/metrics/metric-config'
import { useDistanceUnit } from '@/hooks/useDistanceUnit'
import type { WheelDistanceUnit } from '@/lib/metrics/wheel-steps'
import type { SessionExerciseEntry, SetMetrics, SessionSet } from '@/types/session'
import type { MetricType } from '@prisma/client'

// RIR is only meaningful where reps are counted.
const RIR_METRICS = new Set<MetricType>([
  'WEIGHT_REPS',
  'COUNTER_WEIGHT_REPS',
  'REPS',
  'REPS_DURATION',
])

// Estimated 1RM requires a real external load + reps.
const ONE_RM_METRICS = new Set<MetricType>(['WEIGHT_REPS'])

// Ordered base (non-RIR) editable fields per metric type.
const BASE_FIELDS: Record<MetricType, MetricField[]> = {
  WEIGHT_REPS: ['weight', 'reps'],
  COUNTER_WEIGHT_REPS: ['counterWeight', 'reps'],
  REPS: ['reps'],
  REPS_DURATION: ['reps', 'duration'],
  DURATION: ['duration'],
  DISTANCE_DURATION: ['distance', 'duration'],
  WEIGHT_DISTANCE: ['weight', 'distance'],
  WEIGHT_DURATION: ['weight', 'duration'],
}

/** Full ordered editable field list for a metric type (base + RIR where shown). */
function getRowFields(metricType: MetricType): MetricField[] {
  const base = BASE_FIELDS[metricType] ?? []
  return RIR_METRICS.has(metricType) ? [...base, 'rir'] : base
}

interface SetLoggerProps {
  exercise: SessionExerciseEntry
  disabled?: boolean
  onOpenOptions?: () => void
  onExerciseNameClick?: () => void
}

export function SetLogger({
  exercise,
  disabled,
  onOpenOptions,
  onExerciseNameClick,
}: SetLoggerProps) {
  const dispatch = useAppDispatch()
  const editor = useMetricEditor()
  const { unit, toggleUnit } = useDistanceUnit()
  const coarse = useIsCoarsePointer()

  // Mobile: edit exercise notes in a focused drawer (keeps the keyboard off the carousel).
  const [notesDrawerOpen, setNotesDrawerOpen] = useState(false)

  // Get progress from Redux
  const progress = useAppSelector((state) => state.session.progress[exercise.instanceId])

  // Local state for current (active) set inputs (used for validation + clearing after complete)
  const [currentInputs, setCurrentInputs] = useState<SetMetrics>({})

  // Notes state
  const [notes, setNotes] = useState(progress?.notes || '')

  // Sync notes from Redux
  useEffect(() => {
    setNotes(progress?.notes || '')
  }, [progress?.notes])

  if (!progress) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        No progress data available
      </div>
    )
  }

  const { sets, activeSetNumber } = progress
  const activeSet = sets.find((s) => s.setNumber === activeSetNumber)

  // Keep currentInputs aligned with the active set's stored metrics when active set changes
  // Note: intentionally only depends on instanceId and activeSetNumber to avoid resetting on metric changes
  useEffect(() => {
    setCurrentInputs(activeSet?.metrics ?? {})
  }, [exercise.instanceId, activeSetNumber, activeSet?.metrics])

  // Handle notes change
  const handleNotesBlur = () => {
    if (notes !== progress.notes) {
      dispatch(
        updateExerciseNotes({
          instanceId: exercise.instanceId,
          notes,
        })
      )
    }
  }

  // Commit notes from the mobile notes drawer.
  const handleNotesCommit = (text: string) => {
    setNotes(text)
    if (text !== (progress.notes ?? '')) {
      dispatch(updateExerciseNotes({ instanceId: exercise.instanceId, notes: text }))
    }
  }

  /**
   * Commit a metric value (canonical) for a specific set number. Called by the
   * metric editor on Done/advance (mobile) or the native input (desktop).
   */
  const handleInputChange = (setNumber: number, field: MetricField, value: number | undefined) => {
    // Update Redux for that exact set number
    dispatch(
      updateSet({
        instanceId: exercise.instanceId,
        setNumber,
        metrics: { [field]: value },
      })
    )

    // If editing the active set, keep local state in sync (for validate + clear on complete)
    if (setNumber === activeSetNumber) {
      setCurrentInputs((prev) => ({ ...prev, [field]: value }))
    }
  }

  // Handle complete set (active set only)
  const handleCompleteSet = () => {
    if (!validateMetrics(exercise.metricType, currentInputs)) {
      toast.error('Please fill in all required fields')
      return
    }

    dispatch(completeSet({ metrics: currentInputs }))

    // Clear inputs for next set (will also be re-synced by effect when activeSetNumber advances)
    setCurrentInputs({})

    toast.success(`Set ${activeSetNumber} completed`, { duration: 1000 })
  }

  const hasCompletedSets = sets.some((s) => s.completed)

  return (
    <div className="space-y-2">
      {/* Exercise Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2
            className="cursor-pointer text-base sm:text-lg md:text-xl lg:text-2xl font-bold transition-colors hover:text-primary"
            onClick={onExerciseNameClick}
          >
            {exercise.name}
          </h2>
          <p className="text-sm text-muted-foreground">
            {exercise.targetSets} sets × {exercise.targetReps || '–'} reps
            {exercise.targetWeight && ` @ ${exercise.targetWeight}kg`}
          </p>
        </div>

        <Button variant="ghost" size="icon" disabled={disabled} onClick={onOpenOptions}>
          <MoreVertical className="h-5 w-5" />
        </Button>
      </div>

      {/* Set Logging Table */}
      <div className="overflow-x-auto -mx-4 px-4">
        <Table className="[&_td]:px-1 [&_th]:px-1 [&_td]:py-1 [&_th]:py-1">
          <TableHeader>
            <TableRow>
              <TableHead className="w-7 px-1 text-left">#</TableHead>
              {renderTableHeaders(exercise.metricType, unit, toggleUnit)}
              <TableHead className="text-center">
                <SetSettingsDrawer
                  instanceId={exercise.instanceId}
                  currentSetCount={sets.length}
                  hasCompletedSets={hasCompletedSets}
                  disabled={disabled}
                />
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {sets.map((set) => {
              const isActive = set.setNumber === activeSetNumber
              const isCompleted = set.completed

              return (
                <TableRow
                  key={set.setNumber}
                  className={cn(
                    isActive && !isCompleted && 'bg-primary/5',
                    isCompleted && 'bg-muted/30'
                  )}
                >
                  <TableCell className="w-7 px-1 text-left font-medium">{set.setNumber}</TableCell>

                  {renderSetInputs({
                    setNumber: set.setNumber,
                    metricType: exercise.metricType,
                    set,
                    isActive,
                    isCompleted,
                    disabled,
                    currentInputs,
                    handleInputChange,
                    openEditor: editor.open,
                  })}

                  <TableCell>
                    {isCompleted ? (
                      <div className="transition flex justify-center">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      </div>
                    ) : isActive ? (
                      <Button
                        size="sm"
                        onClick={handleCompleteSet}
                        disabled={disabled}
                        className="h-8 w-full"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    ) : (
                      <div className="h-8" />
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Exercise Notes */}
      <div className="space-y-2">
        <Label htmlFor={`notes-${exercise.instanceId}`}>Exercise Notes (Optional)</Label>
        {coarse ? (
          <>
            <button
              type="button"
              id={`notes-${exercise.instanceId}`}
              onClick={() => setNotesDrawerOpen(true)}
              disabled={disabled}
              className="flex min-h-10 w-full items-start rounded-md border border-input bg-background px-3 py-2 text-left text-sm disabled:opacity-50"
            >
              {notes ? (
                <span className="line-clamp-2 whitespace-pre-wrap">{notes}</span>
              ) : (
                <span className="text-muted-foreground">Add notes about this exercise...</span>
              )}
            </button>
            <NotesEditorDrawer
              open={notesDrawerOpen}
              onOpenChange={setNotesDrawerOpen}
              title="Exercise Notes"
              value={notes}
              placeholder="Add notes about this exercise..."
              onCommit={handleNotesCommit}
            />
          </>
        ) : (
          <Textarea
            id={`notes-${exercise.instanceId}`}
            placeholder="Add notes about this exercise..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={handleNotesBlur}
            rows={2}
            className="resize-none"
            disabled={disabled}
          />
        )}
      </div>

      {/* Latest History Preview */}
      <LatestHistoryPreview exerciseId={exercise.exerciseId} metricType={exercise.metricType} />

      {/* Spacer to prevent floating timer button from overlapping history */}
      <div className="pb-20 sm:pb-0" />
    </div>
  )
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function renderTableHeaders(
  metricType: MetricType,
  unit: WheelDistanceUnit,
  onToggleUnit: () => void
): React.ReactNode {
  const classInput = 'text-center'
  return (
    <>
      {getRowFields(metricType).map((field) => (
        <TableHead key={field} className={classInput}>
          {headerLabel(field, unit, onToggleUnit)}
        </TableHead>
      ))}
      {ONE_RM_METRICS.has(metricType) && <TableHead className={classInput}>1RM</TableHead>}
    </>
  )
}

function headerLabel(
  field: MetricField,
  unit: WheelDistanceUnit,
  onToggleUnit: () => void
): React.ReactNode {
  switch (field) {
    case 'weight':
      return 'Weight (kg)'
    case 'counterWeight':
      return 'Assist (kg)'
    case 'reps':
      return 'Reps'
    case 'duration':
      return 'Duration'
    case 'rir':
      return 'RIR'
    case 'distance':
      return (
        <button
          type="button"
          onClick={onToggleUnit}
          className="underline decoration-dotted underline-offset-2"
          title="Tap to switch km/mi"
        >
          Distance ({unit})
        </button>
      )
    default:
      return 'Value'
  }
}

interface RenderSetInputsArgs {
  setNumber: number
  metricType: MetricType
  set: SessionSet
  isActive: boolean
  isCompleted: boolean
  disabled: boolean | undefined
  currentInputs: SetMetrics
  handleInputChange: (setNumber: number, field: MetricField, value: number | undefined) => void
  openEditor: (session: EditorSession) => void
}

function renderSetInputs({
  setNumber,
  metricType,
  set,
  isActive,
  isCompleted,
  disabled,
  currentInputs,
  handleInputChange,
  openEditor,
}: RenderSetInputsArgs): React.ReactNode {
  // Edit rules: any set is editable (including completed sets — editing a
  // completed set updates its stored values without un-completing it). Only a
  // logger-level `disabled` locks inputs.
  const isInputDisabled = !!disabled

  const inputClass = cn(
    'text-center rounded-full px-1',
    isActive && 'bg-muted',
    isCompleted && 'text-muted-foreground',
    !isActive && !isCompleted && 'opacity-80'
  )

  // Numeric accessor: for the active set prefer local input, else stored metrics.
  const numValueFor = (field: MetricField): number | undefined => {
    const v = isActive ? (currentInputs[field] ?? set.metrics[field]) : set.metrics[field]
    return typeof v === 'number' && !Number.isNaN(v) ? v : undefined
  }

  const renderOneRm = (): React.ReactNode => {
    const est = estimateOneRepMax(
      numValueFor('weight') ?? null,
      numValueFor('reps') ?? null,
      numValueFor('rir') ?? null
    )
    return est == null ? <span className="text-muted-foreground">–</span> : est.toFixed(1)
  }

  const rowFields = getRowFields(metricType)

  // Build the editor session for this row so any cell opens a multi-field editor.
  const editorFields: EditorField[] = rowFields.map((field) => ({
    field,
    config: METRIC_CONFIG[field],
    canonicalValue: numValueFor(field),
    commit: (value) => handleInputChange(setNumber, field, value),
  }))

  return (
    <>
      {rowFields.map((field, i) => (
        <TableCell key={field}>
          <MetricInput
            metric={field}
            value={numValueFor(field)}
            onChange={(value) => handleInputChange(setNumber, field, value)}
            disabled={isInputDisabled}
            className={inputClass}
            onOpenEditor={() => openEditor({ fields: editorFields, index: i })}
          />
        </TableCell>
      ))}
      {ONE_RM_METRICS.has(metricType) && (
        <TableCell className="text-center text-sm font-medium tabular-nums">
          {renderOneRm()}
        </TableCell>
      )}
    </>
  )
}

/**
 * ✅ 0-safe validation:
 * - 0 is valid input
 * - undefined / null / NaN are invalid
 */
function validateMetrics(metricType: MetricType, metrics: SetMetrics): boolean {
  const hasNumber = (v: unknown) =>
    v !== undefined && v !== null && v !== '' && !(typeof v === 'number' && Number.isNaN(v))

  const baseValid = ((): boolean => {
    switch (metricType) {
      case 'WEIGHT_REPS':
        return hasNumber(metrics.weight) && hasNumber(metrics.reps)
      case 'COUNTER_WEIGHT_REPS':
        return hasNumber(metrics.counterWeight) && hasNumber(metrics.reps)
      case 'REPS':
        return hasNumber(metrics.reps)
      case 'REPS_DURATION':
        return hasNumber(metrics.reps) && hasNumber(metrics.duration)
      case 'DURATION':
        return hasNumber(metrics.duration)
      case 'DISTANCE_DURATION':
        return hasNumber(metrics.distance) && hasNumber(metrics.duration)
      case 'WEIGHT_DISTANCE':
        return hasNumber(metrics.weight) && hasNumber(metrics.distance)
      case 'WEIGHT_DURATION':
        return hasNumber(metrics.weight) && hasNumber(metrics.duration)
      default:
        return false
    }
  })()

  // RIR is mandatory to complete a set on the metric types where it's displayed
  // (RIR 0 = to failure is a valid value). Not collected/required elsewhere.
  if (RIR_METRICS.has(metricType) && !hasNumber(metrics.rir)) return false

  return baseValid
}

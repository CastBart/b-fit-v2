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
 * FIXES:
 * - Any NON-completed set is now editable (not just the active set)
 * - Inputs always display their set.metrics values (no more blanking non-active rows)
 * - onChange updates the correct setNumber in Redux (not always activeSetNumber)
 * - Validation is "0-safe" (0 no longer fails validation)
 */

'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import type { SessionExerciseEntry, SetMetrics, SessionSet } from '@/types/session'
import type { MetricType } from '@prisma/client'

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

  /**
   * ✅ FIX: input change is now tied to the row's setNumber (not always activeSetNumber)
   */
  const handleInputChange = (setNumber: number, field: keyof SetMetrics, value: string) => {
    const numValue = value === '' ? undefined : Number(value)

    // Update Redux for that exact set number
    dispatch(
      updateSet({
        instanceId: exercise.instanceId,
        setNumber,
        metrics: { [field]: Number.isNaN(numValue as number) ? undefined : numValue },
      })
    )

    // If editing the active set, keep local state in sync (for validate + clear on complete)
    if (setNumber === activeSetNumber) {
      setCurrentInputs((prev) => ({
        ...prev,
        [field]: Number.isNaN(numValue as number) ? undefined : numValue,
      }))
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
    <div className="space-y-6">
      {/* Exercise Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2
            className="cursor-pointer text-2xl font-bold transition-colors hover:text-primary"
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-center">Set</TableHead>
              {renderTableHeaders(exercise.metricType)}
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
                  <TableCell className="font-medium">{set.setNumber}</TableCell>

                  {renderSetInputs(
                    set.setNumber,
                    exercise.metricType,
                    set,
                    isActive,
                    isCompleted,
                    disabled,
                    currentInputs,
                    handleInputChange
                  )}

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
      </div>

      {/* Latest History Preview */}
      <LatestHistoryPreview exerciseId={exercise.exerciseId} metricType={exercise.metricType} />
    </div>
  )
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function renderTableHeaders(metricType: MetricType): React.ReactNode {
  const classInput = 'text-center'
  switch (metricType) {
    case 'WEIGHT_REPS':
      return (
        <>
          <TableHead className={classInput}>Weight (kg)</TableHead>
          <TableHead className={classInput}>Reps</TableHead>
        </>
      )
    case 'COUNTER_WEIGHT_REPS':
      return (
        <>
          <TableHead className={classInput}>Assist (kg)</TableHead>
          <TableHead className={classInput}>Reps</TableHead>
        </>
      )
    case 'REPS':
      return <TableHead className={classInput}>Reps</TableHead>
    case 'REPS_DURATION':
      return (
        <>
          <TableHead className={classInput}>Reps</TableHead>
          <TableHead className={classInput}>Duration (s)</TableHead>
        </>
      )
    case 'DURATION':
      return <TableHead className={classInput}>Duration (s)</TableHead>
    case 'DISTANCE_DURATION':
      return (
        <>
          <TableHead className={classInput}>Distance (m)</TableHead>
          <TableHead className={classInput}>Duration (s)</TableHead>
        </>
      )
    case 'WEIGHT_DISTANCE':
      return (
        <>
          <TableHead className={classInput}>Weight (kg)</TableHead>
          <TableHead className={classInput}>Distance (m)</TableHead>
        </>
      )
    case 'WEIGHT_DURATION':
      return (
        <>
          <TableHead className={classInput}>Weight (kg)</TableHead>
          <TableHead className={classInput}>Duration (s)</TableHead>
        </>
      )
    default:
      return <TableHead className={classInput}>Value</TableHead>
  }
}

function renderSetInputs(
  setNumber: number,
  metricType: MetricType,
  set: SessionSet,
  isActive: boolean,
  isCompleted: boolean,
  disabled: boolean | undefined,
  currentInputs: SetMetrics,
  handleInputChange: (setNumber: number, field: keyof SetMetrics, value: string) => void
): React.ReactNode {
  // ✅ Edit rules:
  // - allow editing ANY non-completed set
  // - lock completed sets
  const isInputDisabled = !!disabled || isCompleted

  const inputClass = cn(
    'text-center rounded-full',
    isActive && 'bg-muted',
    !isActive && !isCompleted && 'opacity-80'
  )

  // Helper: for active set, prefer local input (so user can type freely), fallback to stored metrics.
  // For non-active sets, just show stored metrics.
  const valueFor = (field: keyof SetMetrics) => {
    const stored = set.metrics[field]
    const activeLocal = currentInputs[field]
    if (isActive) return activeLocal ?? stored ?? ''
    return stored ?? ''
  }

  switch (metricType) {
    case 'WEIGHT_REPS':
      return (
        <>
          <TableCell>
            <Input
              type="number"
              step="0.5"
              placeholder="0"
              value={valueFor('weight')}
              onChange={(e) => handleInputChange(setNumber, 'weight', e.target.value)}
              disabled={isInputDisabled}
              className={inputClass}
            />
          </TableCell>
          <TableCell>
            <Input
              type="number"
              placeholder="0"
              value={valueFor('reps')}
              onChange={(e) => handleInputChange(setNumber, 'reps', e.target.value)}
              disabled={isInputDisabled}
              className={inputClass}
            />
          </TableCell>
        </>
      )

    case 'COUNTER_WEIGHT_REPS':
      return (
        <>
          <TableCell>
            <Input
              type="number"
              step="0.5"
              placeholder="0"
              value={valueFor('counterWeight')}
              onChange={(e) => handleInputChange(setNumber, 'counterWeight', e.target.value)}
              disabled={isInputDisabled}
              className={inputClass}
            />
          </TableCell>
          <TableCell>
            <Input
              type="number"
              placeholder="0"
              value={valueFor('reps')}
              onChange={(e) => handleInputChange(setNumber, 'reps', e.target.value)}
              disabled={isInputDisabled}
              className={inputClass}
            />
          </TableCell>
        </>
      )

    case 'REPS':
      return (
        <TableCell>
          <Input
            type="number"
            placeholder="0"
            value={valueFor('reps')}
            onChange={(e) => handleInputChange(setNumber, 'reps', e.target.value)}
            disabled={isInputDisabled}
            className={inputClass}
          />
        </TableCell>
      )

    case 'REPS_DURATION':
      return (
        <>
          <TableCell>
            <Input
              type="number"
              placeholder="0"
              value={valueFor('reps')}
              onChange={(e) => handleInputChange(setNumber, 'reps', e.target.value)}
              disabled={isInputDisabled}
              className={inputClass}
            />
          </TableCell>
          <TableCell>
            <Input
              type="number"
              placeholder="0"
              value={valueFor('duration')}
              onChange={(e) => handleInputChange(setNumber, 'duration', e.target.value)}
              disabled={isInputDisabled}
              className={inputClass}
            />
          </TableCell>
        </>
      )

    case 'DURATION':
      return (
        <TableCell>
          <Input
            type="number"
            placeholder="0"
            value={valueFor('duration')}
            onChange={(e) => handleInputChange(setNumber, 'duration', e.target.value)}
            disabled={isInputDisabled}
            className={inputClass}
          />
        </TableCell>
      )

    case 'DISTANCE_DURATION':
      return (
        <>
          <TableCell>
            <Input
              type="number"
              placeholder="0"
              value={valueFor('distance')}
              onChange={(e) => handleInputChange(setNumber, 'distance', e.target.value)}
              disabled={isInputDisabled}
              className={inputClass}
            />
          </TableCell>
          <TableCell>
            <Input
              type="number"
              placeholder="0"
              value={valueFor('duration')}
              onChange={(e) => handleInputChange(setNumber, 'duration', e.target.value)}
              disabled={isInputDisabled}
              className={inputClass}
            />
          </TableCell>
        </>
      )

    case 'WEIGHT_DISTANCE':
      return (
        <>
          <TableCell>
            <Input
              type="number"
              step="0.5"
              placeholder="0"
              value={valueFor('weight')}
              onChange={(e) => handleInputChange(setNumber, 'weight', e.target.value)}
              disabled={isInputDisabled}
              className={inputClass}
            />
          </TableCell>
          <TableCell>
            <Input
              type="number"
              placeholder="0"
              value={valueFor('distance')}
              onChange={(e) => handleInputChange(setNumber, 'distance', e.target.value)}
              disabled={isInputDisabled}
              className={inputClass}
            />
          </TableCell>
        </>
      )

    case 'WEIGHT_DURATION':
      return (
        <>
          <TableCell>
            <Input
              type="number"
              step="0.5"
              placeholder="0"
              value={valueFor('weight')}
              onChange={(e) => handleInputChange(setNumber, 'weight', e.target.value)}
              disabled={isInputDisabled}
              className={inputClass}
            />
          </TableCell>
          <TableCell>
            <Input
              type="number"
              placeholder="0"
              value={valueFor('duration')}
              onChange={(e) => handleInputChange(setNumber, 'duration', e.target.value)}
              disabled={isInputDisabled}
              className={inputClass}
            />
          </TableCell>
        </>
      )

    default:
      return <TableCell>–</TableCell>
  }
}

/**
 * ✅ 0-safe validation:
 * - 0 is valid input
 * - undefined / null / NaN are invalid
 */
function validateMetrics(metricType: MetricType, metrics: SetMetrics): boolean {
  const hasNumber = (v: unknown) =>
    v !== undefined && v !== null && v !== '' && !(typeof v === 'number' && Number.isNaN(v))

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
}

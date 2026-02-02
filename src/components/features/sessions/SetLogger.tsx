/**
 * Set Logger Component (Client-First Architecture)
 *
 * Displays the current exercise with:
 * - Exercise name and controls
 * - Set logging table (multi-metric support)
 * - Add/Remove set buttons
 * - Undo last set button
 * - Exercise notes
 * - Active set highlighting (only activeSetNumber is interactive)
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
import type { SessionExerciseEntry, SetMetrics, SessionSet } from '@/types/session'
import type { MetricType } from '@prisma/client'

interface SetLoggerProps {
  exercise: SessionExerciseEntry
  disabled?: boolean
  onOpenOptions?: () => void
}

export function SetLogger({ exercise, disabled, onOpenOptions }: SetLoggerProps) {
  const dispatch = useAppDispatch()

  // Get progress from Redux
  const progress = useAppSelector((state) => state.session.progress[exercise.instanceId])

  // Local state for current set inputs
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

  // Handle input change for active set
  const handleInputChange = (field: keyof SetMetrics, value: string) => {
    const numValue = value === '' ? undefined : parseFloat(value)
    setCurrentInputs((prev) => ({
      ...prev,
      [field]: numValue,
    }))

    // Also update in Redux (for persistence)
    dispatch(
      updateSet({
        instanceId: exercise.instanceId,
        setNumber: activeSetNumber,
        metrics: {
          [field]: numValue,
        },
      })
    )
  }

  // Handle complete set
  const handleCompleteSet = () => {
    // Validate inputs based on metric type
    if (!validateMetrics(exercise.metricType, currentInputs)) {
      toast.error('Please fill in all required fields')
      return
    }

    // Dispatch completeSet (handles auto-advance, superset rotation, timer)
    dispatch(completeSet({ metrics: currentInputs }))

    // Clear inputs for next set
    setCurrentInputs({})

    // Show success toast
    toast.success(`Set ${activeSetNumber} completed`, {
      duration: 1000,
    })
  }

  // Check if there's any completed set to undo
  const hasCompletedSets = sets.some((s) => s.completed)

  return (
    <div className="space-y-6">
      {/* Exercise Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{exercise.name}</h2>
          <p className="text-sm text-muted-foreground">
            {exercise.targetSets} sets × {exercise.targetReps || '–'} reps
            {exercise.targetWeight && ` @ ${exercise.targetWeight}kg`}
          </p>
        </div>

        {/* Exercise Options Menu Button */}
        <Button variant="ghost" size="icon" disabled={disabled} onClick={onOpenOptions}>
          <MoreVertical className="h-5 w-5" />
        </Button>
      </div>

      {/* Set Logging Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Set</TableHead>
              {renderTableHeaders(exercise.metricType)}
              <TableHead className="w-20 text-center">
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
                    isCompleted && 'bg-muted/50'
                  )}
                >
                  {/* Set Number */}
                  <TableCell className="font-medium">{set.setNumber}</TableCell>

                  {/* Metric Inputs */}
                  {renderSetInputs(
                    set.setNumber,
                    exercise.metricType,
                    set,
                    isActive,
                    isCompleted,
                    currentInputs,
                    handleInputChange,
                    disabled
                  )}

                  {/* Complete Button */}
                  <TableCell>
                    {isCompleted ? (
                      <div className="flex justify-center">
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
    </div>
  )
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Render table headers based on metric type
 */
function renderTableHeaders(metricType: MetricType): React.ReactNode {
  switch (metricType) {
    case 'WEIGHT_REPS':
      return (
        <>
          <TableHead>Weight (kg)</TableHead>
          <TableHead>Reps</TableHead>
        </>
      )
    case 'COUNTER_WEIGHT_REPS':
      return (
        <>
          <TableHead>Assist (kg)</TableHead>
          <TableHead>Reps</TableHead>
        </>
      )
    case 'REPS':
      return <TableHead>Reps</TableHead>
    case 'REPS_DURATION':
      return (
        <>
          <TableHead>Reps</TableHead>
          <TableHead>Duration (s)</TableHead>
        </>
      )
    case 'DURATION':
      return <TableHead>Duration (s)</TableHead>
    case 'DISTANCE_DURATION':
      return (
        <>
          <TableHead>Distance (m)</TableHead>
          <TableHead>Duration (s)</TableHead>
        </>
      )
    case 'WEIGHT_DISTANCE':
      return (
        <>
          <TableHead>Weight (kg)</TableHead>
          <TableHead>Distance (m)</TableHead>
        </>
      )
    case 'WEIGHT_DURATION':
      return (
        <>
          <TableHead>Weight (kg)</TableHead>
          <TableHead>Duration (s)</TableHead>
        </>
      )
    default:
      return <TableHead>Value</TableHead>
  }
}

/**
 * Render set input fields based on metric type
 */
function renderSetInputs(
  setNumber: number,
  metricType: MetricType,
  set: SessionSet,
  isActive: boolean,
  isCompleted: boolean,
  currentInputs: SetMetrics,
  handleInputChange: (field: keyof SetMetrics, value: string) => void,
  disabled?: boolean
): React.ReactNode {
  const inputProps = {
    disabled: disabled || !isActive || isCompleted,
    className: cn('h-8', isCompleted && 'bg-transparent border-transparent'),
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
              value={
                isCompleted ? set.metrics.weight || '' : isActive ? currentInputs.weight || '' : ''
              }
              onChange={(e) => handleInputChange('weight', e.target.value)}
              {...inputProps}
            />
          </TableCell>
          <TableCell>
            <Input
              type="number"
              placeholder="0"
              value={
                isCompleted ? set.metrics.reps || '' : isActive ? currentInputs.reps || '' : ''
              }
              onChange={(e) => handleInputChange('reps', e.target.value)}
              {...inputProps}
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
              value={
                isCompleted
                  ? set.metrics.counterWeight || ''
                  : isActive
                    ? currentInputs.counterWeight || ''
                    : ''
              }
              onChange={(e) => handleInputChange('counterWeight', e.target.value)}
              {...inputProps}
            />
          </TableCell>
          <TableCell>
            <Input
              type="number"
              placeholder="0"
              value={
                isCompleted ? set.metrics.reps || '' : isActive ? currentInputs.reps || '' : ''
              }
              onChange={(e) => handleInputChange('reps', e.target.value)}
              {...inputProps}
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
            value={isCompleted ? set.metrics.reps || '' : isActive ? currentInputs.reps || '' : ''}
            onChange={(e) => handleInputChange('reps', e.target.value)}
            {...inputProps}
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
              value={
                isCompleted ? set.metrics.reps || '' : isActive ? currentInputs.reps || '' : ''
              }
              onChange={(e) => handleInputChange('reps', e.target.value)}
              {...inputProps}
            />
          </TableCell>
          <TableCell>
            <Input
              type="number"
              placeholder="0"
              value={
                isCompleted
                  ? set.metrics.duration || ''
                  : isActive
                    ? currentInputs.duration || ''
                    : ''
              }
              onChange={(e) => handleInputChange('duration', e.target.value)}
              {...inputProps}
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
            value={
              isCompleted
                ? set.metrics.duration || ''
                : isActive
                  ? currentInputs.duration || ''
                  : ''
            }
            onChange={(e) => handleInputChange('duration', e.target.value)}
            {...inputProps}
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
              value={
                isCompleted
                  ? set.metrics.distance || ''
                  : isActive
                    ? currentInputs.distance || ''
                    : ''
              }
              onChange={(e) => handleInputChange('distance', e.target.value)}
              {...inputProps}
            />
          </TableCell>
          <TableCell>
            <Input
              type="number"
              placeholder="0"
              value={
                isCompleted
                  ? set.metrics.duration || ''
                  : isActive
                    ? currentInputs.duration || ''
                    : ''
              }
              onChange={(e) => handleInputChange('duration', e.target.value)}
              {...inputProps}
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
              value={
                isCompleted ? set.metrics.weight || '' : isActive ? currentInputs.weight || '' : ''
              }
              onChange={(e) => handleInputChange('weight', e.target.value)}
              {...inputProps}
            />
          </TableCell>
          <TableCell>
            <Input
              type="number"
              placeholder="0"
              value={
                isCompleted
                  ? set.metrics.distance || ''
                  : isActive
                    ? currentInputs.distance || ''
                    : ''
              }
              onChange={(e) => handleInputChange('distance', e.target.value)}
              {...inputProps}
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
              value={
                isCompleted ? set.metrics.weight || '' : isActive ? currentInputs.weight || '' : ''
              }
              onChange={(e) => handleInputChange('weight', e.target.value)}
              {...inputProps}
            />
          </TableCell>
          <TableCell>
            <Input
              type="number"
              placeholder="0"
              value={
                isCompleted
                  ? set.metrics.duration || ''
                  : isActive
                    ? currentInputs.duration || ''
                    : ''
              }
              onChange={(e) => handleInputChange('duration', e.target.value)}
              {...inputProps}
            />
          </TableCell>
        </>
      )

    default:
      return <TableCell>–</TableCell>
  }
}

/**
 * Validate metrics based on metric type
 */
function validateMetrics(metricType: MetricType, metrics: SetMetrics): boolean {
  switch (metricType) {
    case 'WEIGHT_REPS':
      return !!metrics.weight && !!metrics.reps
    case 'COUNTER_WEIGHT_REPS':
      return !!metrics.counterWeight && !!metrics.reps
    case 'REPS':
      return !!metrics.reps
    case 'REPS_DURATION':
      return !!metrics.reps && !!metrics.duration
    case 'DURATION':
      return !!metrics.duration
    case 'DISTANCE_DURATION':
      return !!metrics.distance && !!metrics.duration
    case 'WEIGHT_DISTANCE':
      return !!metrics.weight && !!metrics.distance
    case 'WEIGHT_DURATION':
      return !!metrics.weight && !!metrics.duration
    default:
      return false
  }
}

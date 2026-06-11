/**
 * Completed Session Actions Menu
 *
 * Kebab menu shown on the right of the completed-session drawer title. Hosts
 * the two session-level actions previously in the drawer footer:
 *   - Save as Workout (gated: workoutId null + workout:create role)
 *   - Repeat Session  (gated: not hidden by the caller)
 *
 * The whole menu renders null when neither action is available, so no empty
 * trigger appears.
 *
 * --- Save as Workout ---
 * Turns a completed session into a reusable workout template. Offline: fully
 * supported via the existing offline-capable `useCreateWorkout` path
 * (`['workouts','create']` → `/api/offline/workouts` → `workoutService.create`),
 * which optimistically updates the cache and auto-syncs on reconnect. Name
 * uniqueness is a best-effort client-side check against the cached workouts list
 * (workout name has no unique DB constraint).
 *
 * --- Repeat Session ---
 * Starts a fresh ad-hoc session reusing the completed session's exercises and
 * target params. The new session is always ad-hoc (workoutId/planId/planDayId
 * null) so repeating a plan-day session does not re-complete a plan day.
 * Two contexts: history views self-handle via `useActiveSessionGuard`; the live
 * just-completed drawer passes an `onRepeat` override (its close handler tears
 * down + navigates, which would otherwise conflict).
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useQueryClient } from '@tanstack/react-query'
import { MoreVertical } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAppDispatch } from '@/store/hooks'
import { useCanCreateWorkout } from '@/hooks/useCanCreateWorkout'
import { useActiveSessionGuard } from '@/hooks/useActiveSessionGuard'
import { useCreateWorkout } from '@/hooks/mutations/useWorkoutMutations'
import { startRepeatedSession } from '@/lib/utils/session-navigation'
import { newTempId } from '@/lib/pwa/temp-id'
import type { WorkoutExerciseSnapshot } from '@/lib/pwa/mutation-defaults'
import type { CompletedSessionData } from './CompletedSessionDrawer'
import type { Exercise } from '@prisma/client'

interface CompletedSessionActionsMenuProps {
  data: CompletedSessionData
  /** Override for the repeat flow (live just-completed drawer). */
  onRepeat?: (data: CompletedSessionData) => void
  /** Hide the Repeat action (e.g. viewing another user's session). */
  hideRepeat?: boolean
}

const WORKOUTS_ALL_KEY = ['workouts', 'all'] as const

type WorkoutsListShape = { workouts?: Array<{ name?: string | null }> }

/** Clamp a value into [min, max]. */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function CompletedSessionActionsMenu({
  data,
  onRepeat,
  hideRepeat,
}: CompletedSessionActionsMenuProps) {
  const { data: session } = useSession()
  const { canCreate } = useCanCreateWorkout()
  const queryClient = useQueryClient()
  const createWorkout = useCreateWorkout()
  const dispatch = useAppDispatch()
  const router = useRouter()
  const { guardedStart } = useActiveSessionGuard()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const canSave = data.workoutId == null && canCreate
  const canRepeat = !hideRepeat

  // Nothing to show — don't render an empty trigger.
  if (!canSave && !canRepeat) return null

  const openSaveDialog = () => {
    setName(data.workoutName ?? '')
    setError(null)
    setDialogOpen(true)
  }

  const handleRepeat = () => {
    if (onRepeat) {
      onRepeat(data)
      return
    }
    guardedStart(() => startRepeatedSession(data, dispatch, router))
  }

  /** Case-insensitive name clash against the cached workouts list (best-effort). */
  const nameExists = (candidate: string): boolean => {
    const list = queryClient.getQueryData<WorkoutsListShape>(WORKOUTS_ALL_KEY)
    if (!list?.workouts) return false
    const target = candidate.trim().toLowerCase()
    return list.workouts.some((w) => (w.name ?? '').trim().toLowerCase() === target)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Workout name is required')
      return
    }
    if (!session?.user?.id) {
      setError('You must be signed in to save a workout')
      return
    }
    if (nameExists(trimmed)) {
      setError('A workout with this name already exists')
      return
    }

    // Map completed-session exercises → workout exercise snapshots.
    // Wire constraints (nestedOfflineExerciseSchema): sets 1–20, reps 1–999,
    // weight 0–9999, restSeconds 0–600. The `exercise` object is for the
    // optimistic cache render only — it never reaches the wire.
    const exercises: WorkoutExerciseSnapshot[] = data.exercises.map((ex, idx) => {
      const completedSets = ex.sets.filter((s) => s.isCompleted).length
      const setCount = clamp(completedSets || ex.sets.length || 1, 1, 20)
      const reps = ex.targetReps != null && ex.targetReps >= 1 ? clamp(ex.targetReps, 1, 999) : null
      const weight = ex.targetWeight != null ? clamp(ex.targetWeight, 0, 9999) : null

      const cached =
        queryClient.getQueryData<Exercise>(['exercise', ex.exerciseId]) ??
        queryClient
          .getQueryData<{ exercises?: Exercise[] }>(['exercises', 'all'])
          ?.exercises?.find((e) => e.id === ex.exerciseId)

      // Fall back to a partial synthesized from the completed-exercise data
      // (Chunk B carries the muscle groups the optimistic builders read).
      const exercise =
        cached ??
        ({
          id: ex.exerciseId,
          name: ex.name,
          metricType: ex.metricType,
          exerciseType: ex.exerciseType,
          primaryMuscleGroup: ex.primaryMuscleGroup,
          secondaryMuscleGroups: ex.secondaryMuscleGroups,
        } as Exercise)

      return {
        id: newTempId(),
        exerciseId: ex.exerciseId,
        order: idx,
        sets: setCount,
        reps,
        weight,
        restSeconds: clamp(ex.targetRestSeconds ?? 60, 0, 600),
        notes: ex.notes ?? null,
        groupId: ex.groupId ?? null,
        exercise,
      }
    })

    createWorkout.mutate({
      tempId: newTempId(),
      userId: session.user.id,
      input: { name: trimmed },
      exercises,
    })

    setDialogOpen(false)
  }

  return (
    <>
      {/* modal={false}: these items trigger navigation / open a dialog. A modal
          dropdown locks `body { pointer-events: none }` while open and only
          restores it on close-cleanup — if the surrounding drawer unmounts
          first, that lock strands and the page becomes unclickable. Non-modal
          avoids the body lock entirely. */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Session actions">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canSave && (
            <DropdownMenuItem
              onSelect={(e) => {
                // Keep the menu's close from racing the dialog open.
                e.preventDefault()
                openSaveDialog()
              }}
            >
              Save as Workout
            </DropdownMenuItem>
          )}
          {canRepeat && <DropdownMenuItem onSelect={handleRepeat}>Repeat Session</DropdownMenuItem>}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Save as Workout</DialogTitle>
              <DialogDescription>
                Save this session&apos;s exercises as a reusable workout template.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 py-4">
              <Label htmlFor="save-workout-name">
                Workout Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="save-workout-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (error) setError(null)
                }}
                maxLength={100}
                autoFocus
                aria-invalid={!!error}
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!name.trim()}>
                Save Workout
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

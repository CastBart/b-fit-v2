/**
 * Session Settings Drawer Component
 *
 * Displays session info and provides controls:
 * - Start time, elapsed duration
 * - Pause/Resume
 * - Complete Session (saves to DB)
 * - Abandon Session (saves partial progress)
 * - Session notes
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { CalendarDays, Hourglass, Pause, Play, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import {
  pauseSession,
  resumeSession,
  updateSessionNotes,
  resetSessionState,
  prepareSessionEnd,
  endSession,
} from '@/store/slices/sessionSlice'
import { clearSessionBackup } from '@/store/middleware/persistence'
import { commitCompletedSession } from '@/lib/pwa/commit-completed-session'
import { useElapsedSessionTime } from '@/hooks/useElapsedSessionTime'
import { formatStartTime, formatDuration } from '@/lib/utils/format-time'
import { SessionStatus, type SaveSessionPayload } from '@/types/session'
import { toast } from 'sonner'

interface SessionSettingsDrawerProps {
  children: React.ReactNode
  onSessionComplete?: () => void
}

export function SessionSettingsDrawer({ children, onSessionComplete }: SessionSettingsDrawerProps) {
  const router = useRouter()
  const dispatch = useAppDispatch()

  // Redux state
  const {
    sessionId,
    workoutId,
    workoutName,
    startTime,
    isPaused,
    exercises,
    progress,
    sessionNotes,
    accumulatedPauseDuration,
    planId,
    planDayId,
  } = useAppSelector((state) => state.session)

  // Live elapsed time
  const elapsedSeconds = useElapsedSessionTime()

  // Local state
  const [open, setOpen] = useState(false)
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false)
  const [abandonDialogOpen, setAbandonDialogOpen] = useState(false)
  const [isCommitting, setIsCommitting] = useState(false)
  const [notes, setNotes] = useState(sessionNotes || '')

  // Update notes in Redux on blur
  const handleNotesBlur = () => {
    if (notes !== sessionNotes) {
      dispatch(updateSessionNotes(notes))
    }
  }

  // Build save payload from Redux state
  const buildSavePayload = (status: SessionStatus): SaveSessionPayload => {
    return {
      sessionId: sessionId!,
      workoutId,
      workoutName,
      planId,
      planDayId,
      startTime: startTime!,
      completeTime: Date.now(),
      accumulatedPauseDuration,
      status,
      sessionNotes: notes || null,
      exercises: exercises.map((exercise) => {
        const exerciseProgress = progress[exercise.instanceId]
        return {
          instanceId: exercise.instanceId,
          exerciseId: exercise.exerciseId,
          order: exercise.order,
          groupId: exercise.groupId,
          targetSets: exercise.targetSets,
          targetReps: exercise.targetReps,
          targetWeight: exercise.targetWeight,
          targetRestSeconds: exercise.targetRestSeconds,
          notes: exerciseProgress?.notes || null,
          sets:
            exerciseProgress?.sets.map((set) => ({
              setNumber: set.setNumber,
              weight: set.metrics.weight || null,
              reps: set.metrics.reps || null,
              duration: set.metrics.duration || null,
              distance: set.metrics.distance || null,
              counterWeight: set.metrics.counterWeight || null,
              rir: set.metrics.rir ?? null, // ?? not || — RIR 0 (to failure) is a valid value
              isCompleted: set.completed,
              completedAt: set.completedAt || null,
            })) || [],
        }
      }),
    }
  }

  // Handle complete session
  const handleComplete = async () => {
    setIsCommitting(true)
    try {
      const payload = buildSavePayload(SessionStatus.COMPLETED)

      // Prepare session end (stops timer, sets completeTime, keeps isActive = true)
      dispatch(prepareSessionEnd())

      // Commit boundary: writes durable IDB marker, fires the mutation
      // (pauses offline), and clears the localStorage backup. Safe under
      // a crash between "tapped Complete" and "server confirmed".
      await commitCompletedSession('complete', payload)

      // Close the drawer first
      setCompleteDialogOpen(false)
      setOpen(false)

      // If callback provided, let parent handle the completion UI
      if (onSessionComplete) {
        onSessionComplete()
      } else {
        // Fallback: fully end session, clear state and navigate directly
        dispatch(endSession())
        dispatch(resetSessionState())
        clearSessionBackup()
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Failed to complete session:', error)
      toast.error('Failed to save session. Please try again.')
      setCompleteDialogOpen(false)
    } finally {
      setIsCommitting(false)
    }
  }

  // Handle abandon session - does NOT save to database
  const handleAbandon = () => {
    // End session
    dispatch(endSession())

    // Clear Redux state and LocalStorage without saving
    dispatch(resetSessionState())
    clearSessionBackup()

    toast.success('Session abandoned')

    // Navigate to dashboard
    router.push('/dashboard')

    setAbandonDialogOpen(false)
    setOpen(false)
  }

  // Handle pause/resume
  const handlePauseResume = () => {
    if (isPaused) {
      dispatch(resumeSession())
      toast.success('Session resumed')
    } else {
      dispatch(pauseSession())
      toast.success('Session paused')
    }
  }

  return (
    <>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>{children}</DrawerTrigger>

        <DrawerContent className="custom-drawer-no-height justify-self-center">
          <DrawerHeader>
            <DrawerTitle className="text-center text-2xl">{workoutName}</DrawerTitle>
            <DrawerDescription className="hidden">Session settings and controls</DrawerDescription>
            <Separator className="mt-2" />
          </DrawerHeader>

          <div className="px-6 space-y-4">
            {/* Start Time */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <CalendarDays className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">Started</span>
              </div>
              <span className="text-sm text-muted-foreground">{formatStartTime(startTime)}</span>
            </div>

            {/* Duration */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <Hourglass className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">Duration</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {elapsedSeconds !== null ? formatDuration(elapsedSeconds) : '--:--'}
              </span>
            </div>

            {/* Session Notes */}
            <div className="space-y-2">
              <Label htmlFor="session-notes">Session Notes (Optional)</Label>
              <Textarea
                id="session-notes"
                placeholder="Add notes about your session..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={handleNotesBlur}
                rows={3}
                className="resize-none"
              />
            </div>

            <Separator />

            {/* Action Buttons */}
            <div className="space-y-3">
              {/* Complete Session */}
              <Button
                onClick={() => setCompleteDialogOpen(true)}
                className="w-full"
                size="lg"
                disabled={isCommitting}
              >
                {isCommitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-5 w-5" />
                    Complete Session
                  </>
                )}
              </Button>

              {/* Pause/Resume */}
              <Button variant="outline" onClick={handlePauseResume} className="w-full" size="lg">
                {isPaused ? (
                  <>
                    <Play className="mr-2 h-5 w-5" />
                    Resume Session
                  </>
                ) : (
                  <>
                    <Pause className="mr-2 h-5 w-5" />
                    Pause Session
                  </>
                )}
              </Button>

              {/* Abandon Session */}
              <Button
                variant="destructive"
                onClick={() => setAbandonDialogOpen(true)}
                className="w-full"
                size="lg"
              >
                <XCircle className="mr-2 h-5 w-5" />
                Abandon Session
              </Button>
            </div>
          </div>

          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline">Close</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Complete Confirmation Dialog */}
      <AlertDialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete Session?</AlertDialogTitle>
            <AlertDialogDescription>
              This will save your session to the database. You can view it in your session history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleComplete}>Complete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Abandon Confirmation Dialog */}
      <AlertDialog open={abandonDialogOpen} onOpenChange={setAbandonDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Abandon Session?</AlertDialogTitle>
            <AlertDialogDescription>
              This will discard your session without saving. All progress will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAbandon}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Abandon
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

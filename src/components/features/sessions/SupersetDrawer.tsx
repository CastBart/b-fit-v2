/**
 * Superset Drawer Component
 *
 * Drawer for managing superset configuration:
 * - Superset with previous exercise
 * - Superset with next exercise
 * - Remove from superset
 */

'use client';

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Link2, Unlink } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  supersetWithPrev,
  supersetWithNext,
  removeSupersetWithPrev,
  removeSupersetWithNext,
} from '@/store/slices/sessionSlice';
import { toast } from 'sonner';
import type { SessionExerciseEntry } from '@/types/session';

interface SupersetDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercise: SessionExerciseEntry | null;
}

export function SupersetDrawer({
  open,
  onOpenChange,
  exercise,
}: SupersetDrawerProps) {
  const dispatch = useAppDispatch();
  const exercises = useAppSelector((state) => state.session.exercises);

  if (!exercise) return null;

  // Find current exercise index
  const currentIndex = exercises.findIndex(
    (ex) => ex.instanceId === exercise.instanceId
  );

  if (currentIndex < 0) return null;

  const prevExercise = currentIndex > 0 ? exercises[currentIndex - 1] : null;
  const nextExercise =
    currentIndex < exercises.length - 1 ? exercises[currentIndex + 1] : null;

  // Helper functions to determine what actions are available
  const canSupersetWithPrev =
    prevExercise &&
    (!prevExercise.groupId ||
      !exercise.groupId ||
      prevExercise.groupId !== exercise.groupId);

  const canRemoveSupersetWithPrev =
    prevExercise &&
    exercise.groupId &&
    prevExercise.groupId === exercise.groupId;

  const canSupersetWithNext =
    nextExercise &&
    (!nextExercise.groupId ||
      !exercise.groupId ||
      nextExercise.groupId !== exercise.groupId);

  const canRemoveSupersetWithNext =
    nextExercise &&
    exercise.groupId &&
    nextExercise.groupId === exercise.groupId;

  // Action handlers
  const handleSupersetWithPrev = () => {
    dispatch(supersetWithPrev({ instanceId: exercise.instanceId }));
    toast.success(`Supersetted with ${prevExercise?.name}`);
    onOpenChange(false);
  };

  const handleSupersetWithNext = () => {
    dispatch(supersetWithNext({ instanceId: exercise.instanceId }));
    toast.success(`Supersetted with ${nextExercise?.name}`);
    onOpenChange(false);
  };

  const handleRemoveSupersetWithPrev = () => {
    dispatch(removeSupersetWithPrev({ instanceId: exercise.instanceId }));
    toast.success('Removed from superset');
    onOpenChange(false);
  };

  const handleRemoveSupersetWithNext = () => {
    dispatch(removeSupersetWithNext({ instanceId: exercise.instanceId }));
    toast.success('Removed from superset');
    onOpenChange(false);
  };

  // Check if there are any actions available
  const hasActions =
    canSupersetWithPrev ||
    canRemoveSupersetWithPrev ||
    canSupersetWithNext ||
    canRemoveSupersetWithNext;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-[600px] mx-auto">
        <DrawerHeader>
          <DrawerTitle className="text-center text-2xl">Superset</DrawerTitle>
          <DrawerDescription className="hidden">
            Manage superset configuration
          </DrawerDescription>
          <Separator className="mt-2" />
        </DrawerHeader>

        <div className="px-6 py-4 space-y-3">
          {!hasActions && (
            <p className="text-center text-muted-foreground py-4">
              No superset actions available
            </p>
          )}

          {/* Superset with Previous */}
          {canSupersetWithPrev && (
            <Button
              variant="secondary"
              size="lg"
              onClick={handleSupersetWithPrev}
              className="w-full"
            >
              <Link2 className="mr-2 h-5 w-5" />
              Superset with Previous
              {prevExercise && (
                <span className="ml-2 text-xs text-muted-foreground truncate">
                  ({prevExercise.name})
                </span>
              )}
            </Button>
          )}

          {/* Remove Superset with Previous */}
          {canRemoveSupersetWithPrev && (
            <Button
              variant="secondary"
              size="lg"
              onClick={handleRemoveSupersetWithPrev}
              className="w-full"
            >
              <Unlink className="mr-2 h-5 w-5" />
              Remove from Previous Superset
            </Button>
          )}

          {/* Superset with Next */}
          {canSupersetWithNext && (
            <Button
              variant="secondary"
              size="lg"
              onClick={handleSupersetWithNext}
              className="w-full"
            >
              <Link2 className="mr-2 h-5 w-5" />
              Superset with Next
              {nextExercise && (
                <span className="ml-2 text-xs text-muted-foreground truncate">
                  ({nextExercise.name})
                </span>
              )}
            </Button>
          )}

          {/* Remove Superset with Next */}
          {canRemoveSupersetWithNext && (
            <Button
              variant="secondary"
              size="lg"
              onClick={handleRemoveSupersetWithNext}
              className="w-full"
            >
              <Unlink className="mr-2 h-5 w-5" />
              Remove from Next Superset
            </Button>
          )}
        </div>

        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline">Close</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

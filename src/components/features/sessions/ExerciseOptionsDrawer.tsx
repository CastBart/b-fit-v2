/**
 * Exercise Options Drawer Component
 *
 * Drawer for exercise-level actions:
 * - Superset management
 * - Remove exercise
 */

'use client';

import { useState } from 'react';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { MoreVertical, Link2, Trash2 } from 'lucide-react';
import { useAppDispatch } from '@/store/hooks';
import { removeExercise } from '@/store/slices/sessionSlice';
import { toast } from 'sonner';
import { SupersetDrawer } from './SupersetDrawer';
import type { SessionExerciseEntry } from '@/types/session';

interface ExerciseOptionsDrawerProps {
  exercise: SessionExerciseEntry;
  disabled?: boolean;
}

export function ExerciseOptionsDrawer({
  exercise,
  disabled,
}: ExerciseOptionsDrawerProps) {
  const dispatch = useAppDispatch();
  const [open, setOpen] = useState(false);
  const [supersetDrawerOpen, setSupersetDrawerOpen] = useState(false);

  const handleRemoveExercise = () => {
    dispatch(removeExercise({ instanceId: exercise.instanceId }));
    toast.success(`${exercise.name} removed`);
    setOpen(false);
  };

  const handleOpenSuperset = () => {
    setOpen(false);
    setSupersetDrawerOpen(true);
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="ghost" size="icon" disabled={disabled}>
          <MoreVertical className="h-5 w-5" />
        </Button>
      </DrawerTrigger>

      <DrawerContent className="max-w-[600px] mx-auto">
        <DrawerHeader>
          <DrawerTitle className="text-center text-2xl">
            {exercise.name}
          </DrawerTitle>
          <DrawerDescription className="hidden">
            Exercise options
          </DrawerDescription>
          <Separator className="mt-2" />
        </DrawerHeader>

        <div className="px-6 py-4 space-y-3">
          {/* Superset Button */}
          <Button
            variant="secondary"
            size="lg"
            onClick={handleOpenSuperset}
            disabled={disabled}
            className="w-full"
          >
            <Link2 className="mr-2 h-5 w-5" />
            Superset
          </Button>

          {/* Remove Exercise Button */}
          <Button
            variant="destructive"
            size="lg"
            onClick={handleRemoveExercise}
            disabled={disabled}
            className="w-full"
          >
            <Trash2 className="mr-2 h-5 w-5" />
            Remove Exercise
          </Button>
        </div>

        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline">Close</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>

      {/* Superset Drawer */}
      <SupersetDrawer
        open={supersetDrawerOpen}
        onOpenChange={setSupersetDrawerOpen}
        exercise={exercise}
      />
    </Drawer>
  );
}

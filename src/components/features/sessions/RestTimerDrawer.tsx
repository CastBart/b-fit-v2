/**
 * Rest Timer Drawer Component
 *
 * Floating button that appears when rest timer is running.
 * Opens drawer with countdown and timer controls.
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
import { Timer, Plus, Minus, SkipForward } from 'lucide-react';
import { useAppDispatch } from '@/store/hooks';
import { stopTimer, addTimeToTimer } from '@/store/slices/sessionSlice';
import { formatRestTimer } from '@/lib/utils/format-time';

interface RestTimerDrawerProps {
  remaining: number; // seconds remaining
}

export function RestTimerDrawer({ remaining }: RestTimerDrawerProps) {
  const dispatch = useAppDispatch();
  const [open, setOpen] = useState(false);

  const handleAddTime = (seconds: number) => {
    dispatch(addTimeToTimer(seconds));
  };

  const handleSkip = () => {
    dispatch(stopTimer());
    setOpen(false);
  };

  // Determine color based on remaining time
  const getTimerColor = () => {
    if (remaining < 0) return 'text-red-600'; // Overtime
    if (remaining <= 10) return 'text-red-500';
    if (remaining <= 30) return 'text-orange-500';
    return 'text-primary';
  };

  const isOvertime = remaining < 0;

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      {/* Floating Button */}
      <DrawerTrigger asChild>
        <Button
          size="lg"
          className="fixed left-1/2 -translate-x-1/2 bottom-6 h-24 w-24 rounded-full shadow-lg z-40"
          variant={isOvertime || remaining <= 10 ? 'destructive' : 'default'}
        >
          <div className="flex flex-col items-center">
            <Timer className="h-7 w-7" />
            <span className="text-sm font-bold mt-1">{formatRestTimer(remaining)}</span>
          </div>
        </Button>
      </DrawerTrigger>

      {/* Drawer Content */}
      <DrawerContent className="max-w-[600px] mx-auto">
        <DrawerHeader>
          <DrawerTitle className="text-center text-2xl">Rest Timer</DrawerTitle>
          <DrawerDescription className="hidden">
            Rest timer controls and countdown
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-6 py-8">
          {/* Large Countdown Display */}
          <div className="flex flex-col items-center justify-center space-y-4">
            <div
              className={`text-8xl font-bold tabular-nums ${getTimerColor()}`}
            >
              {formatRestTimer(remaining)}
            </div>
            <p className="text-muted-foreground">
              {isOvertime ? 'Overtime' : 'Time remaining'}
            </p>
          </div>

          {/* Timer Controls */}
          <div className="mt-8 grid grid-cols-3 gap-4">
            {/* -15s Button */}
            <Button
              variant="outline"
              size="lg"
              onClick={() => handleAddTime(-15)}
              className="flex flex-col items-center gap-1 h-auto py-4"
            >
              <Minus className="h-5 w-5" />
              <span className="text-sm">15s</span>
            </Button>

            {/* Skip Button */}
            <Button
              variant="secondary"
              size="lg"
              onClick={handleSkip}
              className="flex flex-col items-center gap-1 h-auto py-4"
            >
              <SkipForward className="h-5 w-5" />
              <span className="text-sm">Skip</span>
            </Button>

            {/* +15s Button */}
            <Button
              variant="outline"
              size="lg"
              onClick={() => handleAddTime(15)}
              className="flex flex-col items-center gap-1 h-auto py-4"
            >
              <Plus className="h-5 w-5" />
              <span className="text-sm">15s</span>
            </Button>
          </div>

          {/* Quick Add Buttons */}
          <div className="mt-4 flex justify-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleAddTime(30)}
            >
              +30s
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleAddTime(60)}
            >
              +1m
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleAddTime(120)}
            >
              +2m
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
  );
}

import { useState, useEffect } from 'react';
import { useAppSelector } from '@/store/hooks';

/**
 * Hook that calculates and returns the elapsed session time in seconds.
 * Updates every second and accounts for pauses.
 *
 * @returns Elapsed time in seconds, or null if no active session
 */
export function useElapsedSessionTime(): number | null {
  const { startTime, isPaused, pauseTime, accumulatedPauseDuration, isActive } =
    useAppSelector((state) => state.session);

  const [elapsed, setElapsed] = useState<number | null>(null);

  useEffect(() => {
    if (!startTime || !isActive) {
      setElapsed(null);
      return;
    }

    // Calculate initial elapsed time
    const calculateElapsed = () => {
      const now = Date.now();
      let total = now - startTime - accumulatedPauseDuration;

      // If currently paused, subtract the current pause duration
      if (isPaused && pauseTime) {
        total -= now - pauseTime;
      }

      return Math.floor(total / 1000); // Convert to seconds
    };

    // Set initial value
    setElapsed(calculateElapsed());

    // Update every second
    const interval = setInterval(() => {
      setElapsed(calculateElapsed());
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, isPaused, pauseTime, accumulatedPauseDuration, isActive]);

  return elapsed;
}

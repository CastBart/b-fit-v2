/**
 * Format seconds into MM:SS format
 * @param seconds Total seconds
 * @returns Formatted time string (e.g., "2:30")
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format a timestamp into a human-readable start time
 * @param timestamp Unix timestamp in milliseconds
 * @returns Formatted date string
 */
export function formatStartTime(timestamp: number | null): string {
  if (!timestamp) return 'Not started';

  const date = new Date(timestamp);
  return date.toLocaleString(undefined, {
    weekday: 'short', // "Mon", "Tue", etc.
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Format duration in seconds to hours:minutes:seconds
 * @param seconds Total seconds
 * @returns Formatted duration string (e.g., "1:23:45" or "23:45")
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format rest timer countdown/overtime
 * @param seconds Seconds remaining (negative for overtime)
 * @returns Formatted time string (e.g., "2:30" or "+0:15" for overtime)
 */
export function formatRestTimer(seconds: number): string {
  const isOvertime = seconds < 0;
  const absSeconds = Math.abs(seconds);
  const mins = Math.floor(absSeconds / 60);
  const secs = absSeconds % 60;
  const formatted = `${mins}:${secs.toString().padStart(2, '0')}`;
  return isOvertime ? `+${formatted}` : formatted;
}

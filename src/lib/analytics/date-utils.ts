import type { DateRange, DateRangePreset } from '@/types/analytics'

/**
 * Convert a preset string to an actual date range.
 * End date is always "now". Start date is calculated from the preset.
 */
export function getDateRange(preset: DateRangePreset): DateRange {
  const end = new Date()

  switch (preset) {
    case '7d': {
      const start = new Date()
      start.setDate(start.getDate() - 7)
      return { start, end }
    }
    case '30d': {
      const start = new Date()
      start.setDate(start.getDate() - 30)
      return { start, end }
    }
    case '90d': {
      const start = new Date()
      start.setDate(start.getDate() - 90)
      return { start, end }
    }
    case '1y': {
      const start = new Date()
      start.setFullYear(start.getFullYear() - 1)
      return { start, end }
    }
    case 'all': {
      // Use a far-past date for "all time"
      return { start: new Date('2020-01-01'), end }
    }
  }
}

/**
 * Get ISO week key in "YYYY-WNN" format.
 */
export function getWeekKey(date: Date): string {
  const year = getISOWeekYear(date)
  const week = getISOWeekNumber(date)
  return `${year}-W${String(week).padStart(2, '0')}`
}

/**
 * Get ISO 8601 week number (1-53).
 * Week 1 is the week containing the first Thursday of the year.
 */
export function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  // Set to nearest Thursday: current date + 4 - current day (Mon=1, Sun=7)
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

/**
 * Get the ISO week-numbering year.
 * This can differ from calendar year at year boundaries.
 */
function getISOWeekYear(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  return d.getUTCFullYear()
}

/**
 * Format a week key like "2026-W07" to a human-readable label like "Feb 9".
 * Returns the Monday date of that ISO week.
 */
export function formatWeekLabel(weekKey: string): string {
  const parts = weekKey.split('-W')
  const year = parseInt(parts[0] ?? '0', 10)
  const week = parseInt(parts[1] ?? '0', 10)

  // Find January 4th of the year (always in ISO week 1)
  const jan4 = new Date(Date.UTC(year, 0, 4))
  // Find the Monday of week 1
  const dayOfWeek = jan4.getUTCDay() || 7
  const mondayWeek1 = new Date(jan4)
  mondayWeek1.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1)

  // Add (week - 1) * 7 days to get the target Monday
  const targetMonday = new Date(mondayWeek1)
  targetMonday.setUTCDate(mondayWeek1.getUTCDate() + (week - 1) * 7)

  return targetMonday.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
}

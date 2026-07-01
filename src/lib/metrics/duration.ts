/**
 * Duration helpers.
 *
 * Duration is stored canonically in SECONDS (Int). The editor lets the user
 * enter H:M:S; these helpers convert and format. Display reuses formatDuration
 * from src/lib/utils/format-time.ts.
 */

export interface HMS {
  h: number
  m: number
  s: number
}

/** Split canonical seconds into { h, m, s }. */
export function secondsToHMS(total: number): HMS {
  const safe = Math.max(0, Math.floor(total || 0))
  return {
    h: Math.floor(safe / 3600),
    m: Math.floor((safe % 3600) / 60),
    s: safe % 60,
  }
}

/** Combine { h, m, s } back into canonical seconds. */
export function hmsToSeconds({ h, m, s }: HMS): number {
  return h * 3600 + m * 60 + s
}

/**
 * Compact wheel label for a given number of canonical seconds, matching the
 * session wheel spec:
 *   <60s        → "30"          (plain seconds)
 *   whole min   → "5min"
 *   min+sec     → "1:05min"
 *   whole hr    → "1hr"
 *   hr+min      → "1:01hr"
 */
export function labelForSeconds(total: number): string {
  const { h, m, s } = secondsToHMS(total)

  if (h === 0 && m === 0) return `${s}`

  if (h === 0) {
    return s === 0 ? `${m}min` : `${m}:${pad(s)}min`
  }

  return m === 0 ? `${h}hr` : `${h}:${pad(m)}hr`
}

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

/**
 * Stopwatch-style digit buffer helpers for the H:M:S keypad. The buffer is a
 * string of up to 6 digits read right-to-left as SS, MM, HH (e.g. "105" → 1:05).
 */
export function secondsToDigits(total: number): string {
  const { h, m, s } = secondsToHMS(total)
  const digits = `${pad(h)}${pad(m)}${pad(s)}`.replace(/^0+/, '')
  return digits
}

export function digitsToSeconds(digits: string): number {
  const clean = (digits || '').replace(/\D/g, '').slice(-6).padStart(6, '0')
  const h = parseInt(clean.slice(0, 2), 10)
  const m = parseInt(clean.slice(2, 4), 10)
  const s = parseInt(clean.slice(4, 6), 10)
  return h * 3600 + m * 60 + s
}

/** Format a digit buffer as HH:MM:SS for the keypad display. */
export function formatDigits(digits: string): string {
  const clean = (digits || '').replace(/\D/g, '').slice(-6).padStart(6, '0')
  return `${clean.slice(0, 2)}:${clean.slice(2, 4)}:${clean.slice(4, 6)}`
}

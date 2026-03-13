import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generate a UUID that works in non-secure contexts (HTTP on mobile).
 * Falls back to a manual v4 UUID when crypto.randomUUID is unavailable.
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Fallback for non-secure contexts (crypto.getRandomValues is available even over HTTP)
  const getRandomByte = () => crypto.getRandomValues(new Uint8Array(1))[0]!
  return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) => {
    const n = Number(c)
    return (n ^ (getRandomByte() & (15 >> (n / 4)))).toString(16)
  })
}

import { useState, useEffect } from 'react'
import { useAppSelector } from '@/store/hooks'

/**
 * Hook that provides rest timer state with countdown.
 * Updates every 100ms for smooth countdown.
 *
 * @returns Object with remaining seconds and isRunning flag
 */
export function useRestTimer(): { remaining: number; isRunning: boolean } {
  const timer = useAppSelector((state) => state.session.timer)
  const [remaining, setRemaining] = useState(0)

  useEffect(() => {
    if (!timer?.isRunning || !timer.endTime) {
      setRemaining(0)
      return
    }

    // Calculate remaining time (can be negative for overtime)
    const calculateRemaining = () => {
      const left = Math.ceil((timer.endTime! - Date.now()) / 1000)
      return left
    }

    // Set initial value
    setRemaining(calculateRemaining())

    // Update every 100ms for smooth countdown
    const interval = setInterval(() => {
      const left = calculateRemaining()
      setRemaining(left)
    }, 100)

    return () => clearInterval(interval)
  }, [timer?.isRunning, timer?.endTime])

  return {
    remaining,
    isRunning: timer?.isRunning ?? false,
  }
}

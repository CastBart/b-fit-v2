/**
 * WheelPicker — vertical scroll-snap value wheel for the session metric editor.
 *
 * Uses native CSS scroll-snap (mandatory, y) for reliable centering + native
 * momentum on mobile. The centre row is the "selected" stop.
 *
 * Off-grid behaviour: on mount / external `value` change the wheel scrolls to
 * the NEAREST step and highlights it, but does NOT emit onSelect — the caller's
 * exact value is preserved until the user actively scrolls.
 */

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { nearestIndex, type WheelStep } from '@/lib/metrics/wheel-steps'

const ITEM_HEIGHT = 44 // px
const VISIBLE = 5 // odd number → one centred row
const PAD = ((VISIBLE - 1) / 2) * ITEM_HEIGHT // top/bottom padding so edges can centre

interface WheelPickerProps {
  steps: WheelStep[]
  value: number | null | undefined
  onSelect: (value: number) => void
  className?: string
}

export function WheelPicker({ steps, value, onSelect, className }: WheelPickerProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  // Suppress onSelect while we programmatically scroll (mount / external value).
  const suppressRef = useRef(false)
  const suppressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scrollToIndex = useCallback((index: number, smooth: boolean) => {
    const el = scrollRef.current
    if (!el) return
    suppressRef.current = true
    if (suppressTimer.current) clearTimeout(suppressTimer.current)
    el.scrollTo({ top: index * ITEM_HEIGHT, behavior: smooth ? 'smooth' : 'auto' })
    setActiveIndex(index)
    // Release the suppression once the programmatic scroll has settled.
    suppressTimer.current = setTimeout(
      () => {
        suppressRef.current = false
      },
      smooth ? 350 : 80
    )
  }, [])

  // Align to the nearest step whenever the external value (or step set) changes.
  useEffect(() => {
    scrollToIndex(nearestIndex(steps, value), false)
  }, [value, steps, scrollToIndex])

  const handleItemClick = useCallback(
    (i: number) => {
      const step = steps[i]
      if (!step) return
      scrollToIndex(i, true)
      onSelect(step.value)
    },
    [steps, onSelect, scrollToIndex]
  )

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const index = Math.max(0, Math.min(steps.length - 1, Math.round(el.scrollTop / ITEM_HEIGHT)))
    setActiveIndex(index)

    if (suppressRef.current) return

    // Emit once scrolling settles on a snap point.
    if (settleTimer.current) clearTimeout(settleTimer.current)
    settleTimer.current = setTimeout(() => {
      const settled = Math.max(
        0,
        Math.min(steps.length - 1, Math.round((scrollRef.current?.scrollTop ?? 0) / ITEM_HEIGHT))
      )
      const step = steps[settled]
      if (step) onSelect(step.value)
    }, 120)
  }, [steps, onSelect])

  useEffect(() => {
    return () => {
      if (suppressTimer.current) clearTimeout(suppressTimer.current)
      if (settleTimer.current) clearTimeout(settleTimer.current)
    }
  }, [])

  return (
    <div
      className={cn('relative select-none', className)}
      style={{ height: VISIBLE * ITEM_HEIGHT }}
    >
      {/* Centre selection band */}
      <div
        className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 rounded-md border-y border-primary/40 bg-primary/5"
        style={{ height: ITEM_HEIGHT }}
      />
      {/* Top/bottom fade */}
      <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-background via-transparent to-background" />

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto [&::-webkit-scrollbar]:hidden"
        style={{
          scrollSnapType: 'y mandatory',
          paddingTop: PAD,
          paddingBottom: PAD,
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {steps.map((step, i) => (
          <div
            key={`${step.value}-${i}`}
            className={cn(
              'flex items-center justify-center tabular-nums transition-colors',
              i === activeIndex
                ? 'text-xl font-bold text-foreground'
                : 'text-base text-muted-foreground/60'
            )}
            style={{ height: ITEM_HEIGHT, scrollSnapAlign: 'center' }}
            onClick={() => handleItemClick(i)}
          >
            {step.label}
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Plan Days Carousel
 *
 * Horizontal carousel of training days for the plan detail page. Each day is a
 * full-width slide; a tap-to-jump row of day-name cards sits above the viewport
 * and stays in sync with swipes. Mirrors the project's hand-rolled Embla pattern
 * (see SetLoggerCarousel).
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { PlanDaySlide } from './PlanDaySlide'
import { cn } from '@/lib/utils'
import type { PlanWithDetails } from '@/types/plan'

interface PlanDaysCarouselProps {
  days: PlanWithDetails['days']
}

export function PlanDaysCarousel({ days }: PlanDaysCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    containScroll: 'trimSnaps',
    skipSnaps: false,
    dragFree: false,
  })

  const [selectedIndex, setSelectedIndex] = useState(0)

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setSelectedIndex(emblaApi.selectedScrollSnap())
  }, [emblaApi])

  // Sync selected index with swipes and re-inits
  useEffect(() => {
    if (!emblaApi) return
    onSelect()
    emblaApi.on('select', onSelect)
    emblaApi.on('reInit', onSelect)
    return () => {
      emblaApi.off('select', onSelect)
      emblaApi.off('reInit', onSelect)
    }
  }, [emblaApi, onSelect])

  // Re-initialize when the number of days changes (e.g. navigating to another plan)
  useEffect(() => {
    if (emblaApi) emblaApi.reInit()
  }, [emblaApi, days.length])

  const scrollTo = useCallback(
    (index: number) => {
      emblaApi?.scrollTo(index)
    },
    [emblaApi]
  )

  if (days.length === 0) {
    return <p className="text-sm text-muted-foreground italic">No training days yet.</p>
  }

  return (
    <div className="space-y-4">
      {/* Day-name nav strip */}
      {days.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {days.map((day, index) => {
            const isActive = index === selectedIndex
            return (
              <button
                key={day.id}
                type="button"
                onClick={() => scrollTo(index)}
                aria-current={isActive ? 'true' : undefined}
                className={cn(
                  'shrink-0 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-border bg-card text-muted-foreground hover:text-foreground'
                )}
              >
                {day.label || `Day ${day.dayNumber}`}
              </button>
            )
          })}
        </div>
      )}

      {/* Carousel viewport */}
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-4">
          {days.map((day) => (
            <div key={day.id} className="min-w-0 shrink-0 basis-full">
              <PlanDaySlide day={day} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Day Carousel Component
 *
 * Horizontal carousel for navigating between plan days.
 * Displays day number, optional label, and exercise count.
 */

'use client'

import { useEffect } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { cn } from '@/lib/utils'

interface DayInfo {
  dayNumber: number
  label?: string | null
  exerciseCount: number
}

interface DayCarouselProps {
  days: DayInfo[]
  currentDayIndex: number
  onDaySelect: (index: number) => void
}

export function DayCarousel({ days, currentDayIndex, onDaySelect }: DayCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    containScroll: 'trimSnaps',
    dragFree: true,
  })

  // Scroll to current day when it changes
  useEffect(() => {
    if (emblaApi) {
      emblaApi.scrollTo(currentDayIndex)
    }
  }, [emblaApi, currentDayIndex])

  // Re-init carousel when days change
  useEffect(() => {
    if (emblaApi) {
      emblaApi.reInit()
    }
  }, [emblaApi, days.length])

  return (
    <div className="border-b bg-background px-4 py-3">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-2">
          {days.map((day, index) => (
            <button
              key={day.dayNumber}
              onClick={() => onDaySelect(index)}
              className={cn(
                'flex-shrink-0 rounded-lg border px-4 py-2 text-left transition-all min-w-[120px]',
                index === currentDayIndex
                  ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                  : 'border-border bg-card hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <div className="text-sm font-semibold">Day {day.dayNumber}</div>
              {day.label && (
                <div
                  className={cn(
                    'text-xs truncate max-w-[100px]',
                    index === currentDayIndex
                      ? 'text-primary-foreground/80'
                      : 'text-muted-foreground'
                  )}
                >
                  {day.label}
                </div>
              )}
              <div
                className={cn(
                  'text-xs mt-1',
                  index === currentDayIndex ? 'text-primary-foreground/70' : 'text-muted-foreground'
                )}
              >
                {day.exerciseCount} exercise{day.exerciseCount !== 1 ? 's' : ''}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

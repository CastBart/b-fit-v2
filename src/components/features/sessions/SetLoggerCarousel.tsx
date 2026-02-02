/**
 * Set Logger Carousel Component (Client-First Architecture)
 *
 * Embla Carousel wrapper for the SetLogger component.
 * Allows swiping between exercises and syncs with Redux activeExerciseId.
 */

'use client'

import { useEffect, useCallback } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { SetLogger } from './SetLogger'
import { useAppDispatch } from '@/store/hooks'
import { goToExercise } from '@/store/slices/sessionSlice'
import type { SessionExerciseEntry } from '@/types/session'

interface SetLoggerCarouselProps {
  exercises: SessionExerciseEntry[]
  currentExerciseIndex: number
  onOpenExerciseOptions?: (exercise: SessionExerciseEntry) => void
}

export function SetLoggerCarousel({
  exercises,
  currentExerciseIndex,
  onOpenExerciseOptions,
}: SetLoggerCarouselProps) {
  const dispatch = useAppDispatch()

  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    containScroll: 'trimSnaps',
    skipSnaps: false,
    dragFree: false,
  })

  // Re-initialize carousel when exercises array changes (add/remove)
  useEffect(() => {
    if (emblaApi) {
      emblaApi.reInit()
    }
  }, [emblaApi, exercises.length])

  // Scroll to current exercise when index changes externally
  useEffect(() => {
    if (emblaApi && currentExerciseIndex >= 0) {
      emblaApi.scrollTo(currentExerciseIndex, false)
    }
  }, [currentExerciseIndex, emblaApi])

  // Handle carousel slide change (when user swipes)
  const onSelect = useCallback(() => {
    if (!emblaApi) return

    const selectedIndex = emblaApi.selectedScrollSnap()

    // Only dispatch if the index actually changed
    if (selectedIndex !== currentExerciseIndex && exercises[selectedIndex]) {
      const exercise = exercises[selectedIndex]
      if (exercise) {
        dispatch(goToExercise(exercise.instanceId))
      }
    }
  }, [emblaApi, currentExerciseIndex, exercises, dispatch])

  // Subscribe to carousel select events
  useEffect(() => {
    if (!emblaApi) return

    emblaApi.on('select', onSelect)

    return () => {
      emblaApi.off('select', onSelect)
    }
  }, [emblaApi, onSelect])

  return (
    <div className="overflow-hidden" ref={emblaRef}>
      <div className="flex">
        {exercises.map((exercise) => (
          <div
            key={exercise.instanceId}
            className="min-w-0 flex-[0_0_100%]"
            style={{ flex: '0 0 100%' }}
          >
            <SetLogger
              exercise={exercise}
              onOpenOptions={() => onOpenExerciseOptions?.(exercise)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

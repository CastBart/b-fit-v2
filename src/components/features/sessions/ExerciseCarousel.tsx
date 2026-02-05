/**
 * Exercise Carousel Component (Client-First Architecture)
 *
 * Horizontal carousel displaying all exercises in the session.
 * Features:
 * - Drag and drop to reorder exercises (dispatches reorderExercises)
 * - Add button to add new exercises
 * - Active exercise highlighting
 * - Completion indicators from Redux progress map
 * - Superset connector bars
 */

'use client'

import { useEffect, useRef } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  TouchSensor,
  useSensor,
  useSensors,
  MouseSensor,
} from '@dnd-kit/core'
import { SortableContext, useSortable, horizontalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { Plus, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { reorderExercises } from '@/store/slices/sessionSlice'
import type { SessionExerciseEntry } from '@/types/session'
import { restrictToHorizontalAxis, restrictToParentElement } from '@dnd-kit/modifiers'

interface ExerciseCarouselProps {
  exercises: SessionExerciseEntry[]
  currentExerciseIndex: number
  onExerciseSelect: (index: number) => void
  onAddExercise: () => void
  disabled?: boolean
}

export function ExerciseCarousel({
  exercises,
  currentExerciseIndex,
  onExerciseSelect,
  onAddExercise,
  disabled,
}: ExerciseCarouselProps) {
  const dispatch = useAppDispatch()

  const [_emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    containScroll: 'trimSnaps',
    dragFree: true,
  })
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  )

  // Re-initialize carousel when exercises array changes (add/remove)
  useEffect(() => {
    if (emblaApi) {
      emblaApi.reInit()
    }
  }, [emblaApi, exercises.length])

  // Scroll to current exercise when it changes
  useEffect(() => {
    if (emblaApi && currentExerciseIndex >= 0) {
      emblaApi.scrollTo(currentExerciseIndex)
    }
  }, [currentExerciseIndex, emblaApi])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = exercises.findIndex((ex) => ex.instanceId === active.id)
      const newIndex = exercises.findIndex((ex) => ex.instanceId === over.id)

      if (oldIndex !== -1 && newIndex !== -1) {
        dispatch(reorderExercises({ fromIndex: oldIndex, toIndex: newIndex }))
      }
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      modifiers={[restrictToHorizontalAxis, restrictToParentElement]}
    >
      <div className="flex flex-row items-center overflow-x-auto overflow-y-hidden">
        <SortableContext
          items={exercises.map((ex) => ex.instanceId)}
          strategy={horizontalListSortingStrategy}
        >
          <div className="flex gap-2">
            {exercises.map((exercise, index) => (
              <ExerciseCarouselCard
                key={exercise.instanceId}
                exercise={exercise}
                isActive={index === currentExerciseIndex}
                onClick={() => onExerciseSelect(index)}
                disabled={disabled}
              />
            ))}

            {/* Add Exercise Button */}
            <div className="shrink-0">
              <Button
                variant="outline"
                size="lg"
                onClick={onAddExercise}
                disabled={disabled}
                className={cn(
                  'h-15 w-30 rounded-xl border-2 border-dashed',
                  'hover:border-primary hover:bg-primary/10',
                  'transition-all duration-200'
                )}
              >
                <Plus className="h-6 w-6" />
              </Button>
            </div>
          </div>
        </SortableContext>
      </div>
    </DndContext>
  )
}

// ============================================================================
// EXERCISE CAROUSEL CARD
// ============================================================================

interface ExerciseCarouselCardProps {
  exercise: SessionExerciseEntry
  isActive: boolean
  onClick: () => void
  disabled?: boolean
}

function ExerciseCarouselCard({
  exercise,
  isActive,
  onClick,
  disabled,
}: ExerciseCarouselCardProps) {
  // Get progress from Redux
  const progress = useAppSelector((state) => state.session.progress[exercise.instanceId])

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: exercise.instanceId,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 999 : undefined,
    opacity: isDragging ? 0.7 : 1,
  }
  const nodeRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (isActive && nodeRef.current) {
      nodeRef.current.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      })
    }
  }, [isActive])

  // Calculate completed sets from progress
  // Use actual sets from progress (not targetSets) since sets can be added/removed
  const completedSets = progress?.sets.filter((s) => s.completed).length || 0
  const totalSets = progress?.sets.length || exercise.targetSets
  const isCompleted = totalSets > 0 && completedSets === totalSets

  // Check if in superset - use current array index, not stale order prop
  const exercises = useAppSelector((state) => state.session.exercises)
  const currentIndex = exercises.findIndex((ex) => ex.instanceId === exercise.instanceId)
  const currentExercise = currentIndex >= 0 ? exercises[currentIndex] : null
  const isInSuperset = !!currentExercise?.groupId
  const prevExercise = currentIndex > 0 ? exercises[currentIndex - 1] : null
  const nextExercise = currentIndex < exercises.length - 1 ? exercises[currentIndex + 1] : null
  const isFirstInSuperset =
    isInSuperset && (!prevExercise || prevExercise.groupId !== currentExercise?.groupId)
  const isLastInSuperset =
    isInSuperset && (!nextExercise || nextExercise.groupId !== currentExercise?.groupId)

  return (
    <div
      ref={(el) => {
        setNodeRef(el)
        nodeRef.current = el
      }}
      style={style}
      {...attributes}
      {...listeners}
      className={cn('relative mb-1.5 shrink-0 cursor-pointer', isDragging && 'z-50 opacity-50')}
    >
      <div
        onClick={onClick}
        // disabled={disabled}
        className={cn(
          'flex h-15 w-30 flex-col items-start justify-center',
          'rounded-xl border-2 px-1 py-2',
          'transition-all duration-200',
          'hover:border-primary/50 relative',
          isActive ? ' bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground',
          disabled && 'cursor-not-allowed opacity-50'
        )}
      >
        {/* Drag Handle */}
        {/* <div
          // {...listeners}
          className="absolute left-1 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div> */}

        {/* Completion Badge */}
        {isCompleted && (
          <div className="absolute -right-1 -top-1 rounded-full bg-green-500 p-1">
            <CheckCircle2 className="h-3 w-3 text-white" />
          </div>
        )}

        {/* Exercise Name */}
        <div className="lex w-full min-w-0 flex-col items-start">
          <span className="block w-full truncate text-sm font-medium">{exercise.name}</span>

          {/* Progress */}
          <span className={cn('text-xs', isActive ? 'text-primary/70' : 'text-muted-foreground')}>
            {completedSets}/{totalSets} sets
          </span>
        </div>

        {/* Superset Connector Bar */}
        {isInSuperset && (
          <div
            className={cn(
              'absolute -bottom-1.5 left-0 right-0 h-1 bg-primary',
              isFirstInSuperset && 'rounded-l-full',
              isLastInSuperset && 'rounded-r-full'
            )}
          >
            {/* Extension bars to connect with adjacent superset exercises */}
            {isFirstInSuperset && !isLastInSuperset && (
              <div className="absolute -right-2 top-0 h-1 w-2 bg-primary" />
            )}
            {isLastInSuperset && !isFirstInSuperset && (
              <div className="absolute -left-2 top-0 h-1 w-2 bg-primary" />
            )}
            {!isFirstInSuperset && !isLastInSuperset && (
              <>
                <div className="absolute -left-2 top-0 h-1 w-2 bg-primary" />
                <div className="absolute -right-2 top-0 h-1 w-2 bg-primary" />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

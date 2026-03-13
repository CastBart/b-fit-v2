/**
 * Day Carousel Component
 *
 * Horizontal carousel for navigating between plan days.
 * Displays day number and optional label.
 * Supports drag-and-drop reordering and adding days.
 */

'use client'

import { useEffect, useRef } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  TouchSensor,
  MouseSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { SortableContext, useSortable, horizontalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { restrictToHorizontalAxis, restrictToParentElement } from '@dnd-kit/modifiers'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DayInfo {
  uid: string
  dayNumber: number
  dayId?: string
  label?: string | null
}

interface DayCarouselProps {
  days: DayInfo[]
  currentDayIndex: number
  onDaySelect: (index: number) => void
  onAddDay?: () => void
  onReorderDay?: (fromIndex: number, toIndex: number) => void
  maxDays?: number
}

export function DayCarousel({
  days,
  currentDayIndex,
  onDaySelect,
  onAddDay,
  onReorderDay,
  maxDays = 7,
}: DayCarouselProps) {
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id || !onReorderDay) return

    const fromIndex = days.findIndex((d) => d.uid === active.id)
    const toIndex = days.findIndex((d) => d.uid === over.id)

    if (fromIndex !== -1 && toIndex !== -1) {
      onReorderDay(fromIndex, toIndex)
    }
  }

  return (
    <div className="border-b bg-background px-4 py-3">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToHorizontalAxis, restrictToParentElement]}
      >
        <div className="flex flex-row items-center overflow-x-auto overflow-y-hidden">
          <SortableContext items={days.map((d) => d.uid)} strategy={horizontalListSortingStrategy}>
            <div className="flex gap-2">
              {days.map((day, index) => (
                <SortableDayCard
                  key={day.uid}
                  day={day}
                  index={index}
                  isSelected={index === currentDayIndex}
                  onSelect={() => onDaySelect(index)}
                />
              ))}

              {/* Add Day button */}
              {onAddDay && days.length < maxDays && (
                <button
                  onClick={onAddDay}
                  className="flex-shrink-0 rounded-lg border-2 border-dashed border-muted-foreground/30 px-4 py-2 min-w-[80px] flex flex-col items-center justify-center gap-1 hover:border-muted-foreground/50 hover:bg-accent/50 transition-colors text-muted-foreground"
                  title="Add day"
                >
                  <Plus className="h-4 w-4" />
                  <span className="text-xs">Add Day</span>
                </button>
              )}
            </div>
          </SortableContext>
        </div>
      </DndContext>
    </div>
  )
}

// ============================================================================
// SORTABLE DAY CARD
// ============================================================================

interface SortableDayCardProps {
  day: DayInfo
  index: number
  isSelected: boolean
  onSelect: () => void
}

function SortableDayCard({ day, isSelected, onSelect }: SortableDayCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: day.uid,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 999 : undefined,
    opacity: isDragging ? 0.7 : 1,
  }
  const nodeRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (isSelected && nodeRef.current) {
      nodeRef.current.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      })
    }
  }, [isSelected])

  return (
    <div
      ref={(el) => {
        setNodeRef(el)
        nodeRef.current = el
      }}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'flex-shrink-0 rounded-lg border px-3 py-2 text-left transition-all min-w-[80px]',
        isSelected
          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
          : 'border-border bg-card hover:bg-accent hover:text-accent-foreground cursor-pointer',
        isDragging && 'shadow-lg'
      )}
      onClick={onSelect}
    >
      <div className="text-sm font-semibold">Day {day.dayNumber}</div>
      {day.label && (
        <div
          className={cn(
            'text-xs truncate max-w-[80px]',
            isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'
          )}
        >
          {day.label}
        </div>
      )}
    </div>
  )
}

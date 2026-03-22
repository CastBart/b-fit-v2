'use client'

import React, { useMemo, useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  // PointerSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { SortableContext, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers'
import { GripVertical, Plus } from 'lucide-react'
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
  const [activeId, setActiveId] = useState<string | null>(null)

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

  const activeDay = useMemo(
    () => days.find((day) => day.uid === activeId) ?? null,
    [days, activeId]
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over || active.id === over.id || !onReorderDay) return

    const fromIndex = days.findIndex((d) => d.uid === active.id)
    const toIndex = days.findIndex((d) => d.uid === over.id)

    if (fromIndex !== -1 && toIndex !== -1) {
      onReorderDay(fromIndex, toIndex)
    }
  }

  const handleDragCancel = () => {
    setActiveId(null)
  }

  return (
    <div className="border-b bg-background px-4 py-2 sm:px-6 sm:py-4">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToHorizontalAxis]}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="overflow-x-auto overflow-y-hidden">
          <SortableContext items={days.map((d) => d.uid)} strategy={horizontalListSortingStrategy}>
            <div className="flex min-w-max gap-2 pb-1">
              {days.map((day, index) => (
                <SortableDayCard
                  key={day.uid}
                  day={day}
                  index={index}
                  isSelected={index === currentDayIndex}
                  onSelect={() => onDaySelect(index)}
                />
              ))}

              {onAddDay && days.length < maxDays && (
                <button
                  type="button"
                  onClick={onAddDay}
                  className="flex min-w-[92px] shrink-0 flex-col items-center justify-center gap-1 rounded-lg border-1 border-dashed border-muted-foreground/30 px-4 py-2 mb-1 text-muted-foreground transition-colors hover:border-muted-foreground/50 hover:bg-accent/50"
                  title="Add day"
                >
                  <Plus className="h-4 w-4" />
                  <span className="text-xs">Add Day</span>
                </button>
              )}
            </div>
          </SortableContext>
        </div>

        <DragOverlay>
          {activeDay ? (
            <DayCardPresentation day={activeDay} isSelected={false} isDraggingOverlay />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}

interface SortableDayCardProps {
  day: DayInfo
  index: number
  isSelected: boolean
  onSelect: () => void
}

const SortableDayCard = React.memo(function SortableDayCard({
  day,
  isSelected,
  onSelect,
}: SortableDayCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: day.uid,
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition,
    zIndex: isDragging ? 999 : undefined,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className={`shrink-0 ${isDragging && 'z-50 opacity-50'}`}>
      <div className="relative">
        <DayCardPresentation
          day={day}
          isSelected={isSelected}
          onSelect={onSelect}
          dragHandle={
            <div
              // type="button"
              aria-label={`Reorder Day ${day.dayNumber}`}
              className={cn(
                'absolute right-1 top-1 z-10 rounded p-1 transition-colors',
                `${isSelected ? 'hover:bg-primary/10 hover:text-primary-foreground' : 'text-muted-foreground/80'}`,
                'hover:bg-black/5 hover:text-foreground',
                'touch-none cursor-grab active:cursor-grabbing'
              )}
              {...attributes}
              {...listeners}
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="h-4 w-4" />
            </div>
          }
        />
      </div>
    </div>
  )
})

interface DayCardPresentationProps {
  day: DayInfo
  isSelected: boolean
  onSelect?: () => void
  dragHandle?: React.ReactNode
  isDraggingOverlay?: boolean
}

function DayCardPresentation({
  day,
  isSelected,
  onSelect,
  dragHandle,
  isDraggingOverlay = false,
}: DayCardPresentationProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'relative min-w-[92px] rounded-lg border mb-1 px-3 py-2 pr-8 text-left shadow-sm',
        'transition-colors',
        isSelected
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-card hover:bg-accent hover:text-accent-foreground',
        isDraggingOverlay && 'shadow-xl z-50 opacity-50'
      )}
    >
      {dragHandle}

      <div className="text-sm font-semibold">Day {day.dayNumber}</div>

      {day.label ? (
        <div
          className={cn(
            'max-w-[92px] truncate text-xs',
            isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'
          )}
        >
          {day.label}
        </div>
      ) : (
        <div
          className={cn(
            'max-w-[92px] truncate text-xs',
            isSelected ? 'text-primary-foreground/60' : 'text-muted-foreground/70'
          )}
        >
          No label
        </div>
      )}
    </button>
  )
}

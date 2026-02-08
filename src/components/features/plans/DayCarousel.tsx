/**
 * Day Carousel Component
 *
 * Horizontal carousel for navigating between plan days.
 * Displays day number, optional label, and exercise count.
 * Supports inline day label editing, drag-and-drop reordering, copying,
 * deleting, and adding days.
 */

'use client'

import { useEffect, useState, useRef } from 'react'
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
import { Pencil, Check, X, Copy, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DayInfo {
  dayNumber: number
  dayId?: string
  label?: string | null
  exerciseCount: number
}

interface DayCarouselProps {
  days: DayInfo[]
  currentDayIndex: number
  onDaySelect: (index: number) => void
  onDayLabelUpdate?: (dayIndex: number, label: string | null) => void
  onAddDay?: () => void
  onReorderDay?: (fromIndex: number, toIndex: number) => void
  onCopyDay?: (dayIndex: number) => void
  onDeleteDay?: (dayIndex: number) => void
  maxDays?: number
}

export function DayCarousel({
  days,
  currentDayIndex,
  onDaySelect,
  onDayLabelUpdate,
  onAddDay,
  onReorderDay,
  onCopyDay,
  onDeleteDay,
  maxDays = 7,
}: DayCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    containScroll: 'trimSnaps',
    dragFree: true,
  })

  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

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

  // Focus input when editing starts
  useEffect(() => {
    if (editingIndex !== null && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingIndex])

  const handleStartEdit = (e: React.MouseEvent, index: number) => {
    e.stopPropagation()
    setEditingIndex(index)
    setEditValue(days[index]?.label || '')
  }

  const handleConfirmEdit = (index: number) => {
    const trimmed = editValue.trim()
    onDayLabelUpdate?.(index, trimmed || null)
    setEditingIndex(null)
    setEditValue('')
  }

  const handleCancelEdit = () => {
    setEditingIndex(null)
    setEditValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter') {
      handleConfirmEdit(index)
    } else if (e.key === 'Escape') {
      handleCancelEdit()
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id || !onReorderDay) return

    const fromIndex = days.findIndex((d) => d.dayNumber === active.id)
    const toIndex = days.findIndex((d) => d.dayNumber === over.id)

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
        <div className="overflow-hidden" ref={emblaRef}>
          <SortableContext
            items={days.map((d) => d.dayNumber)}
            strategy={horizontalListSortingStrategy}
          >
            <div className="flex gap-2">
              {days.map((day, index) => (
                <SortableDayCard
                  key={`day-${day.dayNumber}`}
                  day={day}
                  index={index}
                  isSelected={index === currentDayIndex}
                  isEditing={editingIndex === index}
                  canCopy={days.length < maxDays}
                  canDelete={days.length > 1}
                  editValue={editValue}
                  inputRef={editingIndex === index ? inputRef : undefined}
                  onSelect={() => {
                    if (editingIndex !== index) onDaySelect(index)
                  }}
                  onStartEdit={(e) => handleStartEdit(e, index)}
                  onConfirmEdit={() => handleConfirmEdit(index)}
                  onCancelEdit={handleCancelEdit}
                  onEditValueChange={setEditValue}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  onCopy={onCopyDay ? () => onCopyDay(index) : undefined}
                  onDelete={onDeleteDay ? () => onDeleteDay(index) : undefined}
                  hasLabelUpdate={!!onDayLabelUpdate}
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
  isEditing: boolean
  canCopy: boolean
  canDelete: boolean
  editValue: string
  inputRef?: React.RefObject<HTMLInputElement | null>
  onSelect: () => void
  onStartEdit: (e: React.MouseEvent) => void
  onConfirmEdit: () => void
  onCancelEdit: () => void
  onEditValueChange: (value: string) => void
  onKeyDown: (e: React.KeyboardEvent) => void
  onCopy?: () => void
  onDelete?: () => void
  hasLabelUpdate: boolean
}

function SortableDayCard({
  day,
  isSelected,
  isEditing,
  canCopy,
  canDelete,
  editValue,
  inputRef,
  onSelect,
  onStartEdit,
  onConfirmEdit,
  onCancelEdit,
  onEditValueChange,
  onKeyDown,
  onCopy,
  onDelete,
  hasLabelUpdate,
}: SortableDayCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: day.dayNumber,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 999 : undefined,
    opacity: isDragging ? 0.7 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'flex-shrink-0 rounded-lg border px-4 py-2 text-left transition-all min-w-[120px] relative',
        isSelected
          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
          : 'border-border bg-card hover:bg-accent hover:text-accent-foreground cursor-pointer',
        isDragging && 'shadow-lg'
      )}
      onClick={() => {
        if (!isEditing) onSelect()
      }}
    >
      <div className="flex items-center justify-between gap-1">
        <div className="text-sm font-semibold">Day {day.dayNumber}</div>
        {isSelected && hasLabelUpdate && !isEditing && (
          <button
            onClick={(e) => onStartEdit(e)}
            className="rounded p-0.5 hover:bg-primary-foreground/20 transition-colors"
            title="Edit day name"
          >
            <Pencil className="h-3 w-3" />
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="mt-1 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => onEditValueChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="e.g. Push Day"
            maxLength={100}
            className="w-[90px] rounded bg-primary-foreground/20 px-1.5 py-0.5 text-xs outline-none placeholder:text-primary-foreground/40"
          />
          <button onClick={onConfirmEdit} className="rounded p-0.5 hover:bg-primary-foreground/20">
            <Check className="h-3 w-3" />
          </button>
          <button onClick={onCancelEdit} className="rounded p-0.5 hover:bg-primary-foreground/20">
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        day.label && (
          <div
            className={cn(
              'text-xs truncate max-w-[100px]',
              isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'
            )}
          >
            {day.label}
          </div>
        )
      )}

      <div
        className={cn(
          'text-xs mt-1',
          isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'
        )}
      >
        {day.exerciseCount} exercise{day.exerciseCount !== 1 ? 's' : ''}
      </div>

      {/* Action buttons on selected day */}
      {isSelected && !isEditing && (
        <div
          className="flex items-center gap-0.5 mt-1.5 -mx-1"
          onClick={(e) => e.stopPropagation()}
        >
          {canCopy && onCopy && (
            <button
              onClick={onCopy}
              className="rounded p-1 hover:bg-primary-foreground/20 transition-colors"
              title="Copy day"
            >
              <Copy className="h-3 w-3" />
            </button>
          )}
          {canDelete && onDelete && (
            <button
              onClick={onDelete}
              className="rounded p-1 hover:bg-primary-foreground/20 transition-colors text-destructive"
              title="Delete day"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

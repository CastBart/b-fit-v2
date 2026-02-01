/**
 * Workout Exercises List
 *
 * Center panel displaying exercises in the current workout.
 * Shows exercise order, sets/reps, and allows selection for configuration.
 * Supports drag-and-drop reordering with DnD Kit.
 */

'use client'

import { GripVertical, Trash2, Dumbbell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { Exercise } from '@prisma/client'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers'
import { CSS } from '@dnd-kit/utilities'

interface WorkoutExercise {
  instanceId: string
  exerciseId: string
  order: number
  sets: number
  reps?: number
  weight?: number
  restSeconds: number
  notes?: string
  groupId?: string
  exercise?: Exercise
}

interface WorkoutExercisesListProps {
  exercises: WorkoutExercise[]
  selectedIndex: number | null
  onExerciseSelect: (index: number) => void
  onExerciseRemove: (index: number) => void
  onExerciseReorder: (fromIndex: number, toIndex: number) => void
}

// Sortable Exercise Item Component
interface SortableExerciseItemProps {
  workoutExercise: WorkoutExercise
  index: number
  isSelected: boolean
  onSelect: () => void
  onRemove: () => void
  isInSuperset: boolean
  isFirstInSuperset: boolean
  isLastInSuperset: boolean
}

function SortableExerciseItem({
  workoutExercise,
  index,
  isSelected,
  onSelect,
  onRemove,
  isInSuperset,
  isFirstInSuperset,
  isLastInSuperset,
}: SortableExerciseItemProps) {
  // const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
  //   id: `exercise-${index}`,
  // })
  const sortableId = workoutExercise.instanceId

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sortableId,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 999 : undefined,
    opacity: isDragging ? 0.5 : 1,
  }

  const exercise = workoutExercise.exercise

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {/* Superset Visual Connector - Blue vertical line */}
      {isInSuperset && (
        <div
          className={cn(
            'absolute left-0 w-1 bg-blue-500',
            isFirstInSuperset && 'rounded-t-full top-0 -bottom-1',
            isLastInSuperset && 'rounded-b-full -top-1 bottom-0',
            !isFirstInSuperset && !isLastInSuperset && '-top-1 -bottom-1'
          )}
        />
      )}

      <div
        onClick={onSelect}
        className={cn(
          'group relative rounded-lg border bg-card p-4 transition-all',
          isInSuperset && 'ml-3',
          isSelected && 'border-primary bg-accent ring-0',
          // ring-2 ring-primary ring-offset-2',
          !isSelected && 'hover:bg-accent'
        )}
      >
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="absolute left-2 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>

        {/* Order Number */}
        <div className="absolute left-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
          {index + 1}
        </div>

        {/* Content */}
        <div className="ml-8">
          {/* Exercise Name */}
          <h4 className="font-semibold">{exercise?.name || 'Unknown Exercise'}</h4>

          {/* Parameters */}
          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div>
              <span className="font-medium">{workoutExercise.sets}</span> sets
            </div>
            {workoutExercise.reps && (
              <div>
                <span className="font-medium">{workoutExercise.reps}</span> reps
              </div>
            )}
            {workoutExercise.weight && (
              <div>
                <span className="font-medium">{workoutExercise.weight}</span> kg
              </div>
            )}
            <div>
              <span className="font-medium">{workoutExercise.restSeconds}s</span> rest
            </div>
          </div>

          {/* Notes
          {workoutExercise.notes && (
            <p className="mt-2 text-sm italic text-muted-foreground">{workoutExercise.notes}</p>
          )} */}

          {/* Superset Badge
          {workoutExercise.groupId && (
            <div className="mt-2">
              <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                Superset
              </span>
            </div>
          )} */}
        </div>

        {/* Delete Button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 opacity-100 lg:opacity-0 transition-opacity group-hover:opacity-100 hover:cursor-pointer"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
        >
          <Trash2 className="h-2 w-2 text-primary" />
        </Button>
      </div>
    </div>
  )
}

export function WorkoutExercisesList({
  exercises,
  selectedIndex,
  onExerciseSelect,
  onExerciseRemove,
  onExerciseReorder,
}: WorkoutExercisesListProps) {
  // Configure drag sensors
  const sensors = useSensors(
    // useSensor(PointerSensor),
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
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = exercises.findIndex((e) => e.instanceId === active.id)
    const newIndex = exercises.findIndex((e) => e.instanceId === over.id)

    if (oldIndex === -1 || newIndex === -1) return

    onExerciseReorder(oldIndex, newIndex)
  }

  // const handleDragEnd = (event: DragEndEvent) => {
  //   const { active, over } = event

  //   if (over && active.id !== over.id) {
  //     const oldIndex = parseInt(String(active.id).replace('exercise-', ''))
  //     const newIndex = parseInt(String(over.id).replace('exercise-', ''))

  //     onExerciseReorder(oldIndex, newIndex)
  //   }
  // }

  // Calculate superset grouping info
  const getSupersetInfo = (index: number) => {
    const exercise = exercises[index]
    if (!exercise?.groupId) {
      return { isInSuperset: false, isFirstInSuperset: false, isLastInSuperset: false }
    }

    const groupId = exercise.groupId
    const prevExercise = index > 0 ? exercises[index - 1] : null
    const nextExercise = index < exercises.length - 1 ? exercises[index + 1] : null

    const isFirstInSuperset = !prevExercise || prevExercise.groupId !== groupId
    const isLastInSuperset = !nextExercise || nextExercise.groupId !== groupId

    return {
      isInSuperset: true,
      isFirstInSuperset,
      isLastInSuperset,
    }
  }
  if (exercises.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <Dumbbell className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-semibold">No Exercises Yet</h3>
          <p className="text-sm text-muted-foreground">
            <span className="hidden lg:inline">
              Select exercises from the library on the left to add them to your workout.
            </span>
            <span className="lg:hidden">Tap the + button to add exercises to your workout.</span>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b p-4">
        <h3 className="font-semibold">Workout Exercises ({exercises.length})</h3>
        <p className="text-xs text-muted-foreground">Drag to reorder, click to configure</p>
      </div>

      {/* Exercises List */}
      <ScrollArea className="flex-1">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
        >
          <SortableContext
            // items={exercises.map((_, index) => `exercise-${index}`)}
            items={exercises.map((e) => e.instanceId)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2 p-4">
              {exercises.map((workoutExercise, index) => {
                const isSelected = selectedIndex === index
                const supersetInfo = getSupersetInfo(index)

                return (
                  <SortableExerciseItem
                    // key={`exercise-${index}`}
                    key={workoutExercise.instanceId}
                    workoutExercise={workoutExercise}
                    index={index}
                    isSelected={isSelected}
                    onSelect={() => onExerciseSelect(index)}
                    onRemove={() => onExerciseRemove(index)}
                    {...supersetInfo}
                  />
                )
              })}
            </div>
          </SortableContext>
        </DndContext>
      </ScrollArea>
    </div>
  )
}

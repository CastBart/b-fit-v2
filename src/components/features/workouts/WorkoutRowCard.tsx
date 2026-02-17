'use client'

import {
  Dumbbell,
  Calendar,
  Star,
  Pencil,
  MoreHorizontal,
  Copy,
  Pin,
  PinOff,
  Trash2,
  Play,
  Loader2,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MuscleGroupBody } from '@/components/features/workouts/MuscleGroupBody'

interface WorkoutWithExerciseCount {
  id: string
  name: string
  description?: string | null
  exerciseCount: number
  isTemplate: boolean
  copiedFrom?: { id: string; name: string } | null
  updatedAt: Date | string
  exercises?: Array<{
    id: string
    exercise: {
      primaryMuscleGroup: string
      secondaryMuscleGroups: string[]
    }
  }>
}

interface WorkoutRowCardProps {
  workout: WorkoutWithExerciseCount
  isClient: boolean
  isPinned: boolean
  isStarting?: boolean
  showPin?: boolean
  onStart: (id: string) => void
  onEdit: (id: string) => void
  onClick: (id: string) => void
  onTogglePin: (id: string) => void
  onDuplicate?: (id: string) => void
  onDelete?: (id: string) => void
}

export function WorkoutRowCard({
  workout,
  isClient,
  isPinned,
  isStarting,
  showPin = true,
  onStart,
  onEdit,
  onClick,
  onTogglePin,
  onDuplicate,
  onDelete,
}: WorkoutRowCardProps) {
  return (
    <Card
      className="group cursor-pointer transition-colors hover:bg-muted/50 hover:border-primary/20"
      onClick={() => onClick(workout.id)}
    >
      <div className="flex items-center gap-4 p-4">
        {/* Muscle body map thumbnail (hidden on mobile) */}
        {workout.exercises && workout.exercises.length > 0 && (
          <div className="hidden sm:block shrink-0">
            <MuscleGroupBody
              exercises={workout.exercises.map((we) => ({
                primaryMuscleGroup: we.exercise.primaryMuscleGroup,
                secondaryMuscleGroups: we.exercise.secondaryMuscleGroups ?? [],
              }))}
              size="sm"
            />
          </div>
        )}

        {/* Pin Toggle */}
        {showPin && (
          <button
            type="button"
            className="shrink-0 text-muted-foreground hover:text-yellow-500 transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              onTogglePin(workout.id)
            }}
            aria-label={isPinned ? 'Unpin workout' : 'Pin workout'}
          >
            <Star className={`h-4 w-4 ${isPinned ? 'fill-yellow-500 text-yellow-500' : ''}`} />
          </button>
        )}

        {/* Left: Name + Description */}
        <div className="min-w-0 flex-1">
          <p className="font-medium leading-none line-clamp-1">{workout.name}</p>
          {workout.description && (
            <p className="mt-1 text-sm text-muted-foreground line-clamp-1">{workout.description}</p>
          )}
        </div>

        {/* Middle: Stat Chips */}
        <div className="hidden sm:flex items-center gap-2">
          <Badge variant="secondary" className="text-xs whitespace-nowrap">
            <Dumbbell className="mr-1 h-3 w-3" />
            {workout.exerciseCount} exercises
          </Badge>
          <Badge variant="secondary" className="text-xs whitespace-nowrap">
            <Calendar className="mr-1 h-3 w-3" />
            {new Date(workout.updatedAt).toLocaleDateString()}
          </Badge>
          {workout.isTemplate && (
            <Badge variant="outline" className="text-xs">
              Template
            </Badge>
          )}
          {workout.copiedFrom && (
            <Badge variant="outline" className="text-xs">
              Assigned
            </Badge>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          {/* Start — always visible */}
          <Button
            variant="default"
            size="sm"
            disabled={isStarting}
            onClick={(e) => {
              e.stopPropagation()
              onStart(workout.id)
            }}
          >
            {isStarting ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="mr-1 h-3.5 w-3.5" />
            )}
            {isStarting ? 'Starting...' : 'Start'}
          </Button>

          {/* Secondary actions — hover reveal on desktop, always visible on touch */}
          {!isClient && (
            <div className="flex items-center gap-1 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-opacity">
              {/* Edit */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation()
                      onEdit(workout.id)
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                    <span className="sr-only">Edit workout</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit workout</TooltipContent>
              </Tooltip>

              {/* More Dropdown */}
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">More actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>More actions</TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuItem
                    onClick={() => onDuplicate?.(workout.id)}
                    disabled={!onDuplicate}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Duplicate
                  </DropdownMenuItem>
                  {showPin && (
                    <DropdownMenuItem onClick={() => onTogglePin(workout.id)}>
                      {isPinned ? (
                        <>
                          <PinOff className="mr-2 h-4 w-4" />
                          Unpin
                        </>
                      ) : (
                        <>
                          <Pin className="mr-2 h-4 w-4" />
                          Pin
                        </>
                      )}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => onDelete?.(workout.id)}
                    disabled={!onDelete}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

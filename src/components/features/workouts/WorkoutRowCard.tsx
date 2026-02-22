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
import { MuscleGroupLabels } from '@/types/exercise'
import type { MuscleGroup } from '@prisma/client'

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

function getSortedMuscleGroups(exercises: WorkoutWithExerciseCount['exercises']): string[] {
  if (!exercises || exercises.length === 0) return []
  const counts = new Map<string, number>()
  for (const we of exercises) {
    const mg = we.exercise.primaryMuscleGroup
    counts.set(mg, (counts.get(mg) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([mg]) => MuscleGroupLabels[mg as MuscleGroup] ?? mg)
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
  const muscleGroups = getSortedMuscleGroups(workout.exercises)

  return (
    <Card
      className="group cursor-pointer transition-colors hover:bg-muted/50 hover:border-primary/20"
      onClick={() => onClick(workout.id)}
    >
      {/* ── Desktop: single-row columns (hidden on mobile + tablet) ── */}
      <div className="hidden lg:grid lg:grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-4 px-4 py-3">
        {/* Pin */}
        {showPin ? (
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
        ) : (
          <span />
        )}

        {/* Name */}
        <div className="min-w-0">
          <p className="font-medium leading-none line-clamp-1">{workout.name}</p>
          {workout.description && (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{workout.description}</p>
          )}
        </div>

        {/* Exercise count */}
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          <Dumbbell className="mr-1 inline h-3.5 w-3.5" />
          {workout.exerciseCount}
        </span>

        {/* Date */}
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          <Calendar className="mr-1 inline h-3.5 w-3.5" />
          {new Date(workout.updatedAt).toLocaleDateString()}
        </span>

        {/* Muscle groups */}
        <div className="flex items-center gap-1 max-w-[280px] overflow-hidden">
          {muscleGroups.length > 0 ? (
            muscleGroups.map((label) => (
              <Badge key={label} variant="outline" className="text-xs whitespace-nowrap shrink-0">
                {label}
              </Badge>
            ))
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
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

          {!isClient && (
            <div className="flex items-center gap-1 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-opacity">
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

      {/* ── Mobile + Tablet: stacked layout (hidden on lg+) ── */}
      <div className="lg:hidden p-3 space-y-2">
        {/* Row 1: Pin + Name + Start + More */}
        <div className="flex items-center gap-2">
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
          <div className="min-w-0 flex-1">
            <p className="font-medium leading-none line-clamp-1">{workout.name}</p>
          </div>
          <Button
            variant="default"
            size="sm"
            className="shrink-0 h-7 px-2 text-xs"
            disabled={isStarting}
            onClick={(e) => {
              e.stopPropagation()
              onStart(workout.id)
            }}
          >
            {isStarting ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <Play className="mr-1 h-3 w-3" />
            )}
            {isStarting ? '...' : 'Start'}
          </Button>
          {!isClient && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit(workout.id)
                  }}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDuplicate?.(workout.id)} disabled={!onDuplicate}>
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
          )}
        </div>

        {/* Row 2: Exercise count · Date · Muscle groups */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground overflow-hidden">
          <span className="shrink-0">
            <Dumbbell className="mr-0.5 inline h-3 w-3" />
            {workout.exerciseCount}
          </span>
          <span className="shrink-0">·</span>
          <span className="shrink-0">{new Date(workout.updatedAt).toLocaleDateString()}</span>
          {muscleGroups.length > 0 && (
            <>
              <span className="shrink-0">·</span>
              <span className="truncate">{muscleGroups.join(', ')}</span>
            </>
          )}
        </div>
      </div>
    </Card>
  )
}

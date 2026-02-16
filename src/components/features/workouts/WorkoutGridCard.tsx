'use client'

import {
  Dumbbell,
  Calendar,
  Star,
  Play,
  Pencil,
  MoreHorizontal,
  Copy,
  Pin,
  PinOff,
  Trash2,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface WorkoutWithExerciseCount {
  id: string
  name: string
  description?: string | null
  exerciseCount: number
  isTemplate: boolean
  copiedFrom?: { id: string; name: string } | null
  updatedAt: Date | string
}

interface WorkoutGridCardProps {
  workout: WorkoutWithExerciseCount
  isClient: boolean
  isPinned: boolean
  isStarting?: boolean
  onStart: (id: string) => void
  onEdit: (id: string) => void
  onClick: (id: string) => void
  onTogglePin: (id: string) => void
  onDuplicate?: (id: string) => void
  onDelete?: (id: string) => void
}

export function WorkoutGridCard({
  workout,
  isClient,
  isPinned,
  isStarting,
  onStart,
  onEdit,
  onClick,
  onTogglePin,
  onDuplicate,
  onDelete,
}: WorkoutGridCardProps) {
  return (
    <Card
      className="group flex flex-col h-full cursor-pointer transition-all hover:shadow-lg"
      onClick={() => onClick(workout.id)}
    >
      <CardHeader className="flex-1">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* Pin Toggle */}
            <button
              type="button"
              className={`shrink-0 transition-colors ${
                isPinned
                  ? 'text-yellow-500 hover:text-muted-foreground'
                  : 'text-muted-foreground hover:text-yellow-500'
              }`}
              onClick={(e) => {
                e.stopPropagation()
                onTogglePin(workout.id)
              }}
              aria-label={isPinned ? 'Unpin workout' : 'Pin workout'}
            >
              <Star className={`h-4 w-4 ${isPinned ? 'fill-yellow-500' : ''}`} />
            </button>
            <div className="flex-1 min-w-0">
              <CardTitle className="line-clamp-1">{workout.name}</CardTitle>
              {workout.description && (
                <CardDescription className="mt-1 line-clamp-2">
                  {workout.description}
                </CardDescription>
              )}
            </div>
          </div>

          {/* Hover-reveal action icons (top-right) */}
          {!isClient && (
            <div className="flex items-center gap-0.5 ml-2 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-opacity">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation()
                      onEdit(workout.id)
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
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
                        className="h-7 w-7"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
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
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Dumbbell className="h-4 w-4" />
            <span>{workout.exerciseCount} exercises</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>{new Date(workout.updatedAt).toLocaleDateString()}</span>
          </div>
        </div>
        {workout.isTemplate && (
          <Badge variant="secondary" className="text-xs">
            Template
          </Badge>
        )}
        {workout.copiedFrom && (
          <Badge variant="outline" className="text-xs">
            Assigned
          </Badge>
        )}
      </CardContent>

      <CardFooter className="gap-2">
        <Button
          variant="default"
          size="sm"
          className="flex-1"
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
          {isStarting ? 'Starting...' : 'Start Workout'}
        </Button>
      </CardFooter>
    </Card>
  )
}

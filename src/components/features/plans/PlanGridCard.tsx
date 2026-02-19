'use client'

import {
  Calendar,
  Dumbbell,
  Zap,
  ZapOff,
  ChevronRight,
  Edit,
  MoreHorizontal,
  Copy,
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
import { formatPlanDuration, getCurrentWeek, getPlanProgress } from '@/lib/utils/plan-utils'

interface PlanListItem {
  id: string
  name: string
  description?: string | null
  isActive: boolean
  activatedAt?: Date | string | null
  copiedFrom?: { id: string; name: string } | null
  daysPerWeek: number
  durationWeeks: number
  totalExerciseCount: number
}

interface PlanGridCardProps {
  plan: PlanListItem
  isClient?: boolean
  onView: (id: string) => void
  onEdit: (id: string) => void
  onActivate: (id: string) => void
  onDeactivate?: (id: string) => void
  onCopy?: (id: string, name: string) => void
  onDelete?: (id: string, name: string) => void
  isActivating?: boolean
  isDeactivating?: boolean
}

export function PlanGridCard({
  plan,
  isClient = false,
  onView,
  onEdit,
  onActivate,
  onDeactivate,
  onCopy,
  onDelete,
  isActivating,
  isDeactivating,
}: PlanGridCardProps) {
  const currentWeek = plan.isActive ? getCurrentWeek(plan.activatedAt ?? null) : 0
  const progress = plan.isActive ? getPlanProgress(plan.activatedAt ?? null, plan.durationWeeks) : 0

  return (
    <Card
      className={`group flex flex-col h-full cursor-pointer transition-all hover:shadow-lg ${
        plan.isActive ? 'border-primary ring-1 ring-primary/20' : ''
      }`}
      onClick={() => onView(plan.id)}
    >
      <CardHeader className="flex-1">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="line-clamp-1">{plan.name}</CardTitle>
              {plan.isActive && (
                <Badge className="bg-primary text-primary-foreground shrink-0">
                  <Zap className="mr-1 h-3 w-3" />
                  Active
                </Badge>
              )}
            </div>
            {plan.description && (
              <CardDescription className="mt-1 line-clamp-2">{plan.description}</CardDescription>
            )}
          </div>

          {/* Hover-reveal actions */}
          {!isClient && (
            <div className="flex items-center gap-0.5 ml-2 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-opacity shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation()
                      onEdit(plan.id)
                    }}
                  >
                    <Edit className="h-3.5 w-3.5" />
                    <span className="sr-only">Edit days</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit days</TooltipContent>
              </Tooltip>

              {(onCopy || onDelete) && (
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
                    {onCopy && (
                      <DropdownMenuItem onClick={() => onCopy(plan.id, plan.name)}>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy Plan
                      </DropdownMenuItem>
                    )}
                    {onDelete && (
                      <>
                        {onCopy && <DropdownMenuSeparator />}
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => onDelete(plan.id, plan.name)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>{plan.daysPerWeek} days/week</span>
          </div>
          <div className="flex items-center gap-1">
            <Dumbbell className="h-4 w-4" />
            <span>{plan.totalExerciseCount} exercises</span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">
            {formatPlanDuration(plan.durationWeeks)}
          </span>
          {plan.copiedFrom && (
            <Badge variant="outline" className="text-xs">
              Assigned
            </Badge>
          )}
        </div>

        {/* Active plan progress bar */}
        {plan.isActive && plan.durationWeeks > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>
                Week {currentWeek} of {plan.durationWeeks}
              </span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="gap-2">
        {!plan.isActive && !isClient ? (
          <Button
            variant="default"
            size="sm"
            className="flex-1"
            disabled={isActivating}
            onClick={(e) => {
              e.stopPropagation()
              onActivate(plan.id)
            }}
          >
            {isActivating ? (
              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
            ) : (
              <Zap className="mr-2 h-3 w-3" />
            )}
            {isActivating ? 'Activating...' : 'Activate'}
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation()
              onView(plan.id)
            }}
          >
            <ChevronRight className="mr-2 h-3 w-3" />
            View Plan
          </Button>
        )}

        {!isClient && (
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onEdit(plan.id)
            }}
          >
            Edit
          </Button>
        )}

        {plan.isActive && onDeactivate && (
          <Button
            variant="ghost"
            size="sm"
            disabled={isDeactivating}
            onClick={(e) => {
              e.stopPropagation()
              onDeactivate(plan.id)
            }}
          >
            {isDeactivating ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <ZapOff className="mr-1 h-3 w-3" />
            )}
            Deactivate
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

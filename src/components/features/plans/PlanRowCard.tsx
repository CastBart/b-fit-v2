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

interface PlanRowCardProps {
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

export function PlanRowCard({
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
}: PlanRowCardProps) {
  const currentWeek = plan.isActive ? getCurrentWeek(plan.activatedAt ?? null) : 0
  const progress = plan.isActive ? getPlanProgress(plan.activatedAt ?? null, plan.durationWeeks) : 0

  const primaryAction =
    !plan.isActive && !isClient ? (
      <Button
        variant="default"
        size="sm"
        className="text-xs h-7"
        disabled={isActivating}
        onClick={(e) => {
          e.stopPropagation()
          onActivate(plan.id)
        }}
      >
        {isActivating ? (
          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
        ) : (
          <Zap className="mr-1 h-3.5 w-3.5" />
        )}
        {isActivating ? 'Activating...' : 'Activate'}
      </Button>
    ) : (
      <Button
        variant="outline"
        size="sm"
        className="text-xs h-7"
        onClick={(e) => {
          e.stopPropagation()
          onView(plan.id)
        }}
      >
        <ChevronRight className="mr-1 h-3.5 w-3.5" />
        View
      </Button>
    )

  return (
    <Card
      className={`group cursor-pointer transition-colors hover:bg-muted/50 hover:border-primary/20 ${
        plan.isActive ? 'border-primary/40' : ''
      }`}
      onClick={() => onView(plan.id)}
    >
      {/* ── Desktop: single-row columns ── */}
      <div className="hidden lg:grid lg:grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 px-4 py-3">
        {/* Name + desc */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium leading-none line-clamp-1">{plan.name}</p>
            {plan.isActive && (
              <Badge className="bg-primary text-primary-foreground shrink-0 text-xs">
                <Zap className="mr-0.5 h-3 w-3" />
                Active
              </Badge>
            )}
            {plan.copiedFrom && (
              <Badge variant="outline" className="shrink-0 text-xs">
                Assigned
              </Badge>
            )}
          </div>
          {plan.description && (
            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{plan.description}</p>
          )}
          {plan.isActive && plan.durationWeeks > 0 && (
            <div className="mt-1.5 flex items-center gap-2">
              <div className="h-1 w-24 rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">
                Week {currentWeek}/{plan.durationWeeks}
              </span>
            </div>
          )}
        </div>

        {/* Days/week */}
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          <Calendar className="mr-1 inline h-3.5 w-3.5" />
          {plan.daysPerWeek} days/week
        </span>

        {/* Duration */}
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {formatPlanDuration(plan.durationWeeks)}
        </span>

        {/* Exercises */}
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          <Dumbbell className="mr-1 inline h-3.5 w-3.5" />
          {plan.totalExerciseCount}
        </span>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {primaryAction}

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
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                <ZapOff className="mr-1 h-3.5 w-3.5" />
              )}
              Deactivate
            </Button>
          )}

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
                      onEdit(plan.id)
                    }}
                  >
                    <Edit className="h-4 w-4" />
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
      </div>

      {/* ── Mobile: stacked layout ── */}
      <div className="lg:hidden p-3 space-y-2">
        {/* Row 1: Name + primary action + more */}
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-medium leading-none line-clamp-1">{plan.name}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {primaryAction}
            {plan.isActive && onDeactivate && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7"
                disabled={isDeactivating}
                onClick={(e) => {
                  e.stopPropagation()
                  onDeactivate(plan.id)
                }}
              >
                {isDeactivating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ZapOff className="h-3.5 w-3.5" />
                )}
              </Button>
            )}
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
                      onEdit(plan.id)
                    }}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Days
                  </DropdownMenuItem>
                  {onCopy && (
                    <DropdownMenuItem onClick={() => onCopy(plan.id, plan.name)}>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy Plan
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <>
                      <DropdownMenuSeparator />
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
        </div>

        {/* Row 2: meta + badges */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
          <span className="shrink-0">
            <Calendar className="mr-0.5 inline h-3 w-3" />
            {plan.daysPerWeek} days/week
          </span>
          <span className="shrink-0">·</span>
          <span className="shrink-0">{formatPlanDuration(plan.durationWeeks)}</span>
          <span className="shrink-0">·</span>
          <span className="shrink-0">
            <Dumbbell className="mr-0.5 inline h-3 w-3" />
            {plan.totalExerciseCount}
          </span>
          {plan.isActive && (
            <>
              <span className="shrink-0">·</span>
              <Badge className="bg-primary text-primary-foreground text-xs shrink-0">
                <Zap className="mr-0.5 h-2.5 w-2.5" />
                Active
              </Badge>
            </>
          )}
          {plan.copiedFrom && (
            <>
              <span className="shrink-0">·</span>
              <Badge variant="outline" className="text-xs shrink-0">
                Assigned
              </Badge>
            </>
          )}
        </div>
      </div>
    </Card>
  )
}

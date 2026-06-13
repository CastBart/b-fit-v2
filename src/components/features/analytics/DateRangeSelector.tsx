'use client'

import type { DateRange as RdpDateRange } from 'react-day-picker'
import { CalendarIcon, ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { DateRangePreset } from '@/types/analytics'

const DATE_RANGE_OPTIONS: { value: DateRangePreset; label: string }[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '1y', label: 'Last year' },
  { value: 'all', label: 'All time' },
  { value: 'custom', label: 'Custom range' },
]

interface DateRangeSelectorProps {
  value: DateRangePreset
  onValueChange: (value: DateRangePreset) => void
  /** Current custom range (only meaningful when value === 'custom'). */
  customStart?: Date
  customEnd?: Date
  /** Fired when the user edits the custom range in the calendar. */
  onCustomRangeChange?: (start?: Date, end?: Date) => void
}

function formatRangeLabel(start?: Date, end?: Date): string {
  const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  if (start && end) return `${fmt(start)} – ${fmt(end)}`
  if (start) return `${fmt(start)} – …`
  return 'Pick dates'
}

export function DateRangeSelector({
  value,
  onValueChange,
  customStart,
  customEnd,
  onCustomRangeChange,
}: DateRangeSelectorProps) {
  const currentLabel = DATE_RANGE_OPTIONS.find((o) => o.value === value)?.label ?? 'Select range'

  // Just propagate the edited range. The calendar does NOT close on selection —
  // the user can keep adjusting both ends while it's open; it closes only when
  // they click away (Radix Popover's default outside-click behaviour).
  const handleSelect = (range: RdpDateRange | undefined) => {
    onCustomRangeChange?.(range?.from, range?.to)
  }

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-[160px] justify-between font-normal">
            {currentLabel}
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-60 w-[160px] overflow-y-auto">
          <DropdownMenuRadioGroup
            value={value}
            onValueChange={(v) => onValueChange(v as DateRangePreset)}
          >
            {DATE_RANGE_OPTIONS.map((option) => (
              <DropdownMenuRadioItem key={option.value} value={option.value}>
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {value === 'custom' && (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'justify-start gap-2 font-normal',
                !customStart && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="h-4 w-4" />
              {formatRangeLabel(customStart, customEnd)}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            {/* The shadcn calendar's `--cell-size` sizing is dead under Tailwind
                v4 (its `*-[--cell-size]` utilities need the v4 `*-(--cell-size)`
                syntax to resolve), so size it the way SessionCalendarView does:
                an explicit width + flex `classNames` overrides that make the grid
                fill it. */}
            <Calendar
              mode="range"
              numberOfMonths={1}
              defaultMonth={customStart ?? customEnd}
              selected={{ from: customStart, to: customEnd }}
              onSelect={handleSelect}
              disabled={{ after: new Date() }}
              autoFocus
              className="w-[20rem]"
              classNames={{
                root: 'w-full overflow-hidden',
                months: 'w-full relative',
                month: 'w-full',
                month_grid: 'w-full',
                weekdays: 'flex w-full',
                weekday: 'flex-1 text-center',
                week: 'mt-2 flex w-full',
                day: 'group/day relative flex-1',
              }}
            />
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import type { DateRange as RdpDateRange } from 'react-day-picker'
import { CalendarIcon } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  const [open, setOpen] = useState(false)

  const handleSelect = (range: RdpDateRange | undefined) => {
    onCustomRangeChange?.(range?.from, range?.to)
    // Close once a full range is picked.
    if (range?.from && range?.to) setOpen(false)
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={value} onValueChange={(v) => onValueChange(v as DateRangePreset)}>
        <SelectTrigger className="w-[160px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DATE_RANGE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {value === 'custom' && (
        <Popover open={open} onOpenChange={setOpen}>
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
            <Calendar
              mode="range"
              numberOfMonths={1}
              defaultMonth={customStart ?? customEnd}
              selected={{ from: customStart, to: customEnd }}
              onSelect={handleSelect}
              disabled={{ after: new Date() }}
              autoFocus
            />
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}

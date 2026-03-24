'use client'

import { useState, useMemo, useCallback } from 'react'
import { getDefaultClassNames } from 'react-day-picker'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSessions } from '@/hooks/queries/useSessions'
import { SessionHistoryCard } from './SessionHistoryCard'
import type { TrainingSessionWithDetails } from '@/types/session'

interface SessionCalendarViewProps {
  onSessionClick: (session: TrainingSessionWithDetails) => void
}

export function SessionCalendarView({ onSessionClick }: SessionCalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)

  const { data, isLoading } = useSessions({
    startDate: monthStart,
    endDate: monthEnd,
    limit: 100,
    page: 1,
  })

  // Build map of date string -> sessions
  const sessionsByDate = useMemo(() => {
    const map = new Map<string, TrainingSessionWithDetails[]>()
    if (!data?.sessions) return map

    for (const session of data.sessions) {
      const key = format(new Date(session.startedAt), 'yyyy-MM-dd')
      const existing = map.get(key)
      if (existing) {
        existing.push(session)
      } else {
        map.set(key, [session])
      }
    }
    return map
  }, [data?.sessions])

  // Dates that have sessions (for modifiers)
  const datesWithSessions = useMemo(() => {
    return Array.from(sessionsByDate.keys()).map((key) => new Date(key + 'T00:00:00'))
  }, [sessionsByDate])

  const selectedDateKey = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null
  const sessionsForSelectedDay = selectedDateKey ? (sessionsByDate.get(selectedDateKey) ?? []) : []

  const handleDayClick = useCallback((day: Date) => {
    setSelectedDate(day)
  }, [])

  const handleMonthChange = useCallback((month: Date) => {
    setCurrentMonth(month)
    setSelectedDate(undefined)
  }, [])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[320px] w-full max-w-sm mx-auto rounded-lg" />
        <Skeleton className="h-20 w-full max-w-sm mx-auto rounded-lg" />
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Calendar */}
      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={setSelectedDate}
        month={currentMonth}
        onMonthChange={handleMonthChange}
        modifiers={{ hasSession: datesWithSessions }}
        onDayClick={handleDayClick}
        className="rounded-lg border p-3 shadow-sm w-full max-w-md [--cell-size:2.5rem] sm:[--cell-size:3rem]"
        classNames={{
          root: 'w-full overflow-hidden',
          months: 'w-full relative',
          month: 'w-full',
          nav: 'absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1 px-1',
          month_grid: 'w-full',
          weekdays: 'flex w-full',
          weekday: 'flex-1 text-center',
          week: 'mt-2 flex w-full',
          day: 'flex-1',
        }}
        components={{
          DayButton: ({ day, modifiers, className, ...props }) => {
            const defaultClassNames = getDefaultClassNames()
            const dateKey = format(day.date, 'yyyy-MM-dd')
            const hasSessions = sessionsByDate.has(dateKey)

            return (
              <Button
                variant="ghost"
                size="icon"
                data-day={day.date.toLocaleDateString()}
                data-selected-single={
                  modifiers.selected &&
                  !modifiers.range_start &&
                  !modifiers.range_end &&
                  !modifiers.range_middle
                }
                className={cn(
                  'data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-ring/50 flex aspect-square h-auto w-full min-w-[--cell-size] flex-col items-center justify-center gap-0.5 font-normal leading-none group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:ring-[3px]',
                  defaultClassNames.day,
                  className
                )}
                {...props}
              >
                <span>{day.date.getDate()}</span>
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    hasSessions
                      ? modifiers.selected
                        ? 'bg-primary-foreground'
                        : 'bg-primary'
                      : 'bg-transparent'
                  )}
                />
              </Button>
            )
          },
        }}
      />

      {/* Selected day sessions */}
      {selectedDate && (
        <div className="w-full space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            {format(selectedDate, 'EEEE, MMMM d, yyyy')}
          </h3>
          {sessionsForSelectedDay.length > 0 ? (
            <div className="space-y-2">
              {sessionsForSelectedDay.map((session) => (
                <SessionHistoryCard
                  key={session.id}
                  session={session}
                  onClick={() => onSessionClick(session)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8 text-center">
              <CalendarDays className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No sessions on this day</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

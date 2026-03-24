'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { History, LayoutGrid, CalendarDays, Play } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useSessions } from '@/hooks/queries/useSessions'
import { SessionHistoryCard } from '@/components/features/sessions/SessionHistoryCard'
import { SessionCalendarView } from '@/components/features/sessions/SessionCalendarView'
import {
  CompletedSessionDrawer,
  type CompletedSessionData,
} from '@/components/features/sessions/CompletedSessionDrawer'
import { mapSessionToCompletedData } from '@/lib/utils/session-mappers'
import { SessionStatus } from '@/types/session'
import type { TrainingSessionWithDetails } from '@/types/session'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { useAppDispatch } from '@/store/hooks'
import { startStandaloneSession } from '@/lib/utils/session-navigation'
import { useActiveSessionGuard } from '@/hooks/useActiveSessionGuard'

// ============================================================================
// Types & Constants
// ============================================================================

type StatusFilter = 'ALL' | 'COMPLETED' | 'ABANDONED'
type ViewMode = 'calendar' | 'grid'

const VIEW_MODE_KEY = 'sessions-view-mode'

// ============================================================================
// Page
// ============================================================================

export default function SessionHistoryPage() {
  const router = useRouter()
  const dispatch = useAppDispatch()
  const { guardedStart } = useActiveSessionGuard()
  const [search, setSearch] = useState('')
  const [statusFilter] = useState<StatusFilter>('ALL')
  const [page, setPage] = useState(1)
  const [viewMode, setViewMode] = useState<ViewMode>('calendar')

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedSession, setSelectedSession] = useState<CompletedSessionData | null>(null)

  // Init view mode from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(VIEW_MODE_KEY)
      if (stored === 'grid' || stored === 'calendar') {
        setViewMode(stored)
      }
    }
  }, [])

  const { data, isLoading, error } = useSessions({
    search: search || undefined,
    status: statusFilter === 'ALL' ? undefined : (statusFilter as SessionStatus),
    page,
    limit: 12,
  })

  if (error) {
    toast.error('Failed to load sessions')
  }

  const handleViewModeChange = (value: string) => {
    if (value === 'calendar' || value === 'grid') {
      setViewMode(value)
      localStorage.setItem(VIEW_MODE_KEY, value)
    }
  }

  const handleSessionClick = (session: TrainingSessionWithDetails) => {
    const mappedData = mapSessionToCompletedData(session)
    setSelectedSession(mappedData)
    setDrawerOpen(true)
  }

  return (
    <div className="container mx-auto flex h-[calc(100dvh-4.5rem)] flex-col px-4 pt-4 sm:px-6 sm:pt-6 md:h-[calc(100dvh-1rem)]">
      {/* Header */}
      <div className="mb-4 shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Session History</h1>
          <p className="hidden sm:block mt-1 text-muted-foreground">
            Browse your past workout sessions
          </p>
        </div>
        <Button
          onClick={() => guardedStart(() => startStandaloneSession(dispatch, router))}
          className="h-9 w-9 sm:h-auto sm:w-auto sm:px-4 sm:py-2"
        >
          <Play className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Start Standalone Session</span>
        </Button>
      </div>

      {/* Filters + View Toggle */}
      <div className="mb-4 shrink-0 flex gap-4 items-center">
        {viewMode === 'grid' && (
          <Input
            type="search"
            placeholder="Search sessions..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="max-w-md"
          />
        )}
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={handleViewModeChange}
          className="ml-auto"
        >
          <ToggleGroupItem value="calendar" aria-label="Calendar view" className="px-2.5">
            <CalendarDays className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="grid" aria-label="Grid view" className="px-2.5">
            <LayoutGrid className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Scrollable content */}
      <ScrollArea className="flex-1 min-h-0">
        {viewMode === 'calendar' ? (
          <SessionCalendarView onSessionClick={handleSessionClick} />
        ) : (
          <>
            {/* Loading State */}
            {isLoading && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4 space-y-3">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-4 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Empty State */}
            {!isLoading && data?.sessions.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <History className="mb-4 h-16 w-16 text-muted-foreground" />
                  <h3 className="mb-2 text-lg font-semibold">No sessions found</h3>
                  <p className="text-center text-sm text-muted-foreground">
                    {search || statusFilter !== 'ALL'
                      ? 'No sessions match your filters. Try adjusting your search.'
                      : 'Complete your first workout to see it here.'}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Sessions Grid */}
            {!isLoading && data && data.sessions.length > 0 && (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {data.sessions.map((session) => (
                    <SessionHistoryCard
                      key={session.id}
                      session={session}
                      onClick={() => handleSessionClick(session)}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {data.totalPages > 1 && (
                  <div className="mt-8 flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      disabled={page === 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {data.page} of {data.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      disabled={page >= data.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </ScrollArea>

      {/* Session Detail Drawer */}
      <CompletedSessionDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        data={selectedSession}
        actionLabel="Close"
      />
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { History, LayoutGrid, List, Play } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useSessions } from '@/hooks/queries/useSessions'
import { SessionHistoryCard } from '@/components/features/sessions/SessionHistoryCard'
import { SessionRowCard } from '@/components/features/sessions/SessionRowCard'
import {
  CompletedSessionDrawer,
  type CompletedSessionData,
} from '@/components/features/sessions/CompletedSessionDrawer'
import { mapSessionToCompletedData } from '@/lib/utils/session-mappers'
import { SessionStatus } from '@/types/session'
import type { TrainingSessionWithDetails } from '@/types/session'
import { toast } from 'sonner'
import { useAppDispatch } from '@/store/hooks'
import { startStandaloneSession } from '@/lib/utils/session-navigation'

// ============================================================================
// Types & Constants
// ============================================================================

type StatusFilter = 'ALL' | 'COMPLETED' | 'ABANDONED'
type ViewMode = 'list' | 'grid'

const VIEW_MODE_KEY = 'sessions-view-mode'

// ============================================================================
// Page
// ============================================================================

export default function SessionHistoryPage() {
  const router = useRouter()
  const dispatch = useAppDispatch()
  const [search, setSearch] = useState('')
  const [statusFilter] = useState<StatusFilter>('ALL')
  const [page, setPage] = useState(1)
  const [viewMode, setViewMode] = useState<ViewMode>('list')

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedSession, setSelectedSession] = useState<CompletedSessionData | null>(null)

  // Init view mode from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(VIEW_MODE_KEY)
      if (stored === 'grid' || stored === 'list') {
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
    if (value === 'list' || value === 'grid') {
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
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Session History</h1>
          <p className="mt-1 text-muted-foreground">Browse your past workout sessions</p>
        </div>
        <Button onClick={() => startStandaloneSession(dispatch, router)}>
          <Play className="mr-2 h-4 w-4" />
          Start Standalone Session
        </Button>
      </div>

      {/* Filters + View Toggle */}
      <div className="mb-6 flex gap-4 items-center">
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
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={handleViewModeChange}
          className="ml-auto"
        >
          <ToggleGroupItem value="list" aria-label="List view" className="px-2.5">
            <List className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="grid" aria-label="Grid view" className="px-2.5">
            <LayoutGrid className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Loading State */}
      {isLoading && viewMode === 'grid' && (
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
      {isLoading && viewMode === 'list' && (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="flex items-center gap-4 p-4">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-4 w-2/3" />
              </div>
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-4 w-24" />
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

      {/* Sessions List */}
      {!isLoading && data && data.sessions.length > 0 && (
        <>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.sessions.map((session) => (
                <SessionHistoryCard
                  key={session.id}
                  session={session}
                  onClick={() => handleSessionClick(session)}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {data.sessions.map((session) => (
                <SessionRowCard
                  key={session.id}
                  session={session}
                  onClick={() => handleSessionClick(session)}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <Button variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
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

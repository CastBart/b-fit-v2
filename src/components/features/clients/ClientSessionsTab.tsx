'use client'

import { useState, useEffect } from 'react'
import { History, LayoutGrid, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { SessionHistoryCard } from '@/components/features/sessions/SessionHistoryCard'
import { SessionRowCard } from '@/components/features/sessions/SessionRowCard'
import {
  CompletedSessionDrawer,
  type CompletedSessionData,
} from '@/components/features/sessions/CompletedSessionDrawer'
import { useClientSessions } from '@/hooks/queries/useClientDetail'
import { mapSessionToCompletedData } from '@/lib/utils/session-mappers'
import type { TrainingSessionWithDetails } from '@/types/session'

// ============================================================================
// Types & Constants
// ============================================================================

type ViewMode = 'list' | 'grid'

const VIEW_MODE_KEY = 'client-sessions-view-mode'

interface ClientSessionsTabProps {
  clientId: string
  clientName: string
}

// ============================================================================
// Component
// ============================================================================

export function ClientSessionsTab({ clientId, clientName }: ClientSessionsTabProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [sessionsPage, setSessionsPage] = useState(1)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedSession, setSelectedSession] = useState<CompletedSessionData | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(VIEW_MODE_KEY)
      if (stored === 'grid' || stored === 'list') {
        setViewMode(stored)
      }
    }
  }, [])

  const { data: sessionsData, isLoading } = useClientSessions(clientId, sessionsPage)

  const handleViewModeChange = (value: string) => {
    if (value === 'list' || value === 'grid') {
      setViewMode(value)
      localStorage.setItem(VIEW_MODE_KEY, value)
    }
  }

  const handleSessionClick = (session: TrainingSessionWithDetails) => {
    const mapped = mapSessionToCompletedData(session)
    setSelectedSession(mapped)
    setDrawerOpen(true)
  }

  return (
    <>
      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{clientName}&apos;s sessions</p>
        <ToggleGroup type="single" value={viewMode} onValueChange={handleViewModeChange}>
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
          {Array.from({ length: 3 }).map((_, i) => (
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
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="flex items-center gap-4 p-4">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-4 w-2/3" />
              </div>
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-24" />
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && (!sessionsData || sessionsData.sessions.length === 0) && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-12">
            <History className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No sessions recorded yet for this client.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Session List */}
      {!isLoading && sessionsData && sessionsData.sessions.length > 0 && (
        <>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sessionsData.sessions.map((s) => (
                <SessionHistoryCard
                  key={s.id}
                  session={s}
                  onClick={() => handleSessionClick(s as TrainingSessionWithDetails)}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {sessionsData.sessions.map((s) => (
                <SessionRowCard
                  key={s.id}
                  session={s as TrainingSessionWithDetails}
                  onClick={() => handleSessionClick(s as TrainingSessionWithDetails)}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {sessionsData.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                disabled={sessionsPage === 1}
                onClick={() => setSessionsPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {sessionsData.page} of {sessionsData.totalPages}
              </span>
              <Button
                variant="outline"
                disabled={sessionsPage >= sessionsData.totalPages}
                onClick={() => setSessionsPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {/* Session Detail Drawer — viewing another user's (client's) session,
          so hide "Repeat Session" (would start the PT's own session). */}
      <CompletedSessionDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        data={selectedSession}
        hideRepeat
        actions={[{ label: 'Close', onClick: () => setDrawerOpen(false) }]}
      />
    </>
  )
}

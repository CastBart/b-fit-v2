'use client'

import { useState } from 'react'
import { History } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useSessions } from '@/hooks/queries/useSessions'
import { SessionHistoryCard } from '@/components/features/sessions/SessionHistoryCard'
import {
  CompletedSessionDrawer,
  type CompletedSessionData,
} from '@/components/features/sessions/CompletedSessionDrawer'
import { mapSessionToCompletedData } from '@/lib/utils/session-mappers'
import { SessionStatus } from '@/types/session'
import type { TrainingSessionWithDetails } from '@/types/session'
import { toast } from 'sonner'

type StatusFilter = 'ALL' | 'COMPLETED' | 'ABANDONED'

export default function SessionHistoryPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [page, setPage] = useState(1)

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedSession, setSelectedSession] = useState<CompletedSessionData | null>(null)

  const { data, isLoading, error } = useSessions({
    search: search || undefined,
    status: statusFilter === 'ALL' ? undefined : (statusFilter as SessionStatus),
    page,
    limit: 12,
  })

  if (error) {
    toast.error('Failed to load sessions')
  }

  const handleSessionClick = (session: TrainingSessionWithDetails) => {
    const mappedData = mapSessionToCompletedData(session)
    setSelectedSession(mappedData)
    setDrawerOpen(true)
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Session History</h1>
        <p className="mt-1 text-muted-foreground">Browse your past workout sessions</p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
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
        <Select
          value={statusFilter}
          onValueChange={(value: StatusFilter) => {
            setStatusFilter(value)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Sessions</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="ABANDONED">Abandoned</SelectItem>
          </SelectContent>
        </Select>
      </div>

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

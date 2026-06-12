'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Dumbbell } from 'lucide-react'
import { useSessions } from '@/hooks/queries/useSessions'
import { SessionStatus } from '@/types/session'
import {
  CompletedSessionDrawer,
  type CompletedSessionData,
} from '@/components/features/sessions/CompletedSessionDrawer'
import { mapSessionToCompletedData } from '@/lib/utils/session-mappers'
import type { TrainingSessionWithDetails } from '@/types/session'

export function RecentSessions() {
  const { data, isLoading } = useSessions({ status: SessionStatus.COMPLETED, limit: 5, page: 1 })
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedSession, setSelectedSession] = useState<CompletedSessionData | null>(null)

  const handleViewSession = (session: TrainingSessionWithDetails) => {
    setSelectedSession(mapSessionToCompletedData(session))
    setDrawerOpen(true)
  }

  const formatRelativeDate = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30)
      return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl sm:text-2xl lg:text-2xl tracking-tight">
            Recent Sessions
          </CardTitle>
          <CardDescription>Your last 5 workout sessions</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div>
                      <Skeleton className="h-4 w-24 sm:w-32 mb-1" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-14" />
                </div>
              ))}
            </div>
          ) : !data?.sessions.length ? (
            <div className="text-center py-8">
              <Dumbbell className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No sessions yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Complete a workout to see your sessions here
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.sessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <Dumbbell className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{session.name ?? 'Untitled Session'}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatRelativeDate(new Date(session.startedAt))}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleViewSession(session)}>
                    View
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CompletedSessionDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        data={selectedSession}
        actions={[{ label: 'Close', onClick: () => setDrawerOpen(false) }]}
      />
    </>
  )
}

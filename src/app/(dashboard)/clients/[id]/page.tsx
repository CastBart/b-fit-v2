'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Dumbbell, CalendarDays, History, UserX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useClientDetail, useClientSessions } from '@/hooks/queries/useClientDetail'
import { SessionHistoryCard } from '@/components/features/sessions/SessionHistoryCard'
import { AssignWorkoutDrawer } from '@/components/features/clients/AssignWorkoutDrawer'
import { AssignPlanDrawer } from '@/components/features/clients/AssignPlanDrawer'
import { EndRelationshipDialog } from '@/components/features/clients/EndRelationshipDialog'

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const clientId = params.id

  const [sessionsPage, setSessionsPage] = useState(1)
  const [assignWorkoutOpen, setAssignWorkoutOpen] = useState(false)
  const [assignPlanOpen, setAssignPlanOpen] = useState(false)
  const [endDialogOpen, setEndDialogOpen] = useState(false)

  const { data: client, isLoading: clientLoading } = useClientDetail(clientId)
  const { data: sessionsData, isLoading: sessionsLoading } = useClientSessions(
    clientId,
    sessionsPage
  )

  const clientName = client?.client?.name ?? client?.client?.email ?? 'Client'

  if (clientLoading) {
    return (
      <div className="container mx-auto p-6">
        <Skeleton className="mb-4 h-8 w-32" />
        <Skeleton className="mb-2 h-10 w-64" />
        <Skeleton className="h-5 w-48" />
      </div>
    )
  }

  if (!client) {
    return (
      <div className="container mx-auto p-6">
        <Button variant="ghost" onClick={() => router.push('/clients')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Clients
        </Button>
        <Card className="mt-4">
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">Client not found or relationship is not active.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      {/* Back Button */}
      <Button variant="ghost" className="mb-4" onClick={() => router.push('/clients')}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Clients
      </Button>

      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          {client.client?.image ? (
            <img
              src={client.client.image}
              alt={clientName}
              className="h-14 w-14 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
              {clientName[0]?.toUpperCase() ?? '?'}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{clientName}</h1>
              <Badge variant="default" className="capitalize">
                {client.status.toLowerCase()}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{client.client?.email}</p>
          </div>
        </div>

        <Button
          variant="outline"
          className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
          onClick={() => setEndDialogOpen(true)}
        >
          <UserX className="mr-2 h-4 w-4" />
          End Relationship
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="sessions">
        <TabsList>
          <TabsTrigger value="sessions">
            <History className="mr-1.5 h-4 w-4" />
            Sessions
          </TabsTrigger>
          <TabsTrigger value="workouts">
            <Dumbbell className="mr-1.5 h-4 w-4" />
            Workouts
          </TabsTrigger>
          <TabsTrigger value="plans">
            <CalendarDays className="mr-1.5 h-4 w-4" />
            Plans
          </TabsTrigger>
        </TabsList>

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="mt-6">
          {sessionsLoading && (
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

          {!sessionsLoading && sessionsData?.sessions.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center py-12">
                <History className="mb-3 h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No sessions recorded yet for this client.
                </p>
              </CardContent>
            </Card>
          )}

          {!sessionsLoading && sessionsData && sessionsData.sessions.length > 0 && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {sessionsData.sessions.map((session) => (
                  <SessionHistoryCard key={session.id} session={session} />
                ))}
              </div>

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
        </TabsContent>

        {/* Workouts Tab */}
        <TabsContent value="workouts" className="mt-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Assign one of your workouts to {clientName}. A copy will be created for them.
            </p>
            <Button onClick={() => setAssignWorkoutOpen(true)}>
              <Dumbbell className="mr-2 h-4 w-4" />
              Assign Workout
            </Button>
          </div>
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center py-12">
              <Dumbbell className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Use the &quot;Assign Workout&quot; button to give {clientName} a workout from your
                library.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Plans Tab */}
        <TabsContent value="plans" className="mt-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Assign one of your plans to {clientName}. A copy will be created for them.
            </p>
            <Button onClick={() => setAssignPlanOpen(true)}>
              <CalendarDays className="mr-2 h-4 w-4" />
              Assign Plan
            </Button>
          </div>
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center py-12">
              <CalendarDays className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Use the &quot;Assign Plan&quot; button to give {clientName} a training plan from
                your library.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Drawers & Dialogs */}
      <AssignWorkoutDrawer
        open={assignWorkoutOpen}
        onOpenChange={setAssignWorkoutOpen}
        clientId={clientId}
        clientName={clientName}
      />
      <AssignPlanDrawer
        open={assignPlanOpen}
        onOpenChange={setAssignPlanOpen}
        clientId={clientId}
        clientName={clientName}
      />
      <EndRelationshipDialog
        open={endDialogOpen}
        onOpenChange={setEndDialogOpen}
        relationshipId={client.id}
        clientName={clientName}
      />
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  ArrowLeft,
  BarChart3,
  Dumbbell,
  CalendarDays,
  History,
  UserX,
  Plus,
  Edit,
  Eye,
  Zap,
  ZapOff,
  Copy,
  Check,
  Clock,
  RefreshCw,
  Mail,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  useClientDetail,
  useClientSessions,
  useClientPlans,
  useInvitationDetail,
} from '@/hooks/queries/useClientDetail'
import { useCancelInvitation, useRefreshInvitation } from '@/hooks/mutations/useClientMutations'
import { useActivatePlan, useDeactivatePlan } from '@/hooks/mutations/usePlanMutations'
import { SessionHistoryCard } from '@/components/features/sessions/SessionHistoryCard'
import {
  CompletedSessionDrawer,
  type CompletedSessionData,
} from '@/components/features/sessions/CompletedSessionDrawer'
import { mapSessionToCompletedData } from '@/lib/utils/session-mappers'
import type { TrainingSessionWithDetails } from '@/types/session'
import { AssignWorkoutDrawer } from '@/components/features/clients/AssignWorkoutDrawer'
import { AssignPlanDrawer } from '@/components/features/clients/AssignPlanDrawer'
import { EndRelationshipDialog } from '@/components/features/clients/EndRelationshipDialog'
import { ClientWorkoutsTab } from '@/components/features/clients/ClientWorkoutsTab'
import { ClientAnalyticsTab } from '@/components/features/analytics/ClientAnalyticsTab'

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { data: session, status } = useSession()
  const id = params.id

  // Role guard: only PT and ORG can access client detail
  useEffect(() => {
    if (
      status === 'authenticated' &&
      session?.user?.role !== 'PT' &&
      session?.user?.role !== 'ORG'
    ) {
      router.replace('/dashboard')
    }
  }, [status, session, router])

  // Try as active client first
  const { data: client, isLoading: clientLoading, isError: clientError } = useClientDetail(id)

  // If client detail fails, try as pending invitation (id = relationshipId)
  const { data: invitation, isLoading: invitationLoading } = useInvitationDetail(
    id,
    !clientLoading && !client
  )

  const isLoading = clientLoading || (!client && !clientError && invitationLoading)

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <Skeleton className="mb-4 h-8 w-32" />
        <Skeleton className="mb-2 h-10 w-64" />
        <Skeleton className="h-5 w-48" />
      </div>
    )
  }

  // Show pending invitation view
  if (!client && invitation) {
    return <PendingInvitationView invitation={invitation} onBack={() => router.push('/clients')} />
  }

  // Not found
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

  return <ActiveClientView client={client} clientId={id} />
}

// ============================================================================
// Pending Invitation View
// ============================================================================

interface PendingInvitationViewProps {
  invitation: {
    id: string
    inviteCode: string
    status: string
    clientEmail: string | null
    expiresAt: Date | null
    createdAt: Date
  }
  onBack: () => void
}

function PendingInvitationView({ invitation, onBack }: PendingInvitationViewProps) {
  const router = useRouter()
  const [copied, setCopied] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)

  const cancelMutation = useCancelInvitation()
  const refreshMutation = useRefreshInvitation()

  const isExpired = invitation.expiresAt ? new Date() > new Date(invitation.expiresAt) : false
  const inviteLink =
    typeof window !== 'undefined'
      ? `${window.location.origin}/invite/${invitation.inviteCode}`
      : `/invite/${invitation.inviteCode}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      toast.success('Link copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy link')
    }
  }

  const handleRefresh = async () => {
    const result = await refreshMutation.mutateAsync(invitation.id)
    if (result?.inviteCode) {
      setCopied(false)
    }
  }

  const handleCancel = async () => {
    await cancelMutation.mutateAsync(invitation.id)
    setCancelDialogOpen(false)
    router.push('/clients')
  }

  const formatExpiry = () => {
    if (!invitation.expiresAt) return 'No expiry set'
    const expiresAt = new Date(invitation.expiresAt)
    if (isExpired) {
      return `Expired on ${expiresAt.toLocaleDateString()} at ${expiresAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    }
    const diff = expiresAt.getTime() - Date.now()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    if (hours > 24) {
      const days = Math.floor(hours / 24)
      return `Expires in ${days} day${days !== 1 ? 's' : ''}`
    }
    if (hours > 0) {
      return `Expires in ${hours}h ${minutes}m`
    }
    return `Expires in ${minutes} minutes`
  }

  return (
    <div className="container mx-auto p-6">
      <Button variant="ghost" className="mb-4" onClick={onBack}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Clients
      </Button>

      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-lg font-semibold text-muted-foreground">
            <Mail className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">
                {invitation.clientEmail || 'Pending Invitation'}
              </h1>
              <Badge variant={isExpired ? 'destructive' : 'secondary'}>
                {isExpired ? 'Expired' : 'Pending'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <Clock className="h-3.5 w-3.5" />
              {formatExpiry()}
            </p>
          </div>
        </div>
      </div>

      {/* Invite Link Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Invite Link</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Share this link with your client</Label>
            <div className="flex gap-2">
              <Input
                value={inviteLink}
                readOnly
                className={`font-mono text-sm ${isExpired ? 'opacity-50' : ''}`}
              />
              <Button variant="outline" size="icon" onClick={handleCopy} disabled={isExpired}>
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            {isExpired && (
              <p className="text-xs text-destructive">
                This link has expired. Refresh the invitation to generate a new link.
              </p>
            )}
          </div>

          {invitation.clientEmail && (
            <div className="space-y-1">
              <Label className="text-muted-foreground">Linked email</Label>
              <p className="text-sm">{invitation.clientEmail}</p>
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-muted-foreground">Created</Label>
            <p className="text-sm">
              {new Date(invitation.createdAt).toLocaleDateString()} at{' '}
              {new Date(invitation.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {!isExpired && (
          <Button variant="outline" onClick={handleCopy}>
            {copied ? (
              <Check className="mr-2 h-4 w-4 text-green-600" />
            ) : (
              <Copy className="mr-2 h-4 w-4" />
            )}
            {copied ? 'Copied!' : 'Copy Invite Link'}
          </Button>
        )}

        {isExpired && (
          <Button onClick={handleRefresh} disabled={refreshMutation.isPending}>
            <RefreshCw
              className={`mr-2 h-4 w-4 ${refreshMutation.isPending ? 'animate-spin' : ''}`}
            />
            {refreshMutation.isPending ? 'Refreshing...' : 'Refresh Invitation'}
          </Button>
        )}

        <Button
          variant="outline"
          className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
          onClick={() => setCancelDialogOpen(true)}
        >
          <XCircle className="mr-2 h-4 w-4" />
          Cancel Invitation
        </Button>
      </div>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this invitation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently cancel the invitation
              {invitation.clientEmail ? ` for ${invitation.clientEmail}` : ''}. The invite link will
              no longer work. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Invitation</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={cancelMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Invitation'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ============================================================================
// Active Client View (original page content)
// ============================================================================

interface ActiveClientViewProps {
  client: {
    id: string
    ptId: string
    clientId: string | null
    status: string
    inviteCode: string
    clientEmail: string | null
    createdAt: Date
    updatedAt: Date
    client: {
      id: string
      name: string | null
      email: string
      image: string | null
    } | null
  }
  clientId: string
}

function ActiveClientView({ client, clientId }: ActiveClientViewProps) {
  const router = useRouter()

  const [sessionsPage, setSessionsPage] = useState(1)
  const [assignWorkoutOpen, setAssignWorkoutOpen] = useState(false)
  const [assignPlanOpen, setAssignPlanOpen] = useState(false)
  const [endDialogOpen, setEndDialogOpen] = useState(false)
  const [sessionDrawerOpen, setSessionDrawerOpen] = useState(false)
  const [selectedSession, setSelectedSession] = useState<CompletedSessionData | null>(null)

  const { data: sessionsData, isLoading: sessionsLoading } = useClientSessions(
    clientId,
    sessionsPage
  )
  const { data: clientPlans, isLoading: plansLoading } = useClientPlans(clientId)
  const activatePlanMutation = useActivatePlan()
  const deactivatePlanMutation = useDeactivatePlan()

  const clientName = client?.client?.name ?? client?.client?.email ?? 'Client'

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
          <TabsTrigger value="analytics">
            <BarChart3 className="mr-1.5 h-4 w-4" />
            Analytics
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
                {sessionsData.sessions.map((s) => (
                  <SessionHistoryCard
                    key={s.id}
                    session={s}
                    onClick={() => {
                      const mapped = mapSessionToCompletedData(s as TrainingSessionWithDetails)
                      setSelectedSession(mapped)
                      setSessionDrawerOpen(true)
                    }}
                  />
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
          <ClientWorkoutsTab
            clientId={clientId}
            clientName={clientName}
            onAssignWorkout={() => setAssignWorkoutOpen(true)}
          />
        </TabsContent>

        {/* Plans Tab */}
        <TabsContent value="plans" className="mt-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">{clientName}&apos;s training plans</p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => router.push(`/clients/${clientId}/plans/create`)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Plan
              </Button>
              <Button onClick={() => setAssignPlanOpen(true)}>
                <CalendarDays className="mr-2 h-4 w-4" />
                Assign Plan
              </Button>
            </div>
          </div>

          {plansLoading && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4 space-y-3">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!plansLoading && (!clientPlans || clientPlans.length === 0) && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center py-12">
                <CalendarDays className="mb-3 h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No plans yet. Assign or create a plan for {clientName}.
                </p>
              </CardContent>
            </Card>
          )}

          {!plansLoading && clientPlans && clientPlans.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {clientPlans.map((plan) => (
                <Card key={plan.id} className="group transition-all hover:shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold truncate">{plan.name}</h3>
                      <div className="flex gap-1 ml-2 shrink-0">
                        {plan.isActive && (
                          <Badge className="bg-primary text-primary-foreground text-xs">
                            <Zap className="mr-0.5 h-3 w-3" />
                            Active
                          </Badge>
                        )}
                        {plan.copiedFrom && (
                          <Badge variant="secondary" className="text-xs">
                            Assigned
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {plan.daysPerWeek} days/week
                      {plan.durationWeeks > 0 ? ` \u00b7 ${plan.durationWeeks} weeks` : ''}
                    </p>
                    <p className="text-sm text-muted-foreground mb-3">
                      {plan.totalExerciseCount} total exercise
                      {plan.totalExerciseCount !== 1 ? 's' : ''}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/plans/${plan.id}`)}
                      >
                        <Eye className="mr-1 h-3 w-3" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/plans/${plan.id}/builder`)}
                      >
                        <Edit className="mr-1 h-3 w-3" />
                        Edit Days
                      </Button>
                      {plan.isActive ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={deactivatePlanMutation.isPending}
                          onClick={() => deactivatePlanMutation.mutate(plan.id)}
                        >
                          <ZapOff className="mr-1 h-3 w-3" />
                          Deactivate
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={activatePlanMutation.isPending}
                          onClick={() => activatePlanMutation.mutate(plan.id)}
                        >
                          <Zap className="mr-1 h-3 w-3" />
                          Activate
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="mt-6">
          {client.clientId && <ClientAnalyticsTab clientId={client.clientId} />}
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
      <CompletedSessionDrawer
        open={sessionDrawerOpen}
        onOpenChange={setSessionDrawerOpen}
        data={selectedSession}
        actionLabel="Close"
      />
    </div>
  )
}

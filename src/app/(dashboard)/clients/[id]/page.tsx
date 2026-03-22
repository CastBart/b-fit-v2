'use client'

import { useState, useEffect } from 'react'
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  ArrowLeft,
  BarChart3,
  Dumbbell,
  CalendarDays,
  History,
  UserX,
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
import { useClientDetail, useInvitationDetail } from '@/hooks/queries/useClientDetail'
import { useCancelInvitation, useRefreshInvitation } from '@/hooks/mutations/useClientMutations'
import { AssignWorkoutDrawer } from '@/components/features/clients/AssignWorkoutDrawer'
import { AssignPlanDrawer } from '@/components/features/clients/AssignPlanDrawer'
import { WorkoutPreviewDrawer } from '@/components/features/workouts/WorkoutPreviewDrawer'
import { useAssignWorkout } from '@/hooks/mutations/useClientMutations'
import { EndRelationshipDialog } from '@/components/features/clients/EndRelationshipDialog'
import { ClientWorkoutsTab } from '@/components/features/clients/ClientWorkoutsTab'
import { ClientPlansTab } from '@/components/features/clients/ClientPlansTab'
import { ClientSessionsTab } from '@/components/features/clients/ClientSessionsTab'
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
      <div className="container mx-auto max-w-5xl pt-4 sm:pt-6 px-4">
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
      <div className="container mx-auto max-w-5xl pt-4 sm:pt-6 px-4">
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
    <div className="container mx-auto max-w-5xl pt-4 sm:pt-6 px-4">
      <Button variant="ghost" className="mb-2" onClick={onBack}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Clients
      </Button>

      {/* Header */}
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-muted text-lg font-semibold text-muted-foreground">
            <Mail className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold">
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

const VALID_TABS = ['sessions', 'workouts', 'plans', 'analytics'] as const
type TabValue = (typeof VALID_TABS)[number]

function ActiveClientView({ client, clientId }: ActiveClientViewProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const rawTab = searchParams.get('tab')
  const activeTab: TabValue = VALID_TABS.includes(rawTab as TabValue)
    ? (rawTab as TabValue)
    : 'sessions'

  const handleTabChange = (value: string) => {
    router.replace(`${pathname}?tab=${value}`, { scroll: false })
  }

  const [assignWorkoutOpen, setAssignWorkoutOpen] = useState(false)
  const [assignPlanOpen, setAssignPlanOpen] = useState(false)
  const [previewWorkoutId, setPreviewWorkoutId] = useState<string | null>(null)

  const assignWorkoutMutation = useAssignWorkout()
  const [endDialogOpen, setEndDialogOpen] = useState(false)
  const clientName = client?.client?.name ?? client?.client?.email ?? 'Client'

  return (
    <div className="container mx-auto max-w-5xl pt-4 sm:pt-6 px-4">
      {/* Back Button */}
      <Button variant="ghost" className="mb-2" onClick={() => router.push('/clients')}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Clients
      </Button>

      {/* Header */}
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {client.client?.image ? (
            <img
              src={client.client.image}
              alt={clientName}
              className="h-10 w-10 sm:h-14 sm:w-14 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
              {clientName[0]?.toUpperCase() ?? '?'}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold">{clientName}</h1>
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
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="w-full sm:inline-flex sm:h-10 sm:w-auto">
          <TabsTrigger value="sessions" className="w-full sm:w-auto">
            <History className="hidden sm:inline mr-1.5 h-4 w-4" />
            Sessions
          </TabsTrigger>
          <TabsTrigger value="workouts" className="w-full sm:w-auto">
            <Dumbbell className="hidden sm:inline mr-1.5 h-4 w-4" />
            Workouts
          </TabsTrigger>
          <TabsTrigger value="plans" className="w-full sm:w-auto">
            <CalendarDays className="hidden sm:inline mr-1.5 h-4 w-4" />
            Plans
          </TabsTrigger>
          <TabsTrigger value="analytics" className="w-full sm:w-auto">
            <BarChart3 className="hidden sm:inline mr-1.5 h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="mt-4">
          <ClientSessionsTab clientId={clientId} clientName={clientName} />
        </TabsContent>

        <TabsContent value="workouts" className="mt-4">
          <ClientWorkoutsTab
            clientId={clientId}
            clientName={clientName}
            onAssignWorkout={() => setAssignWorkoutOpen(true)}
          />
        </TabsContent>

        <TabsContent value="plans" className="mt-4">
          <ClientPlansTab
            clientId={clientId}
            clientName={clientName}
            onAssignPlan={() => setAssignPlanOpen(true)}
          />
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          {client.clientId && <ClientAnalyticsTab clientId={client.clientId} />}
        </TabsContent>
      </Tabs>

      {/* Drawers & Dialogs */}
      <AssignWorkoutDrawer
        open={assignWorkoutOpen}
        onOpenChange={setAssignWorkoutOpen}
        clientName={clientName}
        onSelectWorkout={(workoutId) => {
          setAssignWorkoutOpen(false)
          setPreviewWorkoutId(workoutId)
        }}
      />
      <WorkoutPreviewDrawer
        workoutId={previewWorkoutId}
        open={previewWorkoutId !== null}
        onOpenChange={(open) => {
          if (!open) setPreviewWorkoutId(null)
        }}
        onAssign={async () => {
          if (!previewWorkoutId) return
          await assignWorkoutMutation.mutateAsync({ workoutId: previewWorkoutId, clientId })
          setPreviewWorkoutId(null)
        }}
        isAssigning={assignWorkoutMutation.isPending}
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

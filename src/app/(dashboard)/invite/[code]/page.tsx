'use client'

import { useParams, useRouter } from 'next/navigation'
import { UserCheck, UserX, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useInvitation } from '@/hooks/queries/useInvitation'
import { useAcceptInvitation, useRejectInvitation } from '@/hooks/mutations/useClientMutations'

export default function InviteAcceptPage() {
  const params = useParams<{ code: string }>()
  const router = useRouter()
  const code = params.code

  const { data: invitation, isLoading, error } = useInvitation(code)
  const acceptMutation = useAcceptInvitation()
  const rejectMutation = useRejectInvitation()

  const handleAccept = async () => {
    await acceptMutation.mutateAsync(code)
    router.push('/dashboard')
  }

  const handleDecline = async () => {
    await rejectMutation.mutateAsync(code)
    router.push('/dashboard')
  }

  if (isLoading) {
    return (
      <div className="container mx-auto flex items-center justify-center p-6 min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 space-y-4">
            <Skeleton className="mx-auto h-16 w-16 rounded-full" />
            <Skeleton className="mx-auto h-6 w-48" />
            <Skeleton className="mx-auto h-4 w-32" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !invitation) {
    return (
      <div className="container mx-auto flex items-center justify-center p-6 min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center p-8">
            <AlertCircle className="mb-4 h-16 w-16 text-destructive" />
            <h2 className="mb-2 text-xl font-semibold">Invalid Invitation</h2>
            <p className="mb-6 text-center text-sm text-muted-foreground">
              {error?.message || 'This invitation is no longer valid or has already been used.'}
            </p>
            <Button onClick={() => router.push('/dashboard')}>Go to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto flex items-center justify-center p-6 min-h-[60vh]">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center p-8">
          {/* PT Avatar */}
          {invitation.pt.image ? (
            <img
              src={invitation.pt.image}
              alt={invitation.pt.name ?? invitation.pt.email}
              className="mb-4 h-20 w-20 rounded-full object-cover"
            />
          ) : (
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-2xl font-semibold text-primary">
              {(invitation.pt.name ?? invitation.pt.email)[0]?.toUpperCase() ?? '?'}
            </div>
          )}

          <h2 className="mb-1 text-xl font-semibold">Trainer Invitation</h2>
          <p className="mb-1 text-lg font-medium">{invitation.pt.name ?? 'A trainer'}</p>
          <p className="mb-6 text-sm text-muted-foreground">{invitation.pt.email}</p>

          <p className="mb-8 text-center text-sm text-muted-foreground">
            has invited you to join as their client. Accepting will connect you with this trainer so
            they can assign workouts and view your progress.
          </p>

          <div className="flex w-full gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleDecline}
              disabled={rejectMutation.isPending || acceptMutation.isPending}
            >
              <UserX className="mr-2 h-4 w-4" />
              {rejectMutation.isPending ? 'Declining...' : 'Decline'}
            </Button>
            <Button
              className="flex-1"
              onClick={handleAccept}
              disabled={acceptMutation.isPending || rejectMutation.isPending}
            >
              <UserCheck className="mr-2 h-4 w-4" />
              {acceptMutation.isPending ? 'Accepting...' : 'Accept'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

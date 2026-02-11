'use client'

import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { AlertCircle, Clock, UserPlus, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useInvitation } from '@/hooks/queries/useInvitation'

export default function InviteAcceptPage() {
  const params = useParams<{ code: string }>()
  const router = useRouter()
  const { status: authStatus } = useSession()
  const code = params.code
  const isAuthenticated = authStatus === 'authenticated'
  const isAuthLoading = authStatus === 'loading'

  const { data: invitation, isLoading, error } = useInvitation(code)

  if (isLoading || isAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
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

  // Check if the error is specifically about expiration
  const isExpired = error?.message === 'This invitation has expired'

  if (isExpired) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center p-8">
            <Clock className="mb-4 h-16 w-16 text-muted-foreground" />
            <h2 className="mb-2 text-xl font-semibold">Invite Expired</h2>
            <p className="mb-6 text-center text-sm text-muted-foreground">
              This invitation link has expired. Please contact your trainer to request a new invite
              link.
            </p>
            <Button asChild variant="outline">
              <Link href="/login">Go to Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !invitation) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center p-8">
            <AlertCircle className="mb-4 h-16 w-16 text-destructive" />
            <h2 className="mb-2 text-xl font-semibold">Invalid Invitation</h2>
            <p className="mb-6 text-center text-sm text-muted-foreground">
              {error?.message || 'This invitation is no longer valid or has already been used.'}
            </p>
            {isAuthenticated ? (
              <Button onClick={() => router.push('/dashboard')}>Go to Dashboard</Button>
            ) : (
              <Button asChild>
                <Link href="/login">Go to Login</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Authenticated users: show "this is for new users" message
  if (isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
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
              You are already logged in. This invite link is for new users to create an account. If
              you need to connect with this trainer, please log out and sign up with a new account
              using this link.
            </p>

            <Button onClick={() => router.push('/dashboard')} className="w-full">
              <ArrowRight className="mr-2 h-4 w-4" />
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Unauthenticated: show PT info + sign up button
  const signupUrl = `/signup?inviteCode=${code}${
    invitation.clientEmail ? `&email=${encodeURIComponent(invitation.clientEmail)}` : ''
  }&callbackUrl=${encodeURIComponent('/dashboard')}`

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
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

          <p className="mb-4 text-center text-sm text-muted-foreground">
            has invited you to join as their client. Sign up to connect with this trainer so they
            can assign workouts and track your progress.
          </p>

          {invitation.clientEmail && (
            <p className="mb-4 text-center text-xs text-muted-foreground">
              This invite is for <span className="font-medium">{invitation.clientEmail}</span>
            </p>
          )}

          <Button asChild className="w-full">
            <Link href={signupUrl}>
              <UserPlus className="mr-2 h-4 w-4" />
              Sign up to Accept
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

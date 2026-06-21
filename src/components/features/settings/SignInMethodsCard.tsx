'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { KeyRound } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { GoogleSignInButton } from '@/components/features/auth/GoogleSignInButton'
import { SetPasswordDialog } from '@/components/features/settings/SetPasswordDialog'
import { useLinkedAccounts } from '@/hooks/queries/useLinkedAccounts'
import { useUnlinkGoogle } from '@/hooks/mutations/useUnlinkGoogle'

/** Show a one-time toast for the ?link= result of a Google linking attempt. */
function useLinkResultToast() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const handled = useRef(false)

  useEffect(() => {
    const result = searchParams.get('link')
    if (!result || handled.current) return
    handled.current = true

    switch (result) {
      case 'success':
        toast.success('Google account linked')
        break
      case 'already':
        toast.info('Your Google account is already linked')
        break
      case 'already_in_use':
        toast.error('That Google account is already linked to another B-Fit account')
        break
      case 'error':
        toast.error('Could not link Google account. Please try again.')
        break
    }

    router.replace('/settings')
  }, [searchParams, router])
}

// Dialog opens either to just set a password, or to set one then unlink Google.
type DialogMode = 'set' | 'unlink' | null

export function SignInMethodsCard() {
  useLinkResultToast()
  const { data, isLoading } = useLinkedAccounts()
  const unlinkGoogle = useUnlinkGoogle()
  const [dialogMode, setDialogMode] = useState<DialogMode>(null)

  const googleLinked = data?.providers.includes('google') ?? false
  const hasPassword = data?.hasPassword ?? false

  function handlePasswordSet() {
    if (dialogMode === 'unlink') {
      // Password is now set, so unlinking won't lock the user out.
      unlinkGoogle.mutate()
    } else {
      toast.success('Password set')
    }
    setDialogMode(null)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5" />
          Sign-in methods
        </CardTitle>
        <CardDescription>Manage how you sign in to your account</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <>
            {/* Email / password */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Email &amp; password</span>
                {hasPassword ? (
                  <Badge variant="secondary">Enabled</Badge>
                ) : (
                  <Badge variant="outline">Not set</Badge>
                )}
              </div>
              {!hasPassword && (
                <Button size="sm" variant="outline" onClick={() => setDialogMode('set')}>
                  Set a password
                </Button>
              )}
            </div>

            {/* Google */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Google</span>
                {googleLinked && <Badge variant="secondary">Linked</Badge>}
              </div>

              {googleLinked ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={unlinkGoogle.isPending}
                  onClick={() => {
                    // Google-only user must set a password first, in the same flow.
                    if (!hasPassword) {
                      setDialogMode('unlink')
                    } else {
                      unlinkGoogle.mutate()
                    }
                  }}
                >
                  {unlinkGoogle.isPending ? 'Unlinking...' : 'Unlink'}
                </Button>
              ) : (
                <div className="w-44">
                  <GoogleSignInButton callbackUrl="/settings" label="Link Google" />
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>

      <SetPasswordDialog
        open={dialogMode !== null}
        onOpenChange={(open) => {
          if (!open) setDialogMode(null)
        }}
        title={dialogMode === 'unlink' ? 'Set a password to unlink Google' : 'Set a password'}
        description={
          dialogMode === 'unlink'
            ? 'Create a password so you can still sign in after unlinking Google.'
            : 'Add a password so you can sign in with your email as well as Google.'
        }
        submitLabel={dialogMode === 'unlink' ? 'Set password & unlink' : 'Set password'}
        onPasswordSet={handlePasswordSet}
      />
    </Card>
  )
}

import { Suspense } from 'react'
import Link from 'next/link'
import { AlertCircle } from 'lucide-react'
import { LoginForm } from '@/components/features/auth/LoginForm'
import { GoogleSignInButton } from '@/components/features/auth/GoogleSignInButton'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'

/** Map NextAuth OAuth error codes to friendly messages. */
function oauthErrorMessage(error?: string): string | null {
  switch (error) {
    case 'OAuthAccountNotLinked':
      return 'This email is already registered with a password. Please log in with your email and password.'
    case 'AccessDenied':
      return 'Access denied. Your account may be deactivated.'
    case undefined:
      return null
    default:
      return 'Something went wrong during sign-in. Please try again.'
  }
}

function LoginFormSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-10 w-full" />
      </div>
      <Skeleton className="h-10 w-full" />
    </div>
  )
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>
}) {
  const { callbackUrl, error } = await searchParams
  const signupHref = callbackUrl
    ? `/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : '/signup'
  const errorMessage = oauthErrorMessage(error)

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Log in</CardTitle>
          <CardDescription>Enter your email and password to access your account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorMessage && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Sign-in failed</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}
          <Suspense fallback={<LoginFormSkeleton />}>
            <LoginForm />
          </Suspense>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>
          <Suspense fallback={<Skeleton className="h-10 w-full" />}>
            <GoogleSignInButton />
          </Suspense>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-sm text-center">
            <Link href="/forgot-password" className="text-primary font-medium hover:underline">
              Forgot your password?
            </Link>
          </div>
          <div className="text-sm text-muted-foreground text-center">
            Don&apos;t have an account?{' '}
            <Link href={signupHref} className="text-primary font-medium hover:underline">
              Sign up
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}

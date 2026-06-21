import Link from 'next/link'
import { ResetPasswordForm } from '@/components/features/auth/ResetPasswordForm'
import { verifyResetToken } from '@/server/actions/password-reset'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  const isValid = token ? await verifyResetToken(token) : false
  const validToken = isValid && token ? token : null

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        {validToken ? (
          <>
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold">Reset password</CardTitle>
              <CardDescription>Choose a new password for your account</CardDescription>
            </CardHeader>
            <CardContent>
              <ResetPasswordForm token={validToken} />
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold">Invalid or expired link</CardTitle>
              <CardDescription>
                This password reset link is invalid or has expired. Reset links are valid for 1
                hour.
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex flex-col space-y-4">
              <div className="text-sm text-muted-foreground text-center">
                <Link href="/forgot-password" className="text-primary font-medium hover:underline">
                  Request a new reset link
                </Link>
              </div>
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  )
}

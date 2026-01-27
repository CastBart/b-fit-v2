import { auth } from '@/lib/auth/auth.config'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function TestProtectedPage() {
  const session = await auth()

  // This is a server-side check as a fallback (middleware should handle this)
  if (!session) {
    redirect('/login')
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle>Protected Route Test</CardTitle>
          <CardDescription>
            This page is protected and can only be accessed by authenticated users.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="mb-2 text-sm font-medium">Session Information:</h3>
            <div className="rounded-lg bg-muted p-4">
              <pre className="overflow-auto text-sm">
                {JSON.stringify(
                  {
                    user: session.user,
                    expires: session.expires,
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          </div>

          <div className="rounded-lg border border-green-500 bg-green-50 p-4 dark:bg-green-950">
            <p className="text-sm text-green-800 dark:text-green-200">
              ✓ Middleware protection working - you are authenticated!
            </p>
          </div>

          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              <strong>User ID:</strong> {session.user.id}
            </p>
            <p>
              <strong>Email:</strong> {session.user.email}
            </p>
            <p>
              <strong>Name:</strong> {session.user.name || 'Not provided'}
            </p>
            <p>
              <strong>Role:</strong> {session.user.role}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

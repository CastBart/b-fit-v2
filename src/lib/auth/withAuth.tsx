'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, ComponentType } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Higher-Order Component (HOC) to protect pages from unauthorized access
 * Redirects to login if user is not authenticated
 *
 * @example
 * ```tsx
 * const ProtectedPage = withAuth(MyComponent)
 * export default ProtectedPage
 * ```
 */
export function withAuth<P extends object>(Component: ComponentType<P>) {
  return function ProtectedRoute(props: P) {
    const { data: session, status } = useSession()
    const router = useRouter()

    useEffect(() => {
      if (status === 'unauthenticated') {
        // Get current URL to redirect back after login
        const currentUrl = window.location.pathname + window.location.search
        const callbackUrl = encodeURIComponent(currentUrl)
        router.push(`/login?callbackUrl=${callbackUrl}`)
      }
    }, [status, router])

    // Show loading state while checking authentication
    if (status === 'loading') {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <div className="w-full max-w-md space-y-4 p-6">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <div className="space-y-2 pt-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        </div>
      )
    }

    // Don't render component until authenticated
    if (!session) {
      return null
    }

    // User is authenticated, render the component
    return <Component {...props} />
  }
}

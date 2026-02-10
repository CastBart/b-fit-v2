import { auth } from '@/lib/auth/auth.config'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth

  const isAuthRoute =
    nextUrl.pathname.startsWith('/login') || nextUrl.pathname.startsWith('/signup')
  const isProtectedRoute =
    nextUrl.pathname.startsWith('/dashboard') ||
    nextUrl.pathname.startsWith('/workouts') ||
    nextUrl.pathname.startsWith('/exercises') ||
    nextUrl.pathname.startsWith('/sessions') ||
    nextUrl.pathname.startsWith('/plans') ||
    nextUrl.pathname.startsWith('/clients') ||
    nextUrl.pathname.startsWith('/invite') ||
    nextUrl.pathname.startsWith('/settings')

  // Redirect logged-in users away from auth pages
  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL('/dashboard', nextUrl))
  }

  // Redirect non-logged-in users to login
  if (isProtectedRoute && !isLoggedIn) {
    const callbackUrl = encodeURIComponent(nextUrl.pathname + nextUrl.search)
    return NextResponse.redirect(new URL(`/login?callbackUrl=${callbackUrl}`, nextUrl))
  }

  return NextResponse.next()
})

// Matcher configuration - specify which routes to run middleware on
export const config = {
  matcher: [
    // Protected routes
    '/dashboard/:path*',
    '/workouts/:path*',
    '/exercises/:path*',
    '/sessions/:path*',
    '/plans/:path*',
    '/clients/:path*',
    '/invite/:path*',
    '/settings/:path*',
    // Auth routes (to redirect logged-in users)
    '/login',
    '/signup',
  ],
}

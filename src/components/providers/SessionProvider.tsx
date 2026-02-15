'use client'

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react'
import type { Session } from 'next-auth'
import { ReactNode } from 'react'

interface SessionProviderProps {
  children: ReactNode
  session?: Session | null
}

/**
 * Client-side SessionProvider wrapper for NextAuth
 * Accepts an optional server-side session to prevent hydration mismatches
 */
export function SessionProvider({ children, session }: SessionProviderProps) {
  return (
    <NextAuthSessionProvider session={session ?? undefined}>{children}</NextAuthSessionProvider>
  )
}

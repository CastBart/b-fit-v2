import NextAuth from 'next-auth'
import type { NextAuthConfig } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/db/prisma'
import type { UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

export const authConfig = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapter: PrismaAdapter(prisma) as any, // NextAuth v5 beta type compatibility
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
    signOut: '/login',
    error: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Missing email or password')
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email as string,
          },
        })

        if (!user || !user.password) {
          throw new Error('Invalid email or password')
        }

        const isPasswordValid = await bcrypt.compare(credentials.password as string, user.password)

        if (!isPasswordValid) {
          throw new Error('Invalid email or password')
        }

        if (!user.isActive) {
          throw new Error('Account is deactivated')
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        }
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      // NOTE: allowDangerousEmailAccountLinking is intentionally OMITTED.
      // We never auto-link by email (credentials accounts aren't email-verified).
      // Linking only happens explicitly from Settings — see the signIn callback.
    }),
  ],
  callbacks: {
    /**
     * Handles two Google modes:
     *  - Standalone (no active session): normal sign-in/sign-up. We block
     *    deactivated users for parity with the credentials provider; otherwise
     *    the adapter creates the user or surfaces OAuthAccountNotLinked.
     *  - Linking (an active session exists → user clicked "Link" in Settings):
     *    manually link the Google account to the signed-in user and abort
     *    NextAuth's own session creation by returning a redirect, so the user
     *    stays signed in as their original account.
     *
     * JWT sessions don't auto-link to a signed-in user, so we do it manually.
     */
    async signIn({ user, account, profile }) {
      if (account?.provider !== 'google') {
        return true
      }

      const activeSession = await auth()

      // ---- Linking mode (user already authenticated) ----
      if (activeSession?.user?.id) {
        const emailVerified = (profile as { email_verified?: boolean })?.email_verified
        if (!emailVerified) {
          return '/settings?link=error'
        }

        const existing = await prisma.account.findUnique({
          where: {
            provider_providerAccountId: {
              provider: 'google',
              providerAccountId: account.providerAccountId,
            },
          },
          select: { userId: true },
        })

        if (existing) {
          // Already linked to a different B-Fit account → reject (anti-hijack).
          if (existing.userId !== activeSession.user.id) {
            return '/settings?link=already_in_use'
          }
          return '/settings?link=already'
        }

        await prisma.account.create({
          data: {
            userId: activeSession.user.id,
            type: account.type,
            provider: account.provider,
            providerAccountId: account.providerAccountId,
            access_token: account.access_token,
            refresh_token: account.refresh_token,
            expires_at: account.expires_at,
            token_type: account.token_type,
            scope: account.scope,
            id_token: account.id_token,
            session_state: account.session_state as string | undefined,
          },
        })

        return '/settings?link=success'
      }

      // ---- Standalone mode: block deactivated existing users ----
      if (user.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
          select: { isActive: true },
        })
        if (dbUser && !dbUser.isActive) {
          return false
        }
      }

      return true
    },
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id
        token.role = user.role as UserRole
      }
      // On session.update() calls, refresh role from DB
      if (trigger === 'update' && token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true },
        })
        if (dbUser) {
          token.role = dbUser.role as UserRole
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as UserRole
      }
      return session
    },
  },
  events: {
    // Fires when the adapter creates a new user — effectively OAuth signups here,
    // since credentials users are created directly in the signup action.
    // NOTE: import the email helper dynamically so the Resend/react-email deps
    // stay OUT of auth.config's static graph (this module is also pulled into
    // the Edge middleware bundle, which can't include those Node-only modules).
    async createUser({ user }) {
      if (user.email) {
        const { sendWelcomeEmail } = await import('@/lib/email/welcome')
        await sendWelcomeEmail({ email: user.email, name: user.name })
      }
    },
  },
} satisfies NextAuthConfig

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)

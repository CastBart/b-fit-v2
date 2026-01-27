# B-Fit Authentication & Authorization Specification

## Authentication Strategy

### NextAuth.js Configuration

**Path**: `lib/auth/next-auth.config.ts`

```typescript
import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/db/prisma'
import bcrypt from 'bcryptjs'

export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/login',
    signOut: '/logout',
    error: '/auth/error',
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Missing credentials')
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        })

        if (!user || !user.password) {
          throw new Error('Invalid credentials')
        }

        const isValid = await bcrypt.compare(credentials.password as string, user.password)

        if (!isValid) {
          throw new Error('Invalid credentials')
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Initial sign in
      if (user) {
        token.id = user.id
        token.role = user.role
      }

      // Session update (e.g., role upgrade)
      if (trigger === 'update' && session) {
        token.role = session.role
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
})
```

---

## User Registration Flow

### Sign Up with Credentials

```typescript
// app/(auth)/signup/actions.ts
'use server'

import { hash } from 'bcryptjs'
import { prisma } from '@/lib/db/prisma'

export async function signUp(data: { email: string; password: string; name: string }) {
  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  })

  if (existingUser) {
    return { error: 'Email already registered' }
  }

  // Hash password
  const hashedPassword = await hash(data.password, 12)

  // Create user (default role: PERSONAL)
  const user = await prisma.user.create({
    data: {
      email: data.email,
      password: hashedPassword,
      name: data.name,
      role: 'PERSONAL',
    },
  })

  return { success: true, userId: user.id }
}
```

### Sign Up with Google OAuth

Flow:

1. User clicks "Sign in with Google"
2. Redirect to Google OAuth consent
3. Google redirects back with code
4. NextAuth exchanges code for tokens
5. Create/update user in database
6. Set session

---

## Protected Routes

### Middleware

**Path**: `middleware.ts`

```typescript
import { auth } from '@/lib/auth/next-auth.config'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isAuthenticated = !!req.auth

  // Public routes
  if (pathname.startsWith('/login') || pathname.startsWith('/signup')) {
    return NextResponse.next()
  }

  // Protected routes - require authentication
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/workouts')) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
  }

  // PT-only routes
  if (pathname.startsWith('/clients') || pathname.startsWith('/branding')) {
    if (req.auth?.user?.role !== 'PT' && req.auth?.user?.role !== 'ORG') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  // Org-only routes
  if (pathname.startsWith('/organisation')) {
    if (req.auth?.user?.role !== 'ORG') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
```

---

## Role-Based Access Control (RBAC)

### Permission Matrix

| Action                   | Personal | PT (Self)        | PT (Client)   | Client               | Org Admin |
| ------------------------ | -------- | ---------------- | ------------- | -------------------- | --------- |
| **Exercises**            |
| Create Exercise          | ✓        | ✓                | ✗             | ✗                    | ✗         |
| Edit Own Exercise        | ✓        | ✓                | -             | ✗                    | ✗         |
| Delete Own Exercise      | ✓        | ✓                | -             | ✗                    | ✗         |
| View Default Exercises   | ✓        | ✓                | ✓             | ✓                    | ✓         |
| **Workouts**             |
| Create Workout           | ✓        | ✓                | ✗             | ✗                    | ✗         |
| Edit Own Workout         | ✓        | ✓                | -             | ✗                    | ✗         |
| Edit Assigned Workout    | ✗        | -                | ✓             | ✗                    | ✗         |
| Delete Own Workout       | ✓        | ✓                | -             | ✗                    | ✗         |
| Assign Workout to Client | ✗        | -                | ✓             | ✗                    | ✗         |
| View Assigned Workouts   | ✓        | ✓                | ✓             | ✓ (assigned to self) | ✗         |
| **Sessions**             |
| Start Session            | ✓        | ✓                | -             | ✓                    | ✗         |
| Complete Own Session     | ✓        | ✓                | -             | ✓                    | ✗         |
| View Own Sessions        | ✓        | ✓                | -             | ✓                    | ✗         |
| View Client Sessions     | ✗        | -                | ✓ (read-only) | ✗                    | Aggregate |
| **Clients**              |
| Invite Client            | ✗        | ✓                | -             | ✗                    | Invite PT |
| Accept Invitation        | ✗        | -                | -             | ✓                    | ✗         |
| End Relationship         | ✗        | ✓                | -             | ✓                    | ✓         |
| View Client List         | ✗        | ✓                | -             | ✗                    | ✓ (all)   |
| **Analytics**            |
| View Own Analytics       | ✓        | ✓                | -             | ✓                    | ✗         |
| View Client Analytics    | ✗        | -                | ✓             | ✗                    | Aggregate |
| View Org Analytics       | ✗        | -                | -             | ✗                    | ✓         |
| **Plans**                |
| Create Plan              | ✓        | ✓                | ✗             | ✗                    | ✗         |
| Assign Plan              | ✗        | -                | ✓             | ✗                    | ✗         |
| View Assigned Plans      | ✓        | ✓                | ✓             | ✓ (assigned to self) | ✗         |
| **Branding**             |
| Update Branding          | ✗        | ✓                | -             | ✗                    | ✗         |
| View PT Branding         | ✗        | ✓                | -             | ✓ (own PT)           | ✗         |
| **Messaging**            |
| Send Message to PT       | ✗        | -                | -             | ✓                    | ✗         |
| Send Message to Client   | ✗        | -                | ✓             | ✗                    | ✗         |
| View Conversations       | ✗        | ✓ (with clients) | -             | ✓ (with PT)          | ✗         |
| **Subscription**         |
| Manage Own Subscription  | ✓        | ✓                | -             | ✗                    | ✓         |
| Upgrade to PT            | ✓        | -                | -             | ✗                    | ✗         |

---

## Permission Utility

**Path**: `lib/auth/rbac.ts`

```typescript
import { UserRole } from '@prisma/client'

export const permissions = {
  // Exercises
  'exercise:create': ['PERSONAL', 'PT'],
  'exercise:edit:own': ['PERSONAL', 'PT'],
  'exercise:delete:own': ['PERSONAL', 'PT'],

  // Workouts
  'workout:create': ['PERSONAL', 'PT'],
  'workout:edit:own': ['PERSONAL', 'PT'],
  'workout:edit:client': ['PT'],
  'workout:assign': ['PT'],

  // Sessions
  'session:start': ['PERSONAL', 'PT', 'CLIENT'],
  'session:view:own': ['PERSONAL', 'PT', 'CLIENT'],
  'session:view:client': ['PT'],

  // Clients
  'client:invite': ['PT'],
  'client:view': ['PT', 'ORG'],
  'client:manage': ['PT', 'ORG'],

  // Analytics
  'analytics:view:own': ['PERSONAL', 'PT', 'CLIENT'],
  'analytics:view:client': ['PT', 'ORG'],
  'analytics:view:aggregate': ['ORG'],

  // Branding
  'branding:edit': ['PT'],

  // Subscription
  'subscription:upgrade': ['PERSONAL'],
} as const

export function hasPermission(userRole: UserRole, permission: keyof typeof permissions): boolean {
  return permissions[permission]?.includes(userRole) ?? false
}

export function requirePermission(userRole: UserRole, permission: keyof typeof permissions) {
  if (!hasPermission(userRole, permission)) {
    throw new Error('Forbidden: Insufficient permissions')
  }
}
```

### Usage in Server Actions

```typescript
'use server'

export async function createWorkout(input: WorkoutInput) {
  const session = await auth()
  if (!session?.user) {
    return { success: false, error: 'Unauthorized' }
  }

  // Check permission
  requirePermission(session.user.role, 'workout:create')

  // Proceed with action
  // ...
}
```

---

## Data Access Control

### Workout Access

```typescript
// lib/auth/access.ts

export async function canAccessWorkout(userId: string, workoutId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      clients: true,
      trainers: true,
    },
  })

  const workout = await prisma.workout.findUnique({
    where: { id: workoutId },
    include: {
      createdBy: true,
    },
  })

  if (!workout) return false

  // Owner can access
  if (workout.createdById === userId) return true

  // PT can access client's workouts
  if (user?.role === 'PT') {
    const hasClientAccess = user.clients.some(
      (rel) => rel.clientId === workout.createdById && rel.status === 'ACTIVE'
    )
    if (hasClientAccess) return true
  }

  // Client can access assigned workouts
  if (user?.role === 'CLIENT') {
    const isPTWorkout = user.trainers.some(
      (rel) => rel.ptId === workout.createdById && rel.status === 'ACTIVE'
    )
    if (isPTWorkout && workout.createdById !== userId) return false
    if (workout.createdById === userId) return true
  }

  return false
}
```

### Session Access

```typescript
export async function canAccessSession(userId: string, sessionId: string): Promise<boolean> {
  const session = await prisma.trainingSession.findUnique({
    where: { id: sessionId },
    include: {
      user: {
        include: {
          trainers: true,
        },
      },
    },
  })

  if (!session) return false

  // Owner can access
  if (session.userId === userId) return true

  // PT can access client's sessions
  const isPT = session.user.trainers.some((rel) => rel.ptId === userId && rel.status === 'ACTIVE')

  return isPT
}
```

---

## Role Transitions

### Personal User → PT

```typescript
// features/users/actions/upgrade-to-pt.ts
'use server'

export async function upgradeToPT() {
  const session = await auth()
  if (!session?.user) {
    return { success: false, error: 'Unauthorized' }
  }

  if (session.user.role !== 'PERSONAL') {
    return { success: false, error: 'Only personal users can upgrade to PT' }
  }

  // Create Stripe checkout session
  const checkoutUrl = await createStripeCheckout({
    userId: session.user.id,
    priceId: process.env.STRIPE_PT_STARTER_PRICE_ID!,
  })

  return { success: true, data: { checkoutUrl } }
}

// Webhook handler updates user role after payment
export async function handleStripeWebhook(event: Stripe.Event) {
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    await prisma.user.update({
      where: { id: session.metadata.userId },
      data: {
        role: 'PT',
        subscriptionTier: 'PT_STARTER',
        clientCapacity: 10,
      },
    })
  }
}
```

### Client → Personal User

```typescript
// features/clients/actions/convert-to-personal.ts
'use server'

export async function convertClientToPersonal(relationshipId: string) {
  const session = await auth()
  if (!session?.user) {
    return { success: false, error: 'Unauthorized' }
  }

  const relationship = await prisma.clientRelationship.findUnique({
    where: { id: relationshipId },
    include: {
      client: true,
    },
  })

  if (!relationship) {
    return { success: false, error: 'Relationship not found' }
  }

  // Ensure requester is PT or client
  if (session.user.id !== relationship.ptId && session.user.id !== relationship.clientId) {
    return { success: false, error: 'Forbidden' }
  }

  // End relationship
  await prisma.clientRelationship.update({
    where: { id: relationshipId },
    data: {
      status: 'ENDED',
      endedAt: new Date(),
    },
  })

  // Upgrade client to personal user
  await prisma.user.update({
    where: { id: relationship.clientId },
    data: {
      role: 'PERSONAL',
    },
  })

  // Note: Client retains all assigned workout copies (owned by them)

  return { success: true }
}
```

---

## Session Management

### JWT Token Structure

```typescript
interface JWT {
  id: string // User ID
  email: string
  name: string
  role: UserRole
  iat: number // Issued at
  exp: number // Expires at
}
```

### Session Refresh

JWT auto-refreshes on each request if more than 50% of max age has passed.

### Logout

```typescript
// app/logout/page.tsx
'use client'

import { signOut } from 'next-auth/react'

export default function LogoutPage() {
  return (
    <button onClick={() => signOut({ callbackUrl: '/login' })}>
      Sign Out
    </button>
  )
}
```

---

## Security Best Practices

### Password Hashing

```typescript
import bcrypt from 'bcryptjs'

// Hash password (12 rounds)
const hashed = await bcrypt.hash(password, 12)

// Verify password
const isValid = await bcrypt.compare(inputPassword, hashedPassword)
```

### CSRF Protection

NextAuth automatically handles CSRF protection via tokens.

### Rate Limiting

```typescript
// middleware.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
})

export async function middleware(request: NextRequest) {
  const ip = request.ip ?? '127.0.0.1'
  const { success } = await ratelimit.limit(ip)

  if (!success) {
    return new Response('Rate limit exceeded', { status: 429 })
  }

  return NextResponse.next()
}
```

### SQL Injection Protection

Prisma provides automatic SQL injection protection via parameterized queries.

---

## Testing Authentication

### Mock Auth in Tests

```typescript
// lib/auth/auth.mock.ts
import { Session } from 'next-auth'

export function mockSession(overrides?: Partial<Session>): Session {
  return {
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      role: 'PERSONAL',
      ...overrides?.user,
    },
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  }
}

// Usage in tests
jest.mock('@/lib/auth/next-auth.config', () => ({
  auth: jest.fn(() => Promise.resolve(mockSession())),
}))
```

---

**Document Version**: 1.0
**Last Updated**: 2026-01-24

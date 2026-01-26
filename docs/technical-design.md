# B-Fit Technical Design Document

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       Client (Browser)                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Next.js App Router (React 18+)               │  │
│  │  ┌────────────┐  ┌──────────────┐  ┌─────────────┐  │  │
│  │  │  UI Pages  │  │ Redux Store  │  │React Query  │  │  │
│  │  │ (RSC + CC) │  │(Session State│  │(Server Data)│  │  │
│  │  └────────────┘  └──────────────┘  └─────────────┘  │  │
│  │                                                       │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │         Local Storage (Session Backup)         │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Next.js Server (Vercel)                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Server Actions (API Layer)              │  │
│  │  ┌────────┐  ┌──────────┐  ┌────────┐  ┌─────────┐  │  │
│  │  │Workouts│  │ Sessions │  │  Auth  │  │Analytics│  │  │
│  │  └────────┘  └──────────┘  └────────┘  └─────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
│                            │                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              NextAuth.js Middleware                  │  │
│  │          (JWT Sessions, RBAC Checks)                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                            │                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                 Prisma ORM Client                    │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌───────────────┐  ┌────────────────┐  ┌───────────────┐
│Vercel Postgres│  │  Vercel Blob   │  │    Stripe     │
│  (Database)   │  │ (Media Storage)│  │  (Payments)   │
└───────────────┘  └────────────────┘  └───────────────┘
```

### Monitoring & Analytics

```
┌─────────────────────────────────────────────────────────────┐
│                      External Services                       │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │    Sentry    │  │   PostHog    │  │   Vercel     │      │
│  │    (Errors)  │  │  (Analytics) │  │  (Performance)│     │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

---

## Feature-Based Folder Structure

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth route group
│   │   ├── login/
│   │   └── signup/
│   ├── (dashboard)/              # Protected routes group
│   │   ├── layout.tsx            # Dashboard layout with navigation
│   │   ├── page.tsx              # Dashboard home
│   │   ├── workouts/
│   │   │   ├── page.tsx          # Workout list
│   │   │   ├── new/
│   │   │   ├── [id]/
│   │   │   └── [id]/edit/
│   │   ├── sessions/
│   │   │   ├── page.tsx          # Session history
│   │   │   ├── [id]/             # Live session view
│   │   │   └── [id]/summary/
│   │   ├── exercises/
│   │   ├── plans/
│   │   ├── clients/              # PT only
│   │   ├── analytics/
│   │   └── settings/
│   ├── api/
│   │   ├── auth/                 # NextAuth
│   │   └── webhooks/
│   │       └── stripe/
│   ├── layout.tsx                # Root layout
│   └── globals.css
│
├── features/                     # Feature-based modules
│   ├── workouts/
│   │   ├── actions/              # Server actions
│   │   │   ├── create-workout.ts
│   │   │   ├── update-workout.ts
│   │   │   └── assign-workout.ts
│   │   ├── components/           # Feature components
│   │   │   ├── workout-builder.tsx
│   │   │   ├── workout-card.tsx
│   │   │   └── exercise-selector.tsx
│   │   ├── hooks/                # Feature hooks
│   │   │   └── use-workout.ts
│   │   ├── schemas/              # Zod validation
│   │   │   └── workout-schema.ts
│   │   ├── types/                # TypeScript types
│   │   │   └── workout.types.ts
│   │   └── utils/                # Feature utilities
│   │       └── workout-helpers.ts
│   │
│   ├── sessions/
│   │   ├── actions/
│   │   ├── components/
│   │   │   ├── session-carousel.tsx
│   │   │   ├── set-logger.tsx
│   │   │   └── exercise-navigator.tsx
│   │   ├── hooks/
│   │   │   ├── use-session-state.ts
│   │   │   └── use-local-storage-sync.ts
│   │   ├── store/                # Redux slice for session state
│   │   │   └── session-slice.ts
│   │   └── utils/
│   │       ├── session-sync.ts
│   │       └── session-storage.ts
│   │
│   ├── exercises/
│   ├── analytics/
│   ├── auth/
│   ├── clients/
│   ├── plans/
│   ├── messages/
│   ├── branding/
│   └── subscriptions/
│
├── components/                   # Shared components
│   ├── ui/                       # Shadcn UI components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   └── ...
│   ├── layout/
│   │   ├── header.tsx
│   │   ├── sidebar.tsx
│   │   └── footer.tsx
│   └── common/
│       ├── loading-spinner.tsx
│       └── error-boundary.tsx
│
├── lib/                          # Shared utilities
│   ├── db/
│   │   └── prisma.ts             # Prisma client singleton
│   ├── auth/
│   │   ├── next-auth.config.ts
│   │   └── rbac.ts               # Role-based access control
│   ├── stripe/
│   │   └── stripe-client.ts
│   ├── utils/
│   │   ├── cn.ts                 # Class name utility
│   │   └── date.ts
│   └── constants.ts
│
├── store/                        # Redux store setup
│   ├── index.ts                  # Store configuration
│   └── provider.tsx              # Redux provider
│
├── hooks/                        # Shared hooks
│   ├── use-user.ts
│   └── use-media-query.ts
│
├── types/                        # Shared types
│   ├── database.types.ts
│   └── api.types.ts
│
└── middleware.ts                 # Next.js middleware (auth)
```

---

## State Management Strategy

### State Distribution

```
┌─────────────────────────────────────────────────────────────┐
│                      Application State                       │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Server State (React Query)                           │  │
│  │  - Workouts, exercises, sessions                       │  │
│  │  - User profile, clients                               │  │
│  │  - Analytics data                                       │  │
│  │  - Plans, messages                                      │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Client State (Redux Toolkit)                         │  │
│  │  - Active session state (live workout)                 │  │
│  │  - UI state (modals, drawers)                          │  │
│  │  - Form state (workout builder)                        │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Local Storage                                         │  │
│  │  - Session backup (for refresh recovery)               │  │
│  │  - User preferences (theme, units)                     │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  URL State (Next.js Router)                           │  │
│  │  - Filters, pagination                                  │  │
│  │  - Current exercise in session                         │  │
│  └────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### React Query vs Redux Decision Matrix

| Data Type | Tool | Reasoning |
|-----------|------|-----------|
| Workouts list | React Query | Server data, caching, refetching |
| Session history | React Query | Server data, rarely changes |
| User profile | React Query | Server data, infrequent updates |
| Active session sets | Redux | Frequent updates, optimistic UI |
| Workout builder state | Redux | Complex form state, undo/redo |
| Modal visibility | Redux | UI state, cross-component |
| Exercise filters | URL State | Shareable, bookmarkable |

---

## API Layer: Server Actions

### Server Action Pattern

```typescript
// features/workouts/actions/create-workout.ts
'use server'

import { auth } from '@/lib/auth/next-auth.config'
import { prisma } from '@/lib/db/prisma'
import { createWorkoutSchema } from '../schemas/workout-schema'
import { revalidatePath } from 'next/cache'

export async function createWorkout(formData: FormData) {
  // 1. Authenticate
  const session = await auth()
  if (!session?.user) {
    return { error: 'Unauthorized' }
  }

  // 2. Validate input
  const rawData = {
    name: formData.get('name'),
    description: formData.get('description'),
    exercises: JSON.parse(formData.get('exercises') as string)
  }

  const parsed = createWorkoutSchema.safeParse(rawData)
  if (!parsed.success) {
    return { error: 'Invalid input', details: parsed.error }
  }

  // 3. Authorize (RBAC check)
  if (session.user.role === 'CLIENT') {
    return { error: 'Clients cannot create workouts' }
  }

  // 4. Execute business logic
  try {
    const workout = await prisma.workout.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description,
        createdById: session.user.id,
        exercises: {
          create: parsed.data.exercises.map((ex, index) => ({
            exerciseId: ex.exerciseId,
            order: index,
            groupId: ex.groupId,
            sets: ex.sets,
            reps: ex.reps,
            weight: ex.weight,
            restSeconds: ex.restSeconds
          }))
        }
      },
      include: {
        exercises: {
          include: {
            exercise: true
          }
        }
      }
    })

    // 5. Revalidate cache
    revalidatePath('/workouts')

    return { success: true, data: workout }
  } catch (error) {
    console.error('Failed to create workout:', error)
    return { error: 'Failed to create workout' }
  }
}
```

---

## Session State Sync Strategy

### Architecture

```
Live Session Flow:

User completes set
     │
     ▼
┌──────────────────────────────────┐
│  Optimistic UI Update (Redux)   │
│  - Immediate visual feedback     │
│  - Mark set as completed         │
└────────────┬─────────────────────┘
             │
             ├─────────────────────────────────┐
             │                                 │
             ▼                                 ▼
┌──────────────────────┐         ┌─────────────────────────┐
│  Local Storage       │         │  Queue DB Write         │
│  - Save full state   │         │  - Debounced (500ms)    │
│  - Timestamp update  │         │  - Batched updates      │
└──────────────────────┘         └────────┬────────────────┘
                                          │
                                          ▼
                              ┌────────────────────────────┐
                              │  Server Action             │
                              │  - updateSessionSet()      │
                              │  - Idempotent by setId     │
                              └────────┬───────────────────┘
                                       │
                                       ▼
                              ┌────────────────────────────┐
                              │  Database                  │
                              │  - Persist set completion  │
                              └────────────────────────────┘
```

### Recovery on Refresh

```typescript
// features/sessions/hooks/use-session-state.ts
export function useSessionState(sessionId: string) {
  const dispatch = useDispatch()

  useEffect(() => {
    // 1. Load from database
    const dbState = await getSessionById(sessionId)

    // 2. Load from localStorage
    const localState = localStorage.getItem(`session-${sessionId}`)
    const localParsed = localState ? JSON.parse(localState) : null

    // 3. Compare timestamps, use newer state
    const dbTimestamp = new Date(dbState.updatedAt).getTime()
    const localTimestamp = localParsed?.timestamp || 0

    if (localTimestamp > dbTimestamp) {
      // Local is newer, use local and sync to DB
      dispatch(loadSession(localParsed.data))
      await syncSessionState(sessionId, localParsed.data)
    } else {
      // DB is newer, use DB
      dispatch(loadSession(dbState))
    }
  }, [sessionId])
}
```

---

## Performance Optimization

### Target Metrics
- **Page Load**: <2s (p95)
- **Session UI Update**: <100ms
- **API Response**: <500ms (p95)

### Strategies

#### 1. Code Splitting
```typescript
// Lazy load heavy components
const SessionCarousel = dynamic(
  () => import('@/features/sessions/components/session-carousel'),
  { loading: () => <SessionSkeleton /> }
)
```

#### 2. Database Optimization
```prisma
// Add indexes for common queries
model Session {
  id String @id
  userId String
  status SessionStatus
  createdAt DateTime

  @@index([userId, status])
  @@index([createdAt])
}
```

#### 3. Optimistic Updates
```typescript
// Immediate UI feedback before server confirmation
const completeSet = useMutation({
  mutationFn: updateSessionSet,
  onMutate: async (newSet) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries(['session', sessionId])

    // Snapshot previous value
    const previous = queryClient.getQueryData(['session', sessionId])

    // Optimistically update
    queryClient.setQueryData(['session', sessionId], (old) => {
      return {
        ...old,
        sets: [...old.sets, newSet]
      }
    })

    return { previous }
  },
  onError: (err, newSet, context) => {
    // Rollback on error
    queryClient.setQueryData(['session', sessionId], context.previous)
  }
})
```

#### 4. React Server Components
```typescript
// app/(dashboard)/workouts/page.tsx
// Server Component - no JS shipped to client
export default async function WorkoutsPage() {
  const workouts = await getWorkouts() // Server-side data fetch

  return (
    <div>
      <WorkoutList workouts={workouts} /> {/* Client Component */}
    </div>
  )
}
```

---

## Security Considerations

### 1. Role-Based Access Control (RBAC)

```typescript
// lib/auth/rbac.ts
export const permissions = {
  'workout:create': ['PERSONAL', 'PT'],
  'workout:assign': ['PT'],
  'session:start': ['PERSONAL', 'PT', 'CLIENT'],
  'client:view': ['PT', 'ORG'],
  'analytics:view_client': ['PT', 'ORG']
}

export function hasPermission(
  userRole: UserRole,
  permission: string
): boolean {
  return permissions[permission]?.includes(userRole) ?? false
}
```

### 2. Data Isolation

```typescript
// Ensure users can only access their own data
export async function getWorkout(id: string) {
  const session = await auth()

  const workout = await prisma.workout.findFirst({
    where: {
      id,
      OR: [
        { createdById: session.user.id },
        {
          // PTs can access client workouts
          createdBy: {
            clients: {
              some: { ptId: session.user.id }
            }
          }
        }
      ]
    }
  })

  if (!workout) {
    throw new Error('Workout not found or access denied')
  }

  return workout
}
```

### 3. Input Validation

```typescript
// All server actions use Zod schemas
import { z } from 'zod'

export const createWorkoutSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  exercises: z.array(
    z.object({
      exerciseId: z.string().uuid(),
      sets: z.number().int().min(1).max(20),
      reps: z.number().int().min(1).max(100),
      weight: z.number().min(0).optional(),
      groupId: z.string().optional()
    })
  ).min(1)
})
```

### 4. Rate Limiting

```typescript
// middleware.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s')
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

---

## Error Handling

### Error Boundary Strategy

```typescript
// components/common/error-boundary.tsx
'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

export function ErrorBoundary({
  error,
  reset
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="error-container">
      <h2>Something went wrong</h2>
      <button onClick={reset}>Try again</button>
    </div>
  )
}
```

### Server Action Error Pattern

```typescript
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; details?: unknown }

// Consistent return type for all server actions
export async function createWorkout(
  input: unknown
): Promise<ActionResult<Workout>> {
  try {
    // ... implementation
    return { success: true, data: workout }
  } catch (error) {
    Sentry.captureException(error)
    return {
      success: false,
      error: 'Failed to create workout'
    }
  }
}
```

---

## Testing Strategy Integration

### Testing Pyramid

```
         ▲
        / \
       /E2E\          10% - Playwright
      /─────\
     /  INT  \        20% - Vitest + Testing Library
    /─────────\
   /   UNIT    \      70% - Vitest
  /_____________\
```

### Component Testing Pattern

```typescript
// features/workouts/components/workout-card.test.tsx
import { render, screen } from '@testing-library/react'
import { WorkoutCard } from './workout-card'

describe('WorkoutCard', () => {
  it('displays workout name and exercise count', () => {
    const workout = {
      id: '1',
      name: 'Push Day',
      exercises: [{}, {}, {}]
    }

    render(<WorkoutCard workout={workout} />)

    expect(screen.getByText('Push Day')).toBeInTheDocument()
    expect(screen.getByText('3 exercises')).toBeInTheDocument()
  })
})
```

---

## Deployment Architecture

```
GitHub Repository
       │
       │ (push to main)
       ▼
GitHub Actions CI
  │   ├─ Lint
  │   ├─ Type check
  │   ├─ Unit tests
  │   └─ Build
  │
  │ (if all pass)
  ▼
Vercel Deployment
  │   ├─ Build Next.js app
  │   ├─ Run Prisma migrations
  │   ├─ Deploy to edge
  │   └─ Invalidate cache
  │
  ▼
Production Live
  │
  ├─ Vercel Edge Network
  ├─ Vercel Postgres (Primary)
  ├─ Vercel Blob Storage
  └─ Monitoring (Sentry, PostHog)
```

---

**Document Version**: 1.0
**Last Updated**: 2026-01-24

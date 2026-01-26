# B-Fit Testing Strategy

## Testing Philosophy

B-Fit follows a testing pyramid approach with emphasis on fast, reliable tests that provide confidence in deployments.

```
         ▲
        / \
       /E2E\ ←───── 10% (Critical user flows)
      /─────\
     /  INT  \ ←──── 20% (Feature integration)
    /─────────\
   /   UNIT    \ ←── 70% (Business logic, utilities)
  /_____________\
```

---

## Test Stack

### Unit & Integration Testing
- **Framework**: Vitest
- **React Testing**: React Testing Library
- **Mocking**: vi.mock(), MSW (Mock Service Worker)
- **Coverage**: Istanbul (built into Vitest)

### E2E Testing
- **Framework**: Playwright
- **Browsers**: Chromium, Firefox, WebKit
- **Parallel**: Yes

### Additional Tools
- **Type Checking**: TypeScript strict mode
- **Linting**: ESLint with strict rules
- **Code Quality**: Prettier, Husky pre-commit hooks

---

## Coverage Goals

| Category | Minimum Coverage | Target Coverage |
|----------|-----------------|----------------|
| Overall | 80% | 85% |
| Business Logic (actions, calculations) | 95% | 100% |
| UI Components | 60% | 70% |
| Utilities | 90% | 95% |
| API Routes/Actions | 85% | 90% |

---

## Unit Testing

### Server Actions

**Pattern**: Test business logic with mocked database

```typescript
// features/workouts/actions/create-workout.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createWorkout } from './create-workout'
import { prismaMock } from '@/lib/db/prisma.mock'
import { mockSession } from '@/lib/auth/auth.mock'

// Mock auth
vi.mock('@/lib/auth/next-auth.config', () => ({
  auth: vi.fn(() => Promise.resolve(mockSession({ role: 'PERSONAL' })))
}))

describe('createWorkout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a workout with exercises', async () => {
    const mockWorkout = {
      id: 'workout-1',
      name: 'Push Day',
      exercises: [
        {
          id: 'we-1',
          exerciseId: 'ex-1',
          sets: 3,
          reps: 10,
          order: 0
        }
      ]
    }

    prismaMock.workout.create.mockResolvedValue(mockWorkout)

    const result = await createWorkout({
      name: 'Push Day',
      exercises: [
        {
          exerciseId: 'ex-1',
          sets: 3,
          reps: 10,
          order: 0
        }
      ]
    })

    expect(result.success).toBe(true)
    expect(result.data.name).toBe('Push Day')
    expect(prismaMock.workout.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Push Day'
        })
      })
    )
  })

  it('rejects workout with no exercises', async () => {
    const result = await createWorkout({
      name: 'Empty Workout',
      exercises: []
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('Invalid input')
  })

  it('rejects unauthorized users', async () => {
    vi.mocked(auth).mockResolvedValueOnce(null)

    const result = await createWorkout({
      name: 'Test',
      exercises: [{ exerciseId: 'ex-1', sets: 3, reps: 10, order: 0 }]
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Unauthorized')
  })

  it('enforces role-based permissions', async () => {
    vi.mocked(auth).mockResolvedValueOnce(
      mockSession({ role: 'CLIENT' })
    )

    const result = await createWorkout({
      name: 'Test',
      exercises: [{ exerciseId: 'ex-1', sets: 3, reps: 10, order: 0 }]
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('Forbidden')
  })
})
```

---

### Utility Functions

```typescript
// features/analytics/utils/volume-calculator.test.ts
import { describe, it, expect } from 'vitest'
import { calculateVolume } from './volume-calculator'

describe('calculateVolume', () => {
  it('calculates total volume correctly', () => {
    const sets = [
      { weight: 100, reps: 10 },
      { weight: 100, reps: 8 },
      { weight: 100, reps: 6 }
    ]

    const volume = calculateVolume(sets)

    expect(volume).toBe(2400) // 100*10 + 100*8 + 100*6
  })

  it('handles missing weight', () => {
    const sets = [
      { weight: null, reps: 10 },
      { weight: 100, reps: 10 }
    ]

    const volume = calculateVolume(sets)

    expect(volume).toBe(1000) // Only counts sets with weight
  })

  it('returns 0 for empty sets', () => {
    expect(calculateVolume([])).toBe(0)
  })
})
```

---

### Prisma Mock Setup

```typescript
// lib/db/prisma.mock.ts
import { PrismaClient } from '@prisma/client'
import { mockDeep, mockReset, DeepMockProxy } from 'vitest-mock-extended'

export const prismaMock = mockDeep<PrismaClient>()

beforeEach(() => {
  mockReset(prismaMock)
})
```

---

## Component Testing

### Component with User Interactions

```typescript
// features/workouts/components/workout-card.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WorkoutCard } from './workout-card'

describe('WorkoutCard', () => {
  const mockWorkout = {
    id: '1',
    name: 'Push Day',
    exercises: [
      { id: '1', exercise: { name: 'Bench Press' } },
      { id: '2', exercise: { name: 'Shoulder Press' } }
    ]
  }

  it('renders workout name', () => {
    render(<WorkoutCard workout={mockWorkout} />)

    expect(screen.getByText('Push Day')).toBeInTheDocument()
  })

  it('displays exercise count', () => {
    render(<WorkoutCard workout={mockWorkout} />)

    expect(screen.getByText('2 exercises')).toBeInTheDocument()
  })

  it('calls onStart when start button clicked', () => {
    const onStart = vi.fn()

    render(<WorkoutCard workout={mockWorkout} onStart={onStart} />)

    const startButton = screen.getByRole('button', { name: /start/i })
    fireEvent.click(startButton)

    expect(onStart).toHaveBeenCalledWith(mockWorkout.id)
  })

  it('shows edit and delete buttons for owner', () => {
    render(
      <WorkoutCard
        workout={mockWorkout}
        isOwner={true}
      />
    )

    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
  })

  it('hides edit and delete buttons for non-owner', () => {
    render(
      <WorkoutCard
        workout={mockWorkout}
        isOwner={false}
      />
    )

    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
  })
})
```

---

### Component with Data Fetching

```typescript
// features/sessions/components/session-history.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SessionHistory } from './session-history'

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false }
    }
  })

  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('SessionHistory', () => {
  it('displays loading state', () => {
    render(<SessionHistory />, { wrapper: createWrapper() })

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('displays sessions when loaded', async () => {
    const mockSessions = [
      { id: '1', workout: { name: 'Push Day' }, completedAt: '2024-01-01' },
      { id: '2', workout: { name: 'Pull Day' }, completedAt: '2024-01-02' }
    ]

    // Mock server action
    vi.mock('../actions/get-sessions', () => ({
      getSessions: vi.fn(() => Promise.resolve({ success: true, data: mockSessions }))
    }))

    render(<SessionHistory />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Push Day')).toBeInTheDocument()
      expect(screen.getByText('Pull Day')).toBeInTheDocument()
    })
  })

  it('displays error state on failure', async () => {
    vi.mock('../actions/get-sessions', () => ({
      getSessions: vi.fn(() => Promise.reject(new Error('Failed to load')))
    }))

    render(<SessionHistory />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument()
    })
  })
})
```

---

## Integration Testing

### Feature Flow Tests

```typescript
// features/sessions/session-flow.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SessionPage } from '@/app/(dashboard)/sessions/[id]/page'

describe('Session Flow', () => {
  it('completes full session flow', async () => {
    const { container } = render(<SessionPage params={{ id: 'session-1' }} />)

    // Wait for session to load
    await waitFor(() => {
      expect(screen.getByText(/bench press/i)).toBeInTheDocument()
    })

    // Log first set
    const weightInput = screen.getByPlaceholderText(/weight/i)
    const repsInput = screen.getByPlaceholderText(/reps/i)
    const completeButton = screen.getByRole('button', { name: /complete set/i })

    fireEvent.change(weightInput, { target: { value: '100' } })
    fireEvent.change(repsInput, { target: { value: '10' } })
    fireEvent.click(completeButton)

    // Verify set logged
    await waitFor(() => {
      expect(screen.getByText('100kg × 10')).toBeInTheDocument()
    })

    // Navigate to next exercise
    const nextButton = screen.getByRole('button', { name: /next/i })
    fireEvent.click(nextButton)

    // Verify next exercise displayed
    await waitFor(() => {
      expect(screen.getByText(/shoulder press/i)).toBeInTheDocument()
    })
  })
})
```

---

## E2E Testing (Playwright)

### Setup

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

---

### Critical User Flows

#### 1. Complete Workout Session

```typescript
// tests/e2e/session.spec.ts
import { test, expect } from '@playwright/test'

test('user can complete a workout session', async ({ page }) => {
  // Login
  await page.goto('/login')
  await page.fill('input[name="email"]', 'test@example.com')
  await page.fill('input[name="password"]', 'password123')
  await page.click('button[type="submit"]')

  // Navigate to workout
  await page.goto('/workouts')
  await page.click('text=Push Day')

  // Start session
  await page.click('text=Start Workout')

  // Wait for session to load
  await expect(page.locator('text=Bench Press')).toBeVisible()

  // Log first set
  await page.fill('input[placeholder*="Weight"]', '100')
  await page.fill('input[placeholder*="Reps"]', '10')
  await page.click('button:has-text("Complete Set")')

  // Verify set logged
  await expect(page.locator('text=100kg × 10')).toBeVisible()

  // Complete remaining sets...
  for (let i = 0; i < 2; i++) {
    await page.fill('input[placeholder*="Weight"]', '100')
    await page.fill('input[placeholder*="Reps"]', '10')
    await page.click('button:has-text("Complete Set")')
  }

  // Move to next exercise
  await page.click('button[aria-label="Next exercise"]')

  // Complete session
  await page.click('text=Finish Workout')
  await page.click('button:has-text("Confirm")')

  // Verify summary page
  await expect(page.locator('text=Workout Complete')).toBeVisible()
  await expect(page.locator('text=Total Volume')).toBeVisible()
})
```

#### 2. PT Assigns Workout to Client

```typescript
// tests/e2e/pt-client-workflow.spec.ts
import { test, expect } from '@playwright/test'

test('PT can assign workout to client', async ({ page }) => {
  // Login as PT
  await page.goto('/login')
  await page.fill('input[name="email"]', 'pt@example.com')
  await page.fill('input[name="password"]', 'password123')
  await page.click('button[type="submit"]')

  // Go to workout
  await page.goto('/workouts')
  await page.click('text=Full Body Program')

  // Assign to client
  await page.click('text=Assign to Client')

  // Select client
  await page.click('text=John Doe')

  // Customize (optional)
  await page.fill('input[aria-label="Sets for Squats"]', '5')

  // Confirm assignment
  await page.click('button:has-text("Assign Workout")')

  // Verify success
  await expect(page.locator('text=Workout assigned successfully')).toBeVisible()

  // Verify in client profile
  await page.goto('/clients')
  await page.click('text=John Doe')
  await expect(page.locator('text=Full Body Program')).toBeVisible()
})
```

#### 3. Subscription Upgrade Flow

```typescript
// tests/e2e/subscription.spec.ts
import { test, expect } from '@playwright/test'

test('user can upgrade to PT subscription', async ({ page }) => {
  // Login as personal user
  await page.goto('/login')
  await page.fill('input[name="email"]', 'personal@example.com')
  await page.fill('input[name="password"]', 'password123')
  await page.click('button[type="submit"]')

  // Navigate to pricing
  await page.goto('/pricing')

  // Select PT Starter
  await page.click('button:has-text("Upgrade to PT Starter")')

  // Fill Stripe checkout (test mode)
  await page.waitForURL(/checkout.stripe.com/)
  await page.fill('input[name="email"]', 'personal@example.com')
  await page.fill('input[name="cardNumber"]', '4242 4242 4242 4242')
  await page.fill('input[name="cardExpiry"]', '12/34')
  await page.fill('input[name="cardCvc"]', '123')
  await page.fill('input[name="billingName"]', 'Test User')

  await page.click('button:has-text("Subscribe")')

  // Wait for redirect
  await page.waitForURL(/dashboard/)

  // Verify upgrade success
  await expect(page.locator('text=Welcome to B-Fit PT')).toBeVisible()

  // Verify PT features unlocked
  await expect(page.locator('text=Invite Client')).toBeVisible()
})
```

---

## Test Data Management

### Test Database

```typescript
// lib/db/test-db.ts
import { PrismaClient } from '@prisma/client'

export const testDb = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL
    }
  }
})

export async function resetTestDatabase() {
  await testDb.$transaction([
    testDb.sessionSet.deleteMany(),
    testDb.trainingSession.deleteMany(),
    testDb.workoutExercise.deleteMany(),
    testDb.workout.deleteMany(),
    testDb.exercise.deleteMany(),
    testDb.clientRelationship.deleteMany(),
    testDb.user.deleteMany(),
  ])
}
```

### Factory Functions

```typescript
// lib/test/factories.ts
import { faker } from '@faker-js/faker'

export function createUser(overrides?: Partial<User>): User {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    name: faker.person.fullName(),
    role: 'PERSONAL',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }
}

export function createWorkout(overrides?: Partial<Workout>): Workout {
  return {
    id: faker.string.uuid(),
    name: faker.word.words(2),
    description: faker.lorem.sentence(),
    createdById: faker.string.uuid(),
    isTemplate: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }
}

// Usage in tests
const user = createUser({ role: 'PT' })
const workout = createWorkout({ createdById: user.id })
```

---

## Running Tests

### Commands

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:all": "npm run test && npm run test:e2e"
  }
}
```

### CI Pipeline

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm run test:coverage

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
```

---

**Document Version**: 1.0
**Last Updated**: 2026-01-24

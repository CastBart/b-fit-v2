# B-Fit Infrastructure & DevOps Documentation

## Overview

B-Fit is deployed on Vercel with a fully automated CI/CD pipeline, comprehensive monitoring, and multi-environment setup.

---

## Environments

### Local Development

**URL**: http://localhost:3000

**Database**: Vercel Postgres development instance or Docker Postgres

**Setup**:

```bash
# Clone repository
git clone https://github.com/your-org/b-fit.git
cd b-fit

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local

# Run database migrations
npx prisma migrate dev

# Seed database
npx prisma db seed

# Start development server
npm run dev
```

**Environment Variables** (.env.local):

```bash
# Database
DATABASE_URL="postgres://..."

# Auth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# OAuth
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# Stripe (test mode)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Vercel Blob (development)
BLOB_READ_WRITE_TOKEN="..."

# Monitoring (optional in dev)
SENTRY_DSN="..."
NEXT_PUBLIC_POSTHOG_KEY="..."
```

---

### Preview (Staging)

**URL**: https://b-fit-preview-\*.vercel.app

**Trigger**: Every pull request

**Purpose**:

- Test changes in production-like environment
- QA and review before merge
- Automated E2E tests run against preview

**Database**: Isolated Vercel Postgres preview instance

**Features**:

- Automatic deployment on PR
- Unique URL per PR
- Synced environment variables
- Preview comments in PR

---

### Staging

**URL**: https://staging.bfit.app

**Branch**: `staging`

**Purpose**:

- Pre-production testing
- Final validation before production
- User acceptance testing (UAT)

**Database**: Staging Vercel Postgres (separate from production)

**Deployment**: Automatic on push to `staging` branch

---

### Production

**URL**: https://app.bfit.com

**Branch**: `main`

**Database**: Production Vercel Postgres

**Deployment**: Automatic on merge to `main`

**Protection**:

- Branch protection rules
- Require review approvals
- Status checks must pass
- No force pushes

---

## Deployment Architecture

```
┌────────────────────────────────────────────────────────┐
│                     GitHub Repository                   │
│                                                          │
│  main ─────────────────────────────┬─────► Production │
│                                     │                    │
│  staging ───────────────────────────┼─────► Staging    │
│                                     │                    │
│  feature/* ─────────────────────────┴─────► Preview    │
│                                                          │
└──────────────────┬─────────────────────────────────────┘
                   │
                   │ (webhook)
                   ▼
┌────────────────────────────────────────────────────────┐
│                    GitHub Actions                       │
│                                                          │
│  1. Lint & Type Check                                  │
│  2. Unit Tests                                          │
│  3. Build Next.js App                                   │
│  4. Deploy to Vercel                                    │
│  5. E2E Tests (on preview)                             │
│                                                          │
└──────────────────┬─────────────────────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────────────────┐
│                     Vercel Platform                     │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │         Next.js Edge Functions                   │  │
│  │         (Server Components, API Routes)          │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │         CDN (Static Assets, Images)              │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
└────────────────────────────────────────────────────────┘
                   │
        ┌──────────┼──────────┐
        │          │          │
        ▼          ▼          ▼
   ┌─────────┐ ┌──────┐ ┌────────┐
   │Postgres │ │ Blob │ │ Stripe │
   │         │ │      │ │        │
   └─────────┘ └──────┘ └────────┘
```

---

## CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
name: CI/CD

on:
  push:
    branches: [main, staging]
  pull_request:
    branches: [main, staging]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Format check
        run: npm run format:check

  type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npm run type-check

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm run test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json

  build:
    runs-on: ubuntu-latest
    needs: [lint, type-check, test]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          NEXTAUTH_SECRET: ${{ secrets.NEXTAUTH_SECRET }}

  e2e:
    runs-on: ubuntu-latest
    needs: build
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          BASE_URL: ${{ steps.vercel.outputs.preview-url }}

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Database Management

### Migrations

**Development**:

```bash
# Create new migration
npx prisma migrate dev --name add_user_preferences

# Reset database (warning: data loss)
npx prisma migrate reset
```

**Production**:

```bash
# Apply migrations (run automatically in build)
npx prisma migrate deploy
```

### Seeding

**Development**:

```bash
# Seed database
npx prisma db seed
```

**Seed Script** (prisma/seed.ts):

```typescript
import { PrismaClient } from '@prisma/client'
import { exerciseSeedData } from './seeds/exercises'

const prisma = new PrismaClient()

async function main() {
  // Seed default exercises
  await prisma.exercise.createMany({
    data: exerciseSeedData,
    skipDuplicates: true,
  })

  console.log('Database seeded successfully')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

### Backups

**Vercel Postgres Backups**:

- Automatic daily backups
- Point-in-time recovery (14 days)
- Manual backup via Vercel CLI

```bash
# Create manual backup
vercel postgres backup create

# List backups
vercel postgres backup list

# Restore from backup
vercel postgres backup restore <backup-id>
```

---

## Monitoring & Observability

### Error Tracking (Sentry)

**Setup**:

```typescript
// sentry.server.config.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.VERCEL_ENV || 'development',
  tracesSampleRate: 1.0,
  beforeSend(event) {
    // Filter sensitive data
    if (event.request?.headers) {
      delete event.request.headers['authorization']
      delete event.request.headers['cookie']
    }
    return event
  },
})
```

**Alerts**:

- New error occurrence
- Error frequency spike
- Performance degradation

---

### Performance Monitoring (Vercel Analytics)

**Metrics Tracked**:

- Core Web Vitals (LCP, FID, CLS)
- Time to First Byte (TTFB)
- Function execution time
- Edge function invocations

**Thresholds**:

- LCP: <2.5s (good), <4s (needs improvement)
- FID: <100ms (good), <300ms (needs improvement)
- CLS: <0.1 (good), <0.25 (needs improvement)

---

### Product Analytics (PostHog)

**Setup**:

```typescript
// lib/analytics/posthog.ts
import posthog from 'posthog-js'

if (typeof window !== 'undefined') {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: 'https://app.posthog.com',
    capture_pageview: false, // We'll handle manually
    autocapture: false, // Prefer explicit tracking
  })
}

export { posthog }
```

**Events Tracked**:

- User signup
- Workout created
- Session started
- Session completed
- Workout assigned (PT)
- Subscription upgrade
- Client invited

**Example**:

```typescript
posthog.capture('workout_created', {
  workout_id: workoutId,
  exercise_count: exercises.length,
  has_supersets: exercises.some((e) => e.groupId),
})
```

---

### Uptime Monitoring

**Vercel Monitors**:

- Endpoint: https://app.bfit.com/api/health
- Frequency: 1 minute
- Regions: Global

**Health Check Endpoint**:

```typescript
// app/api/health/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export async function GET() {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'ok',
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error.message,
      },
      { status: 503 }
    )
  }
}
```

---

## Security

### Environment Variables

**Vercel Environment Variables**:

- Production: Encrypted at rest
- Preview: Isolated per deployment
- Development: Local .env.local

**Rotation Policy**:

- Rotate secrets every 90 days
- Immediate rotation on suspected compromise

---

### HTTPS & SSL

- Automatic HTTPS on all Vercel deployments
- SSL certificates auto-renewed
- HSTS headers enabled

---

### Rate Limiting

**Upstash Rate Limiting**:

```typescript
// middleware.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
  analytics: true,
})

export async function middleware(request: NextRequest) {
  const ip = request.ip ?? '127.0.0.1'
  const { success, limit, reset, remaining } = await ratelimit.limit(ip)

  if (!success) {
    return new Response('Rate limit exceeded', {
      status: 429,
      headers: {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': reset.toString(),
      },
    })
  }

  return NextResponse.next()
}
```

---

## Disaster Recovery

### Backup Strategy

**Database**:

- Daily automated backups
- 14-day retention
- Point-in-time recovery

**Code**:

- Git repository (GitHub)
- Vercel deployment history

**Media**:

- Vercel Blob redundancy
- No additional backup needed

---

### Incident Response Plan

1. **Detection**: Alert via Sentry, Vercel, or user report
2. **Assessment**: Determine severity and impact
3. **Communication**: Update status page, notify users if needed
4. **Resolution**: Deploy fix or rollback
5. **Post-mortem**: Document incident and prevention measures

---

### Rollback Procedure

**Vercel Instant Rollback**:

```bash
# List deployments
vercel ls

# Rollback to previous deployment
vercel rollback <deployment-url>
```

**Database Rollback**:

```bash
# Revert migration
npx prisma migrate resolve --rolled-back <migration-name>

# Apply corrective migration
npx prisma migrate dev --name fix_issue
```

---

## Performance Optimization

### Caching Strategy

**ISR (Incremental Static Regeneration)**:

```typescript
// app/workouts/page.tsx
export const revalidate = 60 // Revalidate every 60 seconds

export default async function WorkoutsPage() {
  const workouts = await getWorkouts()
  return <WorkoutList workouts={workouts} />
}
```

**React Query Caching**:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
  },
})
```

---

### Image Optimization

**Next.js Image Component**:

```tsx
import Image from 'next/image'
;<Image
  src={exercise.imageUrl}
  alt={exercise.name}
  width={400}
  height={300}
  placeholder="blur"
  loading="lazy"
/>
```

**Vercel Image Optimization**:

- Automatic WebP conversion
- Responsive sizes
- Edge caching

---

### Bundle Optimization

**Code Splitting**:

```typescript
import dynamic from 'next/dynamic'

const SessionCarousel = dynamic(
  () => import('@/features/sessions/components/session-carousel'),
  { ssr: false, loading: () => <Skeleton /> }
)
```

**Tree Shaking**:

- ES modules import (not `require`)
- Unused exports eliminated
- `sideEffects: false` in package.json

---

## Cost Optimization

### Vercel Pricing Estimate

**Expected Monthly Costs** (1000 users):

- Vercel Pro: $20/month
- Vercel Postgres: ~$50/month (1GB storage)
- Vercel Blob: ~$10/month (10GB storage, 100GB bandwidth)
- **Total**: ~$80/month

**At Scale** (10,000 users):

- Vercel Pro: $20/month
- Vercel Postgres: ~$200/month (10GB storage)
- Vercel Blob: ~$50/month (50GB storage, 500GB bandwidth)
- **Total**: ~$270/month

### Development Environment Costs

**Local Development**:

- Vercel Postgres: Free tier includes 256MB storage, 60 compute hours/month
- Local Docker alternative: Free (but requires setup)
- Cost during development: **$0/month** (within free tier limits)

**Preview Deployments** (Per PR):

- Vercel Pro free preview deployments (unlimited)
- Isolated database instances share dev environment
- Cost per preview: **$0** (included in Pro plan during development)

**Testing Environments**:

- Staging database: Vercel Postgres starter (~$20-50/month depending on usage)
- Shared across team during development
- Estimated cost: **$20-50/month**

**Development Database**:

- Vercel Postgres development instance
- Typically under 1GB during development
- Estimated cost: **Included in free tier or ~$0-20/month**

**Total Estimated Development Costs**: $20-70/month

- Primarily for staging/testing database
- Production infrastructure costs listed above kick in only after launch

---

### Cost Monitoring

**Vercel Usage Dashboard**:

- Function execution time
- Bandwidth usage
- Database storage and queries
- Blob storage and bandwidth

**Alerts**:

- 80% of plan limits
- Unexpected usage spikes

---

## Scaling Strategy

### Horizontal Scaling

**Auto-scaling**:

- Vercel automatically scales serverless functions
- No manual intervention required
- Pay-per-use pricing

---

### Database Scaling

**Read Replicas** (when needed):

- Vercel Postgres supports read replicas
- Route read queries to replicas
- Write queries to primary

**Connection Pooling**:

```typescript
// lib/db/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

---

**Document Version**: 1.0
**Last Updated**: 2026-01-24

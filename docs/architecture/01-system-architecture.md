# B-Fit System Architecture

## Overview

This document provides a high-level overview of the B-Fit system architecture, showing the relationships between all major components including the frontend, backend services, database, and external integrations.

## System Architecture Diagram

```mermaid
flowchart TB
    subgraph Client["Client (Browser/PWA)"]
        direction TB
        UI["Next.js App Router<br/>(React 18+ RSC + Client Components)"]
        Redux["Redux Toolkit<br/>(Session State)"]
        RQ["React Query<br/>(Server State Cache)"]
        LS["LocalStorage<br/>(Session Backup)"]

        UI --> Redux
        UI --> RQ
        Redux <--> LS
    end

    subgraph Vercel["Vercel Platform"]
        direction TB

        subgraph Edge["Edge Network"]
            CDN["CDN<br/>(Static Assets)"]
            MW["Middleware<br/>(Auth, Rate Limiting)"]
        end

        subgraph Server["Next.js Server"]
            RSC["React Server Components"]
            SA["Server Actions"]
            API["API Routes<br/>(/api/webhooks)"]
        end

        subgraph Auth["Authentication"]
            NextAuth["NextAuth.js<br/>(JWT Sessions)"]
            RBAC["RBAC Layer"]
        end

        subgraph ORM["Data Access"]
            Prisma["Prisma Client"]
        end

        MW --> RSC
        MW --> SA
        MW --> API
        RSC --> Auth
        SA --> Auth
        Auth --> RBAC
        RBAC --> Prisma
    end

    subgraph Storage["Data Storage"]
        direction TB
        VPostgres[("Vercel Postgres<br/>(Primary Database)")]
        VBlob["Vercel Blob<br/>(Media Storage)"]
    end

    subgraph External["External Services"]
        direction TB
        Stripe["Stripe<br/>(Payments)"]
        Google["Google OAuth<br/>(Authentication)"]
    end

    subgraph Monitoring["Monitoring & Analytics"]
        direction TB
        Sentry["Sentry<br/>(Error Tracking)"]
        PostHog["PostHog<br/>(Product Analytics)"]
        VAnalytics["Vercel Analytics<br/>(Performance)"]
    end

    %% Client to Vercel
    Client -->|HTTPS| Edge

    %% Server to Storage
    Prisma --> VPostgres
    SA -->|Media Upload| VBlob

    %% External Service Connections
    API -->|Webhooks| Stripe
    NextAuth --> Google
    SA --> Stripe

    %% Monitoring Connections
    Server --> Sentry
    Client --> PostHog
    Server --> VAnalytics

    %% Styling
    classDef primary fill:#3B82F6,stroke:#1E40AF,color:#fff
    classDef secondary fill:#10B981,stroke:#047857,color:#fff
    classDef storage fill:#F59E0B,stroke:#B45309,color:#fff
    classDef external fill:#8B5CF6,stroke:#6D28D9,color:#fff
    classDef monitoring fill:#EC4899,stroke:#BE185D,color:#fff

    class UI,RSC,SA,API primary
    class Redux,RQ,LS,NextAuth,RBAC,Prisma secondary
    class VPostgres,VBlob storage
    class Stripe,Google external
    class Sentry,PostHog,VAnalytics monitoring
```

## Component Descriptions

### Client Layer

| Component | Technology | Purpose |
|-----------|------------|---------|
| UI Pages | Next.js App Router | Renders pages using React Server Components and Client Components |
| Redux Store | Redux Toolkit | Manages client-side session state during live workouts |
| React Query | TanStack Query | Caches server data, handles async state, automatic refetching |
| LocalStorage | Browser API | Persists session state for recovery on page refresh |

### Vercel Platform

| Component | Technology | Purpose |
|-----------|------------|---------|
| CDN | Vercel Edge | Serves static assets (JS, CSS, images) globally |
| Middleware | Next.js Middleware | Authentication checks, rate limiting, route protection |
| Server Components | React 18 RSC | Server-rendered components, no client JS for static content |
| Server Actions | Next.js Server Actions | Type-safe API layer for mutations and data fetching |
| API Routes | Next.js Route Handlers | Webhook endpoints for Stripe |
| NextAuth | NextAuth.js v5 | JWT-based authentication with OAuth providers |
| RBAC | Custom Middleware | Role-based access control for all operations |
| Prisma | Prisma ORM | Type-safe database queries, migrations, schema management |

### Data Storage

| Component | Service | Purpose |
|-----------|---------|---------|
| Database | Vercel Postgres | Primary relational database for all application data |
| Media Storage | Vercel Blob | Stores user-uploaded media (profile images, check-in photos) |

### External Services

| Service | Purpose | Integration |
|---------|---------|-------------|
| Stripe | Payment processing | Checkout sessions, subscriptions, webhooks |
| Google OAuth | Social authentication | NextAuth.js provider |

### Monitoring

| Service | Purpose | Coverage |
|---------|---------|----------|
| Sentry | Error tracking | Server and client errors with context |
| PostHog | Product analytics | User behavior, feature usage, funnels |
| Vercel Analytics | Performance | Core Web Vitals, latency metrics |

## Data Flow Patterns

### 1. Read Operations (Server Components)

```mermaid
sequenceDiagram
    participant B as Browser
    participant E as Edge/CDN
    participant RSC as Server Component
    participant Auth as NextAuth
    participant DB as Postgres

    B->>E: GET /workouts
    E->>RSC: Forward request
    RSC->>Auth: Verify JWT
    Auth-->>RSC: User session
    RSC->>DB: Prisma query
    DB-->>RSC: Workout data
    RSC-->>E: Rendered HTML
    E-->>B: HTML response
```

### 2. Write Operations (Server Actions)

```mermaid
sequenceDiagram
    participant B as Browser
    participant SA as Server Action
    participant Auth as NextAuth
    participant RBAC as RBAC Layer
    participant DB as Postgres
    participant RQ as React Query

    B->>SA: createWorkout()
    SA->>Auth: Verify JWT
    Auth-->>SA: User session
    SA->>RBAC: Check permissions
    RBAC-->>SA: Authorized
    SA->>DB: Prisma mutation
    DB-->>SA: Created workout
    SA-->>B: Result + revalidate
    B->>RQ: Invalidate cache
```

### 3. Live Session State Sync

```mermaid
sequenceDiagram
    participant U as User
    participant Redux as Redux Store
    participant LS as LocalStorage
    participant SA as Server Action
    participant DB as Postgres

    U->>Redux: Complete set
    Redux->>Redux: Optimistic update
    Redux->>LS: Backup state
    Redux->>SA: Debounced sync (500ms)
    SA->>DB: Persist set
    DB-->>SA: Confirmed
    SA-->>Redux: Success
```

## Deployment Architecture

```mermaid
flowchart LR
    subgraph GH["GitHub"]
        Repo["Repository"]
        PR["Pull Request"]
    end

    subgraph GA["GitHub Actions"]
        Lint["Lint"]
        Type["Type Check"]
        Test["Unit Tests"]
        Build["Build"]
    end

    subgraph Vercel["Vercel"]
        Preview["Preview<br/>(per PR)"]
        Staging["Staging<br/>(staging branch)"]
        Prod["Production<br/>(main branch)"]
    end

    Repo -->|push| GA
    PR -->|trigger| GA
    GA -->|deploy| Preview
    GA -->|deploy| Staging
    GA -->|deploy| Prod

    classDef gh fill:#24292e,stroke:#333,color:#fff
    classDef ga fill:#2088FF,stroke:#0366d6,color:#fff
    classDef vercel fill:#000,stroke:#333,color:#fff

    class Repo,PR gh
    class Lint,Type,Test,Build ga
    class Preview,Staging,Prod vercel
```

## Security Layers

```mermaid
flowchart TB
    subgraph Perimeter["Perimeter Security"]
        HTTPS["HTTPS/TLS"]
        RateLimit["Rate Limiting<br/>(Upstash)"]
        CORS["CORS Policy"]
    end

    subgraph Auth["Authentication"]
        JWT["JWT Tokens"]
        OAuth["OAuth 2.0"]
        Session["Session Management"]
    end

    subgraph App["Application Security"]
        RBAC["Role-Based Access"]
        Input["Input Validation<br/>(Zod)"]
        CSRF["CSRF Protection"]
    end

    subgraph Data["Data Security"]
        Encrypt["Password Hashing<br/>(bcrypt)"]
        Param["Parameterized Queries<br/>(Prisma)"]
        Isolation["Data Isolation"]
    end

    Perimeter --> Auth
    Auth --> App
    App --> Data

    classDef security fill:#EF4444,stroke:#B91C1C,color:#fff
    class HTTPS,RateLimit,CORS,JWT,OAuth,Session,RBAC,Input,CSRF,Encrypt,Param,Isolation security
```

---

**Document Version**: 1.0
**Last Updated**: 2026-01-26

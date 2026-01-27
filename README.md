# B-Fit - Fitness & Workout Tracking Platform

A modern, production-ready web application for fitness enthusiasts, personal trainers, and organizations to create workouts, manage live training sessions, and track performance over time.

## Overview

B-Fit is a comprehensive fitness platform that enables:

- **Custom workout creation** with advanced structures (supersets, exercise ordering)
- **Live session tracking** with real-time set logging and exercise navigation
- **Multi-role support** for Personal Users, Personal Trainers, Clients, and Organizations
- **Progress analytics** with exercise history, PRs, and volume tracking
- **PT-Client management** with workout assignment and branded experiences

**Status:** Phase 0 - Documentation & Setup
**Target Launch:** Week 16

## Tech Stack

### Frontend

- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS
- **UI Components:** Shadcn UI
- **Interactions:** DnD Kit (drag-and-drop), Embla Carousel
- **State Management:** Redux Toolkit, React Query (TanStack)

### Backend

- **Database:** Vercel Postgres
- **ORM:** Prisma
- **Authentication:** NextAuth.js
- **File Storage:** Vercel Blob
- **Payments:** Stripe

### DevOps & Monitoring

- **Deployment:** Vercel
- **Error Tracking:** Sentry
- **Analytics:** PostHog
- **Testing:** Jest, Playwright

## Prerequisites

- Node.js 18+ and npm/pnpm/yarn
- Git
- A Vercel account (for deployment)
- PostgreSQL (or Vercel Postgres)

## Getting Started

> **Note:** The project is currently in Phase 0. Development environment setup will be completed in Phase 1.

### Installation (Phase 1)

```bash
# Clone the repository
git clone <repository-url>
cd b-fit-v2

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# Initialize database
npx prisma migrate dev

# Seed database (optional)
npm run db:seed

# Start development server
npm run dev
```

## Project Structure

```
b-fit-v2/
├── docs/                    # Comprehensive technical documentation
│   ├── project-plan.md     # Full implementation roadmap
│   ├── database-schema.md  # Prisma schema & data model
│   ├── api-specification.md
│   ├── auth-rbac.md        # Authentication & role-based access
│   ├── technical-design.md
│   ├── ui-ux-spec.md
│   ├── subscription-billing.md
│   ├── analytics-calculations.md
│   └── ...
├── CLAUDE.md               # AI assistant guidance
├── b_fit_product_requirements_document_prd.md
└── README.md              # This file
```

## Documentation

The project includes extensive documentation to guide development:

- **[Product Requirements Document (PRD)](./b_fit_product_requirements_document_prd.md)** - Complete product vision and requirements
- **[Project Plan](./docs/project-plan.md)** - 16-week implementation roadmap
- **[Technical Design](./docs/technical-design.md)** - System architecture and design patterns
- **[Database Schema](./docs/database-schema.md)** - Complete Prisma schema with relationships
- **[API Specification](./docs/api-specification.md)** - Server actions and API patterns
- **[Auth & RBAC](./docs/auth-rbac.md)** - Authentication and role-based access control
- **[UI/UX Specification](./docs/ui-ux-spec.md)** - Interface design and user flows
- **[Subscription & Billing](./docs/subscription-billing.md)** - Stripe integration and pricing
- **[Analytics Calculations](./docs/analytics-calculations.md)** - Progress tracking formulas
- **[Testing Strategy](./docs/testing-strategy.md)** - Testing approach and coverage goals

## Key Features

### User Roles

- **Personal User** - Individual fitness enthusiasts managing their own workouts
- **Personal Trainer** - Manage clients, assign workouts, track progress
- **Client** - Access PT-assigned workouts and track sessions
- **Organization** - Manage multiple PTs and aggregate analytics

### Core Functionality

- Exercise library with custom exercises
- Workout builder with drag-and-drop, supersets, and ordering
- Live session mode with carousel navigation
- Set tracking with reps, weight, RPE, and notes
- Exercise history and PR detection
- Volume tracking and analytics dashboards
- PT-Client relationships with workout assignment
- Async messaging with media uploads
- Subscription management with auto-upgrade

## Development Phases

| Phase       | Duration    | Focus                                         |
| ----------- | ----------- | --------------------------------------------- |
| **Phase 0** | Week 0      | Documentation & Setup                         |
| **Phase 1** | Weeks 1-2   | Foundation (Next.js, Auth, DB)                |
| **Phase 2** | Weeks 3-6   | Core Features (Exercises, Workouts, Sessions) |
| **Phase 3** | Weeks 7-9   | Multi-Role Features (PT-Client)               |
| **Phase 4** | Weeks 10-11 | Payments & Subscriptions                      |
| **Phase 5** | Weeks 12-14 | Advanced Features (Analytics, Messaging)      |
| **Phase 6** | Weeks 15-16 | Polish & Launch                               |

Full breakdown available in [docs/project-plan.md](./docs/project-plan.md)

## Architecture Highlights

### Workout Assignment Pattern

When a PT assigns a workout to a client, the client receives a **copy** of the workout. This enables:

- Per-client customization by the PT
- Client-to-Personal User role transitions without data loss
- Clear ownership boundaries

### Session State Management

- Sessions use `instanceId` to track individual exercise instances
- State persists across page refreshes (database + local storage)
- Optimistic updates for sub-100ms UI performance
- Clear separation between workout definition and session execution

### Multi-Role Architecture

- Four first-class user roles with standalone value
- PTs are a superset of Personal User capabilities
- Role-based data access with Prisma RLS patterns
- Organizations manage PTs but don't modify training data directly

## Contributing

This is currently a solo development project. Contribution guidelines will be added post-launch.

## Testing

```bash
# Run unit tests
npm test

# Run E2E tests
npm run test:e2e

# Generate coverage report
npm run test:coverage
```

**Target Coverage:** 80%+ for production launch

## Deployment

The application is designed for deployment on Vercel with:

- Vercel Postgres for database
- Vercel Blob for media storage
- Edge runtime for API routes where possible
- ISR for static content

```bash
# Deploy to Vercel
vercel deploy
```

## License

[License TBD]

## Support

For issues and questions:

- GitHub Issues: [TBD]
- Documentation: See [docs/](./docs) folder

---

**Built with:** Next.js, TypeScript, Prisma, Tailwind CSS
**Version:** 0.1.0 (Pre-launch)
**Last Updated:** 2026-01-26

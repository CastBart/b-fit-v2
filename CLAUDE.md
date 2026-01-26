# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

B-Fit is a web-based fitness and workout tracking application built with Next.js. The platform supports multiple user roles (Personal Users, Personal Trainers, Clients, and Organisations) with a focus on structured workouts, live session tracking, and progress analytics.

**Current Status:** Project is in initial setup phase. The PRD is complete but implementation has not yet begun.

## Tech Stack

- **Frontend:** Next.js 14+, React, TypeScript, Tailwind CSS, Shadcn UI, Embla Carousel, DnD Kit
- **State Management:** Redux Toolkit, React Query (TanStack)
- **Backend:** Vercel Postgres, Prisma ORM, NextAuth
- **Target Platform:** Web (PWA-ready), future mobile expansion

## Architecture Overview

### Core Data Model

The application is built around these key entities:

- **User** - Represents all user types (Personal, PT, Client, Organisation) with role-based permissions
- **Exercise** - Base exercise definitions (owned by PTs/Personal Users, read-only for Clients)
- **Workout** - Structured collections of exercises with support for supersets and ordering
- **Session** - Live workout execution instances with real-time set tracking
- **ExerciseHistory** - Aggregated performance data per exercise
- **Plan/Program** - Multi-workout training schedules

### Key Design Patterns

**Workout Assignment & Ownership:**
- When a PT assigns a workout to a client, the client receives a **copy** of the workout
- The PT can customize the copy per client
- Original workout remains owned by the PT; assigned copy is owned by the client
- This enables client-to-Personal User role transitions without data loss

**Session State Management:**
- Sessions use `instanceId` for tracking individual exercise instances within a session
- Clear separation between workout **definition** (template) and session **execution** (live tracking)
- Session state must survive page refreshes (persist to database or local storage)

**Multi-Role Architecture:**
- Four first-class user roles, each with standalone value and subscription model
- PTs are a **superset** of Personal User capabilities (can train themselves + manage clients)
- Organisations manage PTs but don't directly modify training data
- Client accounts can convert to Personal User accounts when PT relationship ends

### Data Access Patterns

- **Personal Users:** Own analytics, exercises, workouts, sessions
- **PTs:** Own + read access to assigned client data; full write access to assigned workouts
- **Clients:** Read-only workouts/plans assigned by PT; full ownership of session data
- **Organisations:** Aggregate read-only analytics across PTs and clients

## Development Conventions

### Session State Performance Requirements

- UI updates during live sessions must be sub-100ms
- No blocking renders during set completion
- Session data must not be lost during completion or page refresh

### Subscription & Billing Logic

- Auto-upgrade tiers when capacity is exceeded (no hard blocks)
- Billing is role-based and capacity-driven
- PTs pay base + client capacity; Organisations pay for PT seats + client capacity

### UX Priorities

- Mobile-first responsive design
- Minimal cognitive load during workout sessions
- Clear visual hierarchy for exercise navigation
- Drawer-based controls for session management
- Support for supersets and exercise ordering in workout builder

## Future Roadmap Considerations

When implementing core features, consider these planned enhancements:

- Analytics dashboard (volume tracking, PRs, adherence metrics)
- AI workout generator
- PWA offline session support
- Async messaging between PTs and clients with media uploads
- Nutrition tracking integration

## Important Notes

- **instanceId** is used throughout the session system to distinguish between multiple instances of the same exercise in a single workout
- Messaging is async-only in v1 (no real-time chat)
- Check-ins and media uploads are contextual to workouts/sessions/plans
- Analytics visibility is role-dependent (Personal = self only, PT = self + clients, Org = aggregated)

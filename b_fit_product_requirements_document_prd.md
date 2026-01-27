# B-Fit – Product Requirements Document (PRD)

## 1. Product Overview

**Product Name:** B-Fit  
**Product Type:** Web-based Fitness & Workout Tracking Application (PWA-ready)  
**Platform:** Web (Next.js), future mobile-friendly expansion  
**Target Users:** Gym-goers, hybrid athletes (e.g. Hyrox), fitness enthusiasts who want structured workouts, session tracking, and progression insights

B-Fit is a modern fitness application designed to help users **build workouts, manage live training sessions, and track performance over time**. It focuses on flexibility (custom exercises, supersets), real-time session control, and clean UX, while being built with scalable, production-ready architecture.

---

## 2. Goals & Objectives

### Primary Goals

- Allow users to **create and manage workouts** with advanced structures (ordered exercises, supersets).
- Enable **live workout sessions** with real-time set tracking and exercise navigation.
- Persist completed sessions and generate **exercise history & progress data**.
- Deliver a **fast, reliable, and intuitive UX** across devices.

### Secondary Goals

- Support **progressive enhancement** into analytics, AI-driven plans, and nutrition features.
- Be architected for **scalability** (multi-sessions, large exercise libraries).
- Serve as a **portfolio-grade production app**.

---

## 3. User Personas

### 3.1 Fitness Enthusiast

- Wants custom workouts and progression tracking
- Uses supersets and structured sessions
- Trains 3–6x per week

### 3.2 Hybrid / Hyrox Athlete

- Needs strength + conditioning sessions
- Cares about timing, flow, and minimal friction during sessions
- Uses repeated workouts and templates

### 3.3 Casual Gym User

- Wants simple workout creation
- Needs clear session guidance
- Tracks basic performance improvements

---

## 4. Core Features

### 4.1 User Roles & Account Types

B-Fit supports four **first-class, standalone user roles**. Each role represents a valid long-term use of the platform and has its own subscription model.

#### 4.1.1 Personal User

- Standalone product offering
- Pays individual subscription
- Can create and manage:
  - Exercises
  - Workouts
  - Plans / programs
- Can run sessions and track personal progress
- Has access to personal analytics dashboards

Personal users are **not** clients by default and do not belong to any organisation.

---

#### 4.1.2 Personal Trainer (PT)

- Pays a base subscription plus client capacity
- Superset of Personal User capabilities
- Can:
  - Train themselves using the platform
  - Create and manage clients
  - Assign workouts and plans to clients
  - View full client analytics and history
  - Brand the experience (logo, colours)

PTs operate either:

- Independently (solo PT)
- Or as part of an Organisation

---

#### 4.1.3 Client User

- Access provided through an associated PT
- Does not pay directly (covered by PT or Organisation)
- Can:
  - View assigned workouts and plans
  - Start workout sessions
  - View personal session history
  - Submit check-ins, notes, and media uploads
  - Communicate with PTs via async messaging

Restrictions:

- Cannot create exercises, workouts, or plans

Role Transition:

- If PT relationship ends, client account can be converted into a **Personal User** account
- Assigned workouts are retained as owned copies

---

#### 4.1.4 Organisation (Business)

An Organisation represents a gym, studio, or coaching business.

Capabilities:

- Pays for PT seats and client capacity
- Creates and manages PT accounts
- Views aggregate dashboards across:
  - PTs
  - Clients
  - Session activity
  - Adherence metrics

Limitations:

- Organisations do **not** directly modify training data
- Training ownership remains with PTs and clients

---

### 4.2 Subscription & Licensing Model

Subscriptions are role-based and capacity-driven.

#### Personal User

- Flat recurring subscription
- Full access to personal training features

#### Personal Trainer

- Base subscription
- Client capacity tiers (e.g. 10, 20, unlimited)
- Automatic tier upgrades when capacity limits are exceeded

#### Organisation

- Subscription based on:
  - Number of PT seats
  - Client capacity per PT or pooled capacity
- Automatic scaling as limits are exceeded

Billing Rules:

- No hard feature blocks due to capacity
- Auto-upgrade ensures uninterrupted workflows

---

### 4.3 Workout & Plan Management

- PTs and Personal Users can create reusable workouts and plans
- Workouts can be assigned to multiple clients
- On assignment:
  - A client receives a **copy** of the workout
  - The PT can customise the copy per client

Ownership Rules:

- PT owns the original workout
- Client owns their assigned copy

---

### 4.4 Live Session Mode

- Clients, PTs, and Personal Users can start sessions
- Sessions track:
  - Sets
  - Reps
  - Weight
  - Completion status

Session Data:

- Owned by the user performing the session
- Read-only access for associated PTs

---

### 4.5 Analytics & Reporting (v1)

Core analytics available in v1:

- **Workout Adherence** – percentage of assigned workouts completed
- **Session Frequency** – sessions per week/month
- **Volume Progression** – total lifted volume over time
- **Strength PRs** – personal records per exercise

Visibility:

- Personal Users: own analytics only
- PTs: analytics for themselves and all assigned clients
- Organisations: aggregated analytics across PTs and clients

---

### 4.6 Messaging, Check-ins & Media

- Async messaging between PTs and clients
- Contextual comments on:
  - Workouts
  - Sessions
  - Plans
- Media uploads supported for:
  - Technique review
  - Progress updates

Real-time chat is out of scope for v1

---

## 5. Data Model Overview (High Level)

### Key Entities

- User
- Exercise
- Workout
- Session
- ExerciseHistory

### Notable Design Decisions

- `instanceId` used for session exercises
- Separation of **Workout definition** vs **Session execution**

---

## 6. Non-Functional Requirements

### Performance

- Sub-100ms UI updates during sessions
- No blocking renders during set completion

### Reliability

- Session state must survive refresh
- No data loss during completion

### Scalability

- Designed for thousands of users
- Expandable to mobile & offline use

### Security

- OAuth + credential auth
- Server-side validation
- Prisma schema validation

---

## 7. UX & UI Principles

- Mobile-first responsive layout
- Clear hierarchy and typography
- Minimal cognitive load during workouts
- Consistent drawer-based controls

---

## 8. Technical Stack

**Frontend**

- Next.js 14+
- React
- TypeScript
- Tailwind CSS
- Shadcn UI
- Embla Carousel
- DnD Kit

**State & Data**

- Redux Toolkit
- React Query (TanStack)

**Backend**

- Vercel Postgres
- Prisma ORM
- NextAuth

---

## 9. Future Enhancements

- Analytics dashboard (volume, PRs)
- AI workout generator
- Nutrition & calorie tracking
- PWA offline sessions
- Mobile app (React Native)

---

## 10. Success Metrics

- Client workout adherence rates
- Average sessions per client per week
- PT retention rate
- Client-to-Personal conversion rate
- Organisation seat expansion rate

---

## 11. Risks & Constraints

- Messaging scope creep (real-time chat)
- Analytics performance at scale
- Subscription edge cases during auto-upgrades

---

## 12. Open Questions

- Advanced analytics depth beyond v1
- Future real-time communication needs
- Enterprise-level bespoke billing rules

---

**Document Version:** 2.0  
**Status:** Platform PRD – Expanded

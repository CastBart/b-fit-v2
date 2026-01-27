# B-Fit Database Schema Specification

## Overview

This document details the complete Prisma schema for the B-Fit application, including all entities, relationships, indexes, and constraints.

---

## Complete Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================================================
// ENUMS
// ============================================================================

enum UserRole {
  PERSONAL  // Personal user with individual subscription
  PT        // Personal Trainer
  CLIENT    // Client of a PT
  ORG       // Organisation admin
}

enum SubscriptionStatus {
  ACTIVE
  PAST_DUE
  CANCELED
  TRIALING
}

enum SessionStatus {
  IN_PROGRESS
  COMPLETED
  ABANDONED
}

enum ExerciseType {
  SMALL      // Isolation exercises
  MEDIUM     // Compound exercises
  LARGE      // Major compounds
  STABILITY  // Core and stabilization
  CARDIO     // Cardio exercises
}

enum MetricType {
  WEIGHT_REPS           // weight (kg/lbs) + reps
  COUNTER_WEIGHT_REPS   // assisted exercises (pull-up machine)
  REPS                  // bodyweight exercises (push-ups)
  REPS_DURATION         // timed holds with rep count
  DURATION              // planks, static holds
  DISTANCE_DURATION     // running, rowing
  WEIGHT_DISTANCE       // sled pushes, farmer carries
  WEIGHT_DURATION       // weighted holds
}

enum MuscleGroup {
  CHEST
  BACK
  SHOULDERS
  BICEPS
  TRICEPS
  QUADS
  HAMSTRINGS
  GLUTES
  CALVES
  CORE
  FULL_BODY
}

enum EquipmentType {
  BARBELL
  DUMBBELL
  KETTLEBELL
  MACHINE
  CABLE
  BODYWEIGHT
  RESISTANCE_BAND
  TRX
  CARDIO_EQUIPMENT
}

enum MovementPattern {
  PUSH
  PULL
  SQUAT
  HINGE
  CARRY
  CORE
  LUNGE
  OLYMPIC
}

enum DifficultyLevel {
  BEGINNER
  INTERMEDIATE
  ADVANCED
}

enum ClientRelationshipStatus {
  ACTIVE
  PENDING
  ENDED
}

// ============================================================================
// USER & AUTH
// ============================================================================

model User {
  id            String   @id @default(cuid())
  email         String   @unique
  emailVerified DateTime?
  name          String?
  password      String?  // Hashed password for credentials auth
  image         String?
  role          UserRole @default(PERSONAL)

  // Active status
  isActive      Boolean  @default(true)  // For deactivation without deletion

  // Subscription fields
  stripeCustomerId String?
  subscriptionTier String?  // e.g., "PT_STARTER", "PT_PRO"
  clientCapacity   Int      @default(0)

  // Organisation relationship (for PTs)
  organisationId String?
  organisation   Organisation? @relation("OrganisationPTs", fields: [organisationId], references: [id], onDelete: SetNull)

  // Timestamps
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  accounts      Account[]
  sessions      Session[]
  exercises     Exercise[]
  workouts      Workout[]
  trainingSessions TrainingSession[]
  plans         Plan[]

  // PT-Client relationships
  clients       ClientRelationship[] @relation("PTClients")
  trainers      ClientRelationship[] @relation("ClientPTs")

  // Messaging
  sentMessages     Message[] @relation("SentMessages")
  receivedMessages Message[] @relation("ReceivedMessages")

  // Subscription
  subscription  Subscription?

  // Branding (PT only, if not in organisation)
  brandingSettings BrandingSettings?

  // History
  exerciseHistory ExerciseHistory[]

  @@index([email])
  @@index([role])
  @@index([stripeCustomerId])
  @@index([organisationId])
  @@index([isActive])
}

// NextAuth tables
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@index([userId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

// ============================================================================
// EXERCISES
// ============================================================================

model Exercise {
  id          String   @id @default(cuid())
  name        String
  description String?

  // Categorization
  primaryMuscleGroup    MuscleGroup           // Single required value
  secondaryMuscleGroups MuscleGroup[]         // Optional array
  equipmentType         EquipmentType
  movementPattern       MovementPattern
  difficultyLevel       DifficultyLevel
  exerciseType          ExerciseType
  metricType            MetricType

  // Instructions
  instructions Json?  // Array of instruction strings

  // Ownership
  isDefault   Boolean @default(false)  // System seed exercises
  isPublic    Boolean @default(false)  // User-created, shared to community
  createdById String?
  createdBy   User?   @relation(fields: [createdById], references: [id], onDelete: SetNull)

  // Timestamps
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  workoutExercises WorkoutExercise[]
  sessionSets      SessionSet[]
  exerciseHistory  ExerciseHistory[]

  @@index([createdById])
  @@index([isDefault])
  @@index([equipmentType])
  @@index([exerciseType])
  @@index([primaryMuscleGroup])
}

model ExerciseHistory {
  id         String   @id @default(cuid())
  userId     String
  exerciseId String

  // Personal records (JSON structure)
  // { "1RM": { weight: 100, date: "..." }, "5RM": { weight: 80, date: "..." } }
  personalRecords Json?

  // Volume history (JSON array)
  // [{ week: "2024-W01", volume: 5000 }, ...]
  volumeHistory Json?

  lastPerformed DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  exercise Exercise @relation(fields: [exerciseId], references: [id], onDelete: Cascade)

  @@unique([userId, exerciseId])
  @@index([userId])
  @@index([exerciseId])
}

// ============================================================================
// WORKOUTS
// ============================================================================

model Workout {
  id          String   @id @default(cuid())
  name        String
  description String?

  // Ownership
  createdById String
  createdBy   User   @relation(fields: [createdById], references: [id], onDelete: Cascade)

  // Template vs Copy
  isTemplate Boolean @default(true)
  copiedFromId String?  // Reference to original workout for client assignments
  copiedFrom   Workout? @relation("WorkoutCopies", fields: [copiedFromId], references: [id], onDelete: SetNull)
  copies       Workout[] @relation("WorkoutCopies")

  // Timestamps
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  exercises        WorkoutExercise[]
  trainingSessions TrainingSession[]
  planWorkouts     PlanWorkout[]
  messages         Message[]

  @@index([createdById])
  @@index([copiedFromId])
  @@index([createdAt])
}

model WorkoutExercise {
  id String @id @default(cuid())

  // Relations
  workoutId  String
  workout    Workout  @relation(fields: [workoutId], references: [id], onDelete: Cascade)
  exerciseId String
  exercise   Exercise @relation(fields: [exerciseId], references: [id], onDelete: Restrict)

  // Ordering & Grouping
  order   Int     // 0-indexed position in workout
  groupId String? // For supersets - exercises with same groupId form a superset

  // Target parameters
  sets        Int
  reps        Int?
  weight      Float?
  restSeconds Int     @default(60)
  notes       String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([workoutId])
  @@index([exerciseId])
  @@index([groupId])
  @@unique([workoutId, order])  // Ensure unique ordering within workout
}

// ============================================================================
// TRAINING SESSIONS (Live Workouts)
// ============================================================================

model TrainingSession {
  id        String   @id @default(cuid())

  // Relations - workoutId is now optional
  workoutId String?
  workout   Workout?  @relation(fields: [workoutId], references: [id], onDelete: SetNull)
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Session metadata
  status    SessionStatus
  startedAt DateTime      @default(now())
  completedAt DateTime?

  // Local storage backup (for recovery on refresh)
  // JSON snapshot of session state with timestamp
  localStorageBackup Json?

  // Current exercise/set state for recovery
  currentExerciseIndex Int?
  currentSetIndices    Json?  // Map of instanceId -> currentSetIndex

  // Calculated fields (denormalized for performance)
  totalVolume Float?  // Sum of weight * reps across all sets
  duration    Int?    // Duration in seconds

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  sets     SessionSet[]
  messages Message[]

  @@index([userId])
  @@index([workoutId])
  @@index([status])
  @@index([startedAt])
}

model SessionSet {
  id String @id @default(cuid())

  // Relations
  sessionId  String
  session    TrainingSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  exerciseId String
  exercise   Exercise        @relation(fields: [exerciseId], references: [id], onDelete: Restrict)

  // instanceId: Unique identifier for this specific instance of an exercise in the session
  // Needed because same exercise can appear multiple times (e.g., in different supersets)
  instanceId String

  // Set metadata
  setNumber Int  // 1-indexed set number within this exercise instance

  // Performance data (based on exercise metricType)
  reps      Int?
  weight    Float?
  duration  Int?     // seconds
  distance  Float?   // meters

  completedAt DateTime?
  notes       String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([sessionId])
  @@index([exerciseId])
  @@index([instanceId])
  @@unique([sessionId, instanceId, setNumber])
}

// ============================================================================
// PLANS / PROGRAMS
// ============================================================================

model Plan {
  id            String   @id @default(cuid())
  name          String
  description   String?
  durationWeeks Int      @default(0)  // 0 = unlimited, 1-52 = week count
  daysPerWeek   Int      // Number of training days per week (1-7)

  // Active status (business logic enforces one active plan per user)
  isActive      Boolean  @default(false)
  activatedAt   DateTime?

  // Ownership
  createdById String
  createdBy   User   @relation(fields: [createdById], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  workouts PlanWorkout[]
  messages Message[]

  @@index([createdById])
  @@index([isActive])
}

model PlanWorkout {
  id String @id @default(cuid())

  // Relations
  planId    String
  plan      Plan    @relation(fields: [planId], references: [id], onDelete: Cascade)
  workoutId String
  workout   Workout @relation(fields: [workoutId], references: [id], onDelete: Restrict)

  // Scheduling
  dayNumber  Int  // 1-7 for days within the training week (not week number)
  // Note: No weekNumber - plans are cyclical based on daysPerWeek

  notes String?

  createdAt DateTime @default(now())

  @@index([planId])
  @@index([workoutId])
  @@unique([planId, dayNumber])
}

// ============================================================================
// CLIENT-PT RELATIONSHIPS
// ============================================================================

model ClientRelationship {
  id String @id @default(cuid())

  // Relations
  ptId     String
  pt       User   @relation("PTClients", fields: [ptId], references: [id], onDelete: Cascade)
  clientId String
  client   User   @relation("ClientPTs", fields: [clientId], references: [id], onDelete: Cascade)

  // Status
  status    ClientRelationshipStatus @default(PENDING)
  startedAt DateTime                 @default(now())
  endedAt   DateTime?

  // Invitation tracking
  invitedAt  DateTime @default(now())
  acceptedAt DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([ptId])
  @@index([clientId])
  @@index([status])
  @@unique([ptId, clientId])
}

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================

model Subscription {
  id String @id @default(cuid())

  // Relations
  userId String @unique
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Stripe data
  stripeSubscriptionId String  @unique
  stripePriceId        String
  stripeCurrentPeriodEnd DateTime

  status SubscriptionStatus

  // Billing
  cancelAtPeriodEnd Boolean @default(false)
  canceledAt        DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
  @@index([status])
}

// ============================================================================
// MESSAGING
// ============================================================================

model Message {
  id String @id @default(cuid())

  // Relations
  senderId    String
  sender      User   @relation("SentMessages", fields: [senderId], references: [id], onDelete: Cascade)
  recipientId String
  recipient   User   @relation("ReceivedMessages", fields: [recipientId], references: [id], onDelete: Cascade)

  // Context (optional - message can be about a specific workout/session/plan)
  workoutId String?
  workout   Workout? @relation(fields: [workoutId], references: [id], onDelete: SetNull)
  sessionId String?
  session   TrainingSession? @relation(fields: [sessionId], references: [id], onDelete: SetNull)
  planId    String?
  plan      Plan? @relation(fields: [planId], references: [id], onDelete: SetNull)

  // Content
  content  String
  mediaUrl String?  // URL to media in Vercel Blob

  // Metadata
  readAt DateTime?

  createdAt DateTime @default(now())

  @@index([senderId])
  @@index([recipientId])
  @@index([workoutId])
  @@index([sessionId])
  @@index([createdAt])
}

// ============================================================================
// ORGANISATION
// ============================================================================

model Organisation {
  id   String @id @default(cuid())
  name String

  // Subscription fields
  stripeCustomerId String?
  subscriptionTier String?  // e.g., "ORG_STARTER", "ORG_PRO"
  ptCapacity       Int      @default(0)  // Number of PT seats
  clientCapacity   Int      @default(0)  // Total clients across all PTs

  // Branding
  brandingSettings OrganisationBranding?

  // Timestamps
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  pts  User[] @relation("OrganisationPTs")

  @@index([stripeCustomerId])
}

model OrganisationBranding {
  id String @id @default(cuid())

  // Relations
  organisationId String       @unique
  organisation   Organisation @relation(fields: [organisationId], references: [id], onDelete: Cascade)

  // Branding
  logoUrl      String?
  primaryColor String  @default("#000000")
  accentColor  String  @default("#3B82F6")

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([organisationId])
}

// ============================================================================
// BRANDING (PT Only - When Not in Organisation)
// ============================================================================

model BrandingSettings {
  id String @id @default(cuid())

  // Relations - Only for PTs not linked to an organisation
  // If PT has organisationId, they use OrganisationBranding instead
  ptId String @unique
  pt   User   @relation(fields: [ptId], references: [id], onDelete: Cascade)

  // Branding
  logoUrl      String?
  primaryColor String  @default("#000000")
  accentColor  String  @default("#3B82F6")

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([ptId])
}
```

---

## Entity Relationship Diagram

```
┌──────────────┐
│     User     │
│──────────────│
│ id (PK)      │
│ email        │
│ role         │
│ ...          │
└──────┬───────┘
       │
       ├─────────────────────┐
       │                     │
       ▼                     ▼
┌──────────────┐      ┌──────────────┐
│   Exercise   │      │   Workout    │
│──────────────│      │──────────────│
│ id (PK)      │      │ id (PK)      │
│ createdById  │◄─────┤ createdById  │
│ ...          │      │ copiedFromId │
└──────┬───────┘      └──────┬───────┘
       │                     │
       │              ┌──────┴──────┐
       │              │             │
       │              ▼             ▼
       │       ┌─────────────┐ ┌──────────────┐
       │       │WorkoutExer- │ │TrainingSession│
       │       │cise         │ │──────────────│
       │       │─────────────│ │ id (PK)      │
       │       │ workoutId   │ │ workoutId    │
       └──────►│ exerciseId  │ │ userId       │
               │ groupId     │ └──────┬───────┘
               │ ...         │        │
               └─────────────┘        ▼
                              ┌──────────────┐
                              │  SessionSet  │
                              │──────────────│
                              │ sessionId    │
                              │ exerciseId   │
                              │ instanceId   │
                              │ ...          │
                              └──────────────┘

┌──────────────┐              ┌──────────────┐
│     User     │              │     User     │
│ (PT)         │              │ (Client)     │
└──────┬───────┘              └──────┬───────┘
       │                             │
       └──────┐             ┌────────┘
              │             │
              ▼             ▼
       ┌──────────────────────────┐
       │ ClientRelationship       │
       │──────────────────────────│
       │ ptId (FK)                │
       │ clientId (FK)            │
       │ status                   │
       └──────────────────────────┘
```

---

## Key Design Decisions

### 1. Superset Implementation

**Approach**: `groupId` field in `WorkoutExercise`

Exercises with the same `groupId` value form a superset. This allows:

- Flexible group sizes (2, 3, or more exercises)
- Simple querying: `WHERE groupId = 'xyz'`
- Easy reordering: just update `order` field

**Example**:

```sql
-- Workout with superset (Bench Press + Rows)
WorkoutExercise:
  { id: 1, order: 0, groupId: 'A', exerciseId: 'bench-press' }
  { id: 2, order: 1, groupId: 'A', exerciseId: 'rows' }
  { id: 3, order: 2, groupId: null, exerciseId: 'curls' }  -- solo exercise
```

### 2. Session Instance Tracking

**Challenge**: Same exercise can appear multiple times in a workout.

**Solution**: `instanceId` field in `SessionSet`

- Generate unique `instanceId` when session starts
- Track sets per exercise instance, not per exercise globally
- Enables proper history aggregation

**Example**:

```typescript
// Workout: Squats (3x5) in superset, then Squats (5x10) solo
// Session creates two instanceIds: 'instance-1', 'instance-2'

SessionSet:
  { instanceId: 'instance-1', exerciseId: 'squats', setNumber: 1, reps: 5 }
  { instanceId: 'instance-1', exerciseId: 'squats', setNumber: 2, reps: 5 }
  ...
  { instanceId: 'instance-2', exerciseId: 'squats', setNumber: 1, reps: 10 }
  { instanceId: 'instance-2', exerciseId: 'squats', setNumber: 2, reps: 10 }
```

### 3. Workout Assignment (Copy-on-Assign)

**Challenge**: PT assigns workout to client, but needs to customize per client.

**Solution**: `copiedFromId` field in `Workout`

- Original workout owned by PT
- Assignment creates a copy owned by client
- Copy references original via `copiedFromId`
- Enables client-to-personal conversion (retain workouts)

**Flow**:

```typescript
// 1. PT creates template
const template = { id: '1', createdById: 'pt-id', isTemplate: true }

// 2. PT assigns to client
const clientCopy = {
  id: '2',
  createdById: 'client-id', // Client owns the copy
  copiedFromId: '1', // Reference to template
  isTemplate: false,
}

// 3. PT can customize client's copy
```

### 4. Exercise History Denormalization

**Challenge**: Calculating PRs and volume on-the-fly is expensive.

**Solution**: Pre-aggregated `ExerciseHistory` table

- One record per user-exercise pair
- Store PRs as JSON: `{ "1RM": { weight: 100, date: "..." }, ... }`
- Store volume history as JSON array
- Update on session completion

**Trade-off**: Slight data duplication for major performance gain.

---

## Indexing Strategy

### Critical Indexes

```prisma
// User lookups
@@index([email])
@@index([role])
@@index([stripeCustomerId])

// Session queries
@@index([userId, status])  // "Get my active sessions"
@@index([startedAt])       // "Recent sessions"

// Workout queries
@@index([createdById])     // "My workouts"
@@index([copiedFromId])    // "Workout template usage"

// PT-Client queries
@@index([ptId])            // "All my clients"
@@index([clientId])        // "My trainers"
@@index([status])          // "Active relationships"

// Exercise searches
@@index([equipmentType])
@@index([exerciseType])
@@index([isDefault])

// Session set aggregation
@@index([sessionId])       // "All sets in session"
@@index([exerciseId])      // "Exercise history"
@@index([instanceId])      // "Sets for this exercise instance"
```

### Composite Indexes

Optimize common multi-field queries:

```prisma
// Find active sessions for user
@@index([userId, status])

// Unique workout exercise ordering
@@unique([workoutId, order])

// Unique session set tracking
@@unique([sessionId, instanceId, setNumber])

// One history record per user-exercise
@@unique([userId, exerciseId])
```

---

## Data Integrity Constraints

### Cascade Delete Rules

| Parent → Child                      | On Delete | Reasoning                                                 |
| ----------------------------------- | --------- | --------------------------------------------------------- |
| User → Exercise                     | SET NULL  | Preserve exercises if user deleted                        |
| User → Workout                      | CASCADE   | User's workouts deleted with user                         |
| User → TrainingSession              | CASCADE   | User's sessions deleted with user                         |
| Workout → TrainingSession           | SET NULL  | Session data preserved even if workout deleted            |
| Exercise → WorkoutExercise          | SET NULL  | Workout exercise preserved but exercise reference removed |
| TrainingSession → SessionSet        | CASCADE   | Sets deleted with session                                 |
| Organisation → User (PT)            | SET NULL  | PT account preserved if organisation deleted              |
| Organisation → OrganisationBranding | CASCADE   | Branding deleted with organisation                        |

### Unique Constraints

```prisma
// Prevent duplicate email
email String @unique

// One subscription per user
userId String @unique (on Subscription)

// One branding config per PT
ptId String @unique (on BrandingSettings)

// One PT-Client relationship
@@unique([ptId, clientId])

// Ordered exercises in workout
@@unique([workoutId, order])

// Exercise history per user-exercise
@@unique([userId, exerciseId])
```

---

## Migration Strategy

### Initial Migration

```bash
# Create initial schema
npx prisma migrate dev --name init

# Seed default exercises
npx prisma db seed
```

### Future Migrations

```bash
# Generate migration for schema changes
npx prisma migrate dev --name add_workout_tags

# Deploy to production
npx prisma migrate deploy
```

### Seed Script

```typescript
// prisma/seed.ts
import { PrismaClient, ExerciseType, MetricType } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Seed default exercises (200-300 exercises)
  await prisma.exercise.createMany({
    data: [
      {
        name: 'Barbell Bench Press',
        exerciseType: 'LARGE',
        metricType: 'WEIGHT_REPS',
        muscleGroups: ['CHEST', 'TRICEPS', 'SHOULDERS'],
        equipmentType: 'BARBELL',
        movementPattern: 'PUSH',
        difficultyLevel: 'INTERMEDIATE',
        isDefault: true,
      },
      // ... 200+ more exercises
    ],
  })
}

main()
```

---

**Document Version**: 1.0
**Last Updated**: 2026-01-24

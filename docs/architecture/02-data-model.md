# B-Fit Data Model

## Overview

This document presents the complete entity relationship diagram for the B-Fit application, showing all database tables, their relationships, and key fields with cardinalities.

## Entity Relationship Diagram

```mermaid
erDiagram
    %% ==================
    %% USER & AUTH
    %% ==================

    User ||--o{ Account : "has"
    User ||--o{ Session : "has"
    User ||--|| Subscription : "has"
    User ||--o| BrandingSettings : "has (PT only)"
    User }o--o| Organisation : "belongs to (PT)"

    User ||--o{ Exercise : "creates"
    User ||--o{ Workout : "creates"
    User ||--o{ TrainingSession : "performs"
    User ||--o{ Plan : "creates"
    User ||--o{ ExerciseHistory : "has"

    User ||--o{ ClientRelationship : "as PT"
    User ||--o{ ClientRelationship : "as Client"
    User ||--o{ Message : "sends"
    User ||--o{ Message : "receives"

    User {
        string id PK
        string email UK
        datetime emailVerified
        string name
        string password
        string image
        UserRole role
        boolean isActive
        string stripeCustomerId
        string subscriptionTier
        int clientCapacity
        string organisationId FK
        datetime createdAt
        datetime updatedAt
    }

    Account {
        string id PK
        string userId FK
        string type
        string provider
        string providerAccountId
        string refresh_token
        string access_token
        int expires_at
        string token_type
        string scope
        string id_token
    }

    Session {
        string id PK
        string sessionToken UK
        string userId FK
        datetime expires
    }

    VerificationToken {
        string identifier
        string token UK
        datetime expires
    }

    %% ==================
    %% EXERCISES
    %% ==================

    Exercise ||--o{ WorkoutExercise : "used in"
    Exercise ||--o{ SessionSet : "tracked in"
    Exercise ||--o{ ExerciseHistory : "has history"

    Exercise {
        string id PK
        string name
        string description
        MuscleGroup primaryMuscleGroup
        MuscleGroup[] secondaryMuscleGroups
        EquipmentType equipmentType
        MovementPattern movementPattern
        DifficultyLevel difficultyLevel
        ExerciseType exerciseType
        MetricType metricType
        json instructions
        boolean isDefault
        boolean isPublic
        string createdById FK
        datetime createdAt
        datetime updatedAt
    }

    ExerciseHistory {
        string id PK
        string userId FK
        string exerciseId FK
        json personalRecords
        json volumeHistory
        datetime lastPerformed
        datetime createdAt
        datetime updatedAt
    }

    %% ==================
    %% WORKOUTS
    %% ==================

    Workout ||--o{ WorkoutExercise : "contains"
    Workout ||--o{ TrainingSession : "executed as"
    Workout ||--o{ PlanWorkout : "scheduled in"
    Workout ||--o{ Message : "discussed in"
    Workout }o--o| Workout : "copied from"

    Workout {
        string id PK
        string name
        string description
        string createdById FK
        boolean isTemplate
        string copiedFromId FK
        datetime createdAt
        datetime updatedAt
    }

    WorkoutExercise {
        string id PK
        string workoutId FK
        string exerciseId FK
        int order
        string groupId
        int sets
        int reps
        float weight
        int restSeconds
        string notes
        datetime createdAt
        datetime updatedAt
    }

    %% ==================
    %% TRAINING SESSIONS
    %% ==================

    TrainingSession ||--o{ SessionSet : "contains"
    TrainingSession ||--o{ Message : "discussed in"

    TrainingSession {
        string id PK
        string workoutId FK
        string userId FK
        SessionStatus status
        datetime startedAt
        datetime completedAt
        json localStorageBackup
        int currentExerciseIndex
        json currentSetIndices
        float totalVolume
        int duration
        datetime createdAt
        datetime updatedAt
    }

    SessionSet {
        string id PK
        string sessionId FK
        string exerciseId FK
        string instanceId
        int setNumber
        int reps
        float weight
        int duration
        float distance
        datetime completedAt
        string notes
        datetime createdAt
        datetime updatedAt
    }

    %% ==================
    %% PLANS
    %% ==================

    Plan ||--o{ PlanWorkout : "contains"
    Plan ||--o{ Message : "discussed in"

    Plan {
        string id PK
        string name
        string description
        int durationWeeks
        int daysPerWeek
        boolean isActive
        datetime activatedAt
        string createdById FK
        datetime createdAt
        datetime updatedAt
    }

    PlanWorkout {
        string id PK
        string planId FK
        string workoutId FK
        int dayNumber
        string notes
        datetime createdAt
    }

    %% ==================
    %% CLIENT RELATIONSHIPS
    %% ==================

    ClientRelationship {
        string id PK
        string ptId FK
        string clientId FK
        ClientRelationshipStatus status
        datetime startedAt
        datetime endedAt
        datetime invitedAt
        datetime acceptedAt
        datetime createdAt
        datetime updatedAt
    }

    %% ==================
    %% SUBSCRIPTIONS
    %% ==================

    Subscription {
        string id PK
        string userId FK UK
        string stripeSubscriptionId UK
        string stripePriceId
        datetime stripeCurrentPeriodEnd
        SubscriptionStatus status
        boolean cancelAtPeriodEnd
        datetime canceledAt
        datetime createdAt
        datetime updatedAt
    }

    %% ==================
    %% MESSAGING
    %% ==================

    Message {
        string id PK
        string senderId FK
        string recipientId FK
        string workoutId FK
        string sessionId FK
        string planId FK
        string content
        string mediaUrl
        datetime readAt
        datetime createdAt
    }

    %% ==================
    %% ORGANISATION
    %% ==================

    Organisation ||--o| OrganisationBranding : "has"

    Organisation {
        string id PK
        string name
        string stripeCustomerId
        string subscriptionTier
        int ptCapacity
        int clientCapacity
        datetime createdAt
        datetime updatedAt
    }

    OrganisationBranding {
        string id PK
        string organisationId FK UK
        string logoUrl
        string primaryColor
        string accentColor
        datetime createdAt
        datetime updatedAt
    }

    BrandingSettings {
        string id PK
        string ptId FK UK
        string logoUrl
        string primaryColor
        string accentColor
        datetime createdAt
        datetime updatedAt
    }
```

## Key Design Patterns

### 1. Workout Copy-on-Assign Pattern

When a PT assigns a workout to a client, a copy is created:

```mermaid
flowchart LR
    subgraph PT["PT Owned"]
        W1["Workout (Template)<br/>isTemplate: true<br/>createdById: pt-123"]
    end

    subgraph Client["Client Owned"]
        W2["Workout (Copy)<br/>isTemplate: false<br/>copiedFromId: W1<br/>createdById: client-456"]
    end

    W1 -->|"copy on assign"| W2

    classDef template fill:#3B82F6,stroke:#1E40AF,color:#fff
    classDef copy fill:#10B981,stroke:#047857,color:#fff

    class W1 template
    class W2 copy
```

### 2. Session Instance Tracking Pattern

Same exercise appearing multiple times uses unique instanceId:

```mermaid
flowchart TB
    subgraph Workout["Workout Definition"]
        WE1["Squats (3x5)<br/>order: 0, groupId: A"]
        WE2["RDL (3x8)<br/>order: 1, groupId: A"]
        WE3["Squats (5x10)<br/>order: 2, groupId: null"]
    end

    subgraph Session["Session Execution"]
        S1["SessionSet<br/>instanceId: inst-1<br/>exerciseId: squats"]
        S2["SessionSet<br/>instanceId: inst-2<br/>exerciseId: rdl"]
        S3["SessionSet<br/>instanceId: inst-3<br/>exerciseId: squats"]
    end

    WE1 --> S1
    WE2 --> S2
    WE3 --> S3

    classDef workout fill:#F59E0B,stroke:#B45309,color:#fff
    classDef session fill:#8B5CF6,stroke:#6D28D9,color:#fff

    class WE1,WE2,WE3 workout
    class S1,S2,S3 session
```

### 3. Superset Grouping Pattern

Exercises with same groupId form a superset:

```mermaid
flowchart TB
    subgraph Superset["Superset (groupId: A)"]
        direction LR
        E1["Bench Press<br/>order: 0"]
        E2["Rows<br/>order: 1"]
    end

    subgraph Solo["Solo Exercise"]
        E3["Curls<br/>order: 2<br/>groupId: null"]
    end

    classDef superset fill:#EC4899,stroke:#BE185D,color:#fff
    classDef solo fill:#6B7280,stroke:#374151,color:#fff

    class E1,E2 superset
    class E3 solo
```

---

**Document Version**: 1.0
**Last Updated**: 2026-01-26

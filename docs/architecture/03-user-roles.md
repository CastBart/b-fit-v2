# B-Fit User Role Hierarchy

## Overview

This document describes the four user roles in B-Fit, their permission hierarchy, inheritance patterns, and role transition flows.

## Role Hierarchy Diagram

```mermaid
flowchart TB
    subgraph Roles["User Roles"]
        direction TB

        ORG["Organisation Admin<br/>(ORG)"]
        PT["Personal Trainer<br/>(PT)"]
        PERSONAL["Personal User<br/>(PERSONAL)"]
        CLIENT["Client<br/>(CLIENT)"]
    end

    subgraph Capabilities["Capability Inheritance"]
        direction TB

        C_ORG["Org Capabilities<br/>- Manage PT seats<br/>- Aggregate analytics<br/>- Organisation branding"]
        C_PT["PT Capabilities<br/>- Manage clients<br/>- Assign workouts/plans<br/>- View client data<br/>- PT branding<br/>- Messaging"]
        C_PERSONAL["Personal Capabilities<br/>- Create exercises<br/>- Create workouts<br/>- Create plans<br/>- Personal analytics<br/>- Session tracking"]
        C_CLIENT["Client Capabilities<br/>- View assigned workouts<br/>- Execute sessions<br/>- Personal analytics<br/>- Message PT"]
    end

    ORG --> C_ORG
    PT --> C_PT
    PT --> C_PERSONAL
    PERSONAL --> C_PERSONAL
    CLIENT --> C_CLIENT

    C_ORG -.->|"oversees"| C_PT
    C_PT -.->|"superset of"| C_PERSONAL

    classDef role fill:#3B82F6,stroke:#1E40AF,color:#fff
    classDef cap fill:#10B981,stroke:#047857,color:#fff

    class ORG,PT,PERSONAL,CLIENT role
    class C_ORG,C_PT,C_PERSONAL,C_CLIENT cap
```

## Role Transitions

```mermaid
stateDiagram-v2
    [*] --> NewSignup: User registers

    NewSignup --> PERSONAL: Default role

    PERSONAL --> PT: Subscribe to PT tier

    PT --> PERSONAL: Cancel subscription

    state "PT Invites" as invite
    PERSONAL --> invite: Receives invitation
    invite --> CLIENT: Accept invitation

    CLIENT --> PERSONAL: PT ends relationship
    CLIENT --> PERSONAL: Client ends relationship

    note right of CLIENT
        Client retains all:
        - Assigned workout copies
        - Session history
        - Exercise history
    end note

    note right of PT
        PT is superset of PERSONAL:
        - Can still train themselves
        - All personal features included
    end note
```

## Transition: Personal to PT

```mermaid
sequenceDiagram
    participant U as Personal User
    participant App as B-Fit
    participant Stripe as Stripe
    participant DB as Database

    U->>App: Click "Upgrade to PT"
    App->>Stripe: Create checkout session
    Stripe-->>App: Checkout URL
    App-->>U: Redirect to Stripe
    U->>Stripe: Complete payment
    Stripe->>App: Webhook: checkout.completed
    App->>DB: Update user role to PT
    App->>DB: Set subscriptionTier
    App->>DB: Set clientCapacity
    App-->>U: Redirect to dashboard

    Note over U,DB: User now has PT capabilities<br/>All personal data retained
```

## Transition: Client to Personal

```mermaid
sequenceDiagram
    participant C as Client
    participant PT as Personal Trainer
    participant App as B-Fit
    participant DB as Database

    alt PT ends relationship
        PT->>App: End relationship
    else Client ends relationship
        C->>App: End relationship
    end

    App->>DB: Set relationship.status = ENDED
    App->>DB: Update client.role = PERSONAL

    Note over C,DB: Client keeps all data:<br/>- Workout copies (owned by client)<br/>- Session history<br/>- Exercise history<br/>- PRs and analytics

    App-->>C: Role changed notification
    C->>App: Can now create own workouts
```

## Data Ownership by Role

```mermaid
flowchart TB
    subgraph PERSONAL_Data["Personal User Data"]
        P_Ex["Exercises (owned)"]
        P_Wo["Workouts (owned)"]
        P_Se["Sessions (owned)"]
        P_Pl["Plans (owned)"]
        P_An["Analytics (own)"]
    end

    subgraph PT_Data["PT Data"]
        PT_Ex["Exercises (owned)"]
        PT_Wo["Workout Templates (owned)"]
        PT_Se["Personal Sessions (owned)"]
        PT_Pl["Plan Templates (owned)"]
        PT_An["Personal Analytics (own)"]
        PT_Cl["Client List"]
        PT_Br["Branding (owned)"]
    end

    subgraph CLIENT_Data["Client Data"]
        C_Wo["Workout Copies (owned)"]
        C_Se["Sessions (owned)"]
        C_An["Analytics (own)"]
        C_Msg["Messages"]
    end

    subgraph ORG_Data["Organisation Data"]
        O_PTs["PT Members"]
        O_An["Aggregate Analytics"]
        O_Br["Organisation Branding"]
    end

    PT_Wo -->|"copy on assign"| C_Wo
    PT_Cl -->|"references"| CLIENT_Data
    O_PTs -->|"references"| PT_Data

    classDef personal fill:#3B82F6,stroke:#1E40AF,color:#fff
    classDef pt fill:#10B981,stroke:#047857,color:#fff
    classDef client fill:#F59E0B,stroke:#B45309,color:#fff
    classDef org fill:#8B5CF6,stroke:#6D28D9,color:#fff

    class P_Ex,P_Wo,P_Se,P_Pl,P_An personal
    class PT_Ex,PT_Wo,PT_Se,PT_Pl,PT_An,PT_Cl,PT_Br pt
    class C_Wo,C_Se,C_An,C_Msg client
    class O_PTs,O_An,O_Br org
```

---

**Document Version**: 1.0
**Last Updated**: 2026-01-26

# B-Fit Workout Assignment Flow

## Overview

This document illustrates the complete flow of workout assignment from PT to Client, including the copy-on-assign pattern, workout customization, session execution, and data visibility.

## End-to-End Workflow

```mermaid
flowchart TB
    subgraph PT_Actions["PT Actions"]
        direction TB
        PT1["1. PT creates workout template"]
        PT2["2. PT views client profile"]
        PT3["3. PT selects workout(s) to assign"]
        PT4["4. System creates workout copy"]
        PT5["5. PT can customize client's copy"]
        PT6["6. PT views client sessions"]
    end

    subgraph Client_Actions["Client Actions"]
        direction TB
        C1["7. Client sees assigned workout"]
        C2["8. Client starts session"]
        C3["9. Client logs sets"]
        C4["10. Client completes session"]
        C5["11. Client views summary"]
    end

    subgraph Data_Flow["Data Flow"]
        direction TB
        D1[("PT Workout<br/>(Template)")]
        D2[("Client Workout<br/>(Copy)")]
        D3[("Training Session")]
        D4[("Session Sets")]
        D5[("Exercise History")]
    end

    PT1 --> D1
    PT3 --> PT4
    PT4 --> D2
    D1 -.->|"copy"| D2
    PT5 --> D2

    D2 --> C1
    C1 --> C2
    C2 --> D3
    C3 --> D4
    D4 --> D3
    C4 --> D5

    PT6 -.->|"read access"| D3
    PT6 -.->|"read access"| D4

    classDef pt fill:#3B82F6,stroke:#1E40AF,color:#fff
    classDef client fill:#10B981,stroke:#047857,color:#fff
    classDef data fill:#F59E0B,stroke:#B45309,color:#fff

    class PT1,PT2,PT3,PT4,PT5,PT6 pt
    class C1,C2,C3,C4,C5 client
    class D1,D2,D3,D4,D5 data
```

## Copy-on-Assign Pattern

```mermaid
sequenceDiagram
    participant PT as Personal Trainer
    participant App as B-Fit App
    participant DB as Database
    participant Client as Client

    PT->>App: Navigate to client profile
    App->>DB: Get PT's workout templates
    DB-->>App: Workout list
    App-->>PT: Display assign workflow

    PT->>App: Select workout(s) to assign
    App->>DB: Create workout copies

    Note over DB: For each workout:

    rect rgb(59, 130, 246)
        DB->>DB: Create new Workout record
        Note right of DB: createdById: clientId<br/>copiedFromId: originalId<br/>isTemplate: false
        DB->>DB: Copy all WorkoutExercises
        Note right of DB: New IDs, same exercise refs<br/>Same order, sets, reps, etc.
    end

    DB-->>App: Workout copies created
    App-->>PT: Assignment success
    App-->>Client: Notification: New workout assigned

    Client->>App: View workouts
    App->>DB: Get client's workouts
    DB-->>App: Including new copies
    App-->>Client: Display assigned workouts
```

## Client Session Execution

```mermaid
sequenceDiagram
    participant Client
    participant App as B-Fit App
    participant Redux as Redux Store
    participant LS as LocalStorage
    participant DB as Database

    Client->>App: View assigned workout
    Client->>App: Click "Start Workout"

    App->>DB: Create TrainingSession
    Note over DB: status: IN_PROGRESS<br/>workoutId: copy-id<br/>userId: client-id

    DB-->>App: Session created
    App->>Redux: Initialize session state
    App->>LS: Create backup
    App-->>Client: Show session UI

    loop For each exercise
        Client->>App: Enter set data
        App->>Redux: Update set (optimistic)
        Redux->>LS: Backup state

        Client->>App: Complete set
        App->>Redux: Mark completed
        Redux->>LS: Update backup
        Redux->>DB: Debounced sync (500ms)
    end

    Client->>App: Complete session
    App->>DB: Update session status
    Note over DB: status: COMPLETED<br/>completedAt: now()<br/>Calculate totalVolume

    App->>DB: Update ExerciseHistory
    Note over DB: Update PRs<br/>Update volume history

    DB-->>App: Session summary
    App-->>Client: Show summary with PRs
```

## PT Visibility of Client Data

```mermaid
flowchart LR
    subgraph PT_View["PT Dashboard View"]
        PTV1["Client List"]
        PTV2["Client Profile"]
        PTV3["Assigned Workouts"]
        PTV4["Session History"]
        PTV5["Analytics"]
    end

    subgraph Access_Level["Access Level"]
        A1["Full Write"]
        A2["Read Only"]
    end

    subgraph Client_Data["Client's Data"]
        CD1["Workout Copies"]
        CD2["Training Sessions"]
        CD3["Session Sets"]
        CD4["Exercise History"]
        CD5["Personal Records"]
    end

    PTV3 --> A1
    A1 --> CD1

    PTV4 --> A2
    A2 --> CD2
    A2 --> CD3

    PTV5 --> A2
    A2 --> CD4
    A2 --> CD5

    classDef ptview fill:#3B82F6,stroke:#1E40AF,color:#fff
    classDef access fill:#F59E0B,stroke:#B45309,color:#fff
    classDef clientdata fill:#10B981,stroke:#047857,color:#fff

    class PTV1,PTV2,PTV3,PTV4,PTV5 ptview
    class A1,A2 access
    class CD1,CD2,CD3,CD4,CD5 clientdata
```

---

**Document Version**: 1.0
**Last Updated**: 2026-01-26

# B-Fit Session State Management

## Overview

This document details the session state management architecture, including the separation between workout definitions and session execution, real-time state updates, persistence strategies, and recovery mechanisms.

## Conceptual Model

```mermaid
flowchart TB
    subgraph Definition["Workout Definition (Template)"]
        direction TB
        W["Workout"]
        WE["WorkoutExercise[]"]
        E["Exercise"]

        W --> WE
        WE --> E
    end

    subgraph Execution["Session Execution (Live)"]
        direction TB
        TS["TrainingSession"]
        SS["SessionSet[]"]

        TS --> SS
    end

    subgraph State["State Management"]
        direction TB
        Redux["Redux Store<br/>(Client State)"]
        LS["LocalStorage<br/>(Backup)"]
        DB["Database<br/>(Persistence)"]
    end

    Definition -->|"instantiate"| Execution
    Execution <-->|"sync"| State

    classDef def fill:#3B82F6,stroke:#1E40AF,color:#fff
    classDef exec fill:#10B981,stroke:#047857,color:#fff
    classDef state fill:#F59E0B,stroke:#B45309,color:#fff

    class W,WE,E def
    class TS,SS exec
    class Redux,LS,DB state
```

## State Architecture

```mermaid
flowchart TB
    subgraph Client["Client State (Browser)"]
        direction TB

        subgraph Redux["Redux Store"]
            SessionSlice["Session Slice<br/>- Current session data<br/>- Exercise states<br/>- Set completion<br/>- UI state"]
        end

        subgraph Local["LocalStorage"]
            Backup["Session Backup<br/>- Full state snapshot<br/>- Timestamp<br/>- Recovery data"]
        end

        subgraph URL["URL State"]
            Params["Query Params<br/>- Current exercise index<br/>- Session ID"]
        end
    end

    subgraph Server["Server State (Database)"]
        direction TB

        TSTable["TrainingSession<br/>- Session metadata<br/>- Status<br/>- Timestamps"]

        SSTable["SessionSet<br/>- Set data<br/>- Completion status<br/>- Metrics"]

        EHTable["ExerciseHistory<br/>- PRs<br/>- Volume history"]
    end

    SessionSlice <-->|"bidirectional sync"| TSTable
    SessionSlice -->|"backup on change"| Backup
    SessionSlice <-->|"shallow routing"| Params
    SSTable -->|"aggregate on complete"| EHTable

    classDef redux fill:#764ABC,stroke:#5B3E99,color:#fff
    classDef local fill:#F59E0B,stroke:#B45309,color:#fff
    classDef url fill:#EC4899,stroke:#BE185D,color:#fff
    classDef server fill:#10B981,stroke:#047857,color:#fff

    class SessionSlice redux
    class Backup local
    class Params url
    class TSTable,SSTable,EHTable server
```

## Session Lifecycle

```mermaid
stateDiagram-v2
    [*] --> WorkoutSelected: User clicks "Start Workout"

    WorkoutSelected --> SessionCreated: Create TrainingSession

    state SessionCreated {
        [*] --> InitRedux: Load into Redux
        InitRedux --> InitLS: Create LocalStorage backup
        InitLS --> InitUI: Initialize UI state
    }

    SessionCreated --> IN_PROGRESS: Status: IN_PROGRESS

    state IN_PROGRESS {
        [*] --> ActiveExercise

        state ActiveExercise {
            [*] --> LoggingSet
            LoggingSet --> SetComplete: Complete set
            SetComplete --> RestTimer: Start rest (if applicable)
            RestTimer --> LoggingSet: Timer ends
            SetComplete --> LoggingSet: Skip rest
        }

        ActiveExercise --> NextExercise: Navigate
        NextExercise --> ActiveExercise
    }

    IN_PROGRESS --> COMPLETED: All exercises done
    IN_PROGRESS --> ABANDONED: User abandons
    IN_PROGRESS --> RECOVERED: Page refresh recovery

    RECOVERED --> IN_PROGRESS: Resume session

    COMPLETED --> Summary: Show summary
    Summary --> [*]: Back to workouts

    ABANDONED --> [*]: Session deleted
```

## Real-Time Update Flow

```mermaid
sequenceDiagram
    participant User
    participant UI as Session UI
    participant Redux as Redux Store
    participant LS as LocalStorage
    participant Queue as Sync Queue
    participant SA as Server Action
    participant DB as Database

    User->>UI: Complete set

    rect rgb(118, 74, 188)
        Note over UI,Redux: Optimistic Update (< 100ms)
        UI->>Redux: dispatch(completeSet)
        Redux->>Redux: Update state immediately
        Redux-->>UI: Re-render with completed set
    end

    rect rgb(245, 158, 11)
        Note over Redux,LS: Backup (immediate)
        Redux->>LS: Save full state snapshot
        Note over LS: timestamp: Date.now()
    end

    rect rgb(16, 185, 129)
        Note over Redux,DB: Debounced Sync (500ms)
        Redux->>Queue: Add to sync queue
        Queue->>Queue: Debounce 500ms
        Queue->>SA: Batch sync
        SA->>DB: Persist sets
        DB-->>SA: Confirmed
        SA-->>Redux: Sync complete
    end

    alt Sync Fails
        SA-->>Redux: Error
        Redux->>Redux: Mark pending
        Note over Redux: Retry on next action
    end
```

## Recovery on Page Refresh

```mermaid
flowchart TB
    subgraph PageLoad["Page Load / Refresh"]
        Start["Session Page Loads"]
        GetDB["Fetch from Database"]
        GetLS["Read from LocalStorage"]
        Compare["Compare Timestamps"]

        Start --> GetDB
        Start --> GetLS
        GetDB --> Compare
        GetLS --> Compare
    end

    subgraph Decision["Choose Newer State"]
        DBNewer["DB is newer"]
        LSNewer["LocalStorage is newer"]
        NoLS["No LocalStorage backup"]
    end

    subgraph Actions["Recovery Actions"]
        UseDB["Load DB state to Redux"]
        UseLS["Load LS state to Redux<br/>Sync LS to DB"]
        UseDBOnly["Load DB state only"]
    end

    Compare --> DBNewer
    Compare --> LSNewer
    Compare --> NoLS

    DBNewer --> UseDB
    LSNewer --> UseLS
    NoLS --> UseDBOnly

    UseDB --> Resume["Resume Session"]
    UseLS --> Resume
    UseDBOnly --> Resume

    classDef load fill:#3B82F6,stroke:#1E40AF,color:#fff
    classDef decide fill:#F59E0B,stroke:#B45309,color:#fff
    classDef action fill:#10B981,stroke:#047857,color:#fff

    class Start,GetDB,GetLS,Compare load
    class DBNewer,LSNewer,NoLS decide
    class UseDB,UseLS,UseDBOnly,Resume action
```

## Performance Requirements

| Metric                   | Target  | Implementation           |
| ------------------------ | ------- | ------------------------ |
| Set completion UI update | < 100ms | Optimistic Redux update  |
| LocalStorage backup      | < 50ms  | Synchronous write        |
| Database sync            | < 500ms | Debounced batch          |
| Session recovery         | < 1s    | Parallel fetch + compare |
| Memory usage             | < 10MB  | Minimal state shape      |

---

**Document Version**: 1.0
**Last Updated**: 2026-01-26

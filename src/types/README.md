# TypeScript Types

This directory contains shared TypeScript types and interfaces.

## Structure

```
types/
├── models.ts       # Database model types (from Prisma)
├── api.ts          # API request/response types
├── session.ts      # Session state types
└── common.ts       # Common utility types
```

## Guidelines

- Export types and interfaces, not implementations
- Use descriptive names (e.g., `UserWithWorkouts` instead of `User2`)
- Extend Prisma types when needed with utility types
- Document complex types with comments

## Example

```tsx
import { User, Workout } from '@prisma/client'

// Extend Prisma types
export type UserWithWorkouts = User & {
  workouts: Workout[]
}

// API types
export interface CreateWorkoutInput {
  name: string
  description?: string
  exercises: ExerciseInput[]
}

// Common utility types
export type Result<T> =
  | {
      success: true
      data: T
    }
  | {
      success: false
      error: string
    }
```

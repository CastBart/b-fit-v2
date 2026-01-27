# Server Actions

This directory contains Next.js Server Actions for data mutations.

## Structure

```
actions/
├── workouts.ts    # Workout CRUD operations
├── exercises.ts   # Exercise CRUD operations
└── sessions.ts    # Session tracking operations
```

## Guidelines

- Mark functions with `'use server'` directive
- Use Zod for input validation
- Return consistent result objects: `{ success: boolean, data?: T, error?: string }`
- Handle errors gracefully with try-catch blocks
- Use Prisma for database operations

## Example

```tsx
'use server'

import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'

const workoutSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
})

export async function createWorkout(input: z.infer<typeof workoutSchema>) {
  try {
    const validated = workoutSchema.parse(input)
    const workout = await prisma.workout.create({ data: validated })
    return { success: true, data: workout }
  } catch (error) {
    return { success: false, error: 'Failed to create workout' }
  }
}
```

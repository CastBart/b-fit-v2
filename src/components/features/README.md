# Features Components

This directory contains feature-specific components organized by domain.

## Structure

```
features/
├── workouts/      # Workout-related components (workout cards, builder, etc.)
├── exercises/     # Exercise library and exercise-specific components
└── sessions/      # Live session tracking and session history components
```

## Guidelines

- Keep components specific to their feature domain
- Share reusable components via the `shared/` directory
- Use feature folders for co-located types, hooks, and utilities
- Follow the naming convention: `FeatureName.tsx` (PascalCase)

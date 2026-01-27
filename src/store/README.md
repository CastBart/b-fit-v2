# Redux Store

This directory contains the Redux Toolkit store configuration and slices.

## Structure

```
store/
├── slices/         # Redux slices (workouts, sessions, etc.)
└── store.ts        # Store configuration and setup
```

## Usage

Redux will be used primarily for:

- **Live session state**: Real-time workout tracking with sub-100ms updates
- **Client-side caching**: Reducing API calls for frequently accessed data
- **Optimistic updates**: Immediate UI feedback before server confirmation

## Guidelines

- Use Redux Toolkit (RTK) and createSlice()
- Keep slice logic focused and minimal
- Use React Query for server state when possible
- Reserve Redux for true client-side state needs

## Example Slice

```tsx
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface SessionState {
  activeSessionId: string | null
  currentExerciseId: string | null
}

const initialState: SessionState = {
  activeSessionId: null,
  currentExerciseId: null,
}

export const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    setActiveSession: (state, action: PayloadAction<string>) => {
      state.activeSessionId = action.payload
    },
  },
})

export const { setActiveSession } = sessionSlice.actions
export default sessionSlice.reducer
```

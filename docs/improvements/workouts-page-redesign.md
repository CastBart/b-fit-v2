# Workouts Page Redesign — List/Table + Quick Actions

## Progress

| Chunk | Description                            | Status |
| ----- | -------------------------------------- | ------ |
| 1     | View Toggle + State Persistence        | Done   |
| 2     | List View — Row Card Component         | Done   |
| 3     | Pinned Workouts Section                | Done   |
| 4     | Quick Action Buttons with Hover Reveal | Done   |
| 5     | Delete Confirmation with AlertDialog   | Done   |
| 6     | Duplicate Workout Action               | Done   |
| 7     | Grid View Update                       | Done   |
| 8     | Refactor Page to Use New Components    | Done   |

## Overview

Redesign the workouts page (`src/app/(dashboard)/workouts/page.tsx`) from a basic grid-only card layout to a switchable Grid/List view with pinned favorites, hover-revealed quick actions, and proper delete confirmation.

---

## Current State

- Grid-only layout (1/2/3 columns)
- Basic Card with name, description, exercise count, date, badges (Template/Assigned)
- Footer has "Start Workout" and "Edit" buttons always visible
- Clicking card navigates to `/workouts/{id}`
- No favorites/pinning
- No duplicate action
- No delete action on list page
- No view toggle

---

## Implementation Plan

### Chunk 1: View Toggle + State Persistence — DONE

**Goal:** Add Grid/List toggle in the toolbar, persist preference in localStorage.

**Files modified:**

- `src/app/(dashboard)/workouts/page.tsx` — added toggle state, localStorage persistence, view-adaptive skeletons, and inline list view

**What was implemented:**

- Installed shadcn `toggle-group` + `toggle` components
- Added `ViewMode` type (`'list' | 'grid'`) with `getStoredViewMode()` helper (SSR-safe)
- `useEffect` reads localStorage on mount; `handleViewModeChange` writes on toggle
- `ToggleGroup` with `List` and `LayoutGrid` icons placed to the right of the search bar (`ml-auto`)
- Loading skeletons branch on `viewMode`: horizontal rows for list, card grid for grid
- List view renders inline row cards: left (name+desc) | middle (stat badges, hidden on mobile) | right (Start + Edit buttons)
- Grid view unchanged from before
- Hover effect on list rows: `hover:bg-muted/50 hover:border-primary/20`
- Zero TypeScript diagnostics on the file

---

### Chunk 2: List View — Row Card Component — DONE

**Goal:** Create the list-view row component with proper layout.

**Files created:**

- `src/components/features/workouts/WorkoutRowCard.tsx`

**Files modified:**

- `src/app/(dashboard)/workouts/page.tsx` — replaced inline list view markup with `<WorkoutRowCard>` component

**What was implemented:**

- Created `WorkoutRowCard` component with props: `workout`, `isClient`, `onStart`, `onEdit`, `onClick`
- Three-section horizontal layout: left (name+desc), middle (stat badges, hidden on mobile), right (Start + Edit buttons)
- Card hover effect: `hover:bg-muted/50 hover:border-primary/20` via `group` class
- Template/Assigned badges rendered inline with stat chips
- Actions use `e.stopPropagation()` to prevent card click navigation
- Page now imports and renders `WorkoutRowCard` with router callbacks
- Props kept minimal for now — `onDuplicate`, `onDelete`, `onTogglePin`, `isPinned` will be added in Chunks 3-6
- Zero TypeScript diagnostics on both files

---

### Chunk 3: Pinned Workouts Section — DONE

**Goal:** Allow users to pin/favorite workouts, shown in a dedicated section at the top.

**Files modified:**

- `src/app/(dashboard)/workouts/page.tsx` — added pinned state, toggle handler, split logic, pinned/unpinned sections for both views
- `src/components/features/workouts/WorkoutRowCard.tsx` — added `isPinned` and `onTogglePin` props, star icon toggle button

**What was implemented:**

- `getStoredPinnedIds()` reads from localStorage key `pinned-workouts`, returns `Set<string>`
- `handleTogglePin` callback toggles an ID in the set and persists to localStorage
- `useMemo` splits `data.workouts` into `pinnedWorkouts` and `unpinnedWorkouts` based on `pinnedIds`
- Pinned section hidden when search is active (`showPinnedSection = !search && pinnedIds.size > 0`)
- Both grid and list views render pinned section with star header ("Pinned (N)") above "All Workouts (N)"
- Grid view cards now include a star toggle button in the header (always visible)
- `WorkoutRowCard` shows filled yellow star when pinned, outline when not — always visible (not hover-gated)
- Zero TypeScript diagnostics on both files

---

### Chunk 4: Quick Action Buttons with Hover Reveal — DONE

**Goal:** Add Start, Edit, Duplicate, and More (dropdown) actions to each row.

**Files modified:**

- `src/components/features/workouts/WorkoutRowCard.tsx` — replaced Edit text button with icon actions cluster
- `src/app/layout.tsx` — added `TooltipProvider` wrapping children

**What was implemented:**

- Installed shadcn `tooltip` component
- Added `TooltipProvider` to root layout (required for tooltips to work)
- Start button: always visible, now includes Play icon + "Start" text
- Edit button: icon-only (`Pencil`) with tooltip "Edit workout"
- More button: icon-only (`MoreHorizontal`) with tooltip, opens DropdownMenu containing:
  - Duplicate (with `Copy` icon) — wired to optional `onDuplicate` prop (disabled until Chunk 6)
  - Pin / Unpin (with `Pin`/`PinOff` icons) — wired to existing `onTogglePin`
  - Delete (with `Trash2` icon, destructive styling) — wired to optional `onDelete` prop (disabled until Chunk 5)
- Hover reveal: Edit + More wrapped in `[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-opacity` — always visible on touch devices
- Role-based: clients only see Start button (entire secondary action cluster hidden)
- Props extended with optional `onDuplicate` and `onDelete`
- Zero TypeScript diagnostics on all files

---

### Chunk 5: Delete Confirmation with AlertDialog — DONE

**Goal:** Safe delete with explicit confirmation using shadcn AlertDialog.

**Files created:**

- `src/components/features/workouts/DeleteWorkoutDialog.tsx`

**Files modified:**

- `src/app/(dashboard)/workouts/page.tsx` — added delete state, mutation hook, dialog rendering, wired `onDelete` to all WorkoutRowCard instances

**What was implemented:**

- `DeleteWorkoutDialog` component with props: `open`, `onOpenChange`, `workoutName`, `onConfirm`, `isPending`
- Dialog shows workout name in confirmation message, destructive-styled Delete button with Loader2 spinner
- `e.preventDefault()` on AlertDialogAction to prevent auto-close before mutation completes
- Page uses `deleteTarget` state (stores full workout object for name display)
- `handleDeleteRequest` finds workout by ID from data, sets as delete target
- `handleDeleteConfirm` calls `useDeleteWorkout().mutate()`, clears target on success
- `onDelete` prop wired to both pinned and unpinned WorkoutRowCard lists
- Delete button in More dropdown (from Chunk 4) now fully functional
- Zero TypeScript diagnostics

---

### Chunk 6: Duplicate Workout Action — DONE

**Goal:** Allow duplicating a workout (creates a copy owned by the same user).

**Files modified:**

- `src/server/actions/workouts.ts` — added `duplicateWorkout` server action
- `src/hooks/mutations/useWorkoutMutations.ts` — added `useDuplicateWorkout` hook, imported `duplicateWorkout`
- `src/app/(dashboard)/workouts/page.tsx` — added `handleDuplicate` callback, wired `onDuplicate` to all WorkoutRowCard instances

**What was implemented:**

- `duplicateWorkout(workoutId)` server action: authenticates, validates ID, checks ownership, deep copies workout + all exercises with name "{name} (Copy)", preserves `isTemplate`, no `copiedFromId`
- Includes full `WorkoutWithDetails` return type (createdBy, exercises with exercise details, copiedFrom)
- `useDuplicateWorkout` mutation hook: invalidates `['workouts']`, toast "Workout duplicated"
- Page calls `duplicateWorkoutMutation.mutate(workoutId)` via `handleDuplicate` callback
- "Duplicate" option in More dropdown (from Chunk 4) now fully functional
- Zero TypeScript diagnostics on all files

---

### Chunk 7: Grid View Update — DONE

**Goal:** Update the existing grid card to match the new action pattern.

**Files created:**

- `src/components/features/workouts/WorkoutGridCard.tsx`

**Files modified:**

- `src/app/(dashboard)/workouts/page.tsx` — replaced all inline grid cards (pinned + unpinned) with `<WorkoutGridCard>` component

**What was implemented:**

- `WorkoutGridCard` component with same props interface as `WorkoutRowCard` (`workout`, `isClient`, `isPinned`, `onStart`, `onEdit`, `onClick`, `onTogglePin`, `onDuplicate?`, `onDelete?`)
- Pin star icon in top-left of header (always visible)
- Edit + More dropdown icons in top-right, hover-revealed on desktop (`[@media(hover:hover)]` pattern)
- More dropdown: Duplicate, Pin/Unpin, Delete (destructive) — consistent with row card
- Start button with Play icon in footer (always visible)
- Removed old inline Edit button from footer (now in hover-reveal cluster)
- ChevronRight removed — no longer needed with explicit action buttons
- Both pinned and unpinned grid sections now use `WorkoutGridCard` with all action props wired
- Zero TypeScript diagnostics

---

### Chunk 8: Refactor Page to Use New Components — DONE

**Goal:** Clean up page.tsx to compose the new components.

**Files modified:**

- `src/app/(dashboard)/workouts/page.tsx` — full rewrite for clean composition

**What was implemented:**

- Removed unused imports: `ChevronRight`, `CardDescription`, `CardFooter`, `CardTitle`, `Calendar`, `Badge`
- Moved `useWorkouts` call before handlers that depend on `data` (fixed reference-before-define)
- Created `cardProps()` factory function to generate shared props for both card components — eliminates repeated prop spreading across 4 call sites
- Created `renderWorkoutList()` helper that renders either grid or list view based on `viewMode` — reduces pinned/unpinned rendering duplication from ~60 lines to 2 calls
- Organized file into clear sections: Types & Constants, LocalStorage Helpers, Page Component (with subsections: Handlers, Derived State, Render Helpers, Render)
- Final page structure matches the plan: Header > Toolbar > Loading > Empty > Pinned > All Workouts > Pagination > DeleteDialog
- Page reduced from 383 lines to ~280 lines while adding more functionality
- Zero TypeScript diagnostics

---

## Component Tree

```
WorkoutsPage
├── Header (title + create button)
├── Toolbar
│   ├── Search Input
│   └── ViewToggle (grid/list)
├── PinnedSection (conditional)
│   └── WorkoutRowCard[] or WorkoutGridCard[]
├── AllWorkoutsSection
│   └── WorkoutRowCard[] or WorkoutGridCard[]
├── Pagination
└── DeleteWorkoutDialog (portal)
```

---

## Dependencies

**Already installed:**

- `@/components/ui/dropdown-menu`
- `@/components/ui/alert-dialog`
- `@/components/ui/badge`
- `@/components/ui/card`
- `useDeleteWorkout` mutation hook
- `useCopyWorkout` mutation hook (for duplicate we'll create a new one)

**Installed during Chunk 1:**

- `toggle-group` + `toggle` — for Grid/List toggle

**Still need to install:**

- `npx shadcn@latest add tooltip` — for icon button tooltips (Chunk 4)

---

## Chunk Order & Dependencies

```
Chunk 1 (View Toggle)          — standalone
Chunk 2 (Row Card)             — standalone
Chunk 3 (Pinned Section)       — needs Chunk 2
Chunk 4 (Quick Actions)        — needs Chunk 2
Chunk 5 (Delete Dialog)        — needs Chunk 4
Chunk 6 (Duplicate Action)     — standalone (backend)
Chunk 7 (Grid Card Update)     — standalone
Chunk 8 (Page Refactor)        — needs all above
```

**Recommended execution order:** 1 → 2 → 6 → 4 → 5 → 3 → 7 → 8

---

## Mobile Considerations

- List view rows stack content vertically on small screens (name+desc above chips above actions)
- All action buttons visible on touch devices (no hover gating)
- Grid view remains 1 column on mobile
- Pin icon always visible regardless of device
- Dropdown menu touch-friendly (min 44px tap targets)

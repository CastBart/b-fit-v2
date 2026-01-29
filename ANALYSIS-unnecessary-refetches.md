# Analysis: Unnecessary Exercise List Refetches

## The Problem

When clicking an exercise to open the drawer, the exercises list is being refetched unnecessarily.

## Root Cause

The issue is in `src/app/(dashboard)/exercises/page.tsx` at lines 59-66:

```typescript
const { data, isLoading, error } = useExercises({
  search: search || undefined,
  primaryMuscleGroups: muscleGroups.length ? muscleGroups : undefined,
  equipmentTypes: equipmentTypes.length ? equipmentTypes : undefined,
  difficultyLevels: difficultyLevels.length ? difficultyLevels : undefined,
  page: currentPage,
  limit: 20,
})
```

**Problem**: This params object is **recreated on EVERY render** with a new reference.

Even though React Query does deep comparison of query keys, creating a new object reference on every render can cause:

1. Extra computation for deep comparison
2. Potential React Query internal cache misses
3. Confusion in React Query's staleness tracking

## Why Opening Drawer Causes Refetch

When you click an exercise:

1. `setSelectedExerciseId(exerciseId)` and `setDrawerOpen(true)` are called
2. This causes a re-render of the component
3. The params object is recreated with a new reference
4. React Query sees a "new" query key (even though values are same)
5. Depending on staleness, it might trigger a background refetch

## Two Solutions

### Option 1: Fix Current Implementation (Recommended) ✅

**Keep URL query parameters** but memoize the params object for stable reference.

**Pros:**

- ✅ Shareable URLs (users can copy/paste filtered views)
- ✅ Bookmarkable filtered searches
- ✅ Browser back/forward navigation works
- ✅ Fixes unnecessary refetches
- ✅ Minimal code changes

**Cons:**

- Slightly more complex state management

**Implementation:**
Add `useMemo` to create stable params object:

```typescript
// Memoize filter params object for stable React Query key
const filterParams = useMemo(
  () => ({
    search: search || undefined,
    primaryMuscleGroups: muscleGroups.length ? muscleGroups : undefined,
    equipmentTypes: equipmentTypes.length ? equipmentTypes : undefined,
    difficultyLevels: difficultyLevels.length ? difficultyLevels : undefined,
    page: currentPage,
    limit: 20,
  }),
  [search, muscleGroups, equipmentTypes, difficultyLevels, currentPage]
)

const { data, isLoading, error } = useExercises(filterParams)
```

**Result**: Params object only recreated when actual values change, not on every render.

---

### Option 2: Switch to Local State (Simpler but Loses Benefits)

**Remove URL query parameters** and use local state only.

**Pros:**

- ✅ Simpler implementation
- ✅ No URL updates causing re-renders
- ✅ React Query handles everything

**Cons:**

- ❌ Filters not shareable via URL
- ❌ Browser back/forward doesn't preserve filters
- ❌ Filters reset on page refresh
- ❌ Can't bookmark filtered searches

**Implementation:**
Replace URL params with local state:

```typescript
const [filters, setFilters] = useState({
  search: '',
  muscleGroups: [] as MuscleGroup[],
  equipmentTypes: [] as EquipmentType[],
  difficultyLevels: [] as DifficultyLevel[],
  page: 1,
})

const { data, isLoading, error } = useExercises({
  search: filters.search || undefined,
  primaryMuscleGroups: filters.muscleGroups.length ? filters.muscleGroups : undefined,
  equipmentTypes: filters.equipmentTypes.length ? filters.equipmentTypes : undefined,
  difficultyLevels: filters.difficultyLevels.length ? filters.difficultyLevels : undefined,
  page: filters.page,
  limit: 20,
})

// Update filters without URL
const handleSearchChange = (value: string) => {
  setFilters((prev) => ({ ...prev, search: value, page: 1 }))
}
```

---

## Recommendation

**Go with Option 1: Memoize params object**

This gives you the best of both worlds:

- Fixes the unnecessary refetch issue
- Keeps all the benefits of URL-based state
- Minimal code changes (just add one `useMemo`)
- More user-friendly (shareable, bookmarkable)

The URL query parameter pattern is actually a **best practice** for list/search pages because it provides a better user experience. We just need to implement it correctly with proper memoization.

---

## Additional Optimization: Remove Unnecessary useEffect

The current code has this useEffect:

```typescript
useEffect(() => {
  if (error) {
    toast.error(error.message || 'Failed to load exercises')
  }
}, [error])
```

This is fine, but we could also handle errors inline after the hook:

```typescript
const { data, isLoading, error } = useExercises(filterParams)

// Show error toast immediately when error occurs
if (error) {
  toast.error(error.message || 'Failed to load exercises')
}
```

However, the useEffect approach is actually better because it prevents toast spam on every render. Keep it as is.

---

## Implementation Steps

1. Add `useMemo` for filterParams object
2. Pass memoized object to `useExercises()`
3. Test that filters still work
4. Verify no unnecessary refetches in React Query DevTools

This should reduce network calls significantly!

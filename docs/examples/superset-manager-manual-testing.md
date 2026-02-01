# SupersetManager Manual Testing Guide

This guide provides step-by-step instructions for manually testing the SupersetManager implementation in the workout builder.

## Prerequisites

1. Start the development server: `npm run dev`
2. Navigate to the workout builder page
3. Create a new workout (if prompted)

---

## Test 1: Create Basic Superset

**Objective**: Verify that two adjacent exercises can be grouped into a superset.

**Steps**:

1. Add 3 exercises to the workout (e.g., "Bench Press", "Squats", "Deadlifts")
2. Select the first exercise
3. Click "Create/Manage Superset" button
4. Click "Superset with Next Exercise"

**Expected Result**:

- Blue vertical line appears connecting exercises 1 & 2
- Success toast: "Exercises grouped into superset"
- Both exercises show the blue superset indicator

---

## Test 2: Merge Two Separate Groups

**Objective**: Verify that two separate superset groups can be merged into one.

**Steps**:

1. Add 4 exercises to the workout
2. Create a superset with exercises 1 & 2:
   - Select exercise 1
   - Click "Create/Manage Superset"
   - Click "Superset with Next Exercise"
3. Create a separate superset with exercises 3 & 4:
   - Select exercise 3
   - Click "Create/Manage Superset"
   - Click "Superset with Next Exercise"
4. Merge the groups:
   - Select exercise 2
   - Click "Create/Manage Superset"
   - Click "Superset with Next Exercise" (to connect with exercise 3)

**Expected Result**:

- All 4 exercises now show a continuous blue line
- All exercises are in one superset group
- Success toast appears

---

## Test 3: Remove Exercise from Superset (3-member group)

**Objective**: Verify that removing an exercise from a 3-member superset works correctly.

**Steps**:

1. Create a 3-exercise superset (exercises A, B, C)
2. Select the middle exercise (B)
3. Click "Create/Manage Superset"
4. Click "Remove from Superset"

**Expected Result**:

- Exercise B becomes a solo exercise (no blue line)
- Exercises A and C remain grouped together
- Success toast: "Exercise removed from superset"

---

## Test 4: Remove Exercise from Superset (2-member group)

**Objective**: Verify that removing an exercise from a 2-member superset dissolves the group.

**Steps**:

1. Create a 2-exercise superset (exercises A, B)
2. Select either exercise (A or B)
3. Click "Create/Manage Superset"
4. Click "Remove from Superset"

**Expected Result**:

- Both exercises become solo (no blue lines)
- The entire group is dissolved
- Success toast: "Exercise removed from superset"

---

## Test 5: Drag Reorder Within Group

**Objective**: Verify that reordering exercises within a superset group maintains the grouping.

**Steps**:

1. Create a 4-exercise superset (A, B, C, D)
2. Drag exercise C above exercise B (order becomes A, C, B, D)

**Expected Result**:

- All 4 exercises remain in the same superset group
- Blue line remains continuous
- No toast notification (silent reordering)

---

## Test 6: Drag Reorder Out of Group

**Objective**: Verify that dragging an exercise away from its group removes it from that group.

**Steps**:

1. Add 6 exercises to the workout
2. Create a superset with exercises 1, 2, 3
3. Drag exercise 2 to position after exercise 5 (not adjacent to group)

**Expected Result**:

- Exercise 2 is removed from the original group
- Exercises 1 & 3 remain grouped together
- Exercise 2 becomes a solo exercise at its new position

---

## Test 7: Button Visibility (First Exercise)

**Objective**: Verify correct button states for the first exercise in the list.

**Steps**:

1. Add 3 exercises (not in any superset)
2. Select the first exercise
3. Open the "Create/Manage Superset" drawer

**Expected Result**:

- "Superset with Next Exercise" button is ENABLED
- "Superset with Previous Exercise" button is NOT visible (or disabled)
- "Remove from Superset" button is NOT visible

---

## Test 8: Button Visibility (Middle Exercise in Superset)

**Objective**: Verify correct button states for an exercise in the middle of a superset.

**Steps**:

1. Create a 3-exercise superset (A, B, C)
2. Select the middle exercise (B)
3. Open the "Create/Manage Superset" drawer

**Expected Result**:

- "Superset with Next Exercise" shows "Already grouped with next exercise" and is DISABLED
- "Superset with Previous Exercise" shows "Already grouped with previous exercise" and is DISABLED
- "Remove from Superset" button is ENABLED and shows destructive styling

---

## Test 9: Button Visibility (Last Exercise)

**Objective**: Verify correct button states for the last exercise in the list.

**Steps**:

1. Add 3 exercises (not in any superset)
2. Select the last exercise
3. Open the "Create/Manage Superset" drawer

**Expected Result**:

- "Superset with Next Exercise" button is NOT visible (or disabled)
- "Superset with Previous Exercise" button is ENABLED
- "Remove from Superset" button is NOT visible

---

## Test 10: Save and Reload

**Objective**: Verify that superset groupings persist after saving and reloading.

**Steps**:

1. Create a workout with multiple supersets
2. Click "Save Workout"
3. Navigate away from the workout builder
4. Navigate back to edit the workout (once editing is implemented)

**Expected Result**:

- All superset groupings are preserved
- Blue lines appear in the correct positions
- groupId values are persisted in the database

---

## Test 11: Split 4-Member Group

**Objective**: Verify that splitting a 4-member group creates two 2-member groups.

**Steps**:

1. Create a 4-exercise superset (A, B, C, D)
2. Select exercise B
3. Click "Create/Manage Superset"
4. Click "Remove superset with next exercise" (if available, or use "Remove from Superset")

**Expected Result**:

- Exercises A & B remain grouped (or A becomes solo if only 1 left)
- Exercises C & D form a new superset group
- Two separate blue lines appear

---

## Test 12: Drag Between Two Group Members

**Objective**: Verify that dragging a solo exercise between two members of a group adds it to that group.

**Steps**:

1. Add 4 exercises
2. Create a superset with exercises 1 & 3 (leaving exercise 2 as solo in between)
3. Drag exercise 4 between exercises 1 & 3 (position it at index 2)

**Expected Result**:

- Exercise 4 joins the group automatically
- All three exercises (1, 4, 3) now show a continuous blue line
- The group expands to include the dragged exercise

---

## Edge Cases to Test

### Empty Workout

- Verify that superset buttons are disabled when no exercises exist

### Single Exercise

- Verify that superset options are disabled or hidden with only one exercise

### Non-Contiguous Movement

- Drag an exercise from a 5-member group to a far position
- Verify proper dissolution and reassignment

### Rapid Actions

- Quickly create and remove supersets
- Verify no UI inconsistencies or race conditions

---

## Console Validation (Optional)

Add temporary logging to verify internal state:

```typescript
console.log('Superset validation:', supersetManager.validateSupersets(exercises))
console.log('Superset stats:', supersetManager.getSupersetStats(exercises))
```

**Expected Console Output**:

- `valid: true` with no errors for valid configurations
- Accurate counts for `totalGroups`, `groupSizes`, and `soloExercises`

---

## Success Criteria Checklist

- [ ] All manual tests pass
- [ ] No TypeScript compilation errors
- [ ] UI responds correctly to all superset operations
- [ ] Button states reflect available actions accurately
- [ ] Blue superset indicators display correctly
- [ ] Toast notifications appear for user actions
- [ ] No console errors during testing
- [ ] Superset data persists correctly (when saving is tested)

---

## Rollback Instructions

If any critical issues are found:

1. Revert `page.tsx` changes:

   ```bash
   git checkout HEAD -- src/app/(dashboard)/workouts/builder/page.tsx
   ```

2. Revert `SupersetManagerDrawer.tsx` changes:

   ```bash
   git checkout HEAD -- src/components/features/workouts/SupersetManagerDrawer.tsx
   ```

3. Delete the new superset-manager folder:

   ```bash
   rm -rf src/lib/superset-manager
   ```

4. Rebuild and verify original functionality:
   ```bash
   npm run build
   npm run dev
   ```

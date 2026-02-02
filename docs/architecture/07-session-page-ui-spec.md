# Session Page UI Specification

## Overview

This document defines the UI/UX specifications for the live training session page based on the design mockup at `docs/examples/images/session page example.png`.

## Design Reference

![Session Page Mockup](../examples/images/session%20page%20example.png)

## Layout Structure

### Overall Layout
- **Theme**: Dark background (#0A0E1A or similar)
- **Layout**: Single-page, mobile-first design
- **Navigation**: Horizontal exercise tabs, single exercise view at a time
- **No carousel**: Instead of swiping, use horizontal tab navigation

### Page Sections (Top to Bottom)

```
┌─────────────────────────────────────────────────────────────┐
│  1. Session Header                                          │
│     - Workout name + edit icon                             │
├─────────────────────────────────────────────────────────────┤
│  2. Exercise Navigation Tabs (Horizontal Scroll)           │
│     - Active exercise highlighted                          │
│     - Add exercise button (+)                              │
├─────────────────────────────────────────────────────────────┤
│  3. Current Exercise Title                                 │
│     - Exercise name + menu (...)                           │
├─────────────────────────────────────────────────────────────┤
│  4. Exercise Notes                                         │
│     - Expandable textarea                                  │
├─────────────────────────────────────────────────────────────┤
│  5. Set Logger                                             │
│     - Table: Set | Weight | Reps | Complete button        │
│     - Multiple rows for sets                               │
├─────────────────────────────────────────────────────────────┤
│  6. Exercise History (Collapsible)                         │
│     - Previous workout sessions for this exercise          │
│     - Date + Set data                                      │
└─────────────────────────────────────────────────────────────┘
```

## Component Specifications

### 1. Session Header

**Component**: `SessionHeader`
**Location**: Top of page, sticky

```tsx
<SessionHeader>
  <h1>Arms and Shoulders</h1>
  <IconButton icon={<Edit />} />
</SessionHeader>
```

**Features**:
- Display session name (workout name or custom free session name)
- Edit icon opens dialog to rename session or add session notes
- Sticky positioning (remains visible on scroll)
- **Sync indicator** (right side): Shows sync status (✓ Synced, ⟳ Saving, ⚠ Offline)

**Styling**:
- Font: Large, bold (24-28px)
- Icon: Right-aligned, medium size
- Background: Slightly lighter than page background
- Padding: 16px

---

### 2. Exercise Navigation Tabs

**Component**: `ExerciseNavigationTabs`
**Location**: Below header, horizontally scrollable

```tsx
<ExerciseNavigationTabs>
  <Tab active={true}>Lateral Raises</Tab>
  <Tab active={false}>Tricep Kickbacks</Tab>
  <Tab active={false}>Bicep Curls</Tab>
  <Tab active={false}>Face Pulls</Tab>
  <Tab active={false}>Rope Tricep Pushdowns</Tab>
  <Tab active={false}>Hammer Curls</Tab>
  <AddExerciseButton />
</ExerciseNavigationTabs>
```

**Features**:
- **Horizontal scrollable** container (overflow-x: scroll)
- Active tab: Highlighted with white/bright text, bottom border
- Inactive tabs: Gray/muted text
- Smooth scroll to active tab when changed
- **Add exercise button (+)**: Blue button at the end, opens exercise picker
- Touch-friendly tap targets (min 44px height)

**Styling**:
- Tab padding: 12px 16px
- Active tab: White text, blue underline (2px)
- Inactive tab: Gray text (#6B7280)
- Button: Blue (#3B82F6), rounded, icon only
- Gap between tabs: 8px

**Behavior**:
- Clicking tab navigates to that exercise
- Current exercise position auto-scrolls into view
- Supports keyboard navigation (arrow keys)

---

### 3. Current Exercise Title

**Component**: `CurrentExerciseTitle`
**Location**: Below tabs

```tsx
<CurrentExerciseTitle>
  <h2>Lateral Raises</h2>
  <MenuButton />
</CurrentExerciseTitle>
```

**Features**:
- Display current exercise name
- Menu button (⋯) opens exercise options:
  - View exercise details
  - Add/edit notes
  - Remove from session (free sessions only)
  - View previous history

**Styling**:
- Font: Medium-large, semi-bold (20-24px)
- Menu: Right-aligned, subtle gray icon
- Padding: 16px 0

---

### 4. Exercise Notes

**Component**: `ExerciseNotes`
**Location**: Below exercise title

```tsx
<ExerciseNotes
  value={notes}
  onChange={handleNotesChange}
  placeholder="Add notes..."
/>
```

**Features**:
- Expandable textarea (grows with content)
- Placeholder: "Add notes..."
- Auto-saves on blur or after 1s debounce
- Supports multiline (max 500 chars)

**Styling**:
- Background: Slightly lighter than page (#0F1621)
- Border: Subtle, rounded corners
- Padding: 12px 16px
- Font: Regular, 14-16px
- Min height: 60px
- Max height: 200px (then scrollable)

**Behavior**:
- Click to focus and expand
- Debounced auto-save (1 second after typing stops)
- Visual indicator when saving (subtle spinner or checkmark)

---

### 5. Set Logger

**Component**: `SetLogger`
**Location**: Main content area, below notes

```tsx
<SetLogger>
  <SetLoggerHeader>
    <span>Set</span>
    <span>Weight</span>
    <span>Reps</span>
    <IconButton icon={<Edit />} />
  </SetLoggerHeader>

  <SetRow setNumber={1} completed={true}>
    <SetNumber>1</SetNumber>
    <WeightInput value={0} />
    <RepsInput value={0} />
    <CompleteButton checked={true} />
  </SetRow>

  <SetRow setNumber={2} completed={false}>
    <SetNumber>2</SetNumber>
    <WeightInput value={0} />
    <RepsInput value={0} />
    <CompleteButton checked={false} />
  </SetRow>

  <!-- More sets... -->
</SetLogger>
```

**Features**:
- **Table-like layout** with columns: Set | Weight | Reps | Complete
- **Completed sets**: Checkmark button filled, inputs become read-only
- **Incomplete sets**: Empty checkmark, editable inputs
- **Edit icon (header)**: Opens advanced metrics (duration, distance, etc.)
- **Number inputs**: Large touch targets, auto-focus on tap
- **Auto-advance**: After completing set, auto-focus next set's weight input
- **Dynamic metric fields**: Show weight/reps for WEIGHT_REPS exercises, duration for DURATION exercises, etc.

**Styling**:
- Header: Semi-bold, gray text, uppercase, smaller font
- Set number: Circle or badge, white text on dark background
- Inputs: Dark background (#1E293B), white text, rounded, large (48px height)
- Complete button: Blue when unchecked, filled blue checkmark when checked
- Completed row: Slightly dimmed/grayed out
- Row spacing: 12px gap between rows

**Behavior**:
- **Tap input**: Opens numeric keyboard (mobile) or focuses input
- **Complete button**: Marks set as complete, saves to DB + LS
- **Optimistic UI**: Checkmark fills immediately, syncs in background
- **Edit completed set**: Long-press or tap edit icon to modify
- **Add set button**: At bottom, adds new set row (up to 20 sets)
- **Remove set button**: Swipe left to delete (free sessions or before completion)

**Input Validation**:
- Weight: 0-9999 (kg or lbs)
- Reps: 1-999
- Duration: 1-86400 seconds (format: MM:SS)
- Distance: 1-999999 meters (format: 1000m or 1km)

**Advanced Metrics** (via edit icon):
```tsx
<AdvancedMetrics>
  <DurationInput /> // For DURATION or REPS_DURATION
  <DistanceInput /> // For DISTANCE_DURATION
  <CounterWeightInput /> // For COUNTER_WEIGHT_REPS (assisted exercises)
</AdvancedMetrics>
```

---

### 6. Exercise History

**Component**: `ExerciseHistory`
**Location**: Below set logger, collapsible

```tsx
<ExerciseHistory>
  <HistoryToggle>
    <span>Exercise History</span>
    <ChevronIcon />
  </HistoryToggle>

  <HistoryContent>
    <HistorySession date="Thu, Oct 30th 25 05:10">
      <SessionName>Muscle beach full body</SessionName>
      <HistoryTable>
        <thead>
          <tr>
            <th>Set</th>
            <th>Weight</th>
            <th>Reps</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1</td>
            <td>10</td>
            <td>15</td>
          </tr>
          <tr>
            <td>2</td>
            <td>10</td>
            <td>15</td>
          </tr>
        </tbody>
      </HistoryTable>
    </HistorySession>

    <!-- More sessions... -->
  </HistoryContent>
</ExerciseHistory>
```

**Features**:
- **Collapsible section**: Tap "Exercise History" to expand/collapse
- Shows **previous workout sessions** for current exercise
- Display: Session name, date, set data (weight/reps)
- **Tap to copy**: Long-press a row to copy those metrics to current set
- Limit: Show last 3 sessions (button to "See more history")

**Styling**:
- Header: Semi-bold, centered, gray text
- Chevron: Rotates on expand/collapse
- Session card: Dark background, rounded corners, padding
- Date: Small, gray, right-aligned
- Table: Similar style to set logger, smaller font
- Background: Slightly darker than main page

**Behavior**:
- Collapsed by default (to save space)
- Expands with smooth animation
- Long-press set row → "Copy to current set" action

---

## Page-Level Features

### 1. Auto-Save & Sync

**Visual Indicators**:
- **Sync status badge** (top-right corner):
  - ✓ Synced (green)
  - ⟳ Saving (blue, spinning)
  - • Unsaved (orange dot)
  - ⚠ Offline (yellow warning)
  - ✕ Error (red)

**Behavior**:
- All changes auto-save to LocalStorage immediately (< 50ms)
- Database sync debounced (500ms)
- Show toast on sync errors

### 2. Rest Timer (Future Enhancement - Week 7)

**Component**: `RestTimer` (appears after set completion)
**Location**: Overlay or bottom sheet

```tsx
<RestTimer duration={60}>
  <CircularProgress value={timeLeft} />
  <TimeDisplay>0:45</TimeDisplay>
  <SkipButton>Skip Rest</SkipButton>
</RestTimer>
```

**Features**:
- Countdown timer after completing set
- Vibration/sound notification when complete
- Skip or extend rest period
- Minimizable (continues in background)

### 3. Session Actions (Menu or Bottom Bar)

**Component**: `SessionActions`
**Location**: Bottom of page or overflow menu

**Actions**:
- **Pause Session**: Temporarily pause (future enhancement)
- **Add Exercise**: Open exercise picker, add to current session
- **Finish Session**: Complete session, navigate to summary
- **Abandon Session**: Confirm dialog, delete session

### 4. Free Session: Add Exercise Flow

**Trigger**: Tap "+" button in exercise tabs
**Flow**:
1. Open **Exercise Picker Drawer** (similar to workout builder)
2. Search/filter exercises
3. Tap exercise → Add to session
4. Set target sets/reps (quick config)
5. Exercise added to tabs, auto-navigate to it

### 5. Keyboard Navigation (Desktop)

- **Arrow keys**: Navigate between exercises (left/right)
- **Tab**: Navigate between input fields
- **Enter**: Complete current set
- **Esc**: Close dialogs/menus

### 6. Superset Indicator

**For exercises in a superset**:
- Show visual connector (blue vertical line on left side)
- Badge: "Superset A", "Superset B", etc.
- Alternate between superset exercises (A1 → B1 → A2 → B2)

---

## Responsive Design

### Mobile (< 768px)
- **Full-width layout**: No side padding
- **Large touch targets**: 48px minimum
- **Sticky header**: Always visible
- **Bottom sheet drawers**: For exercise picker, history, etc.
- **Numeric keyboard**: Auto-open for weight/reps inputs

### Tablet (768px - 1024px)
- **Centered layout**: Max width 768px
- **Side padding**: 24px
- **Larger font sizes**: More readable
- **Optional sidebar**: Quick exercise list (collapsed by default)

### Desktop (> 1024px)
- **Two-column layout** (optional):
  - Left: Exercise list (sticky sidebar)
  - Right: Current exercise + set logger
- **Keyboard shortcuts**: Arrow keys, enter, etc.
- **Hover states**: Show edit/delete icons on hover
- **Larger inputs**: Desktop-friendly sizes

---

## Accessibility

- **ARIA labels**: All interactive elements
- **Screen reader support**: Announce set completions, navigation
- **Focus indicators**: Clear focus rings
- **Keyboard navigation**: Full keyboard support
- **Color contrast**: WCAG AA compliance (4.5:1 minimum)
- **Touch targets**: 44px minimum (WCAG AAA)

---

## Performance Considerations

- **Virtualized history list**: For users with 100+ sessions
- **Debounced inputs**: Prevent excessive re-renders
- **Optimistic updates**: Instant UI feedback
- **Lazy load history**: Only fetch when expanded
- **Image placeholders**: For exercise thumbnails (future)

---

## Error States

### Network Error
```
⚠ Connection lost
Changes saved locally. Will sync when online.
[Retry Now]
```

### Sync Error
```
✕ Sync failed
Some changes couldn't be saved. Please check your connection.
[Retry] [View Details]
```

### Session Not Found
```
Session not found or expired.
[Return to Workouts]
```

---

## Success States

### Set Completed
```
✓ Set 1 completed
12 kg × 10 reps
```

### Session Completed
```
🎉 Workout Complete!
Arms and Shoulders - 45 minutes
View Summary →
```

---

**Document Version**: 1.0
**Last Updated**: 2026-02-01
**Implementation Phase**: Week 6 Tasks 6.3-6.4

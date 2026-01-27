# B-Fit UI/UX Specification

## Design System

### Brand Colors

```typescript
// tailwind.config.ts colors
const colors = {
  primary: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9', // Primary
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
  },
  secondary: {
    50: '#faf5ff',
    100: '#f3e8ff',
    200: '#e9d5ff',
    300: '#d8b4fe',
    400: '#c084fc',
    500: '#a855f7', // Secondary
    600: '#9333ea',
    700: '#7e22ce',
    800: '#6b21a8',
    900: '#581c87',
  },
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  neutral: {
    0: '#ffffff',
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
    950: '#030712',
  },
}
```

### Typography

```typescript
// Font Configuration
const fontFamily = {
  sans: ['Inter', 'system-ui', 'sans-serif'],
  mono: ['JetBrains Mono', 'monospace'],
}

// Font Sizes
const fontSize = {
  xs: '0.75rem', // 12px
  sm: '0.875rem', // 14px
  base: '1rem', // 16px
  lg: '1.125rem', // 18px
  xl: '1.25rem', // 20px
  '2xl': '1.5rem', // 24px
  '3xl': '1.875rem', // 30px
  '4xl': '2.25rem', // 36px
  '5xl': '3rem', // 48px
}

// Font Weights
const fontWeight = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
}

// Line Heights
const lineHeight = {
  tight: 1.25,
  normal: 1.5,
  relaxed: 1.75,
}
```

### Spacing Scale

Based on 4px grid:

```typescript
const spacing = {
  0: '0',
  0.5: '0.125rem', // 2px
  1: '0.25rem', // 4px
  2: '0.5rem', // 8px
  3: '0.75rem', // 12px
  4: '1rem', // 16px
  5: '1.25rem', // 20px
  6: '1.5rem', // 24px
  8: '2rem', // 32px
  10: '2.5rem', // 40px
  12: '3rem', // 48px
  16: '4rem', // 64px
  20: '5rem', // 80px
  24: '6rem', // 96px
}
```

### Breakpoints

Mobile-first responsive design:

```typescript
const screens = {
  sm: '640px', // Mobile landscape
  md: '768px', // Tablet
  lg: '1024px', // Desktop
  xl: '1280px', // Large desktop
  '2xl': '1536px', // Extra large
}
```

### Border Radius

```typescript
const borderRadius = {
  none: '0',
  sm: '0.125rem', // 2px
  DEFAULT: '0.25rem', // 4px
  md: '0.375rem', // 6px
  lg: '0.5rem', // 8px
  xl: '0.75rem', // 12px
  '2xl': '1rem', // 16px
  full: '9999px', // Pill shape
}
```

### Shadows

```typescript
const boxShadow = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
}
```

---

## Component Library

### Button

```tsx
// components/ui/button.tsx
import { cva, type VariantProps } from 'class-variance-authority'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary-500 text-white hover:bg-primary-600',
        secondary: 'bg-secondary-500 text-white hover:bg-secondary-600',
        outline: 'border border-neutral-300 bg-transparent hover:bg-neutral-50',
        ghost: 'hover:bg-neutral-100',
        destructive: 'bg-error text-white hover:bg-error/90',
      },
      size: {
        sm: 'h-9 px-3 text-sm',
        default: 'h-11 px-5',
        lg: 'h-14 px-8 text-lg',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size, className }))} {...props} />
}
```

**Usage**:

```tsx
<Button>Default Button</Button>
<Button variant="outline">Outline Button</Button>
<Button size="sm">Small Button</Button>
<Button disabled>Disabled Button</Button>
```

---

### Card

```tsx
// components/ui/card.tsx
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-lg border border-neutral-200 bg-white shadow-sm', className)}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-2xl font-semibold leading-none', className)} {...props} />
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-6 pt-0', className)} {...props} />
}
```

**Usage**:

```tsx
<Card>
  <CardHeader>
    <CardTitle>Workout Summary</CardTitle>
  </CardHeader>
  <CardContent>
    <p>3 exercises, 45 minutes</p>
  </CardContent>
</Card>
```

---

### Input

```tsx
// components/ui/input.tsx
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export function Input({ className, type, ...props }: InputProps) {
  return (
    <input
      type={type}
      className={cn(
        'flex h-11 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
}
```

---

### Badge

```tsx
// components/ui/badge.tsx
const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary-100 text-primary-700',
        secondary: 'bg-secondary-100 text-secondary-700',
        success: 'bg-green-100 text-green-700',
        warning: 'bg-yellow-100 text-yellow-700',
        error: 'bg-red-100 text-red-700',
        outline: 'border border-neutral-300 text-neutral-700',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}
```

**Usage**:

```tsx
<Badge>3 sets</Badge>
<Badge variant="success">PR!</Badge>
<Badge variant="warning">In Progress</Badge>
```

---

## Key Screens

### 1. Dashboard

**Layout**:

```tsx
<DashboardLayout>
  {/* Header */}
  <Header>
    <UserGreeting>Good morning, {user.name}!</UserGreeting>
    <QuickActions>
      <Button>Start Workout</Button>
      <Button variant="outline">Create Workout</Button>
    </QuickActions>
  </Header>

  {/* Stats Grid */}
  <StatsGrid>
    <StatCard
      label="This Week"
      value="4 sessions"
      icon={<CheckCircle />}
      trend="+2 from last week"
    />
    <StatCard label="Total Volume" value="12,500 kg" icon={<Weight />} />
    <StatCard label="PRs This Month" value="3" icon={<Trophy />} />
  </StatsGrid>

  {/* Recent Activity */}
  <Section title="Recent Workouts">
    <WorkoutList workouts={recentWorkouts} />
  </Section>

  {/* For PTs: Client Overview */}
  {role === 'PT' && (
    <Section title="Client Activity">
      <ClientActivityList clients={activeClients} />
    </Section>
  )}
</DashboardLayout>
```

---

### 2. Workout Builder

**Mobile-First Layout**:

```tsx
<WorkoutBuilderLayout>
  {/* Sticky Header */}
  <BuilderHeader>
    <BackButton />
    <Input placeholder="Workout Name" value={workoutName} />
    <SaveButton onClick={saveWorkout} />
  </BuilderHeader>

  {/* Exercise List (Drag & Drop) */}
  <DndContext>
    <ExerciseList>
      {exercises.map((exercise, index) => (
        <DraggableExerciseCard
          key={exercise.id}
          exercise={exercise}
          index={index}
          onRemove={removeExercise}
          onEdit={editExercise}
        />
      ))}
    </ExerciseList>
  </DndContext>

  {/* FAB for adding exercise */}
  <FloatingActionButton onClick={openExerciseSelector}>
    <PlusIcon />
  </FloatingActionButton>

  {/* Exercise Selector Drawer */}
  <Drawer open={showSelector} onClose={closeSelector}>
    <ExerciseSelector onSelect={addExercise} />
  </Drawer>
</WorkoutBuilderLayout>
```

---

### 3. Live Session

**Full-Screen Immersive UI**:

```tsx
<SessionLayout>
  {/* Minimal Top Bar */}
  <SessionHeader>
    <ExitButton />
    <ElapsedTimer />
    <MoreOptionsButton />
  </SessionHeader>

  {/* Exercise Carousel */}
  <Carousel index={currentExerciseIndex} onChange={setCurrentExerciseIndex}>
    {exercises.map((exercise) => (
      <ExerciseSlide key={exercise.instanceId}>
        <ExerciseName>{exercise.name}</ExerciseName>
        <ExerciseImage src={exercise.imageUrl} />

        {/* Large, Touch-Friendly Set Logger */}
        <SetLogger>
          {Array.from({ length: exercise.targetSets }).map((_, i) => (
            <SetRow key={i} setNumber={i + 1}>
              <SetNumber>{i + 1}</SetNumber>
              <LargeInput placeholder="100" label="kg" inputMode="decimal" />
              <LargeInput placeholder="10" label="reps" inputMode="numeric" />
              <CompleteButton size="lg" onClick={() => completeSet(i + 1)}>
                <CheckIcon />
              </CompleteButton>
            </SetRow>
          ))}
        </SetLogger>

        {/* Rest Timer */}
        {isResting && <RestTimer duration={restSeconds} onComplete={handleTimerComplete} />}
      </ExerciseSlide>
    ))}
  </Carousel>

  {/* Bottom Navigation */}
  <SessionFooter>
    <NavButton onClick={previousExercise}>
      <ChevronLeft />
    </NavButton>
    <ProgressIndicator>
      {currentExerciseIndex + 1} / {totalExercises}
    </ProgressIndicator>
    <NavButton onClick={nextExercise}>
      <ChevronRight />
    </NavButton>
  </SessionFooter>
</SessionLayout>
```

**Touch Targets**:

- Minimum 44x44px for all interactive elements
- Extra padding around buttons during workouts
- Large input fields for easy data entry

---

### 4. Session Summary

**Celebration UI**:

```tsx
<SummaryLayout>
  {/* Hero Section */}
  <CompletionHero>
    <SuccessIcon size="xl" />
    <Title>Workout Complete!</Title>
    <Subtitle>Great job, {user.name}</Subtitle>
  </CompletionHero>

  {/* Stats Grid */}
  <StatsGrid>
    <StatCard label="Duration" value="45:32" icon={<Clock />} />
    <StatCard label="Volume" value="5,240 kg" icon={<Weight />} />
    <StatCard label="Sets" value="24" icon={<CheckCircle />} />
    <StatCard label="Exercises" value="6" icon={<Dumbbell />} />
  </StatsGrid>

  {/* PR Highlights */}
  {prs.length > 0 && (
    <PRSection>
      <SectionTitle>Personal Records! 🎉</SectionTitle>
      {prs.map((pr) => (
        <PRCard key={pr.exerciseId}>
          <ExerciseName>{pr.exerciseName}</ExerciseName>
          <PRDetail>
            New {pr.repRange} PR: <Strong>{pr.weight}kg</Strong>
          </PRDetail>
          <Improvement>+{pr.improvement}kg</Improvement>
        </PRCard>
      ))}
    </PRSection>
  )}

  {/* Exercise Breakdown */}
  <ExerciseBreakdown exercises={completedExercises} />

  {/* Actions */}
  <ActionButtons>
    <Button onClick={shareSession}>
      <ShareIcon /> Share
    </Button>
    <Button variant="outline" onClick={goToDashboard}>
      Done
    </Button>
  </ActionButtons>
</SummaryLayout>
```

---

## Mobile Patterns

### Bottom Sheet

```tsx
<BottomSheet open={isOpen} onClose={close}>
  <SheetHandle />
  <SheetHeader>
    <SheetTitle>Select Exercise</SheetTitle>
  </SheetHeader>
  <SheetContent>
    <ExerciseSelector />
  </SheetContent>
</BottomSheet>
```

---

### Swipe Actions

```tsx
<SwipeableCard
  onSwipeLeft={() => deleteWorkout(id)}
  onSwipeRight={() => duplicateWorkout(id)}
  leftAction={{
    icon: <TrashIcon />,
    color: 'error',
    label: 'Delete',
  }}
  rightAction={{
    icon: <CopyIcon />,
    color: 'primary',
    label: 'Duplicate',
  }}
>
  <WorkoutCard workout={workout} />
</SwipeableCard>
```

---

### Pull to Refresh

```tsx
<PullToRefresh onRefresh={refreshWorkouts}>
  <WorkoutList workouts={workouts} />
</PullToRefresh>
```

---

## Animations & Transitions

### Page Transitions

```tsx
// Using Framer Motion
<motion.div
  initial={{ opacity: 0, x: 20 }}
  animate={{ opacity: 1, x: 0 }}
  exit={{ opacity: 0, x: -20 }}
  transition={{ duration: 0.2 }}
>
  {children}
</motion.div>
```

---

### Loading States

**Skeleton Loaders**:

```tsx
<WorkoutCardSkeleton>
  <Skeleton className="h-6 w-3/4" />
  <Skeleton className="h-4 w-1/2 mt-2" />
  <div className="flex gap-2 mt-4">
    <Skeleton className="h-10 w-20" />
    <Skeleton className="h-10 w-20" />
  </div>
</WorkoutCardSkeleton>
```

---

### Success Animations

**Confetti on PR**:

```tsx
import confetti from 'canvas-confetti'

function celebratePR() {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
  })
}
```

---

## Accessibility

### ARIA Labels

```tsx
<button aria-label="Start workout" onClick={startWorkout}>
  <PlayIcon />
</button>
```

---

### Keyboard Navigation

```tsx
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick()
    }
  }}
>
  {children}
</div>
```

---

### Focus Management

```tsx
// Focus first input on modal open
useEffect(() => {
  if (isOpen) {
    inputRef.current?.focus()
  }
}, [isOpen])
```

---

### Color Contrast

All text meets WCAG 2.1 AA standards:

- Normal text: 4.5:1
- Large text: 3:1
- UI components: 3:1

---

## Responsive Design

### Breakpoint Strategy

**Mobile (<768px)**:

- Single column layout
- Full-width cards
- Bottom navigation
- Hamburger menu

**Tablet (768px - 1024px)**:

- Two-column grid
- Side drawer navigation
- Larger touch targets

**Desktop (>1024px)**:

- Three-column grid
- Persistent sidebar
- Hover states
- Keyboard shortcuts

---

**Document Version**: 1.0
**Last Updated**: 2026-01-24

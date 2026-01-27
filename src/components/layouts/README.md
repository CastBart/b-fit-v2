# Layout Components

This directory contains layout components that define page structure and navigation.

## Components

- **DashboardLayout**: Main dashboard layout with sidebar and navigation
- **Navbar**: Top navigation bar with user menu
- **Sidebar**: Collapsible sidebar with role-based navigation

## Usage

```tsx
import { DashboardLayout } from '@/components/layouts/DashboardLayout'

export default function Page() {
  return (
    <DashboardLayout>
      <h1>Page Content</h1>
    </DashboardLayout>
  )
}
```

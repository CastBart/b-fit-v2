import {
  Home,
  Dumbbell,
  ListChecks,
  ClipboardList,
  PlayCircle,
  BarChart3,
  Users,
  Building2,
  Settings,
} from 'lucide-react'

export type UserRole = 'PERSONAL' | 'PT' | 'CLIENT' | 'ORG'

export interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles: UserRole[]
}

export const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: Home,
    roles: ['PERSONAL', 'PT', 'CLIENT', 'ORG'],
  },
  {
    title: 'Exercises',
    href: '/exercises',
    icon: Dumbbell,
    roles: ['PERSONAL', 'PT'],
  },
  {
    title: 'Workouts',
    href: '/workouts',
    icon: ListChecks,
    roles: ['PERSONAL', 'PT', 'CLIENT'],
  },
  {
    title: 'Plans',
    href: '/plans',
    icon: ClipboardList,
    roles: ['PERSONAL', 'PT', 'CLIENT'],
  },
  {
    title: 'Sessions',
    href: '/sessions',
    icon: PlayCircle,
    roles: ['PERSONAL', 'PT', 'CLIENT'],
  },
  {
    title: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
    roles: ['PERSONAL', 'PT', 'ORG'],
  },
  {
    title: 'Clients',
    href: '/clients',
    icon: Users,
    roles: ['PT', 'ORG'],
  },
  {
    title: 'Trainers',
    href: '/trainers',
    icon: Building2,
    roles: ['ORG'],
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
    roles: ['PERSONAL', 'PT', 'CLIENT', 'ORG'],
  },
]

/**
 * Bottom nav priority: the first 4 items shown directly in the bottom bar per role.
 * Remaining role-visible items go into the "More" popover.
 */
export const bottomNavPriority: Record<UserRole, string[]> = {
  PERSONAL: ['/dashboard', '/exercises', '/workouts', '/plans'],
  PT: ['/dashboard', '/exercises', '/workouts', '/plans'],
  CLIENT: ['/dashboard', '/workouts', '/plans', '/sessions'],
  ORG: ['/dashboard', '/analytics', '/clients', '/trainers'],
}

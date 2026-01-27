'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Dumbbell,
  ListChecks,
  PlayCircle,
  BarChart3,
  Users,
  Building2,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
  userRole?: 'PERSONAL' | 'PT' | 'CLIENT' | 'ORG'
}

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles: Array<'PERSONAL' | 'PT' | 'CLIENT' | 'ORG'>
}

const navItems: NavItem[] = [
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
]

export function Sidebar({ isOpen = true, onClose, userRole = 'PERSONAL' }: SidebarProps) {
  const pathname = usePathname()

  // Filter navigation items based on user role
  const visibleNavItems = navItems.filter((item) => item.roles.includes(userRole))

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && onClose && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-full w-64 border-r border-border bg-card transition-transform duration-200 md:sticky md:top-16 md:z-0 md:h-[calc(100vh-4rem)] md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Mobile header */}
          <div className="flex h-16 items-center justify-between border-b border-border px-4 md:hidden">
            <span className="text-lg font-semibold">Menu</span>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 overflow-y-auto p-4">
            <div className="space-y-1">
              {visibleNavItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`)

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => onClose?.()}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.title}</span>
                  </Link>
                )
              })}
            </div>

            <Separator className="my-4" />

            {/* Role badge */}
            <div className="rounded-lg bg-muted px-3 py-2">
              <p className="text-xs font-medium text-muted-foreground">Current Role</p>
              <p className="text-sm font-semibold">
                {userRole === 'PERSONAL' && 'Personal User'}
                {userRole === 'PT' && 'Personal Trainer'}
                {userRole === 'CLIENT' && 'Client'}
                {userRole === 'ORG' && 'Organization'}
              </p>
            </div>
          </nav>

          {/* Footer */}
          <div className="border-t border-border p-4">
            <p className="text-xs text-muted-foreground">B-Fit v2.0</p>
          </div>
        </div>
      </aside>
    </>
  )
}

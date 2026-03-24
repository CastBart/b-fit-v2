'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { useTheme } from 'next-themes'
import { X, Dumbbell, Moon, Sun, LogOut, ChevronsUpDown, PanelLeftClose } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useSubscription } from '@/hooks/queries/useSubscription'
import { SUBSCRIPTION_TIERS } from '@/lib/stripe/config'
import { navItems, type UserRole } from '@/lib/nav-items'
import { toast } from 'sonner'

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
  userRole?: UserRole
  desktopOpen?: boolean
  onDesktopToggle?: () => void
}

function SubscriptionBadge() {
  const { data: subscription } = useSubscription()

  if (!subscription) return null

  const tierConfig = SUBSCRIPTION_TIERS[subscription.tier]

  if (subscription.status === 'TRIALING') {
    const daysLeft = Math.max(
      0,
      Math.ceil(
        (new Date(subscription.currentPeriodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
    )
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground">{tierConfig.name}</span>
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
          Trial: {daysLeft}d
        </Badge>
      </div>
    )
  }

  return <p className="text-xs text-muted-foreground">{tierConfig.name}</p>
}

export function Sidebar({
  isOpen = true,
  onClose,
  userRole = 'PERSONAL',
  desktopOpen = true,
  onDesktopToggle,
}: SidebarProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { theme, setTheme } = useTheme()

  const visibleNavItems = navItems.filter((item) => item.roles.includes(userRole))

  const userInitials = session?.user?.name
    ? session.user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : 'U'

  const handleLogout = async () => {
    try {
      await signOut({
        callbackUrl: '/login',
        redirect: true,
      })
      toast.success('Logged out successfully')
    } catch (error) {
      console.error('Logout error:', error)
      toast.error('Failed to logout')
    }
  }

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
          'fixed left-0 top-0 z-50 h-full w-64 border-r border-border bg-card transition-transform duration-200 md:sticky md:top-0 md:z-0 md:h-screen',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          desktopOpen
            ? 'md:translate-x-0'
            : 'md:-translate-x-full md:w-0 md:overflow-hidden md:border-r-0'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 items-center justify-between border-b border-border px-4">
            <Link
              href="/"
              className="flex items-center gap-2 font-semibold"
              onClick={() => onClose?.()}
            >
              <Dumbbell className="h-6 w-6 text-primary" />
              <span className="text-xl">B-Fit</span>
            </Link>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={onDesktopToggle}
                className="hidden md:inline-flex"
              >
                <PanelLeftClose className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose} className="md:hidden">
                <X className="h-5 w-5" />
              </Button>
            </div>
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
          </nav>

          {/* User Menu */}
          <div className="border-t border-border p-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-accent transition-colors">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={session?.user?.image || undefined} alt="User avatar" />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{session?.user?.name || 'Guest'}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {session?.user?.email || 'Not logged in'}
                    </p>
                    <div className="mt-0.5">
                      {userRole === 'PT' ? (
                        <SubscriptionBadge />
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          {userRole === 'PERSONAL' && 'Personal User'}
                          {userRole === 'CLIENT' && 'Client'}
                          {userRole === 'ORG' && 'Organization'}
                        </p>
                      )}
                    </div>
                  </div>
                  <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56">
                <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                  <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                  <span className="ml-1">{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>
    </>
  )
}

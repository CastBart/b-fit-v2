'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { navItems, bottomNavPriority, type UserRole, type NavItem } from '@/lib/nav-items'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

function useScrollDirection() {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    let lastScrollY = window.scrollY

    const onScroll = () => {
      const currentY = window.scrollY
      if (currentY < 10) {
        setVisible(true)
        lastScrollY = currentY
        return
      }
      if (currentY - lastScrollY > 10) setVisible(false)
      else if (lastScrollY - currentY > 10) setVisible(true)
      lastScrollY = currentY
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return visible
}

interface BottomNavProps {
  userRole?: UserRole
}

function NavButton({ item, isActive }: { item: NavItem; isActive: boolean }) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      className={cn(
        'flex flex-1 flex-col items-center justify-center gap-0.5 py-1',
        isActive ? 'text-primary' : 'text-muted-foreground'
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="text-[10px] leading-tight">{item.title}</span>
    </Link>
  )
}

export function BottomNav({ userRole = 'PERSONAL' }: BottomNavProps) {
  const pathname = usePathname()
  const visible = useScrollDirection()
  const [moreOpen, setMoreOpen] = useState(false)

  const roleItems = navItems.filter((item) => item.roles.includes(userRole))
  const priorityHrefs = bottomNavPriority[userRole]

  const primaryItems = priorityHrefs
    .map((href) => roleItems.find((item) => item.href === href))
    .filter((item): item is NavItem => !!item)

  const overflowItems = roleItems.filter((item) => !priorityHrefs.includes(item.href))

  const isActive = (href: string) => pathname === href || pathname?.startsWith(`${href}/`)

  const moreIsActive = overflowItems.some((item) => isActive(item.href))

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40 border-t bg-card md:hidden transition-transform duration-200'
      )}
      style={{
        transform: visible ? 'translateY(0)' : 'translateY(100%)',
      }}
    >
      <div className="flex items-center justify-around h-14 px-2 pb-[env(safe-area-inset-bottom)]">
        {primaryItems.map((item) => (
          <NavButton key={item.href} item={item} isActive={isActive(item.href)} />
        ))}

        {overflowItems.length > 0 && (
          <Popover open={moreOpen} onOpenChange={setMoreOpen}>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  'flex flex-1 flex-col items-center justify-center gap-0.5 py-1',
                  moreIsActive ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <MoreHorizontal className="h-5 w-5" />
                <span className="text-[10px] leading-tight">More</span>
              </button>
            </PopoverTrigger>
            <PopoverContent side="top" align="end" className="w-48 p-1">
              {overflowItems.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                      active
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </Link>
                )
              })}
            </PopoverContent>
          </Popover>
        )}
      </div>
    </nav>
  )
}

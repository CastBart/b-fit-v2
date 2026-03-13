'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { navItems, bottomNavPriority, type UserRole, type NavItem } from '@/lib/nav-items'

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
  onMoreClick?: () => void
  sidebarOpen?: boolean
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

export function BottomNav({ userRole = 'PERSONAL', onMoreClick, sidebarOpen }: BottomNavProps) {
  const pathname = usePathname()
  const visible = useScrollDirection()

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
        transform: visible && !sidebarOpen ? 'translateY(0)' : 'translateY(100%)',
      }}
    >
      <div className="flex items-center justify-around h-14 px-2 pb-[env(safe-area-inset-bottom)]">
        {primaryItems.map((item) => (
          <NavButton key={item.href} item={item} isActive={isActive(item.href)} />
        ))}

        {overflowItems.length > 0 && (
          <button
            onClick={onMoreClick}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-0.5 py-1',
              moreIsActive ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[10px] leading-tight">More</span>
          </button>
        )}
      </div>
    </nav>
  )
}

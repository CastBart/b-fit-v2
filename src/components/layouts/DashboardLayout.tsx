'use client'

import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { ContinueSessionButton } from '@/components/features/sessions/ContinueSessionButton'
import type { UserRole } from '@/lib/nav-items'

interface DashboardLayoutProps {
  children: React.ReactNode
  userRole?: UserRole
}

export function DashboardLayout({ children, userRole = 'PERSONAL' }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      <div className="md:flex">
        {/* Sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} userRole={userRole} />

        {/* Main Content */}
        <main className="flex-1 min-w-0 p-2 pb-16 md:pb-2">
          <div className="mx-auto ">
            {/* <SubscriptionStatusBanner /> */}
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav
        userRole={userRole}
        onMoreClick={() => setSidebarOpen(true)}
        sidebarOpen={sidebarOpen}
      />
      <ContinueSessionButton />
    </div>
  )
}

'use client'

import { useState } from 'react'
import { PanelLeft } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { ContinueSessionButton } from '@/components/features/sessions/ContinueSessionButton'
import { SyncStatusIndicator } from '@/components/pwa/SyncStatusIndicator'
import { Button } from '@/components/ui/button'
import type { UserRole } from '@/lib/nav-items'

interface DashboardLayoutProps {
  children: React.ReactNode
  userRole?: UserRole
}

export function DashboardLayout({ children, userRole = 'PERSONAL' }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true)

  return (
    <div className="min-h-screen bg-background">
      <div className="md:flex">
        {/* Sidebar */}
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          userRole={userRole}
          desktopOpen={desktopSidebarOpen}
          onDesktopToggle={() => setDesktopSidebarOpen((prev) => !prev)}
        />

        {/* Main Content */}
        <main className="flex-1 min-w-0 p-2 pb-16 md:pb-2">
          <div className="mx-auto">
            {!desktopSidebarOpen && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDesktopSidebarOpen(true)}
                className="hidden md:inline-flex mb-2"
              >
                <PanelLeft className="h-5 w-5" />
              </Button>
            )}
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
      <SyncStatusIndicator />
    </div>
  )
}

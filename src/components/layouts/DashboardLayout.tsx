'use client'

import { useState } from 'react'
import { Navbar } from './Navbar'
import { Sidebar } from './Sidebar'
import { SubscriptionStatusBanner } from '@/components/features/billing/SubscriptionStatusBanner'

interface DashboardLayoutProps {
  children: React.ReactNode
  userRole?: 'PERSONAL' | 'PT' | 'CLIENT' | 'ORG'
}

export function DashboardLayout({ children, userRole = 'PERSONAL' }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <Navbar onMenuClick={() => setSidebarOpen(true)} />

      <div className="md:flex">
        {/* Sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} userRole={userRole} />

        {/* Main Content */}
        <main className="flex-1 min-w-0 p-2">
          <div className="mx-auto ">
            <SubscriptionStatusBanner />
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

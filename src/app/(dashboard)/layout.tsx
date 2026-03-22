import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { ActiveSessionGuardProvider } from '@/components/providers/ActiveSessionGuardProvider'
import { getServerSession } from '@/lib/auth/auth'

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession()
  const userRole = session?.user?.role || 'PERSONAL' // Fallback to PERSONAL if no session

  return (
    <ActiveSessionGuardProvider>
      <DashboardLayout userRole={userRole}>{children}</DashboardLayout>
    </ActiveSessionGuardProvider>
  )
}

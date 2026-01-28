import { DashboardLayout } from '@/components/layouts/DashboardLayout'

export default function Layout({ children }: { children: React.ReactNode }) {
  // if you don’t have role logic yet, keep PERSONAL here for now
  return <DashboardLayout userRole="PERSONAL">{children}</DashboardLayout>
}

'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { BarChart3, Dumbbell, PlayCircle, Users, UserCheck } from 'lucide-react'
import { ActivePlanSection } from '@/components/features/plans/ActivePlanSection'
import { StatsGrid } from '@/components/features/dashboard/StatsGrid'
import { RecentSessions } from '@/components/features/dashboard/RecentSessions'
import { useMyPT } from '@/hooks/queries/useMyPT'
import { useClients } from '@/hooks/queries/useClients'

function TrainerCard() {
  const { data: ptData, isLoading } = useMyPT()

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (!ptData) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCheck className="h-5 w-5" />
          Your Trainer
        </CardTitle>
        <CardDescription>You are connected with a personal trainer</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          {ptData.pt.image ? (
            <img
              src={ptData.pt.image}
              alt={ptData.pt.name ?? ptData.pt.email}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
              {(ptData.pt.name ?? ptData.pt.email)[0]?.toUpperCase() ?? '?'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{ptData.pt.name ?? 'Your Trainer'}</p>
            <p className="text-sm text-muted-foreground truncate">{ptData.pt.email}</p>
          </div>
          <Badge variant="default">Active</Badge>
        </div>
      </CardContent>
    </Card>
  )
}

function ClientsQuickCard() {
  const { data, isLoading } = useClients({ status: 'ACTIVE', page: 1, limit: 5 })

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    )
  }

  const activeCount = data?.total ?? 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          My Clients
        </CardTitle>
        <CardDescription>
          {activeCount === 0
            ? 'Invite clients to get started'
            : `${activeCount} active client${activeCount !== 1 ? 's' : ''}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild variant="outline" className="w-full">
          <Link href="/clients">Manage Clients</Link>
        </Button>
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const userRole = session?.user?.role

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here&apos;s an overview of your fitness journey.
        </p>
      </div>

      {/* Role-Specific Card */}
      {userRole === 'CLIENT' && <TrainerCard />}
      {userRole === 'PT' && <ClientsQuickCard />}

      {/* Stats Grid */}
      <StatsGrid />

      {/* Active Plan Section */}
      <ActivePlanSection />

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <RecentSessions />

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Start your workout or manage your training</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild className="w-full" size="lg">
              <Link href="/workouts">
                <PlayCircle className="mr-2 h-5 w-5" />
                Start New Session
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/workouts">
                <Dumbbell className="mr-2 h-5 w-5" />
                Browse Workouts
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/sessions">
                <BarChart3 className="mr-2 h-5 w-5" />
                View Sessions
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

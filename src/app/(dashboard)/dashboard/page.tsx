'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { BarChart3, Dumbbell, PlayCircle, UserCheck } from 'lucide-react'
import { ActivePlanSection } from '@/components/features/plans/ActivePlanSection'
import { StatsGrid } from '@/components/features/dashboard/StatsGrid'
import { RecentSessions } from '@/components/features/dashboard/RecentSessions'
import { useMyPT } from '@/hooks/queries/useMyPT'
import { useAppDispatch } from '@/store/hooks'
import { startStandaloneSession } from '@/lib/utils/session-navigation'

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

export default function DashboardPage() {
  const { data: session, update } = useSession()
  const searchParams = useSearchParams()
  const router = useRouter()
  const dispatch = useAppDispatch()
  const userRole = session?.user?.role

  useEffect(() => {
    if (searchParams.get('checkout') === 'success') {
      toast.success('Subscription activated! Welcome to your new plan.')
      // Refresh the JWT to pick up the new role from the DB, then
      // re-render the server layout so sidebar/navbar reflect the change
      update().then(() => router.refresh())
    }
  }, [searchParams, update, router])

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here&apos;s an overview of your fitness journey.
        </p>
      </div>

      {/* Role-Specific Card */}
      {userRole === 'CLIENT' && <TrainerCard />}
      {/* {userRole === 'PT' && <ClientsQuickCard />} */}

      <div className="grid grid-cols-1 lg:grid-cols-2 ">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl sm:text-2xl lg:text-2xl tracking-tight">
              Quick Actions
            </CardTitle>
            <CardDescription>Start your workout or manage your training</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              className="w-full"
              size="lg"
              onClick={() => startStandaloneSession(dispatch, router)}
            >
              {/* <Link href="/workouts"> */}
              <PlayCircle className="mr-2 h-5 w-5" />
              Start Session
              {/* </Link> */}
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

        {/* Active Plan Section */}
        <ActivePlanSection />
      </div>

      {/* Stats Grid */}
      <StatsGrid />

      {/* Recent Activity */}
      {/* <div className="grid gap-4 md:grid-cols-2"> */}
      <RecentSessions />
    </div>
    // </div>
  )
}

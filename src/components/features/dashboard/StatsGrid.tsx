'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { BarChart3, Dumbbell, PlayCircle, TrendingUp } from 'lucide-react'
import { useDashboardStats } from '@/hooks/queries/useDashboardStats'

export function StatsGrid() {
  const { data, isLoading, isError } = useDashboardStats()

  if (isLoading) {
    return <StatsGridSkeleton />
  }

  if (isError || !data) {
    return <StatsGridError />
  }

  const stats = [
    {
      title: 'Total Workouts',
      value: data.totalWorkouts.toLocaleString(),
      subtitle: 'Workout templates created',
      icon: Dumbbell,
    },
    {
      title: 'Sessions Completed',
      value: data.sessionsCompleted.toLocaleString(),
      subtitle: 'All time',
      icon: PlayCircle,
    },
    {
      title: 'Total Volume',
      value: `${data.totalVolume.toLocaleString()} kg`,
      subtitle: 'All time',
      icon: BarChart3,
    },
    {
      title: 'Personal Records',
      value: data.personalRecords.toLocaleString(),
      subtitle: 'New PRs this month',
      icon: TrendingUp,
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function StatsGridSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-7 w-20 mb-1" />
            <Skeleton className="h-3 w-28" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function StatsGridError() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">--</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">Failed to load</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

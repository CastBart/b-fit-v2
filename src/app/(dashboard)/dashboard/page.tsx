'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BarChart3, Dumbbell, PlayCircle } from 'lucide-react'
import { ActivePlanSection } from '@/components/features/plans/ActivePlanSection'
import { StatsGrid } from '@/components/features/dashboard/StatsGrid'
import { RecentSessions } from '@/components/features/dashboard/RecentSessions'

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's an overview of your fitness journey.
        </p>
      </div>

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
            <Button className="w-full" size="lg">
              <PlayCircle className="mr-2 h-5 w-5" />
              Start New Session
            </Button>
            <Button variant="outline" className="w-full">
              <Dumbbell className="mr-2 h-5 w-5" />
              Browse Workouts
            </Button>
            <Button variant="outline" className="w-full">
              <BarChart3 className="mr-2 h-5 w-5" />
              View Analytics
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

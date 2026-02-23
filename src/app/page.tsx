import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dumbbell, BarChart3, Users, Building2, ChevronRight } from 'lucide-react'
import { getServerSession } from '@/lib/auth/auth'

export default async function Home() {
  const session = await getServerSession()

  if (session) {
    redirect('/dashboard')
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Dumbbell className="h-6 w-6 text-primary" />
            <span className="text-xl">B-Fit</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Log In</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/signup">Sign Up</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="space-y-6 pb-8 pt-10 md:pb-16 md:pt-16 lg:py-32">
          <div className="container mx-auto flex max-w-[64rem] flex-col items-center gap-6 text-center px-4">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              Your Workouts, <span className="text-primary">Tracked & Optimized</span>
            </h1>
            <p className="max-w-[42rem] text-lg leading-normal text-muted-foreground sm:text-xl sm:leading-8">
              Track every set, monitor your progress with detailed analytics, and build structured
              training plans. Whether you train solo or manage clients, B-Fit keeps everything in
              one place.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
              <Button asChild size="lg">
                <Link href="/signup">
                  Get Started
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/login">Log In</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto space-y-8 py-8 md:py-16 px-4">
          <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
            <h2 className="text-3xl font-bold leading-tight sm:text-4xl">
              Built for Every Fitness Journey
            </h2>
            <p className="max-w-[85%] text-muted-foreground sm:text-lg">
              From solo lifters to full training teams, B-Fit scales with your needs.
            </p>
          </div>
          <div className="mx-auto grid gap-6 sm:grid-cols-2 md:max-w-[64rem] lg:grid-cols-3">
            {/* Personal Users */}
            <Card className="relative overflow-hidden">
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <CardTitle>Personal Users</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="space-y-2">
                  <li>Track workouts with structured exercises and sets</li>
                  <li>Monitor progress with volume tracking and PRs</li>
                  <li>Analyze muscle group distribution over time</li>
                  <li>Build custom workout plans and programs</li>
                </ul>
              </CardContent>
            </Card>

            {/* Personal Trainers */}
            <Card className="relative overflow-hidden">
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <CardTitle>Personal Trainers</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="space-y-2">
                  <li>Manage clients and assign tailored workouts</li>
                  <li>Create and distribute training plans</li>
                  <li>Track client progress and adherence</li>
                  <li>Tiered subscriptions based on client capacity</li>
                </ul>
              </CardContent>
            </Card>

            {/* Organisations */}
            <Card className="relative overflow-hidden">
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex items-center gap-2">
                  <CardTitle>Organisations</CardTitle>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    Coming Soon
                  </span>
                </div>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="space-y-2">
                  <li>Manage teams of personal trainers</li>
                  <li>Aggregate analytics across trainers and clients</li>
                  <li>Scalable seat-based billing</li>
                  <li>Organisation-wide progress dashboards</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* How It Works */}
        <section className="border-t bg-muted/40 py-12 md:py-20">
          <div className="container mx-auto px-4">
            <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
              <h2 className="text-3xl font-bold leading-tight sm:text-4xl">How It Works</h2>
            </div>
            <div className="mx-auto mt-10 grid max-w-[48rem] gap-8 md:grid-cols-3">
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                  1
                </div>
                <h3 className="mb-2 font-semibold">Create Your Account</h3>
                <p className="text-sm text-muted-foreground">
                  Sign up and pick your role — personal user, trainer, or client.
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                  2
                </div>
                <h3 className="mb-2 font-semibold">Build & Track</h3>
                <p className="text-sm text-muted-foreground">
                  Build workouts, assign plans, and track every session in real time.
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                  3
                </div>
                <h3 className="mb-2 font-semibold">Analyze Progress</h3>
                <p className="text-sm text-muted-foreground">
                  Review detailed analytics — volume, PRs, adherence, and more.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-6">
        <div className="container flex items-center justify-center px-4">
          <p className="text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} B-Fit. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}

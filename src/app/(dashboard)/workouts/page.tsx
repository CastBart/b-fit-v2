/**
 * Workouts List Page
 *
 * Displays user's workouts with options to create, edit, view, and start workouts.
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Dumbbell, Calendar, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { useWorkouts } from '@/hooks/queries/useWorkouts'
import { toast } from 'sonner'

interface WorkoutWithExerciseCount {
  id: string
  name: string
  description?: string | null
  exerciseCount: number
  isTemplate: boolean
  copiedFrom?: { id: string; name: string } | null
  updatedAt: Date | string
}

export default function WorkoutsPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading, error } = useWorkouts({
    search,
    page,
    limit: 12,
  })

  if (error) {
    toast.error('Failed to load workouts')
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Workouts</h1>
          <p className="mt-1 text-muted-foreground">Create and manage your workout routines</p>
        </div>
        <Button onClick={() => router.push('/workouts/builder')} size="lg">
          <Plus className="mr-2 h-4 w-4" />
          Create Workout
        </Button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <Input
          type="search"
          placeholder="Search workouts..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="max-w-md"
        />
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="mt-2 h-4 w-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && data?.workouts.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Dumbbell className="mb-4 h-16 w-16 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No workouts yet</h3>
            <p className="mb-6 text-center text-sm text-muted-foreground">
              {search
                ? 'No workouts match your search.'
                : 'Create your first workout to get started.'}
            </p>
            {!search && (
              <Button onClick={() => router.push('/workouts/builder')}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Workout
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Workouts Grid */}
      {!isLoading && data && data.workouts.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.workouts.map((workout: WorkoutWithExerciseCount) => (
              <Card
                key={workout.id}
                className="group flex flex-col h-full cursor-pointer transition-all hover:shadow-lg"
                onClick={() => router.push(`/workouts/${workout.id}`)}
              >
                <CardHeader className="flex-1">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="line-clamp-1">{workout.name}</CardTitle>
                      {workout.description && (
                        <CardDescription className="mt-1 line-clamp-2">
                          {workout.description}
                        </CardDescription>
                      )}
                    </div>
                    <ChevronRight className="ml-2 h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Dumbbell className="h-4 w-4" />
                      <span>{workout.exerciseCount} exercises</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(workout.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {workout.isTemplate && (
                    <Badge variant="secondary" className="text-xs">
                      Template
                    </Badge>
                  )}
                  {workout.copiedFrom && (
                    <Badge variant="outline" className="text-xs">
                      Assigned
                    </Badge>
                  )}
                </CardContent>
                <CardFooter className="gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation()
                      // Navigate to workout detail page where we can start session
                      router.push(`/workouts/${workout.id}`)
                    }}
                  >
                    Start Workout
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      router.push(`/workouts/builder/${workout.id}`)
                    }}
                  >
                    Edit
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <Button variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {data.page} of {data.totalPages}
              </span>
              <Button
                variant="outline"
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

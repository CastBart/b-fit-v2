'use client'

import { useSession } from 'next-auth/react'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { useExercise } from '@/hooks/queries/useExercise'
import {
  MuscleGroupLabels,
  EquipmentTypeLabels,
  ExerciseTypeLabels,
  DifficultyLevelLabels,
  MovementPatternLabels,
  MetricTypeLabels,
} from '@/types/exercise'
import { X, Dumbbell, AlertCircle, Trash2, Edit } from 'lucide-react'
import { toast } from 'sonner'

interface ExerciseDrawerProps {
  exerciseId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ExerciseDrawer({ exerciseId, open, onOpenChange }: ExerciseDrawerProps) {
  const { data: session } = useSession()

  // Fetch exercise data with React Query (only when drawer is open)
  const { data: exercise, isLoading, error } = useExercise(open ? exerciseId : null)

  // Check if current user is the owner
  const isOwner = session?.user?.id === exercise?.createdById
  const canEdit = isOwner && !exercise?.isDefault

  // Helper to safely get instructions as string array
  const getInstructions = (): string[] => {
    if (!exercise?.instructions) return []
    if (Array.isArray(exercise.instructions)) {
      return exercise.instructions as string[]
    }
    return []
  }

  const instructions = getInstructions()

  const handleEdit = () => {
    toast.info('Edit functionality coming soon')
  }

  const handleDelete = () => {
    toast.info('Delete functionality coming soon')
  }

  // Get difficulty color
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'BEGINNER':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
      case 'INTERMEDIATE':
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20'
      case 'ADVANCED':
        return 'bg-red-500/10 text-red-500 border-red-500/20'
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20'
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <div className="mx-auto w-full max-w-2xl overflow-y-auto">
          <DrawerHeader className="relative">
            <DrawerClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-4"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>

            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : error ? (
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <DrawerTitle>{error.message || 'Error Loading Exercise'}</DrawerTitle>
              </div>
            ) : exercise ? (
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <DrawerTitle className="flex-1 text-left">{exercise.name}</DrawerTitle>
                  {!exercise.isDefault && (
                    <Badge variant="secondary" className="text-xs">
                      Custom
                    </Badge>
                  )}
                </div>
                <DrawerDescription className="text-left">
                  {MuscleGroupLabels[exercise.primaryMuscleGroup]} •{' '}
                  {EquipmentTypeLabels[exercise.equipmentType]}
                </DrawerDescription>
              </div>
            ) : null}
          </DrawerHeader>

          <div className="px-4 pb-6">
            {isLoading ? (
              <LoadingSkeleton />
            ) : error ? (
              <ErrorState error={error.message} onClose={() => onOpenChange(false)} />
            ) : exercise ? (
              <Tabs defaultValue="details" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="instructions">Instructions</TabsTrigger>
                  <TabsTrigger value="history">History</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-4">
                  {/* Description */}
                  {exercise.description && (
                    <div>
                      <p className="text-sm text-muted-foreground">{exercise.description}</p>
                    </div>
                  )}

                  <Separator />

                  {/* Categorization Grid */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <DetailItem
                      label="Primary Muscle"
                      value={MuscleGroupLabels[exercise.primaryMuscleGroup]}
                    />

                    {exercise.secondaryMuscleGroups &&
                      exercise.secondaryMuscleGroups.length > 0 && (
                        <DetailItem
                          label="Secondary Muscles"
                          value={exercise.secondaryMuscleGroups
                            .map((mg) => MuscleGroupLabels[mg])
                            .join(', ')}
                        />
                      )}

                    <DetailItem
                      label="Equipment"
                      value={EquipmentTypeLabels[exercise.equipmentType]}
                    />

                    <DetailItem
                      label="Exercise Type"
                      value={ExerciseTypeLabels[exercise.exerciseType]}
                    />

                    <DetailItem
                      label="Difficulty"
                      value={
                        <Badge
                          variant="outline"
                          className={getDifficultyColor(exercise.difficultyLevel)}
                        >
                          {DifficultyLevelLabels[exercise.difficultyLevel]}
                        </Badge>
                      }
                    />

                    <DetailItem
                      label="Movement Pattern"
                      value={MovementPatternLabels[exercise.movementPattern]}
                    />

                    <DetailItem label="Metric Type" value={MetricTypeLabels[exercise.metricType]} />

                    {exercise.createdBy && (
                      <DetailItem
                        label="Created By"
                        value={exercise.createdBy.name || exercise.createdBy.email}
                      />
                    )}
                  </div>

                  {/* Owner Actions */}
                  {canEdit && (
                    <>
                      <Separator />
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleEdit}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleDelete}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="instructions" className="space-y-4">
                  {instructions.length > 0 ? (
                    <ol className="space-y-3">
                      {instructions.map((instruction, index) => (
                        <li key={index} className="flex gap-3">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                            {index + 1}
                          </span>
                          <p className="flex-1 text-sm">{instruction}</p>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <EmptyState
                      icon={<Dumbbell className="h-12 w-12 text-muted-foreground" />}
                      title="No instructions available"
                      description="This exercise does not have step-by-step instructions yet."
                    />
                  )}
                </TabsContent>

                <TabsContent value="history" className="space-y-4">
                  <EmptyState
                    icon={<Dumbbell className="h-12 w-12 text-muted-foreground" />}
                    title="Exercise history"
                    description="Complete workouts to see your exercise history, personal records, and performance trends."
                  />
                </TabsContent>
              </Tabs>
            ) : null}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

// Helper Components

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  )
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
      {icon}
      <h3 className="mb-2 mt-4 text-sm font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Separator />
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

function ErrorState({ error, onClose }: { error: string; onClose: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-destructive/50 bg-destructive/5 p-8 text-center">
      <AlertCircle className="h-12 w-12 text-destructive" />
      <h3 className="mb-2 mt-4 text-sm font-semibold">Failed to load exercise</h3>
      <p className="mb-4 text-sm text-muted-foreground">{error}</p>
      <Button variant="outline" onClick={onClose}>
        Close
      </Button>
    </div>
  )
}

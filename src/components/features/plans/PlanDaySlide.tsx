/**
 * Plan Day Slide
 *
 * A single training-day slide inside the plan detail carousel. Shows the day
 * header, a per-day muscle body map and sets-per-muscle-group breakdown, and
 * the day's exercise list (with superset indicators).
 */

'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MuscleGroupBody } from '@/components/features/workouts/MuscleGroupBody'
import { MuscleGroupSetCounts } from '@/components/features/workouts/MuscleGroupSetCounts'
import { computeMuscleGroupSetCounts } from '@/lib/analytics/muscle-set-counts'
import { SupersetManager, createSupersetStyleResolver } from '@/lib/superset-manager'
import { cn } from '@/lib/utils'
import type { PlanWithDetails, PlanDayExerciseWithExercise } from '@/types/plan'

const supersetManager = new SupersetManager<PlanDayExerciseWithExercise>()

interface PlanDaySlideProps {
  day: PlanWithDetails['days'][number]
}

export function PlanDaySlide({ day }: PlanDaySlideProps) {
  const getSupersetStyle = createSupersetStyleResolver(day.exercises)
  const hasExercises = day.exercises.length > 0

  const muscleSetCounts = computeMuscleGroupSetCounts(
    day.exercises.map((e) => ({
      sets: e.sets,
      primaryMuscleGroup: e.exercise.primaryMuscleGroup,
      secondaryMuscleGroups: e.exercise.secondaryMuscleGroups,
    }))
  )

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg">
          Day {day.dayNumber}
          {day.label && (
            <span className="ml-2 text-muted-foreground font-normal">- {day.label}</span>
          )}
        </CardTitle>
        <CardDescription>
          {day.exercises.length} exercise{day.exercises.length !== 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Per-day muscle analytics */}
        {hasExercises && (
          <>
            <div className="flex justify-center">
              <MuscleGroupBody
                size="smd"
                exercises={day.exercises.map((e) => ({
                  primaryMuscleGroup: e.exercise.primaryMuscleGroup,
                  secondaryMuscleGroups: e.exercise.secondaryMuscleGroups ?? [],
                }))}
              />
            </div>
            <MuscleGroupSetCounts counts={muscleSetCounts} />
          </>
        )}

        {/* Exercise list */}
        {!hasExercises ? (
          <p className="text-sm text-muted-foreground italic">No exercises added yet</p>
        ) : (
          <div className="space-y-2">
            {day.exercises.map((exercise, index) => {
              const supersetInfo = supersetManager.getSupersetInfo(day.exercises, index)
              const supersetStyle = getSupersetStyle(exercise.groupId)

              return (
                <div
                  key={exercise.id}
                  className="relative flex items-center gap-3 rounded-lg border p-3"
                >
                  {/* Superset indicator */}
                  {supersetInfo.isInSuperset && supersetStyle && (
                    <div
                      className={cn(
                        `absolute left-0 w-1 ${supersetStyle.colors.line}`,
                        supersetInfo.isFirstInSuperset && 'rounded-t-full top-0 -bottom-2',
                        supersetInfo.isLastInSuperset && 'rounded-b-full -top-2 bottom-0',
                        !supersetInfo.isFirstInSuperset &&
                          !supersetInfo.isLastInSuperset &&
                          '-top-1 -bottom-1'
                      )}
                    />
                  )}

                  <span className="text-lg font-bold text-muted-foreground w-6 text-center">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{exercise.exercise.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {exercise.sets} sets
                      {exercise.reps ? ` x ${exercise.reps} reps` : ''}
                      {exercise.weight ? ` @ ${exercise.weight}kg` : ''}
                    </div>
                  </div>
                  {supersetInfo.isInSuperset && supersetStyle && (
                    <Badge
                      variant="outline"
                      className={`text-xs ${supersetStyle.colors.bg} ${supersetStyle.colors.text} ${supersetStyle.colors.border}`}
                    >
                      {supersetStyle.label}
                    </Badge>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

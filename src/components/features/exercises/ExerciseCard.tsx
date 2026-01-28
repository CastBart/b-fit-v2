import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  MuscleGroupLabels,
  EquipmentTypeLabels,
  DifficultyLevelLabels,
  type ExerciseEntity,
} from '@/types/exercise'
import { Dumbbell } from 'lucide-react'

interface ExerciseCardProps {
  exercise: ExerciseEntity
  onClick?: () => void
}

export function ExerciseCard({ exercise, onClick }: ExerciseCardProps) {
  const isCustomExercise = !exercise.isDefault

  return (
    <Card
      className="group cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        {/* Image Placeholder */}
        <div className="mb-3 flex h-32 items-center justify-center rounded-md bg-muted">
          <Dumbbell className="h-12 w-12 text-muted-foreground" />
        </div>

        {/* Exercise Name */}
        <CardTitle className="line-clamp-2 text-lg">{exercise.name}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Primary Muscle Group */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Muscle Group</span>
          <Badge variant="secondary">{MuscleGroupLabels[exercise.primaryMuscleGroup]}</Badge>
        </div>

        {/* Equipment Type */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Equipment</span>
          <Badge variant="outline">{EquipmentTypeLabels[exercise.equipmentType]}</Badge>
        </div>

        {/* Difficulty Level */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Difficulty</span>
          <Badge
            variant={
              exercise.difficultyLevel === 'BEGINNER'
                ? 'default'
                : exercise.difficultyLevel === 'INTERMEDIATE'
                  ? 'secondary'
                  : 'destructive'
            }
          >
            {DifficultyLevelLabels[exercise.difficultyLevel]}
          </Badge>
        </div>

        {/* Custom Exercise Badge */}
        {isCustomExercise && (
          <div className="pt-2">
            <Badge variant="outline" className="w-full justify-center">
              Custom Exercise
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

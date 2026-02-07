/**
 * Exercise Form Component
 *
 * Form for creating/editing exercises.
 * Uses react-hook-form with zod validation.
 */

'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  MuscleGroup,
  EquipmentType,
  MovementPattern,
  DifficultyLevel,
  ExerciseType,
  MetricType,
} from '@prisma/client'
import { createExerciseSchema, type CreateExerciseInput } from '@/lib/validations/exercise'
import {
  MuscleGroupLabels,
  EquipmentTypeLabels,
  MovementPatternLabels,
  DifficultyLevelLabels,
  ExerciseTypeLabels,
  MetricTypeLabels,
} from '@/types/exercise'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { InstructionsField } from './InstructionsField'

// Form values type that matches what useForm expects (with all defaults applied)
type ExerciseFormValues = z.input<typeof createExerciseSchema>

interface ExerciseFormProps {
  onSubmit: (data: CreateExerciseInput) => void
  onCancel: () => void
  isSubmitting?: boolean
  defaultValues?: Partial<ExerciseFormValues>
}

export function ExerciseForm({
  onSubmit,
  onCancel,
  isSubmitting,
  defaultValues,
}: ExerciseFormProps) {
  const form = useForm<ExerciseFormValues>({
    resolver: zodResolver(createExerciseSchema),
    defaultValues: {
      name: '',
      description: '',
      primaryMuscleGroup: MuscleGroup.CHEST,
      secondaryMuscleGroups: [],
      equipmentType: EquipmentType.BARBELL,
      movementPattern: MovementPattern.PUSH,
      difficultyLevel: DifficultyLevel.INTERMEDIATE,
      exerciseType: ExerciseType.MEDIUM,
      metricType: MetricType.WEIGHT_REPS,
      instructions: [],
      isPublic: false,
      ...defaultValues,
    },
  })

  const handleSubmit = (data: ExerciseFormValues) => {
    // Filter out empty instructions
    const filteredInstructions = data.instructions?.filter((i) => i.trim() !== '') || []
    onSubmit({
      ...data,
      instructions: filteredInstructions.length > 0 ? filteredInstructions : undefined,
    } as CreateExerciseInput)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Name */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name *</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Bench Press" {...field} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Brief description of the exercise..."
                  {...field}
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Primary Muscle Group */}
        <FormField
          control={form.control}
          name="primaryMuscleGroup"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Primary Muscle Group *</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isSubmitting}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select muscle group" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.entries(MuscleGroupLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Equipment Type */}
        <FormField
          control={form.control}
          name="equipmentType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Equipment *</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isSubmitting}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select equipment" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.entries(EquipmentTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Movement Pattern */}
        <FormField
          control={form.control}
          name="movementPattern"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Movement Pattern *</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isSubmitting}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select pattern" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.entries(MovementPatternLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Difficulty Level */}
        <FormField
          control={form.control}
          name="difficultyLevel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Difficulty *</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isSubmitting}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.entries(DifficultyLevelLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Exercise Type */}
        <FormField
          control={form.control}
          name="exerciseType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Exercise Type *</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isSubmitting}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.entries(ExerciseTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Metric Type */}
        <FormField
          control={form.control}
          name="metricType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Metric Type *</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isSubmitting}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select metric type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.entries(MetricTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>Determines what data is tracked for sets</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Instructions */}
        <FormField
          control={form.control}
          name="instructions"
          render={({ field }) => (
            <FormItem>
              <InstructionsField
                value={field.value || []}
                onChange={field.onChange}
                disabled={isSubmitting}
                error={form.formState.errors.instructions?.message}
              />
            </FormItem>
          )}
        />

        {/* Is Public */}
        <FormField
          control={form.control}
          name="isPublic"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Public Exercise</FormLabel>
                <FormDescription>Make this exercise visible to all users</FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isSubmitting}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="flex-1">
            {isSubmitting ? 'Creating...' : 'Create Exercise'}
          </Button>
        </div>
      </form>
    </Form>
  )
}

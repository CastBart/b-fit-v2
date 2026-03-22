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
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, X } from 'lucide-react'
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
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 p-2">
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

        {/* Secondary Muscle Groups */}
        <FormField
          control={form.control}
          name="secondaryMuscleGroups"
          render={({ field }) => {
            const selectedPrimary = form.watch('primaryMuscleGroup')
            const availableGroups = Object.entries(MuscleGroupLabels).filter(
              ([value]) => value !== selectedPrimary
            )
            const selected = field.value || []

            const toggleGroup = (group: MuscleGroup) => {
              if (selected.includes(group)) {
                field.onChange(selected.filter((g: MuscleGroup) => g !== group))
              } else {
                field.onChange([...selected, group])
              }
            }

            const removeGroup = (group: MuscleGroup) => {
              field.onChange(selected.filter((g: MuscleGroup) => g !== group))
            }

            return (
              <FormItem>
                <FormLabel>Secondary Muscle Groups</FormLabel>
                {selected.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selected.map((group: MuscleGroup) => (
                      <Badge key={group} variant="secondary" className="gap-1 pr-1">
                        {MuscleGroupLabels[group]}
                        <button
                          type="button"
                          onClick={() => removeGroup(group)}
                          className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild className="shadow-xs">
                    <FormControl>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1"
                      >
                        <span className={selected.length > 0 ? '' : 'text-muted-foreground'}>
                          {selected.length > 0
                            ? `${selected.length} selected`
                            : 'Select secondary muscles'}
                        </span>
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </button>
                    </FormControl>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="max-h-[200px] overflow-y-auto"
                    align="start"
                    style={{ minWidth: 'var(--radix-dropdown-menu-trigger-width)' }}
                  >
                    {availableGroups.map(([value, label]) => (
                      <DropdownMenuCheckboxItem
                        key={value}
                        checked={selected.includes(value as MuscleGroup)}
                        onCheckedChange={() => toggleGroup(value as MuscleGroup)}
                        onSelect={(e) => e.preventDefault()}
                      >
                        {label}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <FormMessage />
              </FormItem>
            )
          }}
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

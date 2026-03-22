'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import {
  Dumbbell,
  Disc3,
  Settings2,
  Workflow,
  PersonStanding,
  Waves,
  ArrowUpDown,
  Activity,
  Focus,
  Layers,
  Flame,
  Anchor,
  HeartPulse,
  ArrowRight,
  ArrowLeft,
  ArrowDownUp,
  RotateCcw,
  Package,
  Circle,
  Footprints,
  Zap,
} from 'lucide-react'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { ExerciseFilterDialog } from './ExerciseFilterDialog'
import { MuscleGroupIcon } from './MuscleGroupIcon'
import {
  MuscleGroup,
  EquipmentType,
  ExerciseType,
  DifficultyLevel,
  MovementPattern,
  MuscleGroupLabels,
  EquipmentTypeLabels,
  ExerciseTypeLabels,
  DifficultyLevelLabels,
  MovementPatternLabels,
} from '@/types/exercise'

type OpenDialog = 'muscleGroups' | 'exerciseTypes' | 'equipment' | 'difficulty' | 'movement' | null

interface ExerciseFilterDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  nested?: boolean
  muscleGroups: MuscleGroup[]
  exerciseTypes: ExerciseType[]
  equipmentTypes: EquipmentType[]
  difficultyLevels: DifficultyLevel[]
  movementPatterns: MovementPattern[]
  onMuscleGroupsChange: (values: MuscleGroup[]) => void
  onExerciseTypesChange: (values: ExerciseType[]) => void
  onEquipmentTypesChange: (values: EquipmentType[]) => void
  onDifficultyLevelsChange: (values: DifficultyLevel[]) => void
  onMovementPatternsChange: (values: MovementPattern[]) => void
  onClearAll: () => void
}

function DifficultyBars({ level }: { level: string }) {
  const count = level === 'BEGINNER' ? 1 : level === 'INTERMEDIATE' ? 2 : 3
  return (
    <div className="flex gap-1.5">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className={cn('h-3 w-8 rounded-full', i <= count ? 'bg-primary' : 'bg-muted')}
        />
      ))}
    </div>
  )
}

const CARD_ICON_SIZE = 32

const muscleGroupOptions = Object.entries(MuscleGroupLabels).map(([value, label]) => ({
  value,
  label,
  icon: (
    <div className="h-full w-full">
      <MuscleGroupIcon muscleGroup={value as MuscleGroup} />
    </div>
  ),
}))

const equipmentOptions = Object.entries(EquipmentTypeLabels).map(([value, label]) => {
  const iconMap: Record<string, React.ReactNode> = {
    BARBELL: <Dumbbell size={CARD_ICON_SIZE} />,
    DUMBBELL: <Dumbbell size={CARD_ICON_SIZE} />,
    KETTLEBELL: <Disc3 size={CARD_ICON_SIZE} />,
    MACHINE: <Settings2 size={CARD_ICON_SIZE} />,
    CABLE: <Workflow size={CARD_ICON_SIZE} />,
    BODYWEIGHT: <PersonStanding size={CARD_ICON_SIZE} />,
    RESISTANCE_BAND: <Waves size={CARD_ICON_SIZE} />,
    TRX: <ArrowUpDown size={CARD_ICON_SIZE} />,
    CARDIO_EQUIPMENT: <Activity size={CARD_ICON_SIZE} />,
  }
  return { value, label, icon: iconMap[value] }
})

const exerciseTypeOptions = Object.entries(ExerciseTypeLabels).map(([value, label]) => {
  const iconMap: Record<string, React.ReactNode> = {
    SMALL: <Focus size={CARD_ICON_SIZE} />,
    MEDIUM: <Layers size={CARD_ICON_SIZE} />,
    LARGE: <Flame size={CARD_ICON_SIZE} />,
    STABILITY: <Anchor size={CARD_ICON_SIZE} />,
    CARDIO: <HeartPulse size={CARD_ICON_SIZE} />,
  }
  return { value, label, icon: iconMap[value] }
})

const difficultyOptions = Object.entries(DifficultyLevelLabels).map(([value, label]) => ({
  value,
  label,
  icon: <DifficultyBars level={value} />,
}))

const movementOptions = Object.entries(MovementPatternLabels).map(([value, label]) => {
  const iconMap: Record<string, React.ReactNode> = {
    PUSH: <ArrowRight size={CARD_ICON_SIZE} />,
    PULL: <ArrowLeft size={CARD_ICON_SIZE} />,
    SQUAT: <ArrowDownUp size={CARD_ICON_SIZE} />,
    HINGE: <RotateCcw size={CARD_ICON_SIZE} />,
    CARRY: <Package size={CARD_ICON_SIZE} />,
    CORE: <Circle size={CARD_ICON_SIZE} />,
    LUNGE: <Footprints size={CARD_ICON_SIZE} />,
    OLYMPIC: <Zap size={CARD_ICON_SIZE} />,
  }
  return { value, label, icon: iconMap[value] }
})

export function ExerciseFilterDrawer({
  open,
  onOpenChange,
  nested = false,
  muscleGroups,
  exerciseTypes,
  equipmentTypes,
  difficultyLevels,
  movementPatterns,
  onMuscleGroupsChange,
  onExerciseTypesChange,
  onEquipmentTypesChange,
  onDifficultyLevelsChange,
  onMovementPatternsChange,
  onClearAll,
}: ExerciseFilterDrawerProps) {
  const [openDialog, setOpenDialog] = useState<OpenDialog>(null)

  const hasActiveFilters =
    muscleGroups.length > 0 ||
    exerciseTypes.length > 0 ||
    equipmentTypes.length > 0 ||
    difficultyLevels.length > 0 ||
    movementPatterns.length > 0

  const filterSections: {
    key: OpenDialog
    label: string
    count: number
    chips: { label: string; onRemove: () => void }[]
  }[] = [
    {
      key: 'muscleGroups',
      label: 'Muscle Group',
      count: muscleGroups.length,
      chips: muscleGroups.map((v) => ({
        label: MuscleGroupLabels[v],
        onRemove: () => onMuscleGroupsChange(muscleGroups.filter((x) => x !== v)),
      })),
    },
    {
      key: 'exerciseTypes',
      label: 'Exercise Type',
      count: exerciseTypes.length,
      chips: exerciseTypes.map((v) => ({
        label: ExerciseTypeLabels[v],
        onRemove: () => onExerciseTypesChange(exerciseTypes.filter((x) => x !== v)),
      })),
    },
    {
      key: 'equipment',
      label: 'Equipment',
      count: equipmentTypes.length,
      chips: equipmentTypes.map((v) => ({
        label: EquipmentTypeLabels[v],
        onRemove: () => onEquipmentTypesChange(equipmentTypes.filter((x) => x !== v)),
      })),
    },
    {
      key: 'difficulty',
      label: 'Difficulty',
      count: difficultyLevels.length,
      chips: difficultyLevels.map((v) => ({
        label: DifficultyLevelLabels[v],
        onRemove: () => onDifficultyLevelsChange(difficultyLevels.filter((x) => x !== v)),
      })),
    },
    {
      key: 'movement',
      label: 'Movement Pattern',
      count: movementPatterns.length,
      chips: movementPatterns.map((v) => ({
        label: MovementPatternLabels[v],
        onRemove: () => onMovementPatternsChange(movementPatterns.filter((x) => x !== v)),
      })),
    },
  ]

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange} nested={nested}>
        <DrawerContent className="custom-drawer-no-height justify-self-center">
          <DrawerHeader className="flex flex-row items-center justify-between border-b pb-4">
            <DrawerTitle>Filters</DrawerTitle>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearAll}
                className="text-muted-foreground hover:text-foreground"
              >
                Clear all
              </Button>
            )}
          </DrawerHeader>

          <ScrollArea className="max-h-[60vh]">
            <div className="divide-y px-4">
              {filterSections.map(({ key, label, count, chips }) => (
                <div key={key} className="py-4">
                  {/* Filter type button */}
                  <Button
                    variant="outline"
                    className="w-full justify-between"
                    onClick={() => setOpenDialog(key)}
                  >
                    <span>{label}</span>
                    {count > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                        {count}
                      </span>
                    )}
                  </Button>

                  {/* Active chips for this filter type */}
                  {chips.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {chips.map(({ label: chipLabel, onRemove }) => (
                        <Badge key={chipLabel} variant="secondary" className="gap-1 pr-1 text-xs">
                          {chipLabel}
                          <button
                            type="button"
                            onClick={onRemove}
                            className="ml-0.5 rounded-sm hover:text-destructive"
                            aria-label={`Remove ${chipLabel} filter`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </DrawerContent>
      </Drawer>

      {/*
        Dialogs are rendered OUTSIDE DrawerContent so they portal to document.body
        independently. Since the dialog portal is appended after the drawer portal,
        it naturally stacks on top (same z-index, later DOM order wins).
      */}
      <ExerciseFilterDialog
        title="Muscle Group"
        options={muscleGroupOptions}
        selected={muscleGroups}
        onSelect={(v) => onMuscleGroupsChange(v as MuscleGroup[])}
        open={openDialog === 'muscleGroups'}
        onOpenChange={(o) => setOpenDialog(o ? 'muscleGroups' : null)}
      />
      <ExerciseFilterDialog
        title="Exercise Type"
        options={exerciseTypeOptions}
        selected={exerciseTypes}
        onSelect={(v) => onExerciseTypesChange(v as ExerciseType[])}
        open={openDialog === 'exerciseTypes'}
        onOpenChange={(o) => setOpenDialog(o ? 'exerciseTypes' : null)}
      />
      <ExerciseFilterDialog
        title="Equipment"
        options={equipmentOptions}
        selected={equipmentTypes}
        onSelect={(v) => onEquipmentTypesChange(v as EquipmentType[])}
        open={openDialog === 'equipment'}
        onOpenChange={(o) => setOpenDialog(o ? 'equipment' : null)}
      />
      <ExerciseFilterDialog
        title="Difficulty"
        options={difficultyOptions}
        selected={difficultyLevels}
        onSelect={(v) => onDifficultyLevelsChange(v as DifficultyLevel[])}
        open={openDialog === 'difficulty'}
        onOpenChange={(o) => setOpenDialog(o ? 'difficulty' : null)}
      />
      <ExerciseFilterDialog
        title="Movement Pattern"
        options={movementOptions}
        selected={movementPatterns}
        onSelect={(v) => onMovementPatternsChange(v as MovementPattern[])}
        open={openDialog === 'movement'}
        onOpenChange={(o) => setOpenDialog(o ? 'movement' : null)}
      />
    </>
  )
}

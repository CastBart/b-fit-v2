/**
 * Prisma Seed Script
 *
 * Seeds the database with default exercises covering all muscle groups,
 * equipment types, and exercise types.
 */

import {
  PrismaClient,
  MuscleGroup,
  EquipmentType,
  MovementPattern,
  DifficultyLevel,
  ExerciseType,
  MetricType,
} from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // ============================================================================
  // CHEST EXERCISES
  // ============================================================================

  const chestExercises = [
    {
      name: 'Barbell Bench Press',
      description: 'Classic compound chest exercise using a barbell',
      primaryMuscleGroup: MuscleGroup.CHEST,
      secondaryMuscleGroups: [MuscleGroup.TRICEPS, MuscleGroup.FRONT_DELTS],
      equipmentType: EquipmentType.BARBELL,
      movementPattern: MovementPattern.PUSH,
      difficultyLevel: DifficultyLevel.INTERMEDIATE,
      exerciseType: ExerciseType.LARGE,
      metricType: MetricType.WEIGHT_REPS,
      instructions: [
        'Lie flat on bench with feet planted on floor',
        'Grip bar slightly wider than shoulder width',
        'Lower bar to mid-chest with control',
        'Press bar up until arms are fully extended',
        'Keep shoulder blades retracted throughout',
      ],
      isDefault: true,
    },
    {
      name: 'Dumbbell Bench Press',
      description: 'Chest press variation using dumbbells for greater range of motion',
      primaryMuscleGroup: MuscleGroup.CHEST,
      secondaryMuscleGroups: [MuscleGroup.TRICEPS, MuscleGroup.FRONT_DELTS],
      equipmentType: EquipmentType.DUMBBELL,
      movementPattern: MovementPattern.PUSH,
      difficultyLevel: DifficultyLevel.INTERMEDIATE,
      exerciseType: ExerciseType.LARGE,
      metricType: MetricType.WEIGHT_REPS,
      instructions: [
        'Lie on bench with dumbbells at chest level',
        'Press dumbbells up until arms are extended',
        'Lower with control to stretch position',
        'Allow dumbbells to come slightly below chest level',
      ],
      isDefault: true,
    },
    {
      name: 'Incline Barbell Bench Press',
      description: 'Upper chest focused bench press on incline',
      primaryMuscleGroup: MuscleGroup.CHEST,
      secondaryMuscleGroups: [MuscleGroup.FRONT_DELTS, MuscleGroup.TRICEPS],
      equipmentType: EquipmentType.BARBELL,
      movementPattern: MovementPattern.PUSH,
      difficultyLevel: DifficultyLevel.INTERMEDIATE,
      exerciseType: ExerciseType.LARGE,
      metricType: MetricType.WEIGHT_REPS,
      instructions: [
        'Set bench to 30-45 degree incline',
        'Grip bar slightly wider than shoulders',
        'Lower to upper chest',
        'Press up explosively',
      ],
      isDefault: true,
    },
    {
      name: 'Push-Ups',
      description: 'Bodyweight chest exercise',
      primaryMuscleGroup: MuscleGroup.CHEST,
      secondaryMuscleGroups: [MuscleGroup.TRICEPS, MuscleGroup.FRONT_DELTS, MuscleGroup.CORE],
      equipmentType: EquipmentType.BODYWEIGHT,
      movementPattern: MovementPattern.PUSH,
      difficultyLevel: DifficultyLevel.BEGINNER,
      exerciseType: ExerciseType.MEDIUM,
      metricType: MetricType.REPS,
      instructions: [
        'Start in plank position with hands shoulder-width',
        'Lower body until chest nearly touches floor',
        'Keep core tight and body straight',
        'Push back up to starting position',
      ],
      isDefault: true,
    },
    {
      name: 'Cable Chest Fly',
      description: 'Isolation exercise for chest using cables',
      primaryMuscleGroup: MuscleGroup.CHEST,
      secondaryMuscleGroups: [],
      equipmentType: EquipmentType.CABLE,
      movementPattern: MovementPattern.PUSH,
      difficultyLevel: DifficultyLevel.BEGINNER,
      exerciseType: ExerciseType.SMALL,
      metricType: MetricType.WEIGHT_REPS,
      instructions: [
        'Set cables to shoulder height',
        'Step forward with slight lean',
        'Bring hands together in front of chest',
        'Return to starting position with control',
      ],
      isDefault: true,
    },
  ]

  // ============================================================================
  // BACK EXERCISES
  // ============================================================================

  const backExercises = [
    {
      name: 'Barbell Bent-Over Row',
      description: 'Compound rowing movement for overall back development',
      primaryMuscleGroup: MuscleGroup.UPPER_BACK,
      secondaryMuscleGroups: [MuscleGroup.BICEPS, MuscleGroup.CORE],
      equipmentType: EquipmentType.BARBELL,
      movementPattern: MovementPattern.PULL,
      difficultyLevel: DifficultyLevel.INTERMEDIATE,
      exerciseType: ExerciseType.LARGE,
      metricType: MetricType.WEIGHT_REPS,
      instructions: [
        'Hinge at hips with slight knee bend',
        'Grip bar at shoulder width',
        'Pull bar to lower chest',
        'Keep back flat throughout movement',
        'Lower with control',
      ],
      isDefault: true,
    },
    {
      name: 'Pull-Ups',
      description: 'Bodyweight vertical pulling exercise',
      primaryMuscleGroup: MuscleGroup.LATS,
      secondaryMuscleGroups: [MuscleGroup.BICEPS],
      equipmentType: EquipmentType.BODYWEIGHT,
      movementPattern: MovementPattern.PULL,
      difficultyLevel: DifficultyLevel.ADVANCED,
      exerciseType: ExerciseType.LARGE,
      metricType: MetricType.REPS,
      instructions: [
        'Hang from bar with overhand grip',
        'Pull body up until chin clears bar',
        'Lower with control to full extension',
      ],
      isDefault: true,
    },
    {
      name: 'Lat Pulldown',
      description: 'Machine-based vertical pulling for lats',
      primaryMuscleGroup: MuscleGroup.LATS,
      secondaryMuscleGroups: [MuscleGroup.BICEPS],
      equipmentType: EquipmentType.MACHINE,
      movementPattern: MovementPattern.PULL,
      difficultyLevel: DifficultyLevel.BEGINNER,
      exerciseType: ExerciseType.LARGE,
      metricType: MetricType.WEIGHT_REPS,
      instructions: [
        'Sit with thighs secured under pad',
        'Grip bar wider than shoulder width',
        'Pull bar down to upper chest',
        'Squeeze shoulder blades together',
        'Return to starting position',
      ],
      isDefault: true,
    },
    {
      name: 'Dumbbell Single-Arm Row',
      description: 'Unilateral rowing exercise',
      primaryMuscleGroup: MuscleGroup.LATS,
      secondaryMuscleGroups: [MuscleGroup.BICEPS],
      equipmentType: EquipmentType.DUMBBELL,
      movementPattern: MovementPattern.PULL,
      difficultyLevel: DifficultyLevel.BEGINNER,
      exerciseType: ExerciseType.MEDIUM,
      metricType: MetricType.WEIGHT_REPS,
      instructions: [
        'Place one hand and knee on bench',
        'Hold dumbbell in opposite hand',
        'Pull dumbbell to hip',
        'Lower with control',
      ],
      isDefault: true,
    },
    {
      name: 'Deadlift',
      description: 'King of compound exercises targeting entire posterior chain',
      primaryMuscleGroup: MuscleGroup.LOWER_BACK,
      secondaryMuscleGroups: [MuscleGroup.HAMSTRINGS, MuscleGroup.GLUTES, MuscleGroup.CORE],
      equipmentType: EquipmentType.BARBELL,
      movementPattern: MovementPattern.HINGE,
      difficultyLevel: DifficultyLevel.ADVANCED,
      exerciseType: ExerciseType.LARGE,
      metricType: MetricType.WEIGHT_REPS,
      instructions: [
        'Stand with feet hip-width, bar over mid-foot',
        'Bend down and grip bar outside legs',
        'Keep back flat, chest up',
        'Drive through heels to stand',
        'Extend hips and knees simultaneously',
        'Lower bar with control',
      ],
      isDefault: true,
    },
    {
      name: 'Seated Cable Row',
      description: 'Horizontal rowing using cable machine',
      primaryMuscleGroup: MuscleGroup.UPPER_BACK,
      secondaryMuscleGroups: [MuscleGroup.BICEPS],
      equipmentType: EquipmentType.CABLE,
      movementPattern: MovementPattern.PULL,
      difficultyLevel: DifficultyLevel.BEGINNER,
      exerciseType: ExerciseType.MEDIUM,
      metricType: MetricType.WEIGHT_REPS,
      instructions: [
        'Sit with feet on platform',
        'Grip handle with arms extended',
        'Pull handle to torso',
        'Squeeze shoulder blades together',
      ],
      isDefault: true,
    },
  ]

  // ============================================================================
  // SHOULDER EXERCISES
  // ============================================================================

  const shoulderExercises = [
    {
      name: 'Barbell Overhead Press',
      description: 'Compound overhead pressing movement',
      primaryMuscleGroup: MuscleGroup.FRONT_DELTS,
      secondaryMuscleGroups: [MuscleGroup.TRICEPS, MuscleGroup.CORE],
      equipmentType: EquipmentType.BARBELL,
      movementPattern: MovementPattern.PUSH,
      difficultyLevel: DifficultyLevel.INTERMEDIATE,
      exerciseType: ExerciseType.LARGE,
      metricType: MetricType.WEIGHT_REPS,
      instructions: [
        'Stand with bar at shoulder height',
        'Press bar overhead until arms extended',
        'Lower with control to shoulders',
        'Keep core tight throughout',
      ],
      isDefault: true,
    },
    {
      name: 'Dumbbell Shoulder Press',
      description: 'Overhead press using dumbbells',
      primaryMuscleGroup: MuscleGroup.FRONT_DELTS,
      secondaryMuscleGroups: [MuscleGroup.TRICEPS],
      equipmentType: EquipmentType.DUMBBELL,
      movementPattern: MovementPattern.PUSH,
      difficultyLevel: DifficultyLevel.BEGINNER,
      exerciseType: ExerciseType.MEDIUM,
      metricType: MetricType.WEIGHT_REPS,
      instructions: [
        'Sit or stand with dumbbells at shoulder height',
        'Press dumbbells overhead',
        'Lower to starting position',
      ],
      isDefault: true,
    },
    {
      name: 'Lateral Raise',
      description: 'Isolation exercise for side delts',
      primaryMuscleGroup: MuscleGroup.SIDE_DELTS,
      secondaryMuscleGroups: [],
      equipmentType: EquipmentType.DUMBBELL,
      movementPattern: MovementPattern.PUSH,
      difficultyLevel: DifficultyLevel.BEGINNER,
      exerciseType: ExerciseType.SMALL,
      metricType: MetricType.WEIGHT_REPS,
      instructions: [
        'Stand with dumbbells at sides',
        'Raise arms out to sides to shoulder height',
        'Lower with control',
        'Keep slight bend in elbows',
      ],
      isDefault: true,
    },
    {
      name: 'Face Pulls',
      description: 'Rear delt and upper back exercise',
      primaryMuscleGroup: MuscleGroup.REAR_DELTS,
      secondaryMuscleGroups: [MuscleGroup.UPPER_BACK],
      equipmentType: EquipmentType.CABLE,
      movementPattern: MovementPattern.PULL,
      difficultyLevel: DifficultyLevel.BEGINNER,
      exerciseType: ExerciseType.SMALL,
      metricType: MetricType.WEIGHT_REPS,
      instructions: [
        'Set cable to upper chest height',
        'Pull rope towards face',
        'Separate hands at end of movement',
        'Focus on rear delts',
      ],
      isDefault: true,
    },
  ]

  // ============================================================================
  // ARM EXERCISES (BICEPS & TRICEPS)
  // ============================================================================

  const armExercises = [
    {
      name: 'Barbell Bicep Curl',
      description: 'Classic bicep building exercise',
      primaryMuscleGroup: MuscleGroup.BICEPS,
      secondaryMuscleGroups: [],
      equipmentType: EquipmentType.BARBELL,
      movementPattern: MovementPattern.PULL,
      difficultyLevel: DifficultyLevel.BEGINNER,
      exerciseType: ExerciseType.SMALL,
      metricType: MetricType.WEIGHT_REPS,
      instructions: [
        'Stand with barbell at arms length',
        'Curl bar up to shoulders',
        'Keep elbows stationary',
        'Lower with control',
      ],
      isDefault: true,
    },
    {
      name: 'Dumbbell Hammer Curl',
      description: 'Bicep curl variation targeting brachialis',
      primaryMuscleGroup: MuscleGroup.BICEPS,
      secondaryMuscleGroups: [],
      equipmentType: EquipmentType.DUMBBELL,
      movementPattern: MovementPattern.PULL,
      difficultyLevel: DifficultyLevel.BEGINNER,
      exerciseType: ExerciseType.SMALL,
      metricType: MetricType.WEIGHT_REPS,
      instructions: [
        'Hold dumbbells with neutral grip',
        'Curl up keeping palms facing each other',
        'Lower with control',
      ],
      isDefault: true,
    },
    {
      name: 'Tricep Dips',
      description: 'Bodyweight tricep exercise',
      primaryMuscleGroup: MuscleGroup.TRICEPS,
      secondaryMuscleGroups: [MuscleGroup.CHEST, MuscleGroup.FRONT_DELTS],
      equipmentType: EquipmentType.BODYWEIGHT,
      movementPattern: MovementPattern.PUSH,
      difficultyLevel: DifficultyLevel.INTERMEDIATE,
      exerciseType: ExerciseType.MEDIUM,
      metricType: MetricType.REPS,
      instructions: [
        'Support body on parallel bars',
        'Lower body by bending elbows',
        'Push back up to starting position',
        'Keep torso upright for tricep focus',
      ],
      isDefault: true,
    },
    {
      name: 'Overhead Tricep Extension',
      description: 'Isolation exercise for triceps',
      primaryMuscleGroup: MuscleGroup.TRICEPS,
      secondaryMuscleGroups: [],
      equipmentType: EquipmentType.DUMBBELL,
      movementPattern: MovementPattern.PUSH,
      difficultyLevel: DifficultyLevel.BEGINNER,
      exerciseType: ExerciseType.SMALL,
      metricType: MetricType.WEIGHT_REPS,
      instructions: [
        'Hold dumbbell overhead with both hands',
        'Lower behind head by bending elbows',
        'Extend arms back to starting position',
        'Keep elbows pointing forward',
      ],
      isDefault: true,
    },
    {
      name: 'Cable Tricep Pushdown',
      description: 'Cable exercise for triceps',
      primaryMuscleGroup: MuscleGroup.TRICEPS,
      secondaryMuscleGroups: [],
      equipmentType: EquipmentType.CABLE,
      movementPattern: MovementPattern.PUSH,
      difficultyLevel: DifficultyLevel.BEGINNER,
      exerciseType: ExerciseType.SMALL,
      metricType: MetricType.WEIGHT_REPS,
      instructions: [
        'Stand facing cable machine',
        'Grip bar with overhand grip',
        'Push bar down until arms extended',
        'Return to starting position',
      ],
      isDefault: true,
    },
  ]

  // ============================================================================
  // LEG EXERCISES (QUADS, HAMSTRINGS, GLUTES, CALVES)
  // ============================================================================

  const legExercises = [
    {
      name: 'Barbell Back Squat',
      description: 'King of leg exercises',
      primaryMuscleGroup: MuscleGroup.QUADS,
      secondaryMuscleGroups: [MuscleGroup.GLUTES, MuscleGroup.HAMSTRINGS, MuscleGroup.CORE],
      equipmentType: EquipmentType.BARBELL,
      movementPattern: MovementPattern.SQUAT,
      difficultyLevel: DifficultyLevel.INTERMEDIATE,
      exerciseType: ExerciseType.LARGE,
      metricType: MetricType.WEIGHT_REPS,
      instructions: [
        'Position bar on upper back',
        'Feet shoulder-width apart',
        'Descend by bending knees and hips',
        'Keep chest up and back straight',
        'Drive through heels to stand',
      ],
      isDefault: true,
    },
    {
      name: 'Front Squat',
      description: 'Quad-focused squat variation',
      primaryMuscleGroup: MuscleGroup.QUADS,
      secondaryMuscleGroups: [MuscleGroup.GLUTES, MuscleGroup.CORE],
      equipmentType: EquipmentType.BARBELL,
      movementPattern: MovementPattern.SQUAT,
      difficultyLevel: DifficultyLevel.ADVANCED,
      exerciseType: ExerciseType.LARGE,
      metricType: MetricType.WEIGHT_REPS,
      instructions: [
        'Position bar on front of shoulders',
        'Keep elbows high',
        'Squat down while keeping torso upright',
        'Drive back up',
      ],
      isDefault: true,
    },
    {
      name: 'Romanian Deadlift',
      description: 'Hip hinge movement targeting hamstrings',
      primaryMuscleGroup: MuscleGroup.HAMSTRINGS,
      secondaryMuscleGroups: [MuscleGroup.GLUTES, MuscleGroup.LOWER_BACK],
      equipmentType: EquipmentType.BARBELL,
      movementPattern: MovementPattern.HINGE,
      difficultyLevel: DifficultyLevel.INTERMEDIATE,
      exerciseType: ExerciseType.LARGE,
      metricType: MetricType.WEIGHT_REPS,
      instructions: [
        'Hold bar at hip level',
        'Hinge at hips pushing them back',
        'Lower bar along legs',
        'Feel stretch in hamstrings',
        'Return to starting position',
      ],
      isDefault: true,
    },
    {
      name: 'Leg Press',
      description: 'Machine-based leg exercise',
      primaryMuscleGroup: MuscleGroup.QUADS,
      secondaryMuscleGroups: [MuscleGroup.GLUTES, MuscleGroup.HAMSTRINGS],
      equipmentType: EquipmentType.MACHINE,
      movementPattern: MovementPattern.SQUAT,
      difficultyLevel: DifficultyLevel.BEGINNER,
      exerciseType: ExerciseType.LARGE,
      metricType: MetricType.WEIGHT_REPS,
      instructions: [
        'Sit in machine with feet on platform',
        'Lower platform by bending knees',
        'Push back to starting position',
      ],
      isDefault: true,
    },
    {
      name: 'Walking Lunges',
      description: 'Dynamic unilateral leg exercise',
      primaryMuscleGroup: MuscleGroup.QUADS,
      secondaryMuscleGroups: [MuscleGroup.GLUTES, MuscleGroup.HAMSTRINGS],
      equipmentType: EquipmentType.DUMBBELL,
      movementPattern: MovementPattern.LUNGE,
      difficultyLevel: DifficultyLevel.INTERMEDIATE,
      exerciseType: ExerciseType.MEDIUM,
      metricType: MetricType.WEIGHT_REPS,
      instructions: [
        'Step forward into lunge position',
        'Lower back knee towards ground',
        'Push through front heel to step forward',
        'Alternate legs while walking',
      ],
      isDefault: true,
    },
    {
      name: 'Bulgarian Split Squat',
      description: 'Unilateral squat with rear foot elevated',
      primaryMuscleGroup: MuscleGroup.QUADS,
      secondaryMuscleGroups: [MuscleGroup.GLUTES],
      equipmentType: EquipmentType.DUMBBELL,
      movementPattern: MovementPattern.LUNGE,
      difficultyLevel: DifficultyLevel.INTERMEDIATE,
      exerciseType: ExerciseType.MEDIUM,
      metricType: MetricType.WEIGHT_REPS,
      instructions: [
        'Place rear foot on bench',
        'Lower back knee towards ground',
        'Drive through front heel to return',
      ],
      isDefault: true,
    },
    {
      name: 'Leg Curl',
      description: 'Isolation exercise for hamstrings',
      primaryMuscleGroup: MuscleGroup.HAMSTRINGS,
      secondaryMuscleGroups: [],
      equipmentType: EquipmentType.MACHINE,
      movementPattern: MovementPattern.PULL,
      difficultyLevel: DifficultyLevel.BEGINNER,
      exerciseType: ExerciseType.SMALL,
      metricType: MetricType.WEIGHT_REPS,
      instructions: [
        'Lie face down on machine',
        'Curl legs up towards glutes',
        'Lower with control',
      ],
      isDefault: true,
    },
    {
      name: 'Leg Extension',
      description: 'Quad isolation exercise',
      primaryMuscleGroup: MuscleGroup.QUADS,
      secondaryMuscleGroups: [],
      equipmentType: EquipmentType.MACHINE,
      movementPattern: MovementPattern.PUSH,
      difficultyLevel: DifficultyLevel.BEGINNER,
      exerciseType: ExerciseType.SMALL,
      metricType: MetricType.WEIGHT_REPS,
      instructions: [
        'Sit in machine with shins against pad',
        'Extend legs until straight',
        'Lower with control',
      ],
      isDefault: true,
    },
    {
      name: 'Glute Bridge',
      description: 'Hip extension exercise for glutes',
      primaryMuscleGroup: MuscleGroup.GLUTES,
      secondaryMuscleGroups: [MuscleGroup.HAMSTRINGS],
      equipmentType: EquipmentType.BODYWEIGHT,
      movementPattern: MovementPattern.HINGE,
      difficultyLevel: DifficultyLevel.BEGINNER,
      exerciseType: ExerciseType.MEDIUM,
      metricType: MetricType.REPS,
      instructions: [
        'Lie on back with knees bent',
        'Drive hips up by squeezing glutes',
        'Hold at top',
        'Lower with control',
      ],
      isDefault: true,
    },
    {
      name: 'Hip Thrust',
      description: 'Glute-focused hip extension',
      primaryMuscleGroup: MuscleGroup.GLUTES,
      secondaryMuscleGroups: [MuscleGroup.HAMSTRINGS],
      equipmentType: EquipmentType.BARBELL,
      movementPattern: MovementPattern.HINGE,
      difficultyLevel: DifficultyLevel.INTERMEDIATE,
      exerciseType: ExerciseType.MEDIUM,
      metricType: MetricType.WEIGHT_REPS,
      instructions: [
        'Position upper back on bench',
        'Bar across hips',
        'Drive hips up by squeezing glutes',
        'Lower with control',
      ],
      isDefault: true,
    },
    {
      name: 'Standing Calf Raise',
      description: 'Calf isolation exercise',
      primaryMuscleGroup: MuscleGroup.CALVES,
      secondaryMuscleGroups: [],
      equipmentType: EquipmentType.MACHINE,
      movementPattern: MovementPattern.PUSH,
      difficultyLevel: DifficultyLevel.BEGINNER,
      exerciseType: ExerciseType.SMALL,
      metricType: MetricType.WEIGHT_REPS,
      instructions: [
        'Stand with balls of feet on platform',
        'Raise up onto toes',
        'Hold at top',
        'Lower heels below platform',
      ],
      isDefault: true,
    },
  ]

  // ============================================================================
  // CORE EXERCISES
  // ============================================================================

  const coreExercises = [
    {
      name: 'Plank',
      description: 'Isometric core stability exercise',
      primaryMuscleGroup: MuscleGroup.CORE,
      secondaryMuscleGroups: [],
      equipmentType: EquipmentType.BODYWEIGHT,
      movementPattern: MovementPattern.CORE,
      difficultyLevel: DifficultyLevel.BEGINNER,
      exerciseType: ExerciseType.STABILITY,
      metricType: MetricType.DURATION,
      instructions: [
        'Support body on forearms and toes',
        'Keep body in straight line',
        'Engage core',
        'Hold position',
      ],
      isDefault: true,
    },
    {
      name: 'Hanging Leg Raise',
      description: 'Advanced ab exercise',
      primaryMuscleGroup: MuscleGroup.CORE,
      secondaryMuscleGroups: [],
      equipmentType: EquipmentType.BODYWEIGHT,
      movementPattern: MovementPattern.CORE,
      difficultyLevel: DifficultyLevel.ADVANCED,
      exerciseType: ExerciseType.MEDIUM,
      metricType: MetricType.REPS,
      instructions: [
        'Hang from pull-up bar',
        'Raise legs up to parallel',
        'Lower with control',
        'Avoid swinging',
      ],
      isDefault: true,
    },
    {
      name: 'Cable Crunch',
      description: 'Weighted ab exercise using cable',
      primaryMuscleGroup: MuscleGroup.CORE,
      secondaryMuscleGroups: [],
      equipmentType: EquipmentType.CABLE,
      movementPattern: MovementPattern.CORE,
      difficultyLevel: DifficultyLevel.BEGINNER,
      exerciseType: ExerciseType.SMALL,
      metricType: MetricType.WEIGHT_REPS,
      instructions: [
        'Kneel facing cable machine',
        'Hold rope attachment by head',
        'Crunch down by flexing abs',
        'Return to starting position',
      ],
      isDefault: true,
    },
    {
      name: 'Russian Twist',
      description: 'Rotational core exercise',
      primaryMuscleGroup: MuscleGroup.CORE,
      secondaryMuscleGroups: [],
      equipmentType: EquipmentType.BODYWEIGHT,
      movementPattern: MovementPattern.CORE,
      difficultyLevel: DifficultyLevel.BEGINNER,
      exerciseType: ExerciseType.SMALL,
      metricType: MetricType.REPS,
      instructions: [
        'Sit with knees bent and feet elevated',
        'Lean back slightly',
        'Rotate torso side to side',
        'Touch ground on each side',
      ],
      isDefault: true,
    },
    {
      name: 'Dead Bug',
      description: 'Core stability exercise',
      primaryMuscleGroup: MuscleGroup.CORE,
      secondaryMuscleGroups: [],
      equipmentType: EquipmentType.BODYWEIGHT,
      movementPattern: MovementPattern.CORE,
      difficultyLevel: DifficultyLevel.BEGINNER,
      exerciseType: ExerciseType.STABILITY,
      metricType: MetricType.REPS,
      instructions: [
        'Lie on back with arms extended up',
        'Knees bent at 90 degrees',
        'Lower opposite arm and leg',
        'Return and alternate',
      ],
      isDefault: true,
    },
  ]

  // ============================================================================
  // CARDIO & FULL BODY EXERCISES
  // ============================================================================

  const cardioExercises = [
    {
      name: 'Running',
      description: 'Cardiovascular endurance exercise',
      primaryMuscleGroup: MuscleGroup.FULL_BODY,
      secondaryMuscleGroups: [],
      equipmentType: EquipmentType.CARDIO_EQUIPMENT,
      movementPattern: MovementPattern.CARRY,
      difficultyLevel: DifficultyLevel.BEGINNER,
      exerciseType: ExerciseType.CARDIO,
      metricType: MetricType.DISTANCE_DURATION,
      instructions: ['Maintain steady pace', 'Keep good running form', 'Breathe rhythmically'],
      isDefault: true,
    },
    {
      name: 'Rowing Machine',
      description: 'Full body cardio exercise',
      primaryMuscleGroup: MuscleGroup.FULL_BODY,
      secondaryMuscleGroups: [MuscleGroup.UPPER_BACK, MuscleGroup.QUADS],
      equipmentType: EquipmentType.CARDIO_EQUIPMENT,
      movementPattern: MovementPattern.PULL,
      difficultyLevel: DifficultyLevel.BEGINNER,
      exerciseType: ExerciseType.CARDIO,
      metricType: MetricType.DISTANCE_DURATION,
      instructions: [
        'Drive with legs first',
        'Pull handle to chest',
        'Extend arms then bend knees to return',
        'Maintain consistent pace',
      ],
      isDefault: true,
    },
    {
      name: 'Cycling',
      description: 'Lower body cardio',
      primaryMuscleGroup: MuscleGroup.QUADS,
      secondaryMuscleGroups: [MuscleGroup.HAMSTRINGS, MuscleGroup.CALVES],
      equipmentType: EquipmentType.CARDIO_EQUIPMENT,
      movementPattern: MovementPattern.PUSH,
      difficultyLevel: DifficultyLevel.BEGINNER,
      exerciseType: ExerciseType.CARDIO,
      metricType: MetricType.DISTANCE_DURATION,
      instructions: [
        'Maintain steady cadence',
        'Keep resistance appropriate',
        'Stay seated or stand as needed',
      ],
      isDefault: true,
    },
    {
      name: 'Burpees',
      description: 'High-intensity full body exercise',
      primaryMuscleGroup: MuscleGroup.FULL_BODY,
      secondaryMuscleGroups: [],
      equipmentType: EquipmentType.BODYWEIGHT,
      movementPattern: MovementPattern.PUSH,
      difficultyLevel: DifficultyLevel.INTERMEDIATE,
      exerciseType: ExerciseType.CARDIO,
      metricType: MetricType.REPS,
      instructions: [
        'Start standing',
        'Drop to push-up position',
        'Perform push-up',
        'Jump feet to hands',
        'Jump up with arms overhead',
      ],
      isDefault: true,
    },
    {
      name: 'Kettlebell Swing',
      description: 'Dynamic hip hinge movement',
      primaryMuscleGroup: MuscleGroup.GLUTES,
      secondaryMuscleGroups: [MuscleGroup.HAMSTRINGS, MuscleGroup.LOWER_BACK, MuscleGroup.CORE],
      equipmentType: EquipmentType.KETTLEBELL,
      movementPattern: MovementPattern.HINGE,
      difficultyLevel: DifficultyLevel.INTERMEDIATE,
      exerciseType: ExerciseType.MEDIUM,
      metricType: MetricType.WEIGHT_REPS,
      instructions: [
        'Stand with feet shoulder-width',
        'Hinge at hips and swing kettlebell back',
        'Drive hips forward explosively',
        'Swing kettlebell to chest height',
      ],
      isDefault: true,
    },
    {
      name: "Farmer's Walk",
      description: 'Loaded carry exercise',
      primaryMuscleGroup: MuscleGroup.FULL_BODY,
      secondaryMuscleGroups: [MuscleGroup.CORE, MuscleGroup.FRONT_DELTS],
      equipmentType: EquipmentType.DUMBBELL,
      movementPattern: MovementPattern.CARRY,
      difficultyLevel: DifficultyLevel.BEGINNER,
      exerciseType: ExerciseType.MEDIUM,
      metricType: MetricType.WEIGHT_DISTANCE,
      instructions: [
        'Hold heavy dumbbells at sides',
        'Walk forward with controlled steps',
        'Keep shoulders back and core tight',
        'Maintain upright posture',
      ],
      isDefault: true,
    },
    {
      name: 'Battle Ropes',
      description: 'High-intensity upper body cardio',
      primaryMuscleGroup: MuscleGroup.FRONT_DELTS,
      secondaryMuscleGroups: [MuscleGroup.CORE, MuscleGroup.UPPER_BACK],
      equipmentType: EquipmentType.RESISTANCE_BAND,
      movementPattern: MovementPattern.PUSH,
      difficultyLevel: DifficultyLevel.INTERMEDIATE,
      exerciseType: ExerciseType.CARDIO,
      metricType: MetricType.DURATION,
      instructions: [
        'Hold rope ends in each hand',
        'Create waves by moving arms up and down',
        'Maintain athletic stance',
        'Keep consistent rhythm',
      ],
      isDefault: true,
    },
    {
      name: 'Box Jumps',
      description: 'Plyometric lower body exercise',
      primaryMuscleGroup: MuscleGroup.QUADS,
      secondaryMuscleGroups: [MuscleGroup.GLUTES, MuscleGroup.CALVES],
      equipmentType: EquipmentType.BODYWEIGHT,
      movementPattern: MovementPattern.SQUAT,
      difficultyLevel: DifficultyLevel.INTERMEDIATE,
      exerciseType: ExerciseType.MEDIUM,
      metricType: MetricType.REPS,
      instructions: [
        'Stand facing box',
        'Swing arms and jump onto box',
        'Land softly with both feet',
        'Step down and repeat',
      ],
      isDefault: true,
    },
  ]

  // ============================================================================
  // OLYMPIC LIFTS & ADVANCED
  // ============================================================================

  const olympicExercises = [
    {
      name: 'Power Clean',
      description: 'Olympic lift variation',
      primaryMuscleGroup: MuscleGroup.FULL_BODY,
      secondaryMuscleGroups: [MuscleGroup.UPPER_BACK, MuscleGroup.QUADS, MuscleGroup.FRONT_DELTS],
      equipmentType: EquipmentType.BARBELL,
      movementPattern: MovementPattern.OLYMPIC,
      difficultyLevel: DifficultyLevel.ADVANCED,
      exerciseType: ExerciseType.LARGE,
      metricType: MetricType.WEIGHT_REPS,
      instructions: [
        'Start with bar at shins',
        'Explosively extend hips and knees',
        'Pull bar up and catch at shoulders',
        'Drop hips into quarter squat',
      ],
      isDefault: true,
    },
    {
      name: 'Snatch',
      description: 'Technical Olympic lift',
      primaryMuscleGroup: MuscleGroup.FULL_BODY,
      secondaryMuscleGroups: [],
      equipmentType: EquipmentType.BARBELL,
      movementPattern: MovementPattern.OLYMPIC,
      difficultyLevel: DifficultyLevel.ADVANCED,
      exerciseType: ExerciseType.LARGE,
      metricType: MetricType.WEIGHT_REPS,
      instructions: [
        'Start with wide grip',
        'Explosively extend body',
        'Pull bar overhead in one motion',
        'Catch in overhead squat position',
      ],
      isDefault: true,
    },
  ]

  // ============================================================================
  // SEED ALL EXERCISES
  // ============================================================================

  const allExercises = [
    ...chestExercises,
    ...backExercises,
    ...shoulderExercises,
    ...armExercises,
    ...legExercises,
    ...coreExercises,
    ...cardioExercises,
    ...olympicExercises,
  ]

  console.log(`📝 Creating ${allExercises.length} default exercises...`)

  for (const exercise of allExercises) {
    await prisma.exercise.create({
      data: exercise,
    })
  }

  console.log(`✅ Successfully seeded ${allExercises.length} exercises`)

  // Print summary
  console.log('\n📊 Exercise Summary by Category:')
  console.log(`   Chest: ${chestExercises.length}`)
  console.log(`   Back: ${backExercises.length}`)
  console.log(`   Shoulders: ${shoulderExercises.length}`)
  console.log(`   Arms: ${armExercises.length}`)
  console.log(`   Legs: ${legExercises.length}`)
  console.log(`   Core: ${coreExercises.length}`)
  console.log(`   Cardio/Full Body: ${cardioExercises.length}`)
  console.log(`   Olympic: ${olympicExercises.length}`)
  console.log(`   TOTAL: ${allExercises.length}`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Error seeding database:', e)
    await prisma.$disconnect()
    process.exit(1)
  })

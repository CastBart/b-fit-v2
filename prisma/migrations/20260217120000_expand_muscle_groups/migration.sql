-- Expand MuscleGroup enum: replace BACK/SHOULDERS with granular values
-- PostgreSQL requires enum recreation since we're removing values

-- Step 1: Convert columns to text so we can manipulate values freely
ALTER TABLE "Exercise" ALTER COLUMN "primaryMuscleGroup" TYPE text USING "primaryMuscleGroup"::text;
ALTER TABLE "Exercise" ALTER COLUMN "secondaryMuscleGroups" TYPE text[] USING "secondaryMuscleGroups"::text[];

-- Step 2: Remap primaryMuscleGroup BACK -> specific values per exercise
UPDATE "Exercise" SET "primaryMuscleGroup" = 'UPPER_BACK' WHERE "name" = 'Barbell Bent-Over Row' AND "primaryMuscleGroup" = 'BACK';
UPDATE "Exercise" SET "primaryMuscleGroup" = 'LATS' WHERE "name" = 'Pull-Ups' AND "primaryMuscleGroup" = 'BACK';
UPDATE "Exercise" SET "primaryMuscleGroup" = 'LATS' WHERE "name" = 'Lat Pulldown' AND "primaryMuscleGroup" = 'BACK';
UPDATE "Exercise" SET "primaryMuscleGroup" = 'LATS' WHERE "name" = 'Dumbbell Single-Arm Row' AND "primaryMuscleGroup" = 'BACK';
UPDATE "Exercise" SET "primaryMuscleGroup" = 'LOWER_BACK' WHERE "name" = 'Deadlift' AND "primaryMuscleGroup" = 'BACK';
UPDATE "Exercise" SET "primaryMuscleGroup" = 'UPPER_BACK' WHERE "name" = 'Seated Cable Row' AND "primaryMuscleGroup" = 'BACK';
-- Catch-all for any remaining BACK exercises (user-created)
UPDATE "Exercise" SET "primaryMuscleGroup" = 'UPPER_BACK' WHERE "primaryMuscleGroup" = 'BACK';

-- Step 3: Remap primaryMuscleGroup SHOULDERS -> specific values per exercise
UPDATE "Exercise" SET "primaryMuscleGroup" = 'FRONT_DELTS' WHERE "name" = 'Barbell Overhead Press' AND "primaryMuscleGroup" = 'SHOULDERS';
UPDATE "Exercise" SET "primaryMuscleGroup" = 'FRONT_DELTS' WHERE "name" = 'Dumbbell Shoulder Press' AND "primaryMuscleGroup" = 'SHOULDERS';
UPDATE "Exercise" SET "primaryMuscleGroup" = 'SIDE_DELTS' WHERE "name" = 'Lateral Raise' AND "primaryMuscleGroup" = 'SHOULDERS';
UPDATE "Exercise" SET "primaryMuscleGroup" = 'REAR_DELTS' WHERE "name" = 'Face Pulls' AND "primaryMuscleGroup" = 'SHOULDERS';
UPDATE "Exercise" SET "primaryMuscleGroup" = 'FRONT_DELTS' WHERE "name" = 'Battle Ropes' AND "primaryMuscleGroup" = 'SHOULDERS';
-- Catch-all for any remaining SHOULDERS exercises (user-created)
UPDATE "Exercise" SET "primaryMuscleGroup" = 'FRONT_DELTS' WHERE "primaryMuscleGroup" = 'SHOULDERS';

-- Step 4: Remap secondaryMuscleGroups arrays (text-level replacement)
UPDATE "Exercise"
SET "secondaryMuscleGroups" = array_replace("secondaryMuscleGroups", 'BACK', 'UPPER_BACK')
WHERE 'BACK' = ANY("secondaryMuscleGroups");

UPDATE "Exercise"
SET "secondaryMuscleGroups" = array_replace("secondaryMuscleGroups", 'SHOULDERS', 'FRONT_DELTS')
WHERE 'SHOULDERS' = ANY("secondaryMuscleGroups");

-- Step 5: Drop old enum and create new one
DROP TYPE "MuscleGroup";

CREATE TYPE "MuscleGroup" AS ENUM (
  'CHEST',
  'UPPER_BACK',
  'LATS',
  'LOWER_BACK',
  'TRAPS',
  'FRONT_DELTS',
  'SIDE_DELTS',
  'REAR_DELTS',
  'BICEPS',
  'TRICEPS',
  'FOREARMS',
  'QUADS',
  'HAMSTRINGS',
  'GLUTES',
  'CALVES',
  'CORE',
  'ABDUCTORS',
  'ADDUCTORS',
  'FULL_BODY'
);

-- Step 6: Convert columns back to the new enum type
ALTER TABLE "Exercise" ALTER COLUMN "primaryMuscleGroup" TYPE "MuscleGroup" USING "primaryMuscleGroup"::"MuscleGroup";
ALTER TABLE "Exercise" ALTER COLUMN "secondaryMuscleGroups" TYPE "MuscleGroup"[] USING "secondaryMuscleGroups"::"MuscleGroup"[];

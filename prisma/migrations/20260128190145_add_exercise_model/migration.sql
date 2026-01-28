-- CreateEnum
CREATE TYPE "ExerciseType" AS ENUM ('SMALL', 'MEDIUM', 'LARGE', 'STABILITY', 'CARDIO');

-- CreateEnum
CREATE TYPE "MetricType" AS ENUM ('WEIGHT_REPS', 'COUNTER_WEIGHT_REPS', 'REPS', 'REPS_DURATION', 'DURATION', 'DISTANCE_DURATION', 'WEIGHT_DISTANCE', 'WEIGHT_DURATION');

-- CreateEnum
CREATE TYPE "MuscleGroup" AS ENUM ('CHEST', 'BACK', 'SHOULDERS', 'BICEPS', 'TRICEPS', 'QUADS', 'HAMSTRINGS', 'GLUTES', 'CALVES', 'CORE', 'FULL_BODY');

-- CreateEnum
CREATE TYPE "EquipmentType" AS ENUM ('BARBELL', 'DUMBBELL', 'KETTLEBELL', 'MACHINE', 'CABLE', 'BODYWEIGHT', 'RESISTANCE_BAND', 'TRX', 'CARDIO_EQUIPMENT');

-- CreateEnum
CREATE TYPE "MovementPattern" AS ENUM ('PUSH', 'PULL', 'SQUAT', 'HINGE', 'CARRY', 'CORE', 'LUNGE', 'OLYMPIC');

-- CreateEnum
CREATE TYPE "DifficultyLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateTable
CREATE TABLE "Exercise" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "primaryMuscleGroup" "MuscleGroup" NOT NULL,
    "secondaryMuscleGroups" "MuscleGroup"[],
    "equipmentType" "EquipmentType" NOT NULL,
    "movementPattern" "MovementPattern" NOT NULL,
    "difficultyLevel" "DifficultyLevel" NOT NULL,
    "exerciseType" "ExerciseType" NOT NULL,
    "metricType" "MetricType" NOT NULL,
    "instructions" JSONB,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Exercise_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Exercise_createdById_idx" ON "Exercise"("createdById");

-- CreateIndex
CREATE INDEX "Exercise_isDefault_idx" ON "Exercise"("isDefault");

-- CreateIndex
CREATE INDEX "Exercise_equipmentType_idx" ON "Exercise"("equipmentType");

-- CreateIndex
CREATE INDEX "Exercise_exerciseType_idx" ON "Exercise"("exerciseType");

-- CreateIndex
CREATE INDEX "Exercise_primaryMuscleGroup_idx" ON "Exercise"("primaryMuscleGroup");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "User"("isActive");

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

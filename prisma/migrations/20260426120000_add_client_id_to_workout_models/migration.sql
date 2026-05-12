/*
  Warnings:

  - A unique constraint covering the columns `[clientId]` on the table `Workout` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[clientId]` on the table `WorkoutExercise` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Workout" ADD COLUMN     "clientId" TEXT;

-- AlterTable
ALTER TABLE "WorkoutExercise" ADD COLUMN     "clientId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Workout_clientId_key" ON "Workout"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutExercise_clientId_key" ON "WorkoutExercise"("clientId");

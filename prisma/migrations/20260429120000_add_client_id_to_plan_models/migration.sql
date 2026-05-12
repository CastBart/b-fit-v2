/*
  Warnings:

  - A unique constraint covering the columns `[clientId]` on the table `Plan` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[clientId]` on the table `PlanDay` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[clientId]` on the table `PlanDayExercise` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[clientId]` on the table `PlanDayCompletion` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "clientId" TEXT;

-- AlterTable
ALTER TABLE "PlanDay" ADD COLUMN     "clientId" TEXT;

-- AlterTable
ALTER TABLE "PlanDayExercise" ADD COLUMN     "clientId" TEXT;

-- AlterTable
ALTER TABLE "PlanDayCompletion" ADD COLUMN     "clientId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Plan_clientId_key" ON "Plan"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanDay_clientId_key" ON "PlanDay"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanDayExercise_clientId_key" ON "PlanDayExercise"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanDayCompletion_clientId_key" ON "PlanDayCompletion"("clientId");

-- CreateEnum
CREATE TYPE "PlanWeekStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "DayCompletionStatus" AS ENUM ('COMPLETED', 'SKIPPED');

-- AlterTable
ALTER TABLE "TrainingSession" ADD COLUMN     "planDayId" TEXT,
ADD COLUMN     "planId" TEXT;

-- CreateTable
CREATE TABLE "PlanWeek" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "status" "PlanWeekStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "PlanWeek_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanDayCompletion" (
    "id" TEXT NOT NULL,
    "planWeekId" TEXT NOT NULL,
    "planDayId" TEXT NOT NULL,
    "status" "DayCompletionStatus" NOT NULL DEFAULT 'COMPLETED',
    "sessionId" TEXT,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanDayCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlanWeek_planId_idx" ON "PlanWeek"("planId");

-- CreateIndex
CREATE INDEX "PlanWeek_status_idx" ON "PlanWeek"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PlanWeek_planId_weekNumber_key" ON "PlanWeek"("planId", "weekNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PlanDayCompletion_sessionId_key" ON "PlanDayCompletion"("sessionId");

-- CreateIndex
CREATE INDEX "PlanDayCompletion_planWeekId_idx" ON "PlanDayCompletion"("planWeekId");

-- CreateIndex
CREATE INDEX "PlanDayCompletion_planDayId_idx" ON "PlanDayCompletion"("planDayId");

-- CreateIndex
CREATE INDEX "PlanDayCompletion_sessionId_idx" ON "PlanDayCompletion"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanDayCompletion_planWeekId_planDayId_key" ON "PlanDayCompletion"("planWeekId", "planDayId");

-- CreateIndex
CREATE INDEX "TrainingSession_planId_idx" ON "TrainingSession"("planId");

-- CreateIndex
CREATE INDEX "TrainingSession_planDayId_idx" ON "TrainingSession"("planDayId");

-- AddForeignKey
ALTER TABLE "PlanWeek" ADD CONSTRAINT "PlanWeek_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanDayCompletion" ADD CONSTRAINT "PlanDayCompletion_planWeekId_fkey" FOREIGN KEY ("planWeekId") REFERENCES "PlanWeek"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanDayCompletion" ADD CONSTRAINT "PlanDayCompletion_planDayId_fkey" FOREIGN KEY ("planDayId") REFERENCES "PlanDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanDayCompletion" ADD CONSTRAINT "PlanDayCompletion_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TrainingSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "GoalDirection" AS ENUM ('LOSE', 'MAINTAIN', 'GAIN');

-- AlterTable: switch the goal preset enum for a direction + weekly rate model,
-- and add editable macro percentage columns. Only the `goal` column is dropped;
-- other body metrics are preserved.
ALTER TABLE "UserBodyMetrics"
  DROP COLUMN "goal",
  ADD COLUMN "goalDirection" "GoalDirection" NOT NULL DEFAULT 'MAINTAIN',
  ADD COLUMN "weeklyRateLbs" DOUBLE PRECISION,
  ADD COLUMN "proteinPct" INTEGER,
  ADD COLUMN "carbsPct" INTEGER,
  ADD COLUMN "fatPct" INTEGER;

-- DropEnum
DROP TYPE "CalorieGoal";

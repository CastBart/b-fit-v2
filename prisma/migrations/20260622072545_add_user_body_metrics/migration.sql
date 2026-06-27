-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "UnitSystem" AS ENUM ('METRIC', 'IMPERIAL');

-- CreateEnum
CREATE TYPE "ActivityLevel" AS ENUM ('SEDENTARY', 'LIGHTLY_ACTIVE', 'MODERATELY_ACTIVE', 'VERY_ACTIVE', 'EXTRA_ACTIVE');

-- CreateEnum
CREATE TYPE "CalorieGoal" AS ENUM ('LOSE_FAT_MILD', 'LOSE_FAT_MODERATE', 'LOSE_FAT_AGGRESSIVE', 'MAINTAIN', 'GAIN_LEAN', 'GAIN_STANDARD');

-- CreateTable
CREATE TABLE "UserBodyMetrics" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "heightCm" DOUBLE PRECISION NOT NULL,
    "weightKg" DOUBLE PRECISION NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "sex" "Sex" NOT NULL,
    "activityLevel" "ActivityLevel" NOT NULL,
    "goal" "CalorieGoal" NOT NULL,
    "unitPreference" "UnitSystem" NOT NULL DEFAULT 'METRIC',
    "bmr" DOUBLE PRECISION,
    "tdee" DOUBLE PRECISION,
    "targetCalories" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserBodyMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserBodyMetrics_userId_key" ON "UserBodyMetrics"("userId");

-- AddForeignKey
ALTER TABLE "UserBodyMetrics" ADD CONSTRAINT "UserBodyMetrics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

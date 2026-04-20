/*
  Warnings:

  - A unique constraint covering the columns `[clientId]` on the table `Exercise` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Exercise" ADD COLUMN     "clientId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Exercise_clientId_key" ON "Exercise"("clientId");

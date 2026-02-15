-- CreateEnum
CREATE TYPE "OrgPTStatus" AS ENUM ('PENDING', 'ACTIVE', 'ENDED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SubscriptionTier" ADD VALUE 'ORG_STARTER';
ALTER TYPE "SubscriptionTier" ADD VALUE 'ORG_PRO';
ALTER TYPE "SubscriptionTier" ADD VALUE 'ORG_ELITE';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "organisationId" TEXT;

-- CreateTable
CREATE TABLE "Organisation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ownerId" TEXT NOT NULL,
    "ptSeatCapacity" INTEGER NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganisationBranding" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "logoUrl" TEXT,
    "primaryColor" TEXT,
    "secondaryColor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganisationBranding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgPTRelationship" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "ptId" TEXT,
    "status" "OrgPTStatus" NOT NULL DEFAULT 'PENDING',
    "inviteCode" TEXT NOT NULL,
    "ptEmail" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgPTRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organisation_ownerId_key" ON "Organisation"("ownerId");

-- CreateIndex
CREATE INDEX "Organisation_ownerId_idx" ON "Organisation"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganisationBranding_organisationId_key" ON "OrganisationBranding"("organisationId");

-- CreateIndex
CREATE UNIQUE INDEX "OrgPTRelationship_inviteCode_key" ON "OrgPTRelationship"("inviteCode");

-- CreateIndex
CREATE INDEX "OrgPTRelationship_organisationId_idx" ON "OrgPTRelationship"("organisationId");

-- CreateIndex
CREATE INDEX "OrgPTRelationship_ptId_idx" ON "OrgPTRelationship"("ptId");

-- CreateIndex
CREATE INDEX "OrgPTRelationship_status_idx" ON "OrgPTRelationship"("status");

-- CreateIndex
CREATE INDEX "OrgPTRelationship_inviteCode_idx" ON "OrgPTRelationship"("inviteCode");

-- CreateIndex
CREATE UNIQUE INDEX "OrgPTRelationship_organisationId_ptId_key" ON "OrgPTRelationship"("organisationId", "ptId");

-- CreateIndex
CREATE INDEX "User_organisationId_idx" ON "User"("organisationId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Organisation" ADD CONSTRAINT "Organisation_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganisationBranding" ADD CONSTRAINT "OrganisationBranding_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgPTRelationship" ADD CONSTRAINT "OrgPTRelationship_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgPTRelationship" ADD CONSTRAINT "OrgPTRelationship_ptId_fkey" FOREIGN KEY ("ptId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

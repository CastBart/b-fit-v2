-- CreateEnum
CREATE TYPE "RelationshipStatus" AS ENUM ('PENDING', 'ACTIVE', 'ENDED');

-- CreateTable
CREATE TABLE "ClientRelationship" (
    "id" TEXT NOT NULL,
    "ptId" TEXT NOT NULL,
    "clientId" TEXT,
    "status" "RelationshipStatus" NOT NULL DEFAULT 'PENDING',
    "inviteCode" TEXT NOT NULL,
    "clientEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientRelationship_inviteCode_key" ON "ClientRelationship"("inviteCode");

-- CreateIndex
CREATE INDEX "ClientRelationship_ptId_idx" ON "ClientRelationship"("ptId");

-- CreateIndex
CREATE INDEX "ClientRelationship_clientId_idx" ON "ClientRelationship"("clientId");

-- CreateIndex
CREATE INDEX "ClientRelationship_status_idx" ON "ClientRelationship"("status");

-- CreateIndex
CREATE INDEX "ClientRelationship_inviteCode_idx" ON "ClientRelationship"("inviteCode");

-- CreateIndex
CREATE UNIQUE INDEX "ClientRelationship_ptId_clientId_key" ON "ClientRelationship"("ptId", "clientId");

-- AddForeignKey
ALTER TABLE "ClientRelationship" ADD CONSTRAINT "ClientRelationship_ptId_fkey" FOREIGN KEY ("ptId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientRelationship" ADD CONSTRAINT "ClientRelationship_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

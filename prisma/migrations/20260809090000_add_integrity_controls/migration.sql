-- CreateEnum
CREATE TYPE "PendingApprovalKind" AS ENUM ('VALUE_SIGN_OFF', 'COST_CHANGE');

-- CreateEnum
CREATE TYPE "PendingApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- DropIndex
DROP INDEX "MonthlyReport_year_month_key";

-- AlterTable
ALTER TABLE "BenefitClaim" ADD COLUMN     "baselineSource" TEXT,
ADD COLUMN     "targetSource" TEXT;

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "materialityThresholdInr" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "ValueMeasurement" ADD COLUMN     "evidenceSource" TEXT;

-- CreateTable
CREATE TABLE "PendingApproval" (
    "id" TEXT NOT NULL,
    "initiativeId" TEXT NOT NULL,
    "kind" "PendingApprovalKind" NOT NULL,
    "payload" JSONB NOT NULL,
    "summary" TEXT NOT NULL,
    "materialityInr" DOUBLE PRECISION NOT NULL,
    "proposedBy" TEXT NOT NULL,
    "proposedByRole" TEXT NOT NULL,
    "proposedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "PendingApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "decidedBy" TEXT,
    "decidedByRole" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decisionNote" TEXT,

    CONSTRAINT "PendingApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ValueRestatement" (
    "id" TEXT NOT NULL,
    "initiativeId" TEXT NOT NULL,
    "previousValueInr" DOUBLE PRECISION NOT NULL,
    "newValueInr" DOUBLE PRECISION NOT NULL,
    "previousTcoInr" DOUBLE PRECISION,
    "newTcoInr" DOUBLE PRECISION,
    "reason" TEXT NOT NULL,
    "restatedBy" TEXT NOT NULL,
    "restatedByRole" TEXT NOT NULL,
    "restatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ValueRestatement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PendingApproval_initiativeId_idx" ON "PendingApproval"("initiativeId");

-- CreateIndex
CREATE INDEX "PendingApproval_status_idx" ON "PendingApproval"("status");

-- CreateIndex
CREATE INDEX "ValueRestatement_initiativeId_idx" ON "ValueRestatement"("initiativeId");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyReport_organizationId_year_month_key" ON "MonthlyReport"("organizationId", "year", "month");

-- AddForeignKey
ALTER TABLE "PendingApproval" ADD CONSTRAINT "PendingApproval_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "Initiative"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValueRestatement" ADD CONSTRAINT "ValueRestatement_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "Initiative"("id") ON DELETE CASCADE ON UPDATE CASCADE;


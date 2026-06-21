-- CreateEnum
CREATE TYPE "BenefitUnit" AS ENUM ('INR', 'PERCENT', 'DAYS', 'HOURS', 'COUNT', 'RATIO');

-- CreateEnum
CREATE TYPE "Confidence" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "DemandStatus" AS ENUM ('RAISED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "DemandPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- AlterTable
ALTER TABLE "Initiative" ADD COLUMN     "actualCostInr" DOUBLE PRECISION,
ADD COLUMN     "estimatedCostInr" DOUBLE PRECISION,
ADD COLUMN     "valueSignOffAt" TIMESTAMP(3),
ADD COLUMN     "valueSignOffBy" TEXT,
ADD COLUMN     "valueSignedOff" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "BenefitClaim" (
    "id" TEXT NOT NULL,
    "initiativeId" TEXT,
    "demandId" TEXT,
    "category" "BenefitCategory" NOT NULL,
    "metricName" TEXT NOT NULL,
    "baselineValue" DOUBLE PRECISION,
    "targetValue" DOUBLE PRECISION,
    "unit" "BenefitUnit" NOT NULL DEFAULT 'INR',
    "estimatedAnnualValueInr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "confidence" "Confidence" NOT NULL DEFAULT 'MEDIUM',
    "realizationHorizonMonths" INTEGER NOT NULL DEFAULT 12,
    "narrative" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BenefitClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ValueMeasurement" (
    "id" TEXT NOT NULL,
    "benefitClaimId" TEXT NOT NULL,
    "measuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "horizonLabel" TEXT NOT NULL,
    "actualValue" DOUBLE PRECISION,
    "realizedInr" DOUBLE PRECISION,
    "note" TEXT NOT NULL DEFAULT '',
    "recordedByName" TEXT,

    CONSTRAINT "ValueMeasurement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Okr" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "category" "BenefitCategory",
    "owner" TEXT NOT NULL DEFAULT '',
    "targetStatement" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Okr_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InitiativeOkr" (
    "id" TEXT NOT NULL,
    "initiativeId" TEXT NOT NULL,
    "okrId" TEXT NOT NULL,
    "contributionNote" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "InitiativeOkr_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Demand" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "requirement" TEXT NOT NULL,
    "raisedById" TEXT,
    "raisedByName" TEXT NOT NULL,
    "verticalHeadName" TEXT,
    "status" "DemandStatus" NOT NULL DEFAULT 'RAISED',
    "priority" "DemandPriority" NOT NULL DEFAULT 'MEDIUM',
    "reviewNote" TEXT NOT NULL DEFAULT '',
    "convertedInitiativeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Demand_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BenefitClaim_initiativeId_idx" ON "BenefitClaim"("initiativeId");

-- CreateIndex
CREATE INDEX "BenefitClaim_demandId_idx" ON "BenefitClaim"("demandId");

-- CreateIndex
CREATE INDEX "ValueMeasurement_benefitClaimId_idx" ON "ValueMeasurement"("benefitClaimId");

-- CreateIndex
CREATE INDEX "InitiativeOkr_initiativeId_idx" ON "InitiativeOkr"("initiativeId");

-- CreateIndex
CREATE INDEX "InitiativeOkr_okrId_idx" ON "InitiativeOkr"("okrId");

-- CreateIndex
CREATE UNIQUE INDEX "InitiativeOkr_initiativeId_okrId_key" ON "InitiativeOkr"("initiativeId", "okrId");

-- CreateIndex
CREATE UNIQUE INDEX "Demand_convertedInitiativeId_key" ON "Demand"("convertedInitiativeId");

-- CreateIndex
CREATE INDEX "Demand_status_idx" ON "Demand"("status");

-- AddForeignKey
ALTER TABLE "BenefitClaim" ADD CONSTRAINT "BenefitClaim_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "Initiative"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BenefitClaim" ADD CONSTRAINT "BenefitClaim_demandId_fkey" FOREIGN KEY ("demandId") REFERENCES "Demand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValueMeasurement" ADD CONSTRAINT "ValueMeasurement_benefitClaimId_fkey" FOREIGN KEY ("benefitClaimId") REFERENCES "BenefitClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InitiativeOkr" ADD CONSTRAINT "InitiativeOkr_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "Initiative"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InitiativeOkr" ADD CONSTRAINT "InitiativeOkr_okrId_fkey" FOREIGN KEY ("okrId") REFERENCES "Okr"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Demand" ADD CONSTRAINT "Demand_raisedById_fkey" FOREIGN KEY ("raisedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Demand" ADD CONSTRAINT "Demand_convertedInitiativeId_fkey" FOREIGN KEY ("convertedInitiativeId") REFERENCES "Initiative"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "InvestmentCategory" AS ENUM ('VALUE_GENERATING', 'REGULATORY_MANDATORY', 'FOUNDATIONAL', 'STRATEGIC');

-- AlterTable
ALTER TABLE "Demand" ADD COLUMN     "investmentCategory" "InvestmentCategory" NOT NULL DEFAULT 'VALUE_GENERATING';

-- AlterTable
ALTER TABLE "Initiative" ADD COLUMN     "investmentCategory" "InvestmentCategory" NOT NULL DEFAULT 'VALUE_GENERATING';

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "roiThreshold" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "InvestmentException" (
    "id" TEXT NOT NULL,
    "initiativeId" TEXT NOT NULL,
    "roiAtApproval" DOUBLE PRECISION NOT NULL,
    "thresholdAtApproval" DOUBLE PRECISION NOT NULL,
    "valueInrAtApproval" DOUBLE PRECISION NOT NULL,
    "tcoInrAtApproval" DOUBLE PRECISION NOT NULL,
    "justification" TEXT NOT NULL,
    "approvedBy" TEXT NOT NULL,
    "approvedByRole" TEXT NOT NULL,
    "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvestmentException_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvestmentException_initiativeId_idx" ON "InvestmentException"("initiativeId");

-- AddForeignKey
ALTER TABLE "InvestmentException" ADD CONSTRAINT "InvestmentException_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "Initiative"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: existing regulatory work is funded by its mandate, not by return.
-- Leaving these on the VALUE_GENERATING default would put every RBI/NPCI item
-- under an ROI gate it can never pass and was never meant to.
--
-- This is an INFERENCE, not recorded fact: it assumes a regulatory-flagged
-- initiative is funded on the mandate. That is the right default, but PMO
-- should review categories once after this migration — an initiative can be
-- regulatory AND primarily justified by return, and only a human knows which.
UPDATE "Initiative" SET "investmentCategory" = 'REGULATORY_MANDATORY' WHERE "isRegulatory" = true;

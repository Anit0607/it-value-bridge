-- CreateEnum
CREATE TYPE "InitiativeClassification" AS ENUM ('STRATEGIC', 'MAJOR_PROJECT', 'TACTICAL', 'BAU');

-- AlterTable
ALTER TABLE "Initiative" ADD COLUMN     "classification" "InitiativeClassification" NOT NULL DEFAULT 'TACTICAL';

-- CreateIndex
CREATE INDEX "Initiative_classification_idx" ON "Initiative"("classification");

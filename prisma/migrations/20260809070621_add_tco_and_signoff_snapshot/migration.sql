-- AlterTable
ALTER TABLE "Demand" ADD COLUMN     "annualRunCostInr" DOUBLE PRECISION,
ADD COLUMN     "buildCostInr" DOUBLE PRECISION,
ADD COLUMN     "estimatedCostInr" DOUBLE PRECISION,
ADD COLUMN     "tcoHorizonYears" INTEGER;

-- AlterTable
ALTER TABLE "Initiative" ADD COLUMN     "annualRunCostInr" DOUBLE PRECISION,
ADD COLUMN     "buildCostInr" DOUBLE PRECISION,
ADD COLUMN     "signedOffTcoInr" DOUBLE PRECISION,
ADD COLUMN     "signedOffValueInr" DOUBLE PRECISION,
ADD COLUMN     "tcoHorizonYears" INTEGER;

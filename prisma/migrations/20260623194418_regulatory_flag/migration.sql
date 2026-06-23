-- AlterTable
ALTER TABLE "Initiative" ADD COLUMN     "isRegulatory" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "regulatoryBody" TEXT,
ADD COLUMN     "regulatoryDueDate" TIMESTAMP(3);

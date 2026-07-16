/*
  Warnings:

  - The `ownerRole` column on the `Milestone` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "MilestoneOwnerRole" AS ENUM ('PMO', 'IT', 'BUSINESS', 'VENDOR');

-- AlterTable
ALTER TABLE "Milestone" DROP COLUMN "ownerRole",
ADD COLUMN     "ownerRole" "MilestoneOwnerRole";

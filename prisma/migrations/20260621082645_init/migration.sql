-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CIO', 'PMO', 'VERTICAL_HEAD', 'BUSINESS');

-- CreateEnum
CREATE TYPE "InitiativeType" AS ENUM ('CHANGE_REQUEST', 'PROJECT');

-- CreateEnum
CREATE TYPE "Methodology" AS ENUM ('WATERFALL', 'AGILE');

-- CreateEnum
CREATE TYPE "Stage" AS ENUM ('BRD', 'FSD', 'COMMERCIAL', 'DEVELOPMENT', 'SIT', 'UAT', 'APPSEC', 'CAB_APPROVAL', 'GO_LIVE', 'BUSINESS_VALIDATION', 'CLOSED');

-- CreateEnum
CREATE TYPE "ProcessGroup" AS ENUM ('INITIATING', 'PLANNING', 'EXECUTING', 'MONITORING_CONTROLLING', 'CLOSING');

-- CreateEnum
CREATE TYPE "BenefitCategory" AS ENUM ('REVENUE', 'COST_SAVING', 'CUSTOMER_EXPERIENCE', 'COMPLIANCE', 'EFFICIENCY', 'RISK_REDUCTION');

-- CreateEnum
CREATE TYPE "DelaySource" AS ENUM ('IT', 'BUSINESS', 'VENDOR', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "KnowledgeAreaName" AS ENUM ('INTEGRATION', 'SCOPE', 'SCHEDULE', 'COST', 'QUALITY', 'RESOURCE', 'COMMUNICATIONS', 'RISK', 'PROCUREMENT', 'STAKEHOLDER');

-- CreateEnum
CREATE TYPE "KAStatus" AS ENUM ('GREEN', 'AMBER', 'RED');

-- CreateEnum
CREATE TYPE "OutcomeAchieved" AS ENUM ('YES', 'PARTIALLY', 'NO');

-- CreateEnum
CREATE TYPE "StoryStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'REVIEW', 'DONE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "verticalHead" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Initiative" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "InitiativeType" NOT NULL,
    "methodology" "Methodology" NOT NULL DEFAULT 'WATERFALL',
    "verticalHeadName" TEXT NOT NULL,
    "verticalHeadId" TEXT,
    "businessSpoc" TEXT NOT NULL,
    "businessSponsor" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "benefitCategory" "BenefitCategory" NOT NULL,
    "outcomeDescription" TEXT NOT NULL,
    "targetMetric" TEXT NOT NULL,
    "expectedGoLiveDate" TIMESTAMP(3) NOT NULL,
    "currentStage" "Stage" NOT NULL DEFAULT 'BRD',
    "currentProcessGroup" "ProcessGroup" NOT NULL DEFAULT 'INITIATING',
    "stageStartDate" TIMESTAMP(3) NOT NULL,
    "stageExpectedDate" TIMESTAMP(3) NOT NULL,
    "lastUpdated" TIMESTAMP(3) NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "delayed" BOOLEAN NOT NULL DEFAULT false,
    "delaySource" "DelaySource",
    "committedMonth" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Initiative_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaterfallStage" (
    "id" TEXT NOT NULL,
    "initiativeId" TEXT NOT NULL,
    "stage" "Stage" NOT NULL,
    "processGroup" "ProcessGroup" NOT NULL,
    "expectedDate" TIMESTAMP(3) NOT NULL,
    "startedDate" TIMESTAMP(3),
    "completedDate" TIMESTAMP(3),
    "daysInStage" INTEGER,
    "delayFlag" BOOLEAN NOT NULL DEFAULT false,
    "delaySource" "DelaySource",

    CONSTRAINT "WaterfallStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeArea" (
    "id" TEXT NOT NULL,
    "initiativeId" TEXT NOT NULL,
    "name" "KnowledgeAreaName" NOT NULL,
    "status" "KAStatus" NOT NULL DEFAULT 'GREEN',
    "notes" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Risk" (
    "id" TEXT NOT NULL,
    "initiativeId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "probability" INTEGER NOT NULL,
    "impact" INTEGER NOT NULL,
    "response" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Risk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stakeholder" (
    "id" TEXT NOT NULL,
    "initiativeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "influence" INTEGER NOT NULL,
    "interest" INTEGER NOT NULL,

    CONSTRAINT "Stakeholder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessValueRealization" (
    "id" TEXT NOT NULL,
    "initiativeId" TEXT NOT NULL,
    "outcomeAchieved" "OutcomeAchieved" NOT NULL,
    "actualResult" TEXT NOT NULL,
    "actualMetric" TEXT NOT NULL,
    "realizedDate" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessValueRealization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Epic" (
    "id" TEXT NOT NULL,
    "initiativeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Epic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sprint" (
    "id" TEXT NOT NULL,
    "initiativeId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "capacity" INTEGER NOT NULL,

    CONSTRAINT "Sprint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Story" (
    "id" TEXT NOT NULL,
    "initiativeId" TEXT NOT NULL,
    "epicId" TEXT,
    "sprintId" TEXT,
    "title" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "status" "StoryStatus" NOT NULL DEFAULT 'TODO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Story_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoryLog" (
    "id" TEXT NOT NULL,
    "initiativeId" TEXT NOT NULL,
    "stage" "Stage",
    "note" TEXT NOT NULL,
    "userId" TEXT,
    "userName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoryLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyReport" (
    "id" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "narrative" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonthlyReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Initiative_verticalHeadName_idx" ON "Initiative"("verticalHeadName");

-- CreateIndex
CREATE INDEX "Initiative_currentStage_idx" ON "Initiative"("currentStage");

-- CreateIndex
CREATE INDEX "Initiative_type_idx" ON "Initiative"("type");

-- CreateIndex
CREATE INDEX "WaterfallStage_initiativeId_idx" ON "WaterfallStage"("initiativeId");

-- CreateIndex
CREATE UNIQUE INDEX "WaterfallStage_initiativeId_stage_key" ON "WaterfallStage"("initiativeId", "stage");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeArea_initiativeId_name_key" ON "KnowledgeArea"("initiativeId", "name");

-- CreateIndex
CREATE INDEX "Risk_initiativeId_idx" ON "Risk"("initiativeId");

-- CreateIndex
CREATE INDEX "Stakeholder_initiativeId_idx" ON "Stakeholder"("initiativeId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessValueRealization_initiativeId_key" ON "BusinessValueRealization"("initiativeId");

-- CreateIndex
CREATE INDEX "Epic_initiativeId_idx" ON "Epic"("initiativeId");

-- CreateIndex
CREATE INDEX "Sprint_initiativeId_idx" ON "Sprint"("initiativeId");

-- CreateIndex
CREATE UNIQUE INDEX "Sprint_initiativeId_number_key" ON "Sprint"("initiativeId", "number");

-- CreateIndex
CREATE INDEX "Story_initiativeId_idx" ON "Story"("initiativeId");

-- CreateIndex
CREATE INDEX "Story_sprintId_idx" ON "Story"("sprintId");

-- CreateIndex
CREATE INDEX "HistoryLog_initiativeId_idx" ON "HistoryLog"("initiativeId");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyReport_year_month_key" ON "MonthlyReport"("year", "month");

-- AddForeignKey
ALTER TABLE "Initiative" ADD CONSTRAINT "Initiative_verticalHeadId_fkey" FOREIGN KEY ("verticalHeadId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaterfallStage" ADD CONSTRAINT "WaterfallStage_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "Initiative"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeArea" ADD CONSTRAINT "KnowledgeArea_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "Initiative"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Risk" ADD CONSTRAINT "Risk_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "Initiative"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stakeholder" ADD CONSTRAINT "Stakeholder_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "Initiative"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessValueRealization" ADD CONSTRAINT "BusinessValueRealization_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "Initiative"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Epic" ADD CONSTRAINT "Epic_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "Initiative"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sprint" ADD CONSTRAINT "Sprint_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "Initiative"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Story" ADD CONSTRAINT "Story_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "Initiative"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Story" ADD CONSTRAINT "Story_epicId_fkey" FOREIGN KEY ("epicId") REFERENCES "Epic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Story" ADD CONSTRAINT "Story_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "Sprint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoryLog" ADD CONSTRAINT "HistoryLog_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "Initiative"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoryLog" ADD CONSTRAINT "HistoryLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

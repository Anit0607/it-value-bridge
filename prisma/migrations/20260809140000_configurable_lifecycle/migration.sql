-- M4 — Configurable lifecycle, terminology and modules.
--
-- HAND-WRITTEN. `prisma migrate diff` generates DROP COLUMN + ADD COLUMN for
-- the Stage enum → text conversion, which would silently destroy every
-- initiative's current stage and the whole audit trail. Postgres can convert an
-- enum column in place with USING, so that is what this does.

-- CreateEnum
CREATE TYPE "DeliveryPhase" AS ENUM ('PRE_DELIVERY', 'IN_DELIVERY', 'POST_DELIVERY');

-- ---------------------------------------------------------------------------
-- Stage enum → text, preserving every existing value.
-- The default must be dropped first: Postgres cannot cast a column's default
-- across types.
-- ---------------------------------------------------------------------------
ALTER TABLE "Initiative" ALTER COLUMN "currentStage" DROP DEFAULT;
ALTER TABLE "Initiative" ALTER COLUMN "currentStage" TYPE TEXT USING "currentStage"::TEXT;

ALTER TABLE "HistoryLog" ALTER COLUMN "stage" TYPE TEXT USING "stage"::TEXT;

ALTER TABLE "WaterfallStage" ALTER COLUMN "stage" TYPE TEXT USING "stage"::TEXT;

DROP TYPE "Stage";

-- ---------------------------------------------------------------------------
-- Workspace configuration
-- ---------------------------------------------------------------------------
ALTER TABLE "Organization" ADD COLUMN "lifecycleTemplate" TEXT,
ADD COLUMN "terminology" JSONB,
ADD COLUMN "moduleDependencies" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "moduleMilestones" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "moduleRegulatory" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "LifecycleStage" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "processGroup" "ProcessGroup" NOT NULL,
    "deliveryPhase" "DeliveryPhase" NOT NULL,
    "isGoLiveGate" BOOLEAN NOT NULL DEFAULT false,
    "isValidationGate" BOOLEAN NOT NULL DEFAULT false,
    "isTerminal" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "LifecycleStage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LifecycleStage_organizationId_idx" ON "LifecycleStage"("organizationId");
CREATE UNIQUE INDEX "LifecycleStage_organizationId_key_key" ON "LifecycleStage"("organizationId", "key");

ALTER TABLE "LifecycleStage" ADD CONSTRAINT "LifecycleStage_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Backfill: every existing organization keeps exactly the lifecycle it has been
-- running. This is NOT an inference — the eleven stages below are the enum that
-- was just dropped, in the order the application already enforced, so no
-- initiative changes stage and no history is reinterpreted.
-- ---------------------------------------------------------------------------
INSERT INTO "LifecycleStage" ("id", "organizationId", "key", "label", "order", "processGroup", "deliveryPhase", "isGoLiveGate", "isValidationGate", "isTerminal")
SELECT
  o."id" || '_' || s."key",
  o."id",
  s."key",
  s."label",
  s."order",
  s."processGroup"::"ProcessGroup",
  s."deliveryPhase"::"DeliveryPhase",
  s."isGoLiveGate",
  s."isValidationGate",
  s."isTerminal"
FROM "Organization" o
CROSS JOIN (
  VALUES
    ('BRD',                 'BRD',                  1,  'PLANNING',                 'PRE_DELIVERY',  false, false, false),
    ('FSD',                 'FSD',                  2,  'PLANNING',                 'PRE_DELIVERY',  false, false, false),
    ('COMMERCIAL',          'Commercial',           3,  'PLANNING',                 'PRE_DELIVERY',  false, false, false),
    ('DEVELOPMENT',         'Development',          4,  'EXECUTING',                'IN_DELIVERY',   false, false, false),
    ('SIT',                 'SIT',                  5,  'EXECUTING',                'IN_DELIVERY',   false, false, false),
    ('UAT',                 'UAT',                  6,  'EXECUTING',                'IN_DELIVERY',   false, false, false),
    ('APPSEC',              'AppSec',               7,  'EXECUTING',                'IN_DELIVERY',   false, false, false),
    ('CAB_APPROVAL',        'CAB Approval',         8,  'EXECUTING',                'IN_DELIVERY',   false, false, false),
    ('GO_LIVE',             'Go Live',              9,  'EXECUTING',                'POST_DELIVERY', true,  false, false),
    ('BUSINESS_VALIDATION', 'Business Validation',  10, 'MONITORING_CONTROLLING',   'POST_DELIVERY', false, true,  false),
    ('CLOSED',              'Closed',               11, 'CLOSING',                  'POST_DELIVERY', false, false, true)
) AS s("key", "label", "order", "processGroup", "deliveryPhase", "isGoLiveGate", "isValidationGate", "isTerminal");

UPDATE "Organization" SET "lifecycleTemplate" = 'REGULATED_BFSI' WHERE "lifecycleTemplate" IS NULL;

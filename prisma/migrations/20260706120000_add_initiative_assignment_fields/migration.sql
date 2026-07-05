-- Add manager-level assignment fields to Initiative for the enterprise role
-- model (Program Head / Program Manager / Business Head visibility).
-- All nullable — existing rows are unaffected.
ALTER TABLE "Initiative" ADD COLUMN "programHeadName"    TEXT;
ALTER TABLE "Initiative" ADD COLUMN "programManagerName" TEXT;
ALTER TABLE "Initiative" ADD COLUMN "businessHeadName"   TEXT;
ALTER TABLE "Initiative" ADD COLUMN "businessUnit"       TEXT;
ALTER TABLE "Initiative" ADD COLUMN "subBusinessUnit"    TEXT;

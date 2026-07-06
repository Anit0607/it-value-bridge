-- Add portfolio/reporting hierarchy fields to User for the enterprise role
-- model — lets the app know which Program Head / Program Manager /
-- Business Head / business unit a user belongs to. All nullable — existing
-- rows are unaffected.
ALTER TABLE "User" ADD COLUMN "programHeadName"    TEXT;
ALTER TABLE "User" ADD COLUMN "programManagerName" TEXT;
ALTER TABLE "User" ADD COLUMN "businessHeadName"   TEXT;
ALTER TABLE "User" ADD COLUMN "businessUnit"       TEXT;
ALTER TABLE "User" ADD COLUMN "subBusinessUnit"    TEXT;

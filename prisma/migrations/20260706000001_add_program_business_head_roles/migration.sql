-- Extend Role enum with enterprise role tier additions.
-- Existing roles (PMO, VERTICAL_HEAD, BUSINESS) are kept as-is to avoid a
-- breaking rename; these new values sit alongside them for this sprint.
-- PostgreSQL requires ALTER TYPE ... ADD VALUE for enums.
ALTER TYPE "Role" ADD VALUE 'PROGRAM_HEAD';
ALTER TYPE "Role" ADD VALUE 'PROGRAM_MANAGER';
ALTER TYPE "Role" ADD VALUE 'BUSINESS_HEAD';

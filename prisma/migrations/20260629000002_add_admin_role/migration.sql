-- Add ADMIN value to Role enum
-- PostgreSQL requires ALTER TYPE ... ADD VALUE for enums
ALTER TYPE "Role" ADD VALUE 'ADMIN';

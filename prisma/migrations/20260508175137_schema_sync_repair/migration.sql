-- Migration: schema_sync_repair
-- Description: Adds columns that exist in the Prisma schema but are missing from production DB.
-- The 20260505000000_multi_tenant_categories migration was rolled back, leaving the DB
-- in an inconsistent state between the init migration and the current schema.
-- All statements are idempotent (IF NOT EXISTS) for safe re-run.

-- ================================================================
-- Category (may have been rolled back from multi_tenant_categories)
-- ================================================================
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "rules" TEXT;

-- Drop old global-unique constraint (safe to run even if already dropped)
DROP INDEX IF EXISTS "Category_name_key";

-- Add per-household unique constraint (safe to run even if already exists)
CREATE UNIQUE INDEX IF NOT EXISTS "Category_name_householdId_unique" ON "Category"("name", "householdId");

-- ================================================================
-- Account
-- ================================================================
ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "color" TEXT;
ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "isDefault" BOOLEAN NOT NULL DEFAULT false;

-- ================================================================
-- Transaction
-- ================================================================
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "statementId" TEXT;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "reconciled" BOOLEAN NOT NULL DEFAULT false;

-- ================================================================
-- Income
-- ================================================================
ALTER TABLE "Income" ADD COLUMN IF NOT EXISTS "startDate" DATE NOT NULL DEFAULT CURRENT_DATE;
ALTER TABLE "Income" ADD COLUMN IF NOT EXISTS "dayOfMonth" INTEGER;
ALTER TABLE "Income" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

-- ================================================================
-- Goal
-- ================================================================
ALTER TABLE "Goal" ADD COLUMN IF NOT EXISTS "targetDate" TIMESTAMP(3);

-- ================================================================
-- DailyPeriod (schema was restructured from date-based to period-based)
-- ================================================================
ALTER TABLE "DailyPeriod" ADD COLUMN IF NOT EXISTS "periodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "DailyPeriod" ADD COLUMN IF NOT EXISTS "periodEnd" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "DailyPeriod" ADD COLUMN IF NOT EXISTS "dailyAllowance" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "DailyPeriod" ADD COLUMN IF NOT EXISTS "billsTotal" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "DailyPeriod" ADD COLUMN IF NOT EXISTS "accumulatedSurplus" DOUBLE PRECISION NOT NULL DEFAULT 0;

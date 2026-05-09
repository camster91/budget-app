-- Migration: fix_schema_drift
-- Description: Comprehensive schema repair — adds ALL columns from current Prisma schema
-- that may be missing from the production database, causing 502 errors / blank pages.
-- Every ALTER TABLE uses IF NOT EXISTS for safe re-runs on partially-migrated DBs.
-- Also creates the NoSpendEntry table needed by the latest transfer-bug fixes.

-- ================================================================
-- Transaction — smart dedup, recurring, bill linking, account linking
-- ================================================================
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "isRecurring" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "recurringId" TEXT;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "isDuplicate" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "duplicateOfId" TEXT;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "fingerprint" TEXT;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "source" TEXT;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "accountId" TEXT;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "billId" TEXT;

-- Transaction indexes
CREATE INDEX IF NOT EXISTS "Transaction_accountId_idx" ON "Transaction"("accountId");
CREATE INDEX IF NOT EXISTS "Transaction_billId_idx" ON "Transaction"("billId");
CREATE INDEX IF NOT EXISTS "Transaction_householdId_date_idx" ON "Transaction"("householdId", "date");

-- ================================================================
-- Account — Plaid integration columns
-- ================================================================
ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "plaidAccessToken" TEXT;
ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "plaidItemId" TEXT;
ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "plaidCursor" TEXT;
ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "plaidLastSynced" TIMESTAMP(3);
ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "institution" TEXT;

-- ================================================================
-- Category — daily cap and parent/child nesting
-- ================================================================
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "dailyCap" DOUBLE PRECISION;
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "parentId" TEXT;

-- Category self-relation index
CREATE INDEX IF NOT EXISTS "Category_parentId_idx" ON "Category"("parentId");

-- ================================================================
-- Bill — auto-deduct
-- ================================================================
ALTER TABLE "Bill" ADD COLUMN IF NOT EXISTS "isAutoDeduct" BOOLEAN NOT NULL DEFAULT false;

-- ================================================================
-- NoSpendEntry table — for persistent no-spend day tracking
-- ================================================================
CREATE TABLE IF NOT EXISTS "NoSpendEntry" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "householdId" TEXT,
    CONSTRAINT "NoSpendEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "NoSpendEntry_householdId_date_key" ON "NoSpendEntry"("householdId", "date");
CREATE INDEX IF NOT EXISTS "NoSpendEntry_householdId_idx" ON "NoSpendEntry"("householdId");

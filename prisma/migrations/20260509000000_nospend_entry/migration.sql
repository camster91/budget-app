-- Migration: nospend_entry
-- Description: Adds NoSpendEntry model for tracking no-spend days

CREATE TABLE IF NOT EXISTS "NoSpendEntry" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "householdId" TEXT,

    CONSTRAINT "NoSpendEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "NoSpendEntry_householdId_date_key" ON "NoSpendEntry"("householdId", "date");
CREATE INDEX IF NOT EXISTS "NoSpendEntry_householdId_idx" ON "NoSpendEntry"("householdId");

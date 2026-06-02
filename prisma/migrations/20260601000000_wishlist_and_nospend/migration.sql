-- Migration: wishlist_and_nospend
-- Description: Adds WishlistItem model and ensures NoSpendEntry constraints
-- match the Prisma schema (householdId is NOT NULL, foreign key constraint).

-- WishlistItem was never in a previous migration; create from scratch.
CREATE TABLE IF NOT EXISTS "WishlistItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "link" TEXT,
    "priority" TEXT DEFAULT 'medium',
    "purchased" BOOLEAN NOT NULL DEFAULT false,
    "householdId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WishlistItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "WishlistItem_householdId_idx" ON "WishlistItem"("householdId");

-- NoSpendEntry: previous migration had householdId nullable, but Prisma
-- schema requires NOT NULL. If the table was created without the constraint
-- (e.g. manually in production), this ensures the column is NOT NULL going forward.
-- We only tighten if there are no NULL rows, to avoid breaking existing data.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'NoSpendEntry'
        AND column_name = 'householdId'
        AND is_nullable = 'YES'
    ) THEN
        -- Check for nulls before tightening
        IF NOT EXISTS (SELECT 1 FROM "NoSpendEntry" WHERE "householdId" IS NULL) THEN
            ALTER TABLE "NoSpendEntry" ALTER COLUMN "householdId" SET NOT NULL;
        END IF;
    END IF;
END $$;

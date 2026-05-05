-- Migration: multi_tenant_categories
-- Description: Make category names unique per household instead of globally unique, add rules column

-- Drop the old unique constraint on Category.name
DROP INDEX IF EXISTS "Category_name_key";

-- Add composite unique constraint: name must be unique per household
-- NULL householdId means shared/global categories, so we use NULL-safe comparison
CREATE UNIQUE INDEX "Category_name_householdId_unique" ON "Category"("name", "householdId");

-- Add rules column (stores JSON array of categorization rules)
ALTER TABLE "Category" ADD COLUMN "rules" TEXT;
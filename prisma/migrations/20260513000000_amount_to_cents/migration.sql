-- Migration: Convert all money fields from Float to integer cents
-- This migrates: Transaction.amount, Budget.amount, Account.balance, Bill.amount,
-- Goal.targetAmount, Goal.currentAmount, Income.amount, Category.dailyCap,
-- ScreenshotReceipt.rawAmount, SpendingPattern.avgAmount, DailyPeriod.*

-- Transaction.amount
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "amount_cents" INTEGER;
UPDATE "Transaction" SET "amount_cents" = ROUND("amount" * 100) WHERE "amount_cents" IS NULL;
ALTER TABLE "Transaction" DROP COLUMN "amount";
ALTER TABLE "Transaction" RENAME COLUMN "amount_cents" TO "amount";

-- Budget.amount
ALTER TABLE "Budget" ADD COLUMN IF NOT EXISTS "amount_cents" INTEGER;
UPDATE "Budget" SET "amount_cents" = ROUND("amount" * 100) WHERE "amount_cents" IS NULL;
ALTER TABLE "Budget" DROP COLUMN "amount";
ALTER TABLE "Budget" RENAME COLUMN "amount_cents" TO "amount";

-- Account.balance
ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "balance_cents" INTEGER;
UPDATE "Account" SET "balance_cents" = ROUND("balance" * 100) WHERE "balance_cents" IS NULL;
ALTER TABLE "Account" DROP COLUMN "balance";
ALTER TABLE "Account" RENAME COLUMN "balance_cents" TO "balance";

-- Bill.amount
ALTER TABLE "Bill" ADD COLUMN IF NOT EXISTS "amount_cents" INTEGER;
UPDATE "Bill" SET "amount_cents" = ROUND("amount" * 100) WHERE "amount_cents" IS NULL;
ALTER TABLE "Bill" DROP COLUMN "amount";
ALTER TABLE "Bill" RENAME COLUMN "amount_cents" TO "amount";

-- Goal.targetAmount
ALTER TABLE "Goal" ADD COLUMN IF NOT EXISTS "targetAmount_cents" INTEGER;
UPDATE "Goal" SET "targetAmount_cents" = ROUND("targetAmount" * 100) WHERE "targetAmount_cents" IS NULL;
ALTER TABLE "Goal" DROP COLUMN "targetAmount";
ALTER TABLE "Goal" RENAME COLUMN "targetAmount_cents" TO "targetAmount";

-- Goal.currentAmount
ALTER TABLE "Goal" ADD COLUMN IF NOT EXISTS "currentAmount_cents" INTEGER;
UPDATE "Goal" SET "currentAmount_cents" = ROUND("currentAmount" * 100) WHERE "currentAmount_cents" IS NULL;
ALTER TABLE "Goal" DROP COLUMN "currentAmount";
ALTER TABLE "Goal" RENAME COLUMN "currentAmount_cents" TO "currentAmount";

-- Income.amount
ALTER TABLE "Income" ADD COLUMN IF NOT EXISTS "amount_cents" INTEGER;
UPDATE "Income" SET "amount_cents" = ROUND("amount" * 100) WHERE "amount_cents" IS NULL;
ALTER TABLE "Income" DROP COLUMN "amount";
ALTER TABLE "Income" RENAME COLUMN "amount_cents" TO "amount";

-- Category.dailyCap
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "dailyCap_cents" INTEGER;
UPDATE "Category" SET "dailyCap_cents" = ROUND("dailyCap" * 100) WHERE "dailyCap_cents" IS NULL;
ALTER TABLE "Category" DROP COLUMN "dailyCap";
ALTER TABLE "Category" RENAME COLUMN "dailyCap_cents" TO "dailyCap";

-- ScreenshotReceipt.rawAmount
ALTER TABLE "ScreenshotReceipt" ADD COLUMN IF NOT EXISTS "rawAmount_cents" INTEGER;
UPDATE "ScreenshotReceipt" SET "rawAmount_cents" = ROUND("rawAmount" * 100) WHERE "rawAmount_cents" IS NULL;
ALTER TABLE "ScreenshotReceipt" DROP COLUMN "rawAmount";
ALTER TABLE "ScreenshotReceipt" RENAME COLUMN "rawAmount_cents" TO "rawAmount";

-- SpendingPattern.avgAmount
ALTER TABLE "SpendingPattern" ADD COLUMN IF NOT EXISTS "avgAmount_cents" INTEGER;
UPDATE "SpendingPattern" SET "avgAmount_cents" = ROUND("avgAmount" * 100) WHERE "avgAmount_cents" IS NULL;
ALTER TABLE "SpendingPattern" DROP COLUMN "avgAmount";
ALTER TABLE "SpendingPattern" RENAME COLUMN "avgAmount_cents" TO "avgAmount";

-- DailyPeriod.totalIncome
ALTER TABLE "DailyPeriod" ADD COLUMN IF NOT EXISTS "totalIncome_cents" INTEGER;
UPDATE "DailyPeriod" SET "totalIncome_cents" = ROUND("totalIncome" * 100) WHERE "totalIncome_cents" IS NULL;
ALTER TABLE "DailyPeriod" DROP COLUMN "totalIncome";
ALTER TABLE "DailyPeriod" RENAME COLUMN "totalIncome_cents" TO "totalIncome";

-- DailyPeriod.billsTotal
ALTER TABLE "DailyPeriod" ADD COLUMN IF NOT EXISTS "billsTotal_cents" INTEGER;
UPDATE "DailyPeriod" SET "billsTotal_cents" = ROUND("billsTotal" * 100) WHERE "billsTotal_cents" IS NULL;
ALTER TABLE "DailyPeriod" DROP COLUMN "billsTotal";
ALTER TABLE "DailyPeriod" RENAME COLUMN "billsTotal_cents" TO "billsTotal";

-- DailyPeriod.dailyAllowance
ALTER TABLE "DailyPeriod" ADD COLUMN IF NOT EXISTS "dailyAllowance_cents" INTEGER;
UPDATE "DailyPeriod" SET "dailyAllowance_cents" = ROUND("dailyAllowance" * 100) WHERE "dailyAllowance_cents" IS NULL;
ALTER TABLE "DailyPeriod" DROP COLUMN "dailyAllowance";
ALTER TABLE "DailyPeriod" RENAME COLUMN "dailyAllowance_cents" TO "dailyAllowance";

-- DailyPeriod.accumulatedSurplus
ALTER TABLE "DailyPeriod" ADD COLUMN IF NOT EXISTS "accumulatedSurplus_cents" INTEGER;
UPDATE "DailyPeriod" SET "accumulatedSurplus_cents" = ROUND("accumulatedSurplus" * 100) WHERE "accumulatedSurplus_cents" IS NULL;
ALTER TABLE "DailyPeriod" DROP COLUMN "accumulatedSurplus";
ALTER TABLE "DailyPeriod" RENAME COLUMN "accumulatedSurplus_cents" TO "accumulatedSurplus";

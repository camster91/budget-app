-- Add carryover column to Budget table
ALTER TABLE "Budget" ADD COLUMN IF NOT EXISTS "carryover" BOOLEAN NOT NULL DEFAULT false;

-- Create GoalContribution table
CREATE TABLE IF NOT EXISTS "GoalContribution" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    "amount" INTEGER NOT NULL,
    "note" TEXT,
    "goalId" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GoalContribution_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GoalContribution_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "GoalContribution_goalId_idx" ON "GoalContribution"("goalId");
CREATE INDEX IF NOT EXISTS "GoalContribution_householdId_idx" ON "GoalContribution"("householdId");

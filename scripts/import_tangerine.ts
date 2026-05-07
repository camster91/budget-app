import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://budget:Budget2026!@budget-db:5432/budget",
    },
  },
});

async function main() {
  // Get the household
  const user = await prisma.user.findFirst({
    include: { household: true },
  });

  if (!user || !user.householdId) {
    console.error("No user found");
    process.exit(1);
  }

  console.log(`User: ${user.email}, householdId: ${user.householdId}`);

  // Read the parsed CSV
  const fs = await import("fs");
  const csvData = fs.readFileSync(
    "/home/camst/.hermes/cache/documents/tangerine_import.csv",
    "utf-8"
  );

  const rows: Array<{ date: string; amount: string; description: string; type: string }> = [];
  for (const line of csvData.split('\n').slice(1)) { // skip header
    if (!line.trim()) continue;
    const [date, amount, description, type] = line.split(',');
    if (date && amount && description) {
      rows.push({ date, amount, description, type });
    }
  }

  console.log(`Parsed ${rows.length} rows from CSV`);

  // Map CSV to TransactionCreateInput
  const transactions = rows
    .filter((row) => row.date && row.amount && row.description)
    .map((row: Record<string, string>) => ({
      amount: parseFloat(row.amount),
      description: row.description,
      date: new Date(row.date),
      type: row.type as "income" | "expense",
      isTransfer: false,
      householdId: user.householdId,
      // We'll skip category assignment for now — can be done manually later
    }));

  console.log(`Inserting ${transactions.length} transactions...`);

  // Insert in batches of 50
  const BATCH_SIZE = 50;
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
    const batch = transactions.slice(i, i + BATCH_SIZE);
    try {
      await prisma.transaction.createMany({
        data: batch,
        skipDuplicates: true, // Avoid duplicates on re-run
      });
      inserted += batch.length;
      console.log(`  Inserted ${inserted}/${transactions.length}...`);
    } catch (e: unknown) {
      errors += batch.length;
      console.error(`  Batch error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  console.log(`\nDone! Inserted: ${inserted}, Errors: ${errors}`);

  // Verify
  const count = await prisma.transaction.count({
    where: { householdId: user.householdId },
  });
  console.log(`Total transactions in DB for household: ${count}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
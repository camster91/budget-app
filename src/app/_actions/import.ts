"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export type CSVRow = {
  date: string | Date;
  description: string;
  amount: string | number;
  type?: "income" | "expense";
  category?: string;
  balance?: string | number;
  [key: string]: any;
};

export type ImportOptions = {
  skipTransfers?: boolean;
  autoCategorize?: boolean;
  defaultAccountId?: string;
  dateFormat?: string;
};

export async function importCSVTransactions(
  rows: CSVRow[],
  options: ImportOptions = {}
) {
  try {
    const {
      skipTransfers = true,
      autoCategorize = true,
      defaultAccountId,
      dateFormat = "yyyy-mm-dd",
    } = options;

    const importedTransactions = [];
    const errors = [];

    // Get or create default account if not provided
    let accountId = defaultAccountId;
    if (!accountId) {
      const defaultAccount = await prisma.account.findFirst({
        where: { isDefault: true },
      });

      if (!defaultAccount) {
        // Create a default account
        const newAccount = await prisma.account.create({
          data: {
            name: "Primary Checking",
            type: "checking",
            institution: "Tangerine",
            isDefault: true,
            color: "#FF6B00", // Tangerine orange
          },
        });
        accountId = newAccount.id;
      } else {
        accountId = defaultAccount.id;
      }
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      try {
        // Skip empty rows
        if (!row.date || !row.description || row.amount === undefined || row.amount === null) {
          continue;
        }

        // Parse date
        let date: Date;
        try {
          const dateValue = row.date;
          
          if (dateValue instanceof Date) {
            date = dateValue;
          } else if (typeof dateValue === 'string') {
            // Try various date formats
            const dateStr = dateValue.trim();
            
            // Try ISO format first (yyyy-mm-dd)
            if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
              date = new Date(dateStr);
            } 
            // Try Canadian format (dd/mm/yyyy or dd-mm-yyyy)
            else if (dateStr.match(/^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/)) {
              const parts = dateStr.split(/[/-]/);
              date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
            }
            // Try with month names (01 Jan 2026)
            else if (dateStr.match(/\d{1,2}\s+\w{3}\s+\d{4}/)) {
              date = new Date(dateStr);
            } else {
              date = new Date(dateStr);
            }
          } else {
            throw new Error(`Invalid date format: ${dateValue}`);
          }

          if (isNaN(date.getTime())) {
            throw new Error(`Invalid date: ${dateValue}`);
          }
        } catch (error) {
          errors.push({
            row: i + 1,
            field: "date",
            value: row.date,
            error: `Failed to parse date: ${error instanceof Error ? error.message : String(error)}`,
          });
          continue;
        }

        // Parse amount
        let amount: number;
        try {
          if (typeof row.amount === 'string') {
            // Remove currency symbols and commas
            const cleanAmount = row.amount.replace(/[$,]/g, '');
            amount = parseFloat(cleanAmount);
          } else {
            amount = Number(row.amount);
          }

          if (isNaN(amount)) {
            throw new Error(`Invalid amount: ${row.amount}`);
          }
        } catch (error) {
          errors.push({
            row: i + 1,
            field: "amount",
            value: row.amount,
            error: `Failed to parse amount: ${error}`,
          });
          continue;
        }

        // Determine transaction type
        let type: "income" | "expense" = "expense";
        if (row.type) {
          type = row.type.toLowerCase() as "income" | "expense";
        } else {
          // Try to infer from description or amount
          const desc = row.description.toLowerCase();
          if (desc.includes("deposit") || desc.includes("transfer from") || amount < 0) {
            type = "income";
          }
        }

        // Handle negative amounts (some banks use negative for expenses)
        if (amount < 0 && type === "expense") {
          amount = Math.abs(amount);
        } else if (amount > 0 && type === "income") {
          // Keep positive for income
        }

        // Check if this is a transfer between accounts
        const description = row.description.trim();
        const isTransfer = skipTransfers ? isTransferTransaction(description) : false;

        // Determine category
        let categoryId: string | null = null;
        if (row.category) {
          // Find or create category
          const category = await prisma.category.upsert({
            where: { name: row.category },
            update: {},
            create: {
              name: row.category,
              type,
            },
          });
          categoryId = category.id;
        } else if (autoCategorize) {
          // Auto-categorize
          const category = await categorizeTransaction(description, type);
          if (category) {
            categoryId = category.id;
          }
        }

        // Create transaction
        const transaction = await prisma.transaction.create({
          data: {
            amount,
            description,
            date,
            type,
            categoryId,
            accountId,
            isTransfer,
            statementId: `import_${Date.now()}_${i}`,
          },
        });

        importedTransactions.push(transaction);
      } catch (error) {
        errors.push({
          row: i + 1,
          error: `Failed to import row: ${error}`,
          data: row,
        });
      }
    }

    // Update account balance if we have a default account
    if (accountId && importedTransactions.length > 0) {
      await updateAccountBalance(accountId);
    }

    revalidatePath("/transactions");
    revalidatePath("/");

    return {
      success: true,
      imported: importedTransactions.length,
      errors: errors.length > 0 ? errors : undefined,
      data: {
        transactions: importedTransactions,
      },
    };
  } catch (error) {
    console.error("Failed to import CSV:", error);
    return {
      success: false,
      error: "Failed to import CSV transactions",
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

// Helper function to detect transfer transactions
function isTransferTransaction(description: string): boolean {
  const desc = description.toLowerCase();
  const transferKeywords = [
    "internet deposit from",
    "internet withdrawal to", 
    "transfer to",
    "transfer from",
    "account -",
    "bill -",
    "e-transfer",
    "interac e-transfer",
  ];

  return transferKeywords.some(keyword => desc.includes(keyword));
}

// Helper function to categorize transactions
async function categorizeTransaction(
  description: string,
  type: "income" | "expense"
): Promise<{ id: string; name: string } | null> {
  const desc = description.toLowerCase();

  // Define categorization rules
  const rules: Array<{
    keywords: string[];
    categoryName: string;
    categoryType: "income" | "expense";
  }> = [
    // Income categories
    {
      keywords: ["salary", "payroll", "paycheque"],
      categoryName: "Salary",
      categoryType: "income",
    },
    {
      keywords: ["deposit", "transfer from", "e-transfer from"],
      categoryName: "Transfer",
      categoryType: "income",
    },

    // Expense categories
    {
      keywords: ["metro", "walmart", "costco", "instacart", "grocery"],
      categoryName: "Groceries",
      categoryType: "expense",
    },
    {
      keywords: ["tim hortons", "subway", "pizza", "burger", "mcdonalds", "restaurant"],
      categoryName: "Food & Dining",
      categoryType: "expense",
    },
    {
      keywords: ["amazon", "amzn", "target", "shopping", "store"],
      categoryName: "Shopping",
      categoryType: "expense",
    },
    {
      keywords: ["uber", "parking", "transit", "gas"],
      categoryName: "Transportation",
      categoryType: "expense",
    },
    {
      keywords: ["bill payment", "recurring", "utility", "phone"],
      categoryName: "Bills & Utilities",
      categoryType: "expense",
    },
    {
      keywords: ["netflix", "spotify", "youtube", "apple.com/bill", "subscription"],
      categoryName: "Subscriptions",
      categoryType: "expense",
    },
  ];

  // Find matching rule
  const matchingRule = rules.find(
    (rule) =>
      rule.categoryType === type &&
      rule.keywords.some((keyword) => desc.includes(keyword))
  );

  if (matchingRule) {
    // Find or create category
    const category = await prisma.category.upsert({
      where: { name: matchingRule.categoryName },
      update: {},
      create: {
        name: matchingRule.categoryName,
        type: matchingRule.categoryType,
      },
    });

    return { id: category.id, name: category.name };
  }

  return null;
}

// Helper function to update account balance
async function updateAccountBalance(accountId: string) {
  const transactions = await prisma.transaction.findMany({
    where: { accountId, isTransfer: false },
  });

  const income = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const expenses = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = income - expenses;

  await prisma.account.update({
    where: { id: accountId },
    data: { balance },
  });
}
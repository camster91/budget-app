/**
 * Seed a test household with 30 days of realistic activity.
 * Runs against the same DATABASE_URL as the app (production DB on Coolify).
 *
 * Creates a fully-isolated Household + User with its own accounts/categories/
 * transactions/bills/budgets/goals/wishlist so it never collides with the
 * real user (householdId is the partition key everywhere).
 *
 * Required env:
 *   DATABASE_URL
 *   TEST_USER_EMAIL       (default: qa@budgetapp.local)
 *   TEST_USER_PASSWORD    (default: QaTest2026!)
 *   TEST_USER_NAME        (default: "QA Test User")
 *
 * Run:  npx tsx scripts/seed-30-days.ts
 * Reset: TEST_USER_EMAIL=qa@budgetapp.local npx tsx scripts/seed-30-days.ts
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const EMAIL = process.env.TEST_USER_EMAIL ?? "qa@budgetapp.local";
const PASSWORD = process.env.TEST_USER_PASSWORD ?? "QaTest2026!";
const NAME = process.env.TEST_USER_NAME ?? "QA Test User";

// 30 days back from today, anchored to local midnight
const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(TODAY.getTime() - n * DAY);
const daysAhead = (n: number) => new Date(TODAY.getTime() + n * DAY);

// Random helper
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]!;

// Cents helper
const dollars = (d: number) => Math.round(d * 100);

// ─────────────────────────────────────────────────────────────────────────
// Category catalog (matches what a typical Torontonian would track)
// ─────────────────────────────────────────────────────────────────────────
const CATEGORIES = [
    // Expenses
    { name: "Groceries", icon: "🛒", color: "#10b981", type: "expense", dailyCap: 80, rules: ["loblaws", "metro", "sobeys", "farm boy", "no frills", "fresh"] },
    { name: "Restaurants", icon: "🍽️", color: "#f59e0b", type: "expense", dailyCap: 50, rules: ["uber eats", "skip", "doordash", "tim hortons", "starbucks", "mcdonald"] },
    { name: "Coffee", icon: "☕", color: "#92400e", type: "expense", dailyCap: 15, rules: ["tim hortons", "starbucks", "balzac", "second cup"] },
    { name: "Transit", icon: "🚇", color: "#3b82f6", type: "expense", dailyCap: 20, rules: ["presto", "ttc", "uber"] },
    { name: "Gas", icon: "⛽", color: "#ef4444", type: "expense", rules: ["petro", "esso", "shell", "costco gas"] },
    { name: "Kids", icon: "🧸", color: "#ec4899", type: "expense", dailyCap: 40, rules: ["chapters", "indigo", "toys r us", "schleich"] },
    { name: "Childcare", icon: "👶", color: "#a855f7", type: "expense", rules: ["daycare", "montessori"] },
    { name: "Utilities", icon: "💡", color: "#6366f1", type: "expense", rules: ["enbridge", "toronto hydro", "rogers", "bell", "fido"] },
    { name: "Rent/Mortgage", icon: "🏠", color: "#0ea5e9", type: "expense", rules: ["mortgage", "rent"] },
    { name: "Health", icon: "💊", color: "#22c55e", type: "expense", rules: ["shoppers", "rexall", "pharmacy"] },
    { name: "Entertainment", icon: "🎬", color: "#8b5cf6", type: "expense", rules: ["netflix", "spotify", "ciniplex", "crave"] },
    { name: "Shopping", icon: "🛍️", color: "#f43f5e", type: "expense", rules: ["amazon", "winners", "canadian tire", "home depot"] },
    { name: "Personal", icon: "✂️", color: "#14b8a6", type: "expense", rules: ["salon", "barber", "sephora"] },
    { name: "Subscriptions", icon: "📺", color: "#6366f1", type: "expense", rules: ["netflix", "spotify", "icloud"] },
    { name: "Gifts", icon: "🎁", color: "#f472b6", type: "expense", rules: [] },
    { name: "Bank Fees", icon: "🏦", color: "#64748b", type: "expense", rules: [] },
    { name: "Cash", icon: "💵", color: "#84cc16", type: "expense", rules: ["atm"] },
    // Income
    { name: "Paycheque", icon: "💰", color: "#22c55e", type: "income", rules: [] },
    { name: "Side Income", icon: "💼", color: "#10b981", type: "income", rules: ["upwork", "freelance"] },
    { name: "Refund", icon: "↩️", color: "#06b6d4", type: "income", rules: [] },
];

const BILLS = [
    { name: "Rent", amount: 2800, dueDay: 1, category: "Rent/Mortgage", costType: "fixed" },
    { name: "Hydro (Toronto Hydro)", amount: 145, dueDay: 8, category: "Utilities", costType: "variable" },
    { name: "Gas (Enbridge)", amount: 95, dueDay: 15, category: "Utilities", costType: "variable" },
    { name: "Internet (Rogers)", amount: 110, dueDay: 22, category: "Utilities", costType: "fixed" },
    { name: "Mobile (Fido)", amount: 75, dueDay: 25, category: "Utilities", costType: "fixed" },
    { name: "Streaming Bundle", amount: 38, dueDay: 5, category: "Subscriptions", costType: "fixed" },
    { name: "Daycare", amount: 1450, dueDay: 1, category: "Childcare", costType: "fixed" },
    { name: "Auto Insurance", amount: 165, dueDay: 12, category: "Bank Fees", costType: "fixed" },
];

const MERCHANTS_BY_CATEGORY: Record<string, string[]> = {
    "Groceries": ["Loblaws", "Metro", "Farm Boy", "No Frills", "Sobeys", "Fresh & Wild"],
    "Restaurants": ["Uber Eats", "Skip The Dishes", "The Keg", "Earls", "Boston Pizza", "Cactus Club"],
    "Coffee": ["Tim Hortons", "Starbucks", "Balzac's", "Second Cup", "Dark Horse"],
    "Transit": ["Presto", "TTC", "Uber"],
    "Gas": ["Petro-Canada", "Esso", "Shell", "Costco Gas"],
    "Kids": ["Indigo", "Chapters", "Mastermind Toys", "Toy Town", "Bricks & Minifigs"],
    "Childcare": ["Montessori Daycare"],
    "Utilities": ["Toronto Hydro", "Enbridge", "Rogers", "Bell", "Fido"],
    "Rent/Mortgage": ["Mortgage Payment"],
    "Health": ["Shoppers Drug Mart", "Rexall", "Toronto Dental"],
    "Entertainment": ["Netflix", "Spotify", "Cineplex", "Crave", "Disney+"],
    "Shopping": ["Amazon", "Winners", "Canadian Tire", "Home Depot", "IKEA"],
    "Personal": ["First Choice Haircutters", "Sephora", "MAC"],
    "Subscriptions": ["Netflix", "Spotify", "iCloud", "Adobe", "NYTimes"],
    "Gifts": ["Hallmark", "Indigo", "Mamazon"],
    "Bank Fees": ["TD Bank", "RBC"],
    "Cash": ["TD ATM", "RBC ATM"],
    "Paycheque": ["Acme Corp Payroll"],
    "Side Income": ["Upwork Payment", "Freelance Inc"],
    "Refund": ["Amazon Refund", "Costco Refund"],
};

async function main() {
    console.log(`\n🌱 Seeding 30-day test data for ${EMAIL}…\n`);

    // ─── 1. Wipe any prior test household to make this idempotent ─────
    const existingUser = await prisma.user.findUnique({ where: { email: EMAIL } });
    if (existingUser) {
        console.log("🗑️  Removing prior test user + household…");
        await prisma.user.delete({ where: { email: EMAIL } });
        // household may already be gone (cascade), but try
        try { await prisma.household.delete({ where: { id: existingUser.householdId } }); } catch {}
    }

    // ─── 2. Create household + user ──────────────────────────────────
    const household = await prisma.household.create({
        data: { name: "QA Test Household" },
    });
    const hashed = await bcrypt.hash(PASSWORD, 12);
    const user = await prisma.user.create({
        data: {
            email: EMAIL,
            password: hashed,
            name: NAME,
            householdId: household.id,
        },
    });
    console.log(`✅ User: ${user.email} → household ${household.id}`);

    // ─── 3. Accounts ─────────────────────────────────────────────────
    const chequing = await prisma.account.create({
        data: { householdId: household.id, name: "TD Chequing", type: "checking", institution: "TD", balance: 4250_00, color: "#10b981", isDefault: true },
    });
    const savings = await prisma.account.create({
        data: { householdId: household.id, name: "RBC Savings", type: "savings", institution: "RBC", balance: 12_300_00, color: "#3b82f6" },
    });
    const credit = await prisma.account.create({
        data: { householdId: household.id, name: "TD Visa", type: "credit", institution: "TD", balance: 842_00, color: "#ef4444" },
    });
    const cash = await prisma.account.create({
        data: { householdId: household.id, name: "Cash", type: "cash", institution: null, balance: 85_00, color: "#84cc16" },
    });
    console.log(`✅ Accounts: 4 (chequing, savings, credit, cash)`);

    // ─── 4. Categories ───────────────────────────────────────────────
    const cats: Record<string, { id: string; dailyCap: number | null; type: string }> = {};
    for (const c of CATEGORIES) {
        const created = await prisma.category.create({
            data: {
                householdId: household.id,
                name: c.name,
                icon: c.icon,
                color: c.color,
                type: c.type,
                dailyCap: c.dailyCap ?? null,
                rules: JSON.stringify(c.rules),
            },
        });
        cats[c.name] = { id: created.id, dailyCap: created.dailyCap, type: created.type };
    }
    console.log(`✅ Categories: ${CATEGORIES.length}`);

    // ─── 5. Income sources ───────────────────────────────────────────
    await prisma.income.create({
        data: {
            householdId: household.id,
            name: "Acme Corp Salary",
            amount: 6500_00,
            frequency: "biweekly",
            startDate: daysAgo(120),
            dayOfMonth: 15,
            isActive: true,
        },
    });
    await prisma.income.create({
        data: {
            householdId: household.id,
            name: "Side Freelance",
            amount: 800_00,
            frequency: "monthly",
            startDate: daysAgo(60),
            dayOfMonth: 1,
            isActive: true,
        },
    });
    console.log(`✅ Income sources: 2`);

    // ─── 6. Transactions — 30 days of realistic activity ─────────────
    // Biweekly paycheques fall on days -28, -14, 0 (approx)
    const paychequeDays = [28, 14, 0];
    // Side income: irregular — days -22, -8
    const sideIncomeDays = [22, 8];

    const tx: any[] = [];

    // Paycheques
    for (const d of paychequeDays) {
        const date = daysAgo(d);
        date.setHours(9, 0, 0, 0);
        tx.push({
            householdId: household.id,
            amount: 6500_00,
            description: "Acme Corp Payroll — Direct Deposit",
            date,
            type: "income",
            categoryId: cats["Paycheque"]!.id,
            accountId: chequing.id,
            isTransfer: false,
            isRecurring: true,
            isDuplicate: false,
            fingerprint: `pay-${d}`,
            source: "manual",
        });
    }

    // Side income
    for (const d of sideIncomeDays) {
        const date = daysAgo(d);
        date.setHours(14, 30, 0, 0);
        tx.push({
            householdId: household.id,
            amount: 800_00 + rand(0, 300_00),
            description: "Upwork Payment — Web design project",
            date,
            type: "income",
            categoryId: cats["Side Income"]!.id,
            accountId: chequing.id,
            isTransfer: false,
            isDuplicate: false,
            fingerprint: `side-${d}`,
            source: "manual",
        });
    }

    // One refund (positive transaction tagged as income)
    {
        const date = daysAgo(11);
        date.setHours(11, 15, 0, 0);
        tx.push({
            householdId: household.id,
            amount: 42_00,
            description: "Amazon Refund — Returned headphones",
            date,
            type: "income",
            categoryId: cats["Refund"]!.id,
            accountId: credit.id,
            isTransfer: false,
            isDuplicate: false,
            fingerprint: `refund-11`,
            source: "manual",
        });
    }

    // Daily expenses over 30 days — realistic frequency per category
    const expenseFrequency: Record<string, [number, number, number]> = {
        // [minPerWeek, maxPerWeek, typicalCents]
        "Groceries": [1, 2, 110_00],
        "Restaurants": [2, 5, 38_00],
        "Coffee": [3, 7, 6_00],
        "Transit": [2, 5, 8_00],
        "Gas": [0, 1, 65_00],
        "Kids": [0, 2, 35_00],
        "Health": [0, 1, 28_00],
        "Entertainment": [0, 1, 22_00],
        "Shopping": [0, 2, 75_00],
        "Personal": [0, 1, 45_00],
        "Cash": [0, 2, 40_00],
        "Bank Fees": [0, 0, 12_00],
    };

    let txCount = 0;
    for (let dayBack = 0; dayBack < 30; dayBack++) {
        for (const [catName, [minW, maxW, typical]] of Object.entries(expenseFrequency)) {
            const perDay = (minW + Math.random() * (maxW - minW)) / 7;
            if (Math.random() < perDay) {
                const cat = cats[catName]!;
                const merchants = MERCHANTS_BY_CATEGORY[catName] || [catName];
                const merchant = pick(merchants);
                const amount = typical + rand(-typical / 3 | 0, typical / 3 | 0);
                const date = daysAgo(dayBack);
                date.setHours(rand(7, 21), rand(0, 59), 0, 0);
                tx.push({
                    householdId: household.id,
                    amount: Math.max(100, amount),
                    description: merchant,
                    date,
                    type: "expense",
                    categoryId: cat.id,
                    accountId: Math.random() < 0.6 ? credit.id : chequing.id,
                    isTransfer: false,
                    isDiscretionary: !["Utilities", "Rent/Mortgage", "Childcare", "Subscriptions", "Bank Fees", "Health"].includes(catName),
                    isDuplicate: false,
                    fingerprint: `${catName}-${dayBack}-${txCount}`,
                    source: pick(["manual", "screenshot", "import", "plaid"]),
                });
                txCount++;
            }
        }
    }

    // ─── 7. Bills (one per BILLS entry, with last 3 months of payments) ─
    for (const b of BILLS) {
        const cat = cats[b.category]!;
        const account = pick([chequing, credit]);
        const bill = await prisma.bill.create({
            data: {
                householdId: household.id,
                name: b.name,
                amount: dollars(b.amount),
                dueDay: b.dueDay,
                frequency: "monthly",
                categoryId: cat.id,
                accountId: account.id,
                isAutoDeduct: false,
                isActive: true,
                costType: b.costType,
                amountLow: b.costType === "variable" ? dollars(b.amount * 0.7) : null,
                amountHigh: b.costType === "variable" ? dollars(b.amount * 1.3) : null,
                average: dollars(b.amount),
                sampleCount: 3,
                alertThreshold: 20,
            },
        });

        // 3 months of payment history
        for (let monthsAgo = 3; monthsAgo >= 0; monthsAgo--) {
            const due = new Date(TODAY);
            due.setMonth(due.getMonth() - monthsAgo);
            due.setDate(Math.min(b.dueDay, 28));
            due.setHours(9, 0, 0, 0);
            const isCurrent = monthsAgo === 0;
            const isPast = monthsAgo > 0;

            // Variable bills fluctuate
            const actualAmount = b.costType === "variable"
                ? dollars(b.amount * (0.7 + Math.random() * 0.6))
                : dollars(b.amount);

            const isSpike = b.costType === "variable" && actualAmount > dollars(b.amount) * 1.2;

            await prisma.billPayment.create({
                data: {
                    householdId: household.id,
                    billId: bill.id,
                    amount: actualAmount,
                    dueDate: due,
                    paidAt: isPast ? new Date(due.getTime() + rand(0, 3) * DAY) : null,
                    note: isSpike ? "Spike — winter heating" : null,
                    isSpike,
                },
            });
        }
    }
    console.log(`✅ Bills: ${BILLS.length} (3 months payment history each)`);

    // ─── 8. Budgets — current month (June 2026) and 2 prior months ───
    const monthKey = (offset: number) => {
        const d = new Date(TODAY);
        d.setMonth(d.getMonth() - offset);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    };
    const budgetCats = ["Groceries", "Restaurants", "Coffee", "Transit", "Entertainment", "Shopping", "Kids", "Health", "Personal", "Subscriptions"];
    const monthlyCap: Record<string, number> = {
        "Groceries": 800, "Restaurants": 350, "Coffee": 80, "Transit": 150, "Entertainment": 100,
        "Shopping": 300, "Kids": 200, "Health": 100, "Personal": 100, "Subscriptions": 60,
    };
    for (let m = 0; m < 3; m++) {
        const period = monthKey(m);
        for (const catName of budgetCats) {
            await prisma.budget.create({
                data: {
                    householdId: household.id,
                    categoryId: cats[catName]!.id,
                    period,
                    amount: dollars(monthlyCap[catName]!),
                    carryover: m === 0 && Math.random() < 0.4, // some rollover this month
                },
            });
        }
    }
    console.log(`✅ Budgets: 3 months × ${budgetCats.length} categories`);

    // ─── 9. Goals ────────────────────────────────────────────────────
    await prisma.goal.create({
        data: {
            householdId: household.id,
            name: "Emergency Fund",
            targetAmount: 15_000_00,
            currentAmount: 8_500_00,
            targetDate: new Date("2026-12-31"),
            categoryId: cats["Bank Fees"]!.id,
        },
    });
    await prisma.goal.create({
        data: {
            householdId: household.id,
            name: "Family Disney Trip",
            targetAmount: 6_000_00,
            currentAmount: 1_200_00,
            targetDate: new Date("2027-03-15"),
            categoryId: null,
        },
    });
    await prisma.goal.create({
        data: {
            householdId: household.id,
            name: "Olive's College Fund",
            targetAmount: 50_000_00,
            currentAmount: 4_200_00,
            targetDate: new Date("2042-09-01"),
            categoryId: null,
        },
    });
    console.log(`✅ Goals: 3`);

    // ─── 10. Wishlist ────────────────────────────────────────────────
    await prisma.wishlistItem.createMany({
        data: [
            { householdId: household.id, name: "New coffee machine", price: 650_00, priority: "medium", purchased: false, link: "https://example.com/breville" },
            { householdId: household.id, name: "AirPods Pro 2", price: 329_00, priority: "low", purchased: false },
            { householdId: household.id, name: "Kids' bike (Adelaide)", price: 280_00, priority: "high", purchased: false },
            { householdId: household.id, name: "Standing desk", price: 599_00, priority: "medium", purchased: false, link: "https://example.com/fully" },
            { householdId: household.id, name: "Winter tires", price: 850_00, priority: "high", purchased: true },
        ],
    });
    console.log(`✅ Wishlist: 5 items`);

    // ─── 11. No-spend days ───────────────────────────────────────────
    for (let d = 0; d < 30; d += rand(4, 7)) {
        try {
            await prisma.noSpendEntry.create({
                data: { householdId: household.id, date: daysAgo(d) },
            });
        } catch { /* unique constraint on duplicate date — ignore */ }
    }
    console.log(`✅ No-spend days seeded`);

    // ─── 12. Insert all transactions in one batch ───────────────────
    console.log(`\n💾 Inserting ${tx.length} transactions…`);
    // createMany doesn't allow individual field defaults; do a few batches
    const BATCH = 200;
    for (let i = 0; i < tx.length; i += BATCH) {
        await prisma.transaction.createMany({ data: tx.slice(i, i + BATCH) });
    }
    console.log(`✅ Transactions inserted`);

    // ─── 13. Some duplicates for the dedupe feature ──────────────────
    // Add 2 obvious duplicates (same fingerprint, different id)
    const baseTx = await prisma.transaction.findFirst({
        where: { householdId: household.id, type: "expense" },
        orderBy: { date: "asc" },
    });
    if (baseTx) {
        await prisma.transaction.create({
            data: {
                householdId: household.id,
                amount: baseTx.amount,
                description: baseTx.description,
                date: baseTx.date,
                type: "expense",
                categoryId: baseTx.categoryId,
                accountId: baseTx.accountId,
                isDuplicate: true,
                duplicateOfId: baseTx.id,
                fingerprint: baseTx.fingerprint + "-dup",
                source: "import",
            },
        });
    }
    console.log(`✅ Duplicate detection seeded`);

    console.log(`\n✨ Done! Sign in at https://budget.ashbi.ca/login`);
    console.log(`   Email:    ${EMAIL}`);
    console.log(`   Password: ${PASSWORD}\n`);
}

main()
    .catch((e) => {
        console.error("❌ Seed failed:", e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());

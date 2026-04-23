import { prisma } from "./prisma";
import { startOfMonth, addDays } from "date-fns";

/**
 * Seed the database with demo data for the Daily Spending Tracker.
 * Run with: npx tsx src/lib/seed.ts
 */

async function seed() {
    console.log("🌱 Seeding demo data...\n");

    // Clear existing (optional — comment out to keep real data)
    await prisma.transaction.deleteMany();
    await prisma.bill.deleteMany();
    await prisma.income.deleteMany();
    await prisma.screenshotReceipt.deleteMany();
    await prisma.category.deleteMany();
    await prisma.user.deleteMany();

    // ─── User ──────────────────────────────────────────────────
    const user = await prisma.user.create({
        data: {
            email: "demo@glowos.finance",
            password: "$2a$10$hashedpasswordplaceholder",
            name: "Demo User",
        },
    });
    console.log("👤 User created:", user.email);

    // ─── Categories ────────────────────────────────────────────
    const categories = await prisma.category.createMany({
        data: [
            { name: "Coffee & Snacks", icon: "☕", color: "#d97706", type: "expense" },
            { name: "Groceries", icon: "🛒", color: "#059669", type: "expense" },
            { name: "Gas", icon: "⛽", color: "#dc2626", type: "expense" },
            { name: "Streaming", icon: "📺", color: "#7c3aed", type: "expense" },
            { name: "Dining Out", icon: "🍔", color: "#ea580c", type: "expense" },
            { name: "Transport", icon: "🚌", color: "#2563eb", type: "expense" },
            { name: "Shopping", icon: "🛍️", color: "#db2777", type: "expense" },
            { name: "Rent", icon: "🏠", color: "#7c2d12", type: "expense" },
            { name: "Salary", icon: "💰", color: "#059669", type: "income" },
            { name: "Freelance", icon: "💻", color: "#4f46e5", type: "income" },
        ],
    });
    console.log("🗂️  Categories seeded");

    const catMap = await prisma.category.findMany();
    const byName = Object.fromEntries(catMap.map((c) => [c.name, c.id]));

    // ─── Income ────────────────────────────────────────────────
    const today = new Date();
    const income = await prisma.income.create({
        data: {
            name: "Primary Salary",
            amount: 4200,
            frequency: "monthly",
            startDate: new Date(today.getFullYear(), today.getMonth(), 1),
            dayOfMonth: 1,
            isActive: true,
        },
    });
    console.log("💰 Income created:", income.name, fmt(income.amount));

    // ─── Bills ─────────────────────────────────────────────────
    const bills = await prisma.bill.createMany({
        data: [
            { name: "Rent", amount: 1600, dueDay: 1, frequency: "monthly", categoryId: byName["Rent"], accountId: "", isAutoDeduct: true },
            { name: "Netflix", amount: 15.99, dueDay: 15, frequency: "monthly", categoryId: byName["Streaming"], accountId: "", isAutoDeduct: true },
            { name: "Phone Bill", amount: 65, dueDay: 18, frequency: "monthly", categoryId: byName["Transport"], accountId: "", isAutoDeduct: true },
            { name: "Gym Membership", amount: 45, dueDay: 5, frequency: "monthly", categoryId: byName["Shopping"], accountId: "", isAutoDeduct: true },
            { name: "Car Insurance", amount: 120, dueDay: 22, frequency: "monthly", categoryId: byName["Gas"], accountId: "", isAutoDeduct: true },
        ],
    });
    console.log("📑 Bills seeded");

    // ─── Transactions (this month, past 14 days) ───────────────
    const txData = generateTransactions(today, byName);
    await prisma.transaction.createMany({ data: txData });
    console.log("💳", txData.length, "transactions seeded");

    // ─── Duplicate transactions for dedupe demo ───────────────
    const dupes = [
        { amount: 8.45, description: "Starbucks Coffee", date: addDays(today, -2), categoryId: byName["Coffee & Snacks"], type: "expense", isDiscretionary: true, isDuplicate: true, duplicateOfId: null, fingerprint: "845-starbuckscoffee-2024-04-21" },
        { amount: 8.45, description: "Starbucks Coffee", date: addDays(today, -2), categoryId: byName["Coffee & Snacks"], type: "expense", isDiscretionary: true, isDuplicate: true, duplicateOfId: null, fingerprint: "845-starbuckscoffee-2024-04-21" },
    ];
    await prisma.transaction.createMany({ data: dupes });
    console.log("🔁 Duplicate transactions for dedupe demo");

    // ─── Pending receipts ────────────────────────────────────
    await prisma.screenshotReceipt.create({
        data: {
            imageUrl: "/receipts/demo-1.jpg",
            rawMerchant: "WHOLE FOODS",
            rawAmount: 67.34,
            rawDate: addDays(today, -1),
            status: "pending",
            confidence: 0.87,
        },
    });
    console.log("🧾 Demo receipt in pending queue");

    console.log("\n✅ Seed complete!");
    console.log("\n👉 Next steps:");
    console.log("   npm run dev");
    console.log("   Open http://localhost:3000/daily\n");
}

function generateTransactions(today: Date, byName: Record<string, string>) {
    const txs = [];
    const start = new Date(today.getFullYear(), today.getMonth(), 1);

    // Past 14 days of discretionary spending
    const spends = [
        { day: -14, desc: "Whole Foods", amt: 124.50, cat: "Groceries" },
        { day: -13, desc: "Shell Gas", amt: 52.00, cat: "Gas" },
        { day: -12, desc: "Starbucks", amt: 6.45, cat: "Coffee & Snacks" },
        { day: -12, desc: "McDonald's", amt: 12.80, cat: "Dining Out" },
        { day: -11, desc: "Costco", amt: 198.00, cat: "Groceries" },
        { day: -10, desc: "Uber", amt: 18.50, cat: "Transport" },
        { day: -9, desc: "Starbucks", amt: 6.45, cat: "Coffee & Snacks" },
        { day: -8, desc: "Target", amt: 45.67, cat: "Shopping" },
        { day: -7, desc: "Chipotle", amt: 14.25, cat: "Dining Out" },
        { day: -6, desc: "Starbucks", amt: 6.45, cat: "Coffee & Snacks" },
        { day: -6, desc: "Gas Station", amt: 48.00, cat: "Gas" },
        { day: -5, desc: "Amazon", amt: 32.99, cat: "Shopping" },
        { day: -4, desc: "Starbucks", amt: 6.45, cat: "Coffee & Snacks" },
        { day: -3, desc: "Trader Joe's", amt: 89.20, cat: "Groceries" },
        { day: -2, desc: "Starbucks", amt: 6.45, cat: "Coffee & Snacks" },
        { day: -2, desc: "Uber Eats", amt: 28.50, cat: "Dining Out" },
        { day: -1, desc: "Starbucks", amt: 6.45, cat: "Coffee & Snacks" },
        { day: -1, desc: "Whole Foods", amt: 67.34, cat: "Groceries" },
        // Today
        { day: 0, desc: "Starbucks", amt: 6.45, cat: "Coffee & Snacks" },
        { day: 0, desc: "Lunch", amt: 14.50, cat: "Dining Out" },
    ];

    for (const s of spends) {
        const date = addDays(today, s.day);
        // Add some randomness to hour
        date.setHours(8 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 60));

        txs.push({
            amount: s.amt,
            description: s.desc,
            date,
            type: "expense",
            isDiscretionary: true,
            isTransfer: false,
            isRecurring: false,
            categoryId: byName[s.cat] || null,
            fingerprint: `${Math.round(s.amt * 100)}-${s.desc.toLowerCase().replace(/[^a-z0-9]/g, "")}-${date.toISOString().slice(0, 10)}`,
            source: "manual",
        });
    }

    return txs;
}

function fmt(n: number) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

// Only run if directly executed (not imported)
if (require.main === module) {
    seed().catch((e) => {
        console.error("Seed failed:", e);
        process.exit(1);
    });
}

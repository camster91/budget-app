import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyHermesAuth, getHouseholdId } from "@/lib/hermes";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";

export const dynamic = "force-dynamic";

/*
  Hermes Agent API — Bearer token auth via HERMES_API_KEY env var.

  Endpoints (all POST, Content-Type: application/json):
  /api/hermes?action=transactions&sub=list|create|update|delete
  /api/hermes?action=categories&sub=list|create
  /api/hermes?action=budgets&sub=list|create
  /api/hermes?action=accounts&sub=list|create|update
  /api/hermes?action=bills&sub=list|create
  /api/hermes?action=goals&sub=list|create|update
  /api/hermes?action=daily&sub=snapshot|add-expense
  /api/hermes?action=dashboard&sub=summary

  Auth:
    Authorization: Bearer <HERMES_API_KEY>
*/

export async function POST(request: NextRequest) {
  const auth = verifyHermesAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: 401 });
  }

  const action = request.nextUrl.searchParams.get("action");
  const sub = request.nextUrl.searchParams.get("sub");
  const householdId = await getHouseholdId();

  try {
    switch (action) {
      case "transactions":
        return await handleTransactions(sub, householdId, request);
      case "categories":
        return await handleCategories(sub, householdId, request);
      case "budgets":
        return await handleBudgets(sub, householdId, request);
      case "accounts":
        return await handleAccounts(sub, householdId, request);
      case "bills":
        return await handleBills(sub, householdId, request);
      case "goals":
        return await handleGoals(sub, householdId, request);
      case "daily":
        return await handleDaily(sub, householdId, request);
      case "dashboard":
        return await handleDashboard(householdId);
      default:
        return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err: any) {
    console.error("[HERMES]", err);
    return NextResponse.json({ success: false, error: err.message || "Server error" }, { status: 500 });
  }
}

// ─── Transactions ───────────────────────────────────────────────────────────

async function handleTransactions(sub: string | null, householdId: string, request: NextRequest) {
  const body = await request.json().catch(() => ({}));

  if (sub === "list") {
    const { dateFrom, dateTo, limit = 50, type } = body;
    const where: any = { householdId };
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) where.date.lte = new Date(dateTo + "T23:59:59");
    }
    if (type) where.type = type;
    const txs = await prisma.transaction.findMany({
      where,
      orderBy: { date: "desc" },
      include: { category: true },
      take: limit,
    });
    return json({ success: true, data: txs });
  }

  if (sub === "create") {
    const { amount, description, date, type = "expense", categoryId, accountId, isTransfer = false } = body;
    if (!amount || !description || !date) {
      return json({ success: false, error: "Missing required: amount, description, date" }, 400);
    }
    const tx = await prisma.transaction.create({
      data: {
        amount: Math.round(amount),
        description,
        date: new Date(date),
        type,
        householdId,
        categoryId: categoryId || null,
        accountId: accountId || null,
        isTransfer,
      },
      include: { category: true },
    });
    return json({ success: true, data: tx });
  }

  if (sub === "update") {
    const { id, amount, description, date, type, categoryId, accountId } = body;
    if (!id) return json({ success: false, error: "Missing id" }, 400);
    const existing = await prisma.transaction.findUnique({ where: { id } });
    if (!existing || existing.householdId !== householdId) {
      return json({ success: false, error: "Transaction not found" }, 404);
    }
    const updated = await prisma.transaction.update({
      where: { id },
      data: {
        amount: amount !== undefined ? Math.round(amount) : existing.amount,
        description: description ?? existing.description,
        date: date ? new Date(date) : existing.date,
        type: type ?? existing.type,
        categoryId: categoryId !== undefined ? categoryId : existing.categoryId,
        accountId: accountId !== undefined ? accountId : existing.accountId,
      },
    });
    return json({ success: true, data: updated });
  }

  if (sub === "delete") {
    const { id } = body;
    if (!id) return json({ success: false, error: "Missing id" }, 400);
    await prisma.transaction.delete({ where: { id } });
    return json({ success: true });
  }

  return json({ success: false, error: `Unknown sub: ${sub}` }, 400);
}

// ─── Categories ────────────────────────────────────────────────────────────

async function handleCategories(sub: string | null, householdId: string, request: NextRequest) {
  const body = await request.json().catch(() => ({}));

  if (sub === "list") {
    const cats = await prisma.category.findMany({ where: { householdId } });
    return json({ success: true, data: cats });
  }

  if (sub === "create") {
    const { name, type = "expense", color, icon, rules } = body;
    if (!name) return json({ success: false, error: "Missing name" }, 400);
    const cat = await prisma.category.create({
      data: { name, type, color: color || null, icon: icon || null, rules: rules || null, householdId },
    });
    return json({ success: true, data: cat });
  }

  return json({ success: false, error: `Unknown sub: ${sub}` }, 400);
}

// ─── Budgets ───────────────────────────────────────────────────────────────

async function handleBudgets(sub: string | null, householdId: string, request: NextRequest) {
  const body = await request.json().catch(() => ({}));

  if (sub === "list") {
    const now = new Date();
    const period = body.period || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const budgets = await prisma.budget.findMany({
      where: { householdId, period },
      include: { category: true },
    });
    return json({ success: true, data: budgets });
  }

  if (sub === "create") {
    const { categoryId, amount, period } = body;
    if (!categoryId || !amount || !period) {
      return json({ success: false, error: "Missing categoryId, amount, or period" }, 400);
    }
    const budget = await prisma.budget.create({
      data: { amount: Math.round(amount), period, categoryId, householdId },
    });
    return json({ success: true, data: budget });
  }

  return json({ success: false, error: `Unknown sub: ${sub}` }, 400);
}

// ─── Accounts ──────────────────────────────────────────────────────────────

async function handleAccounts(sub: string | null, householdId: string, request: NextRequest) {
  const body = await request.json().catch(() => ({}));

  if (sub === "list") {
    const accs = await prisma.account.findMany({ where: { householdId } });
    return json({ success: true, data: accs });
  }

  if (sub === "create") {
    const { name, type, institution, balance = 0 } = body;
    if (!name || !type) return json({ success: false, error: "Missing name or type" }, 400);
    const acc = await prisma.account.create({
      data: { name, type, institution: institution || null, balance: Math.round(balance), householdId },
    });
    return json({ success: true, data: acc });
  }

  if (sub === "update") {
    const { id, balance } = body;
    if (!id || balance === undefined) return json({ success: false, error: "Missing id or balance" }, 400);
    const acc = await prisma.account.update({ where: { id }, data: { balance: Math.round(balance) } });
    return json({ success: true, data: acc });
  }

  return json({ success: false, error: `Unknown sub: ${sub}` }, 400);
}

// ─── Bills ─────────────────────────────────────────────────────────────────

async function handleBills(sub: string | null, householdId: string, request: NextRequest) {
  const body = await request.json().catch(() => ({}));

  if (sub === "list") {
    const bills = await prisma.bill.findMany({ where: { householdId } });
    return json({ success: true, data: bills });
  }

  if (sub === "create") {
    const { name, amount, dueDay, frequency = "monthly", categoryId, accountId } = body;
    if (!name || !amount || !dueDay || !categoryId || !accountId) {
      return json({ success: false, error: "Missing required fields" }, 400);
    }
    const bill = await prisma.bill.create({
      data: {
        name,
        amount: Math.round(amount),
        dueDay: Math.round(dueDay),
        frequency,
        categoryId,
        accountId,
        householdId,
      },
    });
    return json({ success: true, data: bill });
  }

  return json({ success: false, error: `Unknown sub: ${sub}` }, 400);
}

// ─── Goals ──────────────────────────────────────────────────────────────────

async function handleGoals(sub: string | null, householdId: string, request: NextRequest) {
  const body = await request.json().catch(() => ({}));

  if (sub === "list") {
    const goals = await prisma.goal.findMany({ where: { householdId } });
    return json({ success: true, data: goals });
  }

  if (sub === "create") {
    const { name, targetAmount, targetDate, categoryId } = body;
    if (!name || !targetAmount) return json({ success: false, error: "Missing name or targetAmount" }, 400);
    const goal = await prisma.goal.create({
      data: {
        name,
        targetAmount: Math.round(targetAmount),
        currentAmount: 0,
        targetDate: targetDate ? new Date(targetDate) : null,
        categoryId: categoryId || null,
           householdId,
      },
    });
    return json({ success: true, data: goal });
  }

  if (sub === "update") {
    const { id, name, targetAmount, currentAmount, targetDate, categoryId } = body;
    if (!id) return json({ success: false, error: "Missing id" }, 400);
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (targetAmount !== undefined) updateData.targetAmount = Math.round(targetAmount);
    if (currentAmount !== undefined) updateData.currentAmount = Math.round(currentAmount);
    if (targetDate !== undefined) updateData.targetDate = targetDate ? new Date(targetDate) : null;
    if (categoryId !== undefined) updateData.categoryId = categoryId || null;
    const goal = await prisma.goal.update({ where: { id }, data: updateData });
    return json({ success: true, data: goal });
  }

  return json({ success: false, error: `Unknown sub: ${sub}` }, 400);
}

// ─── Daily ──────────────────────────────────────────────────────────────────

async function handleDaily(sub: string | null, householdId: string, request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  if (sub === "snapshot") {
    const [totalIncome, totalExpenses, txCount] = await Promise.all([
      prisma.transaction.aggregate({ _sum: { amount: true }, where: { householdId, type: "income", date: { gte: monthStart, lte: monthEnd } } }).then(r => r._sum.amount || 0),
      prisma.transaction.aggregate({ _sum: { amount: true }, where: { householdId, type: "expense", date: { gte: monthStart, lte: monthEnd } } }).then(r => r._sum.amount || 0),
      prisma.transaction.count({ where: { householdId, date: { gte: monthStart, lte: monthEnd } } }),
    ]);
    return json({ success: true, data: { totalIncome, totalExpenses, net: totalIncome - totalExpenses, txCount, month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}` } });
  }

  if (sub === "add-expense") {
    const { amount, description, categoryId } = body;
    if (!amount || !description) return json({ success: false, error: "Missing amount or description" }, 400);
    const tx = await prisma.transaction.create({
      data: { amount: Math.round(amount), description, date: new Date(), type: "expense", householdId, categoryId: categoryId || null },
      include: { category: true },
    });
    return json({ success: true, data: tx });
  }

  return json({ success: false, error: `Unknown sub: ${sub}` }, 400);
}

// ─── Dashboard ──────────────────────────────────────────────────────────────

async function handleDashboard(householdId: string) {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const [monthlyIncome, monthlyExpenses, accounts, categories] = await Promise.all([
    prisma.transaction.aggregate({ _sum: { amount: true }, where: { householdId, type: "income", date: { gte: monthStart, lte: monthEnd } } }).then(r => r._sum.amount || 0),
    prisma.transaction.aggregate({ _sum: { amount: true }, where: { householdId, type: "expense", date: { gte: monthStart, lte: monthEnd } } }).then(r => r._sum.amount || 0),
    prisma.account.findMany({ where: { householdId } }),
    prisma.category.findMany({ where: { householdId } }),
  ]);

  const netWorth = accounts.reduce((sum, a) => sum + (a.type === "credit" ? -a.balance : a.balance), 0);
  const savingsRate = monthlyIncome > 0 ? Math.round(((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100) : 0;

  return json({
    success: true,
    data: {
      netWorth,
      monthlyIncome,
      monthlyExpenses,
      savingsRate,
      accountCount: accounts.length,
      categoryCount: categories.length,
      accounts: accounts.map(a => ({ id: a.id, name: a.name, type: a.type, balance: a.balance })),
    },
  });
}

function json(body: any, status = 200) {
  return NextResponse.json(body, { status });
}

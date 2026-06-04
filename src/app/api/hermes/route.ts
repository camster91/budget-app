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
      case "import-pdf":
        return await handlePdfImport(sub, householdId, request);
      default:
        return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[HERMES]", err);
    return NextResponse.json({ success: false, error: msg || "Server error" }, { status: 500 });
  }
}

// ─── Transactions ───────────────────────────────────────────────────────────

async function handleTransactions(sub: string | null, householdId: string, request: NextRequest) {
  const body = await request.json().catch(() => ({}));

  if (sub === "list") {
    const { dateFrom, dateTo, limit = 50, type } = body;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    const existing = await prisma.transaction.findUnique({ where: { id } });
    if (!existing || existing.householdId !== householdId) {
      return json({ success: false, error: "Transaction not found" }, 404);
    }
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
    const bills = await prisma.bill.findMany({
      where: { householdId },
      include: {
        category: true,
        _count: { select: { billPayments: true } },
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const enriched = bills.map((b: any) => {
      const history = b.average ? `${Math.round(((b.amount - b.average) / b.average) * 100)}% vs avg` : null;
      return { ...b, deviationFromAverage: history };
    });
    return json({ success: true, data: enriched });
  }

  if (sub === "create") {
    const {
      name, amount, dueDay, frequency = "monthly", categoryId, accountId,
      costType = "fixed", amountLow, amountHigh, alertThreshold = 20,
    } = body;
    if (!name || amount === undefined || !dueDay || !categoryId || !accountId) {
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
        costType,
        amountLow: amountLow ? Math.round(amountLow) : null,
        amountHigh: amountHigh ? Math.round(amountHigh) : null,
        alertThreshold: Math.round(alertThreshold),
      },
      include: { category: true },
    });
    return json({ success: true, data: bill });
  }

  if (sub === "pay") {
    const { billId, amount, dueDate, note } = body;
    if (!billId || amount === undefined || !dueDate) {
      return json({ success: false, error: "Missing required fields" }, 400);
    }

    const bill = await prisma.bill.findUnique({ where: { id: billId } });
    if (!bill || bill.householdId !== householdId) {
      return json({ success: false, error: "Bill not found" }, 404);
    }

    const actualCents = Math.round(amount);
    const threshold = 1 + bill.alertThreshold / 100;
    const isSpike = bill.average && actualCents > bill.average * threshold;

    const payment = await prisma.billPayment.create({
      data: {
        billId,
        amount: actualCents,
        dueDate: new Date(dueDate),
        paidAt: new Date(),
        note: isSpike ? `Spike — ${note || ""}` : note || null,
        isSpike: !!isSpike,
        householdId,
      },
    });

    // Update rolling average and bounds
    const newSampleCount = (bill.sampleCount || 0) + 1;
    const oldAvg = bill.average || 0;
    const newAverage = oldAvg === 0
      ? actualCents
      : Math.round((oldAvg * (newSampleCount - 1) + actualCents) / newSampleCount);
    const newLow = bill.amountLow ? Math.min(bill.amountLow, actualCents) : actualCents;
    const newHigh = bill.amountHigh ? Math.max(bill.amountHigh, actualCents) : actualCents;

    await prisma.bill.update({
      where: { id: billId },
      data: {
        average: newAverage,
        sampleCount: newSampleCount,
        amountLow: newLow,
        amountHigh: newHigh,
      },
    });

    return json({ success: true, data: { payment, averageUpdated: newAverage, isSpike } });
  }

  if (sub === "spikes") {
    const { dateFrom, dateTo } = body;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { householdId, isSpike: true };
    if (dateFrom || dateTo) {
      where.dueDate = {};
      if (dateFrom) where.dueDate.gte = new Date(dateFrom);
      if (dateTo) where.dueDate.lte = new Date(dateTo);
    }
    const spikes = await prisma.billPayment.findMany({
      where,
      include: { bill: true },
      orderBy: { dueDate: "desc" },
    });
    return json({ success: true, data: spikes });
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// ─── PDF Import — No external deps, regex-based line parser ─────────────────

async function handlePdfImport(sub: string | null, householdId: string, request: NextRequest) {
  const body = await request.json().catch(() => ({}));

  if (sub === "parse-text") {
    const { lines, bank = "tangerine" } = body;
    if (!lines || !Array.isArray(lines)) {
      return json({ success: false, error: "Missing lines[]" }, 400);
    }
    const bankKey = String(bank).toLowerCase();

    if (bankKey === "tangerine") {
      return json(parseTangerine(lines));
    }
    if (bankKey === "scotiabank-cc" || bankKey === "pcfinancial-cc") {
      return json(parseScotiabankCC(lines));
    }
    if (bankKey === "tangerine-cc") {
      return json(parseTangerineCC(lines));
    }
    if (bankKey === "rbc-cc" || bankKey === "td-cc" || bankKey === "cibc-cc" || bankKey === "amex-cc") {
      return json(parseGenericCC(lines));
    }

    return json({ success: false, error: `Unsupported bank: ${bankKey}. Supported: tangerine, scotiabank-cc, pcfinancial-cc, tangerine-cc, rbc-cc, td-cc, cibc-cc, amex-cc` }, 400);
  }

  if (sub === "insert") {
    const { transactions, accountId: accountIdHint } = body; // Array of { date, description, amount, type }
    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      return json({ success: false, error: "Missing transactions[]" }, 400);
    }

    // Auto-resolve account if not provided. Match the institution field against the
    // known bank code prefixes: scotiabank-cc/pcfinancial-cc/tangerine-cc -> "Scotiabank";
    // tangerine -> "Tangerine"; rbc-cc -> "RBC"; etc. The first match wins.
    let resolvedAccountId: string | null = (typeof accountIdHint === "string" && accountIdHint) ? accountIdHint : null;
    if (!resolvedAccountId) {
      try {
        const accts = await prisma.account.findMany({ where: { householdId } });
        // Detect which institution(s) to match by inspecting the source field of the txns.
        const sample = transactions.find(t => t.source || t.bank);
        const bankCode = String(sample?.bank || sample?.source || "").toLowerCase();
        const institutionMap: Record<string, string[]> = {
          "scotiabank-cc": ["Scotiabank", "PC Financial"],
          "pcfinancial-cc": ["Scotiabank", "PC Financial"],
          "tangerine-cc": ["Scotiabank", "PC Financial", "Tangerine"],
          "tangerine": ["Tangerine"],
          "rbc-cc": ["RBC"],
          "td-cc": ["TD"],
          "cibc-cc": ["CIBC"],
          "amex-cc": ["American Express", "Amex"],
        };
        const candidates = institutionMap[bankCode] || [];
        const match = accts.find(a => a.institution && candidates.some(c => a.institution!.toLowerCase().includes(c.toLowerCase())));
        if (match) resolvedAccountId = match.id;
      } catch {/* ignore — leave resolvedAccountId null */}
    }

    const created = [];
    for (const t of transactions) {
      const tx = await prisma.transaction.create({
        data: {
          amount: Math.round(t.amount),
          description: t.description,
          date: t.date ? new Date(t.date) : new Date(),
          type: t.type === "income" ? "income" : "expense",
          householdId,
          source: t.source || "pdf-import",
          isTransfer: false,
          accountId: resolvedAccountId,
        },
        include: { category: true },
      });
      created.push(tx);
    }
    return json({ success: true, data: { inserted: created.length, transactions: created, accountId: resolvedAccountId } });
  }

  return json({ success: false, error: `Unknown sub: ${sub}` }, 400);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function json(body: any, status = 200) {
  return NextResponse.json(body, { status });
}

// ─── Bank Statement Parsers ──────────────────────────────────────────────────
// Each parser takes a lines[] of raw PDF text and returns an envelope:
//   { success, data: { count, transactions: [{date, description, amount, type, raw, meta?}] } }
//
// All amounts are returned as positive cents for purchases and as negative cents
// for payments / refunds. type=expense for purchases, type=income for refunds/interest.
//   meta may include: post_date, account_last4, foreign_currency, fx_rate, kind: "purchase"|"payment"|"interest"|"fee"

type ParsedTxn = {
  date?: string;
  description: string;
  amount: number; // positive cents for purchases, negative for payments
  type: "income" | "expense";
  raw: string;
  meta?: Record<string, unknown>;
};

function parseEnvelope(parsed: ParsedTxn[]) {
  return { success: true, data: { count: parsed.length, transactions: parsed } };
}

// Tangerine Chequing (existing behaviour — moved to its own function for clarity)
function parseTangerine(lines: string[]) {
  const parsed: ParsedTxn[] = [];
  const MONTHS = new Set(["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"]);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const dateMatch = line.match(/^([A-Za-z]{3}\s+\d{1,2},\s*\d{4})\s*\|\s*(.*)/);
    if (!dateMatch) continue;
    const dateStr = dateMatch[1].replace(/\s+/g, " ").trim();
    const month = dateStr.split(" ")[0].toLowerCase().slice(0, 3);
    if (!MONTHS.has(month)) continue;
    const rest = dateMatch[2];
    const lastDollar = rest.lastIndexOf("$");
    if (lastDollar === -1) continue;
    const description = rest.slice(0, lastDollar).replace(/\|/g, " ").trim();
    const amountStr = rest.slice(lastDollar + 1).replace(/,/g, "").trim();
    const amount = Math.round(parseFloat(amountStr) * 100);
    if (Number.isNaN(amount) || amount <= 0) continue;
    const isIncome = /deposit|transfer in|direct deposit/i.test(description);
    parsed.push({
      date: dateStr,
      description,
      amount,
      type: isIncome ? "income" : "expense",
      raw: line,
      meta: { kind: isIncome ? "deposit" : "purchase" },
    });
  }
  return parseEnvelope(parsed);
}

// Scotiabank / PC Financial Mastercard (also PC Insiders World Elite).
// Format: dates on separate lines, multi-line description, $-prefixed amount.
//   17/03
//   17/03
//   AMZN MKTP CA*B53UX9142   TORONTO      ON
//   $34.26
// Foreign txns insert two extra lines between desc and amount:
//   06/04
//   07/04
//   UDI HOSTIN* OSTING 032   FERRIDAY     LA USD
//    28.08 USA
//   1.429843304
//   $40.15
function parseScotiabankCC(lines: string[]) {
  const parsed: ParsedTxn[] = [];
  const datePat = /^(\d{2})\/(\d{2})$/;
  const moneyPat = /^-?\$[\d,]+\.\d{2}$/;
  const foreignAmtPat = /^(\d+\.\d{1,2})\s*([A-Z]{3,4})?$/;
  const fxRatePat = /^\d+\.\d{6,}$/;

  // Detect account last4 from header line "XXXX XXXX XX83 9729" or "XXXX-XXXXXX-XX83-9729"
  const accountMatch = lines.join("\n").match(/XXXX[ X-]*XX\d{2}\s*(\d{4})/);
  const accountLast4 = accountMatch?.[1];

  let i = 0;
  while (i < lines.length) {
    const l = lines[i].trim();
    const tDate = l.match(datePat);
    if (!tDate) { i++; continue; }

    // Next line must also be a date (post date)
    if (i + 1 >= lines.length) { i++; continue; }
    const pDate = lines[i + 1].trim().match(datePat);
    if (!pDate) { i++; continue; }

    // Collect description lines + optional foreign currency + amount
    const descParts: string[] = [];
    let amt: string | null = null;
    let foreignAmt: string | null = null;
    let foreignCcy: string | null = null;
    let fxRate: string | null = null;
    let endReason: "amount" | "total" | "eof" = "eof";
    let j = i + 2;
    while (j < lines.length) {
      const cur = lines[j].trim();
      if (moneyPat.test(cur)) { amt = cur; endReason = "amount"; break; }
      if (/^Total\b/i.test(cur) && /activity/i.test(cur)) { endReason = "total"; break; }
      const fa = cur.match(foreignAmtPat);
      if (fa && (fa[2] === "USD" || fa[2] === "USA" || fa[2] === "EUR" || fa[2] === "GBP")) {
        foreignAmt = fa[1]; foreignCcy = "USD";
      } else if (fxRatePat.test(cur)) {
        fxRate = cur;
      } else if (cur.length > 0 && cur.length < 120) {
        descParts.push(cur);
      }
      j++;
    }
    if (!amt || endReason !== "amount") {
      i = (amt && endReason === "amount") ? j + 1 : j;
      continue;
    }
    const isNeg = amt.startsWith("-");
    const amtCents = Math.round(Math.abs(parseFloat(amt.replace(/[$,-]/g, ""))) * 100);
    if (Number.isNaN(amtCents) || amtCents === 0) { i = j + 1; continue; }
    let desc = descParts.join(" ");
    desc = desc.replace(/\s+/g, " ").trim();
    // Strip trailing city/province/country tokens only when they are short
    // alpha words (e.g. "TORONTO ON", "FERRIDAY LA"). Keep merchant refs and
    // long words like "PAYMENT TNGBNK" or "PURCHASE INTEREST CHARGE" intact.
    desc = desc.replace(/\s+([A-Z]{2,4}\s+[A-Z]{2,4})$/, "").trim();

    const isPayment = isNeg || /PAYMENT|AUTOPAY|THANK YOU/i.test(desc);
    const isInterest = /INTEREST CHARGE/i.test(desc);
    const isFee = /FEE\b/i.test(desc);

    // Reconstruct full transaction date. Statement period is on a separate page,
    // so we accept the parsed mm/dd as-is and let the caller fill year from context.
    parsed.push({
      date: `${tDate[2]}/${tDate[1]}`, // mm/dd (year is added in the shell script from filename)
      description: desc,
      amount: isPayment || isInterest ? -amtCents : amtCents,
      type: isPayment || isInterest ? "expense" : "expense", // CC interest is also a charge
      raw: lines.slice(i, j + 1).join(" | "),
      meta: {
        post_date: `${pDate[2]}/${pDate[1]}`,
        account_last4: accountLast4,
        foreign_amount: foreignAmt,
        foreign_currency: foreignCcy,
        fx_rate: fxRate,
        kind: isPayment ? "payment" : isInterest ? "interest" : isFee ? "fee" : "purchase",
      },
    });
    i = j + 1;
  }
  return parseEnvelope(parsed);
}

// Tangerine Credit Card — fall back to Scotiabank parser (same statement layout since
// Tangerine is now a Scotiabank subsidiary and uses an identical PDF template).
function parseTangerineCC(lines: string[]) {
  return parseScotiabankCC(lines);
}

// Generic CC parser for unknown banks — accepts a "DD/MM DD/MM DESC $AMT" or
// "MM/DD MM/DD DESC $AMT" pattern on a single line. Returns best-effort output.
function parseGenericCC(lines: string[]) {
  const parsed: ParsedTxn[] = [];
  const singlePat = /^(\d{1,2})[\/\.](\d{1,2})\s+(\d{1,2})[\/\.](\d{1,2})\s+(.+?)\s+(-?\$[\d,]+\.\d{2})\s*$/;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(singlePat);
    if (!m) continue;
    const isNeg = m[6].startsWith("-");
    const cents = Math.round(Math.abs(parseFloat(m[6].replace(/[$,-]/g, ""))) * 100);
    const desc = m[5].replace(/\s+/g, " ").trim();
    if (Number.isNaN(cents) || cents === 0) continue;
    parsed.push({
      date: `${m[2]}/${m[1]}`,
      description: desc,
      amount: isNeg ? -cents : cents,
      type: "expense",
      raw: line,
      meta: { post_date: `${m[4]}/${m[3]}`, kind: isNeg ? "payment" : "purchase" },
    });
  }
  return parseEnvelope(parsed);
}


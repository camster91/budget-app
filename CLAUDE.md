# CLAUDE.md — Antigravity Budget App

## What This Is
A personal finance web app with a dark glassmorphism UI. Live at https://budget.ashbi.ca.
Single-user, self-hosted on a VPS via Coolify (Docker). Built with Next.js App Router.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js (App Router, `force-dynamic` on DB pages) |
| Database | Prisma ORM + PostgreSQL |
| Styling | Tailwind CSS v4 + custom CSS utilities |
| Charts | Recharts (AreaChart, PieChart) |
| Animations | Framer Motion |
| Auth | Custom JWT in httpOnly cookie |
| Bank sync | Plaid SDK (installed, not yet implemented) |
| Toasts | Sonner |
| Icons | Lucide React |
| CSV | papaparse |

---

## Infrastructure

- **Database**: [Set in environment variables]
- **Coolify UUID**: [Set in environment variables]
- **Live URL**: https://budget.ashbi.ca
- **Login**: [Set in environment variables]

**DO NOT** change `DATABASE_URL` — it points to VPS Postgres.
**DO NOT** remove or bypass the custom auth system.

---

## Project Structure

```
src/
├── app/
│   ├── (dashboard)/           # All protected routes (wrapped in layout with sidebar)
│   │   ├── page.tsx           # Dashboard — server component, calls getDashboardSummary()
│   │   ├── transactions/      # Transaction list, filter, CSV export, inline edit
│   │   ├── budgets/           # Budget cards with spending progress
│   │   ├── goals/             # Savings goals with progress bars
│   │   ├── bills/             # Recurring bills with due-date countdown
│   │   ├── accounts/          # Account balance cards
│   │   ├── categories/        # Category management
│   │   └── settings/          # Profile / password change
│   ├── _actions/              # Server Actions ("use server") — all DB mutations here
│   │   ├── dashboard.ts       # getDashboardSummary() — aggregated stats
│   │   ├── transactions.ts
│   │   ├── budgets.ts
│   │   ├── goals.ts
│   │   ├── bills.ts
│   │   ├── accounts.ts
│   │   └── categories.ts
│   ├── api/
│   │   ├── auth/              # login, register, logout, update-profile routes
│   │   └── plaid/             # (TODO) create-link-token, exchange-token, sync
│   ├── login/page.tsx
│   ├── register/page.tsx
│   └── not-found.tsx
├── components/
│   ├── dashboard/DashboardContent.tsx   # Main dashboard UI (client component)
│   ├── budgets/BudgetForm.tsx
│   ├── layout/
│   │   ├── sidebar.tsx        # Nav sidebar with all 8 routes + logout
│   │   └── DashboardLayout.tsx
│   └── ui/                    # Shared primitives: Card, Button, Input, Dialog, Badge
├── lib/
│   ├── prisma.ts              # Prisma client singleton
│   ├── auth.ts                # JWT helpers (sign, verify, getUser)
│   └── utils.ts               # formatCurrency, cn()
└── middleware.ts               # Protects all dashboard routes; redirects to /login
```

---

## Auth Flow

- JWT stored in httpOnly cookie named `token`
- `src/middleware.ts` intercepts all routes except `/login` and `/register`
- `getUser()` in `src/lib/auth.ts` verifies the JWT and returns the user object
- Password hashed with bcryptjs; token signed with jsonwebtoken
- Profile updates handled by `POST /api/auth/update-profile`

---

## Database Schema (Prisma)

Key models and their relationships:

- **User** — single user; FK owner of all data
- **Transaction** — `type: "income" | "expense"`, `isTransfer: boolean`, FK to `Category`, `Account`
- **Category** — `type: "income" | "expense"`, `color`, `icon`, `rules` (JSON array of keyword strings for auto-matching)
- **Budget** — `period: "YYYY-MM"`, FK to `Category`; one budget per category per month
- **Account** — `type: "checking" | "savings" | "credit" | "investment" | "cash"`, `balance`; credit balances are liabilities (subtracted from net worth)
- **Bill** — `dueDay: Int` (day of month 1–31), FK to `Category` and `Account`
- **Goal** — `targetAmount`, `currentAmount`, optional `targetDate`, optional FK to `Category`

---

## Key Conventions

### Server Actions
All mutations go through `src/app/_actions/*.ts`. They:
1. Parse `FormData` or typed args
2. Call `prisma.*`
3. Call `revalidatePath("/route")`
4. Return `{ success: true }` or `{ success: false, error: string }`

### Client Components
Dashboard pages export a `*Client.tsx` component pattern:
- The `page.tsx` is a server component that fetches data and passes it as props
- The `*Client.tsx` is `"use client"` with local state + `useTransition` for mutations
- After mutations: call `router.refresh()` (NOT `window.location.reload()`)
- Optimistic deletes: update local state immediately via `setState(prev => prev.filter(...))`

### Styling
Custom CSS utilities in `src/app/globals.css`:
- `.glass` — translucent blurred card surface
- `.glass-card` — slightly more opaque glass
- `.text-gradient` — indigo→violet gradient text
- `.bg-grid` — subtle dot-grid background
- Color palette: primary = indigo-500 (`#6366f1`), accent = violet-500

### Dialog Component
`src/components/ui/dialog.tsx` uses native `<dialog>` with `.showModal()`. It is NOT Radix UI. Use it with `ref` or the `open`/`onClose` props.

### No `asChild` on Button
The `Button` component does NOT implement Radix `asChild`. Wrap `<Link>` with explicit className instead of `<Button asChild><Link>`.

---

## Dashboard Data Flow

`getDashboardSummary()` in `src/app/_actions/dashboard.ts`:
- Uses `prisma.transaction.aggregate()` and `prisma.transaction.groupBy()` (NOT loading all rows)
- Returns: netWorth, monthlyIncome, monthlyExpenses, savingsRate, incomeTrend, chartData (6-month cashflow), transactions (5 recent), spendingByCategory (top 6), budgetHealth (current month budgets)
- Net worth = account balances (credit subtracted); falls back to income−expenses if no accounts

---

## Feature Status

| Feature | Status |
|---------|--------|
| Transactions — CRUD, filter, pagination, CSV export | Complete |
| Budgets — create, delete, progress bars, health widget | Complete |
| Goals — full CRUD with inline edit (name/target/date/category) | Complete |
| Bills — full CRUD with inline edit | Complete |
| Accounts — balance management, net worth | Complete |
| Categories — CRUD, safe-delete (nulls FKs before delete) | Complete |
| Dashboard — stats, cashflow chart, spending by category, budget health | Complete |
| Auth — login, register, JWT, profile/password update | Complete |
| 404 page | Complete |
| Plaid bank sync | TODO |
| Date range filter on transactions | TODO |
| Budget month selector (past/future months) | TODO |
| Bill mark-as-paid + payment history | TODO |
| Category rules builder UI | TODO |

---

## Plaid Integration (TODO)

SDK installed. Needs:
- `.env`: `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV`
- `POST /api/plaid/create-link-token` — returns link token for Plaid Link widget
- `POST /api/plaid/exchange-token` — exchanges public token for access token, stores on User
- `POST /api/plaid/sync` — fetches transactions from Plaid, upserts into DB
- `<PlaidLink>` component using `react-plaid-link`

---

## Development Branch

Active development branch: `claude/continue-app-development-5P4h2`

```bash
git checkout claude/continue-app-development-5P4h2
git push -u origin claude/continue-app-development-5P4h2
```

# CLAUDE.md — Budget App (Antigravity)

## What This Is
A personal finance app with dark glass UI. Live at budget.ashbi.ca. Built with Next.js.

## Stack
- Next.js 14 (App Router)
- Prisma + PostgreSQL (migrated from SQLite)
- Tailwind + DaisyUI (dark theme)
- Recharts (charts)
- Plaid SDK (bank integration — partially implemented)

## Database
- Host: postgresql://budget:Budget2026!@10.0.1.31:5432/budget
- Running on VPS Docker network (coolify network)

## Auth
- Custom JWT (migrated from Supabase on 2026-03-17)
- Login: cameron@ashbi.ca / Ashbi2026!

## Coolify
- UUID: ok08c00scw48cgo4kgsgkkww
- URL: https://budget.ashbi.ca

## Plaid Integration Status
- Plaid SDK installed
- PLAID_CLIENT_ID, PLAID_SECRET, PLAID_ENV vars needed in .env
- API routes needed: /api/plaid/create-link-token, /api/plaid/exchange-token, /api/plaid/sync
- PlaidLink component needed

## DO NOT
- Do not change the DATABASE_URL — it points to VPS Postgres
- Do not remove the custom auth system

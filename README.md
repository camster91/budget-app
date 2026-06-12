# Pocket Budget

A modern, privacy-first personal finance tracker with a fuel-gauge budget concept, on-device receipt OCR, streak gamification, and offline PWA support — now on Android via Capacitor 8.

[![Live](https://img.shields.io/badge/Demo-budget.ashbi.ca-6366f1?style=for-the-badge)](https://budget.ashbi.ca)
[![Platform](https://img.shields.io/badge/Android-APK-34A853?style=for-the-badge&logo=android)](https://github.com/camster91/budget-app/releases)
[![Price](https://img.shields.io/badge/%241.99-Google_Play-4285F4?style=for-the-badge)](https://play.google.com)

---

## ✨ Features

### Daily Budget Engine
- **Fuel Gauge Concept** — Income minus bills equals your daily allowance. It updates in real time.
- **Rollover Tracking** — Unused budget rolls forward. Overspending reduces tomorrow's allowance.
- **Smart Alerts** — Get notified at 50%, 80%, and over-budget thresholds.
- **No-Spend Mode** — Toggle to lock all discretionary spending for a self-imposed reset.

### Receipt OCR (On-Device)
- Snap a photo of any receipt — **Tesseract.js** extracts the total, merchant, and date on your phone.
- No data leaves your device. No cloud OCR costs.

### Streak Gamification
- Build a streak every day you stay under budget.
- Daily **Spending Score** (0–100, graded A–F) combining pace, surplus, and bill health.
- Category spending shown as a donut chart.

### Optional Bank Sync
- **Plaid** integration for automatic transaction import.
- Fully optional — manual entry always works.
- Connect checking, savings, credit, and investment accounts.

### Dashboards
- 6-month cash flow chart (Recharts area chart)
- Spending by category (pie chart)
- Net worth tracking
- Budget health widget with progress bars

### PWA & Offline
- Installable on any Android device.
- Service worker provides full offline access.
- Sync when you reconnect.

---

## 💰 Pricing

$1.99 one-time purchase on Google Play. No subscriptions. No ads. No data harvesting.

---

## 🛠 Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16 (App Router) + React 19 |
| Styling | Tailwind CSS v4 |
| Database | PostgreSQL + Prisma ORM |
| Charts | Recharts + Framer Motion |
| OCR | Tesseract.js (client-side) |
| Bank Sync | Plaid |
| Mobile | Capacitor 8 |
| Auth | Custom JWT (httpOnly cookie) |

---

## 🚀 Get Started

```bash
git clone https://github.com/camster91/budget-app.git
cd budget-app
npm install

# Environment
cp .env.example .env.local
# Set: DATABASE_URL, JWT_SECRET
# Optional: PLAID_CLIENT_ID, PLAID_SECRET, PLAID_ENV

# Database
npx prisma db push
npm run db:seed

# Dev
npm run dev          # → http://localhost:3000
```

---

## 📱 Android APK (Capacitor 8)

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npm run build:capacitor   # Static export + Capacitor sync
npm run cap:android       # Open in Android Studio

# In Android Studio: Build → Build Bundle(s) / APK(s) → Build APK(s)
# Output: android/app/build/outputs/apk/debug/app-debug.apk
```

Or run the one-liner:

```bash
bash scripts/build-apk.sh
```

---

## 📂 Project Map

| Path | What It Does |
|------|-------------|
| `src/app/(dashboard)/daily/` | Main daily spend page |
| `src/components/daily/` | Fuel gauge, receipt upload, streak display |
| `src/app/_actions/daily.ts` | Budget calculation engine |
| `src/app/_actions/patterns.ts` | Pattern detection (recurring merchants, time peaks) |
| `src/app/_actions/plaid-sync.ts` | Plaid transaction sync |
| `src/app/_actions/plaid-link.ts` | Plaid link token management |
| `src/lib/ocr.ts` | Client-side OCR wrapper |
| `src/components/plaid/` | PlaidLinker UI (conditionally rendered) |
| `public/sw.js` | Service worker (offline PWA) |
| `prisma/schema.prisma` | Database schema |
| `capacitor.config.ts` | Capacitor mobile config |

---

## 🔐 Core Models

- **Transaction** — type (income/expense), amount, date, category, account, receipt image
- **Budget** — monthly budget per category with spending progress
- **Account** — checking, savings, credit, investment, cash with balance tracking
- **Bill** — recurring bill with due day (1–31), payee, amount
- **Goal** — savings target with progress tracking and optional deadline
- **Category** — income/expense type, color, icon, auto-match keyword rules

---

## 📄 Store Listing

See `store-listing.md` for Google Play copy, privacy policy, and submission checklist.

---

## 📈 Roadmap

- [x] Daily budget engine with rollover
- [x] Receipt OCR (Tesseract.js)
- [x] Streak gamification & spending score
- [x] Plaid bank sync
- [x] Capacitor Android build
- [ ] iOS Capacitor build
- [ ] Family / shared budgets
- [ ] Weekly email summaries
- [ ] Light/dark theme toggle

---

MIT License. Built by [Ashbi Design](https://ashbi.ca).

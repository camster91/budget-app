# Budget App

A modern, privacy-first **Daily Spending Tracker** with a fuel-gauge budget concept, smart receipt OCR, streak gamification, and offline PWA support.

## ✨ Features

### Daily Budget Engine
- **Fuel Gauge Concept**: Income − Bills = Daily Allowance
- **Rollover Tracking**: Unused money rolls to tomorrow; overspending reduces it
- **Smart Insights**: Pace alerts, bill countdown, projections
- **No-Spend Mode**: Toggle locks all discretionary spending

### AI & Automation
- **OCR Receipt Parsing**: Client-side Tesseract.js scans receipts → auto-extracts total/merchant/date
- **Smart Deduplication**: Fingerprint matching prevents double entries
- **Pattern Detection**: Recurring merchants, time-of-day peaks, weekend spikes
- **Auto-Categorization**: Merchant name → category mapping

### Gamification
- **Streak Counter**: Under-budget day streaks
- **Spending Score**: 0-100 grade (A-F) combining pace, surplus, bills, streaks
- **Category Pie**: Donut chart of today’s spending by category

### Sync & Export
- **Plaid Bank Sync**: Link bank accounts for automatic transaction sync
- **CSV Export**: Tax-ready transaction downloads
- **Weekly/Monthly Review**: ReCharts bar charts with MoM/WoW trends

### Notifications & PWA
- **Push Notifications**: Budget warnings (80% spent, over-budget, bill reminders)
- **Progressive Web App**: Installable on mobile, works offline with service worker
- **Onboarding Wizard**: 5-step walkthrough for new users

---

## 🛠 Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16 + React 19 |
| Styling | Tailwind CSS v4 |
| Database | PostgreSQL + Prisma |
| Charts | ReCharts + Framer Motion |
| OCR | Tesseract.js (client-side) |
| Bank Sync | Plaid |
| Mobile | Capacitor (Android APK) |

---

## 🚀 Getting Started

```bash
# Clone and install
git clone https://github.com/camster91/budget-app.git
cd budget-app
npm install

# Environment
cp .env.example .env.local
# Edit DATABASE_URL and (optional) PLAID_CLIENT_ID / PLAID_SECRET

# Database
npx prisma db push
npm run db:seed   # Demo data

# Dev server
npm run dev     # http://localhost:3000
```

---

## 📱 Build Android APK

Requires: Android Studio + Android SDK (API 33+) + Java 17+

```bash
# 1. Install Capacitor (one-time)
npm install @capacitor/core @capacitor/cli @capacitor/android

# 2. Build static export + sync Android
npm run build:capacitor

# 3. Open Android Studio
npm run cap:android

# 4. In Android Studio:
#    Build → Generate Signed Bundle / APK → APK
#    OR Run on device with the green Play button

# Debug APK location:
#   android/app/build/outputs/apk/debug/app-debug.apk
```

**Quick script:**
```bash
bash scripts/build-apk.sh   # Automates steps 1-4
```

---

## 📂 Key Files

| Path | Purpose |
|------|---------|
| `src/app/(dashboard)/daily/page.tsx` | Main daily spend page |
| `src/components/daily/` | All daily tracker UI |
| `src/app/_actions/daily.ts` | Budget calculation engine |
| `src/app/_actions/patterns.ts` | Smart algorithms |
| `src/lib/ocr.ts` | Client-side receipt OCR |
| `public/manifest.json` | PWA manifest |
| `public/sw.js` | Service worker (offline) |
| `capacitor.config.ts` | Mobile app config |
| `prisma/schema.prisma` | Database schema |

---

## 🔐 Environment Variables

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/budgetapp
JWT_SECRET=your-secret-key
PLAID_CLIENT_ID=your-plaid-client-id
PLAID_SECRET=your-plaid-sandbox-secret
PLAID_ENV=sandbox
```

---

## 📈 Roadmap Ideas

- [ ] Category Budget Caps (✅ Done — set daily limits per category)
- [ ] Theme Toggle (light/dark/system)
- [ ] Family/Shared Budgets (multi-user)
- [ ] Weekly Email Summaries
- [ ] iOS Capacitor build

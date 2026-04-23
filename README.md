# GlowOS Finance (formerly Budget App)

**A modern, automated personal finance and budgeting platform with built-in statement parsing and AI categorization.**

As part of the **Nexus AI Product Ecosystem**, this repository is being evaluated for a public SaaS launch. With the sunsetting of popular budgeting tools like Mint, there is a massive market opportunity for privacy-first, AI-driven financial software.

## 💰 Monetization & Future Planning

This application serves as a strong candidate for our **Money-Making Software** initiative.
- **SaaS Model:** Potential integration with Plaid for live bank sync behind a premium subscription tier.
- **AI Categorization:** Leveraging the GlowOS Engine to securely and intelligently categorize transactions without manually building endless regex rules.
- **Mainstream Integration:** Will become an accessible skill for the Pi Coding Agent, allowing users to simply ask: *"How much did I spend on groceries this month?"*

## ✨ Features

- **Automated Statement Parsing:** Built-in Python scripts to parse, extract, and clean bank PDF/CSV statements.
- **Smart Categorization:** Automatically assigns categories to transactions based on merchant names.
- **Dashboard Analytics:** Clean, React-based dashboard showing cash flow, spending by category, and budget adherence.
- **Database:** Prisma + PostgreSQL for secure transaction storage.

## 🛠 Tech Stack

- **Frontend/Backend:** Next.js (App Router)
- **Data Parsing:** Python (`extract_pdf.py`, `parse_statement.py`)
- **Database:** Prisma ORM
- **Deployment:** Docker & Coolify ready

## 🚀 Getting Started

```bash
# Clone the repository
git clone https://github.com/camster91/budget-app.git
cd budget-app

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local
# (Configure DATABASE_URL)

# Run database migrations
npx prisma db push

# Start the development server
npm run dev
```

Visit `http://localhost:3000` to view the application.

## 📈 Roadmap
- [ ] Implement Plaid API for live bank synchronization.
- [ ] Connect the AI categorization engine to the 24-hour token reset billing model.
- [ ] Polish the UI/UX for public SaaS launch.

---
*Developed by Cameron Ashley / Nexus AI.*

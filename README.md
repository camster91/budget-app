# Budget App

A modern personal finance management application for tracking expenses and gaining insights into your spending habits.

## ✨ Features

- **Expense Tracking**: Log and categorize expenses with ease
- **Analytics Dashboard**: Visualize spending patterns with interactive charts
- **CSV Import**: Bulk import transactions from bank statements
- **Category Management**: Custom categories for better organization
- **Date Filtering**: View expenses by time period (daily, weekly, monthly, yearly)
- **Real-time Updates**: Instant feedback on all financial operations
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd budget-app

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Set up the database
npx prisma generate
npx prisma db push

# Start the development server
npm run dev
```

The application will be available at `http://localhost:3000`.

### Usage

```bash
# Development
npm run dev

# Production build
npm run build
npm start

# Linting
npm run lint
```

## 🛠️ Tech Stack

- **Framework**: Next.js 16.1.6 (App Router)
- **Language**: TypeScript 5
- **Database**: Prisma ORM
- **UI Components**: Radix UI
- **Styling**: Tailwind CSS 4
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod validation
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Notifications**: Sonner

## 📁 Project Structure

```
budget-app/
├── app/              # Next.js App Router pages
├── components/       # React components
├── lib/             # Utility functions and configurations
├── prisma/          # Database schema and migrations
├── public/          # Static assets
└── types/           # TypeScript type definitions
```

## 🔒 Environment Variables

Create a `.env` file in the root directory:

```env
DATABASE_URL="your-database-url"
# Add other environment variables as needed
```

## 📊 Features in Detail

### Expense Tracking
- Add individual transactions with amount, category, date, and description
- Edit or delete existing transactions
- Support for multiple categories

### Analytics
- Visual breakdown of spending by category
- Time-based analysis (daily, weekly, monthly, yearly)
- Interactive charts with hover details
- Spending trends over time

### CSV Import
- Import transactions from bank statements
- Automatic parsing and categorization
- Validation and error handling

## 🚧 Deployment

See [DEPLOY.md](./DEPLOY.md) for detailed deployment instructions.

## 📄 License

**Private** - This project is proprietary and not licensed for public use.

## 🤝 Contributing

This is a private project. Contributions are not currently accepted.

## 📧 Contact

For questions or issues, please contact the project maintainer.

---

Built with ❤️ using Next.js

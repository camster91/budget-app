# Budget App

A modern, full-stack personal finance application built with Next.js, Tailwind CSS, and Prisma.

## 🚀 Overview

This application aims to provide users with a clean and intuitive interface to manage their finances. Key features include:

- **Dashboard**: Real-time overview of your financial health.
- **Transactions**: Easy tracking of income and expenses.
- **Budgets**: Set and monitor spending limits per category.
- **Analytics**: Visual reports on spending trends.

## 🛠 Tech Stack

- **Frontend**: Next.js 14+ (App Router), React, Tailwind CSS
- **Backend**: Next.js API Routes (Server Actions)
- **Database**: SQLite (via Prisma ORM)
- **State Management**: React Context / Zustand
- **Charts**: Recharts / Chart.js

## 📦 Getting Started

### Prerequisites

- Node.js 18+
- npm / yarn / pnpm

### Installation

1. Clone the repository:

    ```bash
    git clone https://github.com/camster91/budget-app.git
    cd budget-app
    ```

2. Install dependencies:

    ```bash
    npm install
    # or
    yarn install
    # or
    pnpm install
    ```

3. Set up the database:

    ```bash
    npx prisma generate
    npx prisma db push
    ```

4. Run the development server:

    ```bash
    npm run dev
    ```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the [MIT License](LICENSE).

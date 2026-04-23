# Budget App → Mint/QuickBooks Roadmap

## Current State Assessment
**✅ Working:**
- Manual transaction entry
- Category management
- Budget setting (basic)
- Dashboard with charts
- Glassmorphism UI

**❌ Missing (Core Mint Features):**
1. Bank statement import (PDF/CSV)
2. Automated categorization
3. Recurring transaction detection
4. Bill tracking & reminders
5. Multi-account management
6. Advanced reporting
7. Bank reconciliation

## Phase 1: Data Import & Processing (Week 1)

### 1.1 CSV Import Feature
**Goal:** Allow users to upload CSV files from bank statements
**Files to modify:**
- `src/app/(dashboard)/transactions/page.tsx` - Add import button
- `src/app/_actions/transactions.ts` - Add bulk import action
- New: `src/components/transactions/ImportModal.tsx` - Import UI
- New: `src/app/_actions/import.ts` - Import server actions

### 1.2 PDF Parser Integration
**Goal:** Parse Tangerine/Canadian bank PDFs
**Files to create:**
- `src/lib/parsers/tangerineParser.ts` - Tangerine-specific parser
- `src/lib/parsers/csvParser.ts` - Generic CSV parser
- `src/lib/parsers/index.ts` - Parser factory

### 1.3 Transaction Filtering
**Goal:** Filter out transfers between own accounts
**Files to modify:**
- `src/app/_actions/transactions.ts` - Add transfer detection logic
- `src/lib/utils/transactionUtils.ts` - New utility functions

## Phase 2: Smart Categorization (Week 2)

### 2.1 Rule-Based Categorization Engine
**Goal:** Auto-categorize transactions based on rules
**Files to create:**
- `src/lib/categorization/rulesEngine.ts` - Rule processor
- `src/lib/categorization/rules/` - Category rules
  - `tangerineRules.ts` - Tangerine-specific rules
  - `genericRules.ts` - Generic Canadian bank rules
  - `shoppingRules.ts` - Shopping/retail rules
  - `foodRules.ts` - Food/dining rules

### 2.2 Category Management Enhancement
**Goal:** Better category UI with icons, colors, rules
**Files to modify:**
- `src/app/(dashboard)/categories/page.tsx` - New categories page
- `src/components/categories/CategoryForm.tsx` - Enhanced form
- `src/app/_actions/categories.ts` - New category actions

### 2.3 Machine Learning Foundation
**Goal:** Basic ML for categorization
**Files to create:**
- `src/lib/categorization/ml/` - ML models
  - `training.ts` - Train on existing data
  - `predict.ts` - Predict categories
  - `dataPreparation.ts` - Prepare training data

## Phase 3: Recurring Transactions & Bills (Week 3)

### 3.1 Recurring Pattern Detection
**Goal:** Identify monthly bills, subscriptions
**Files to create:**
- `src/lib/recurring/detector.ts` - Pattern detection
- `src/lib/recurring/patterns.ts` - Recurring patterns
- `src/components/recurring/RecurringList.tsx` - UI component

### 3.2 Bill Tracking & Reminders
**Goal:** Track due dates, send reminders
**Files to create:**
- `src/app/(dashboard)/bills/page.tsx` - Bills page
- `src/components/bills/BillCard.tsx` - Bill card component
- `src/app/_actions/bills.ts` - Bill management actions

### 3.3 Calendar Integration
**Goal:** Visual bill calendar
**Files to create:**
- `src/components/calendar/BillCalendar.tsx`
- `src/lib/calendar/utils.ts` - Calendar utilities

## Phase 4: Multi-Account & Dashboard (Week 4)

### 4.1 Multi-Account Support
**Goal:** Support multiple bank accounts
**Files to modify:**
- `prisma/schema.prisma` - Add Account model
- `src/app/_actions/accounts.ts` - Account management
- `src/app/(dashboard)/accounts/page.tsx` - Accounts page

### 4.2 Enhanced Dashboard
**Goal:** Mint-like comprehensive dashboard
**Files to modify:**
- `src/components/dashboard/DashboardContent.tsx` - Enhanced
- New: `src/components/dashboard/SpendingByCategory.tsx`
- New: `src/components/dashboard/NetWorthChart.tsx`
- New: `src/components/dashboard/BudgetProgress.tsx`

### 4.3 Net Worth Tracking
**Goal:** Track assets, liabilities, net worth
**Files to create:**
- `src/app/(dashboard)/net-worth/page.tsx`
- `src/components/net-worth/NetWorthChart.tsx`
- `src/app/_actions/net-worth.ts`

## Phase 5: Advanced Features (Week 5-6)

### 5.1 Reports & Analytics
**Goal:** Tax reports, spending trends, forecasts
**Files to create:**
- `src/app/(dashboard)/reports/page.tsx`
- `src/lib/reports/generator.ts` - Report generator
- `src/components/reports/SpendingReport.tsx`

### 5.2 Bank Reconciliation
**Goal:** Match transactions to statements
**Files to create:**
- `src/app/(dashboard)/reconcile/page.tsx`
- `src/lib/reconciliation/matcher.ts` - Transaction matcher

### 5.3 Goals & Savings
**Goal:** Set and track financial goals
**Files to create:**
- `src/app/(dashboard)/goals/page.tsx`
- `src/components/goals/GoalTracker.tsx`

## Phase 6: Polish & Deployment (Week 7)

### 6.1 Mobile Optimization
**Goal:** Better mobile experience
**Files to review:** All responsive layouts

### 6.2 Performance Optimization
**Goal:** Faster loading, better caching
**Files to modify:**
- Implement React Query for data fetching
- Add loading states
- Optimize database queries

### 6.3 Production Deployment
**Goal:** Stable deployment to Coolify
**Tasks:**
- Fix current deployment issues
- Add proper health checks
- Configure backups
- Set up monitoring

## Immediate TODOs (This Week)

### Day 1: CSV Import MVP
1. Create ImportModal component
2. Add bulk import server action
3. Test with generated CSV file
4. Add basic error handling

### Day 2: PDF Parser Integration
1. Port Python PDF parser to TypeScript
2. Create parser utility functions
3. Add PDF upload to import modal
4. Test with Tangerine statements

### Day 3: Smart Categorization
1. Create rule-based categorization engine
2. Add Tangerine-specific rules
3. Test categorization accuracy
4. Add category suggestions UI

### Day 4: Transfer Filtering
1. Implement transfer detection logic
2. Add "isTransfer" field to Transaction model
3. Update dashboard to exclude transfers
4. Test with real statement data

### Day 5: Recurring Detection
1. Implement basic pattern detection
2. Add recurring transaction flag
3. Create recurring transactions view
4. Test detection accuracy

## Database Schema Updates Needed

```prisma
// Add to existing schema
model Account {
  id          String   @id @default(uuid())
  name        String
  type        String   // checking, savings, credit, investment
  institution String?  // Tangerine, RBC, etc.
  balance     Float    @default(0)
  color       String?
  
  transactions Transaction[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

// Update Transaction model
model Transaction {
  // ... existing fields ...
  
  isTransfer   Boolean  @default(false)
  isRecurring  Boolean  @default(false)
  recurringId  String?  // For grouping recurring transactions
  
  account      Account? @relation(fields: [accountId], references: [id])
  accountId    String?
  
  // Add for reconciliation
  statementId  String?
  reconciled   Boolean  @default(false)
}

// New models
model Bill {
  id          String   @id @default(uuid())
  name        String
  amount      Float
  dueDay      Int      // Day of month (1-31)
  category    Category @relation(fields: [categoryId], references: [id])
  categoryId  String
  account     Account  @relation(fields: [accountId], references: [id])
  accountId   String
  
  transactions Transaction[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Goal {
  id          String   @id @default(uuid())
  name        String
  targetAmount Float
  currentAmount Float @default(0)
  targetDate  DateTime?
  category    Category @relation(fields: [categoryId], references: [id])
  categoryId  String?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

## Success Metrics

### Phase 1 Success:
- User can upload Tangerine CSV/PDF
- 80% of transactions auto-categorized correctly
- Transfers correctly filtered out

### Phase 2 Success:
- 90% categorization accuracy
- Users can create/edit categorization rules
- ML suggestions improve over time

### Phase 3 Success:
- Automatic detection of recurring bills
- Bill reminders work correctly
- Calendar view shows due dates

### Phase 4 Success:
- Multiple accounts supported
- Net worth tracking accurate
- Dashboard shows comprehensive view

## Risks & Mitigations

### Risk 1: PDF Parsing Inconsistency
- **Mitigation:** Start with Tangerine-specific parser, add others gradually
- **Fallback:** Manual CSV import always available

### Risk 2: Categorization Accuracy
- **Mitigation:** Start with rule-based, add ML gradually
- **Fallback:** Manual categorization override

### Risk 3: Performance with Large Datasets
- **Mitigation:** Pagination, lazy loading, query optimization
- **Fallback:** Client-side filtering for small datasets

## Next Steps

1. **Start with Day 1 tasks** (CSV Import MVP)
2. **Test with real user data** (your Tangerine statements)
3. **Iterate based on feedback**
4. **Deploy incremental improvements**

Let's build this! 🚀
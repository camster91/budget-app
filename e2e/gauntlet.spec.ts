import { test, expect, Page } from '@playwright/test';

/**
 * Budget App Gauntlet — Comprehensive E2E QA Suite
 * Tests all critical user flows end-to-end against the running app.
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const TEST_EMAIL = `gauntlet-${Date.now()}@test.local`;
const TEST_PASSWORD = 'Gauntlet_Pass_2026!';

// ───────────────────────────────────────────────────────────
//  HELPERS
// ───────────────────────────────────────────────────────────

async function registerUser(page: Page, email: string, password: string) {
  await page.goto('/register');
  await page.fill('input[name="name"]', 'Gauntlet QA');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/.*(onboarding|daily)/, { timeout: 10000 });
}

async function loginUser(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/.*(daily|onboarding)/, { timeout: 10000 });
}

async function completeOnboarding(page: Page) {
  // If redirected to onboarding, complete the wizard
  if (page.url().includes('/onboarding')) {
    await page.waitForSelector('button[type="submit"], [data-testid="onboarding-next"]', { timeout: 5000 });
    await page.click('button[type="submit"], [data-testid="onboarding-next"]');
    await page.waitForTimeout(1000);
  }
}

async function addIncome(page: Page, name: string, amount: string) {
  await page.goto('/settings');
  await page.fill('input[name="incomeName"]', name);
  await page.fill('input[name="incomeAmount"]', amount);
  await page.selectOption('select[name="incomeFrequency"]', 'monthly');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(500);
}

async function addBill(page: Page, name: string, amount: string, day: string) {
  await page.goto('/bills');
  await page.click('button:has-text("Add Bill")');
  await page.fill('input[name="name"]', name);
  await page.fill('input[name="amount"]', amount);
  await page.fill('input[name="dueDay"]', day);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(500);
}

async function addTransaction(page: Page, desc: string, amount: string, type: 'income' | 'expense' = 'expense') {
  await page.goto('/transactions');
  await page.click('button:has-text("Add Transaction")');
  await page.fill('input[name="description"]', desc);
  await page.fill('input[name="amount"]', amount);
  await page.selectOption('select[name="type"]', type);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(500);
}

// ───────────────────────────────────────────────────────────
//  GAUNTLET TESTS
// ───────────────────────────────────────────────────────────

test.describe('🔐 AUTH GAUNTLET', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('1.1 — Unauthenticated user is redirected to login', async ({ page }) => {
    await page.goto('/daily');
    await expect(page).toHaveURL(/.*login/);
    await expect(page.locator('text=Sign In')).toBeVisible();
  });

  test('1.2 — Register creates account and redirects', async ({ page }) => {
    const email = `auth-${Date.now()}@test.local`;
    await registerUser(page, email, TEST_PASSWORD);
    await expect(page).toHaveURL(/.*(daily|onboarding)/);
  });

  test('1.3 — Login with valid credentials succeeds', async ({ page }) => {
    // Use the pre-registered user from setup or register fresh
    const email = `login-${Date.now()}@test.local`;
    await registerUser(page, email, TEST_PASSWORD);
    await page.goto('/logout');
    await loginUser(page, email, TEST_PASSWORD);
    await expect(page).not.toHaveURL(/.*login/);
  });

  test('1.4 — Login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'fake@nowhere.com');
    await page.fill('input[name="password"]', 'wrongpass');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Invalid credentials')).toBeVisible({ timeout: 5000 });
  });

  test('1.5 — Logout clears session and redirects', async ({ page }) => {
    const email = `logout-${Date.now()}@test.local`;
    await registerUser(page, email, TEST_PASSWORD);
    await page.goto('/api/auth/logout');
    await page.goto('/daily');
    await expect(page).toHaveURL(/.*login/);
  });

  test('1.6 — Rate limiting blocks repeated failed logins', async ({ page }) => {
    await page.goto('/login');
    for (let i = 0; i < 6; i++) {
      await page.fill('input[name="email"]', `rate-${Date.now()}@test.local`);
      await page.fill('input[name="password"]', 'wrong');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(200);
    }
    await expect(page.locator('text=Too many login attempts')).toBeVisible({ timeout: 3000 });
  });
});

test.describe('📊 DASHBOARD GAUNTLET', () => {
  test.beforeEach(async ({ page }) => {
    await registerUser(page, `dash-${Date.now()}@test.local`, TEST_PASSWORD);
    await completeOnboarding(page);
  });

  test('2.1 — Daily page loads with allowance hero', async ({ page }) => {
    await page.goto('/daily');
    await expect(page.locator('text=Daily Spend')).toBeVisible();
    await expect(page.locator('text=Allowance')).toBeVisible();
  });

  test('2.2 — Quick add form creates transaction', async ({ page }) => {
    await page.goto('/daily');
    await page.fill('input[name="amount"]', '25.00');
    await page.fill('input[name="description"]', 'Coffee');
    await page.click('button:has-text("Add")');
    await expect(page.locator('text=Coffee')).toBeVisible({ timeout: 3000 });
  });

  test('2.3 — Duplicate detection triggers on rapid identical entries', async ({ page }) => {
    await page.goto('/daily');
    await page.fill('input[name="amount"]', '10.00');
    await page.fill('input[name="description"]', 'Duplicate Test');
    await page.click('button:has-text("Add")');
    await page.waitForTimeout(300);
    await page.fill('input[name="amount"]', '10.00');
    await page.fill('input[name="description"]', 'Duplicate Test');
    await page.click('button:has-text("Add")');
    await expect(page.locator('text=duplicate')).toBeVisible({ timeout: 5000 });
  });

  test('2.4 — Transaction appears in today\'s log with delete option', async ({ page }) => {
    await page.goto('/daily');
    await page.fill('input[name="amount"]', '50.00');
    await page.fill('input[name="description"]', 'Delete Me');
    await page.click('button:has-text("Add")');
    await expect(page.locator('text=Delete Me')).toBeVisible();
    await page.click('button[aria-label="Delete"]');
    await expect(page.locator('text=Delete Me')).not.toBeVisible({ timeout: 3000 });
  });

  test('2.5 — Dashboard summary page loads all widgets', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Net Worth')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Monthly Income')).toBeVisible();
    await expect(page.locator('text=Monthly Expenses')).toBeVisible();
  });
});

test.describe('💰 TRANSACTIONS GAUNTLET', () => {
  test.beforeEach(async ({ page }) => {
    await registerUser(page, `tx-${Date.now()}@test.local`, TEST_PASSWORD);
    await completeOnboarding(page);
  });

  test('3.1 — Create transaction with category', async ({ page }) => {
    await addTransaction(page, 'Groceries', '150.00');
    await expect(page.locator('text=Groceries')).toBeVisible();
  });

  test('3.2 — Edit transaction inline', async ({ page }) => {
    await addTransaction(page, 'Old Name', '50.00');
    await page.click('button[aria-label="Edit"]');
    await page.fill('input[name="description"]', 'Updated Name');
    await page.fill('input[name="amount"]', '75.00');
    await page.click('button:has-text("Save")');
    await expect(page.locator('text=Updated Name')).toBeVisible({ timeout: 3000 });
  });

  test('3.3 — Delete transaction removes from list', async ({ page }) => {
    await addTransaction(page, 'To Delete', '20.00');
    await page.click('button[aria-label="Delete"]');
    await page.click('button:has-text("Confirm")');
    await expect(page.locator('text=To Delete')).not.toBeVisible({ timeout: 3000 });
  });

  test('3.4 — CSV export returns valid file', async ({ page }) => {
    await addTransaction(page, 'Export Test', '100.00');
    const responsePromise = page.waitForResponse('/api/export/csv');
    await page.goto('/api/export/csv');
    const response = await responsePromise;
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('text/csv');
  });

  test('3.5 — Transaction filter by date range works', async ({ page }) => {
    await page.goto('/transactions');
    await page.fill('input[name="dateFrom"]', '2026-01-01');
    await page.fill('input[name="dateTo"]', '2026-12-31');
    await page.click('button:has-text("Filter")');
    await page.waitForTimeout(500);
    await expect(page.locator('[data-testid="transaction-list"]')).toBeVisible();
  });
});

test.describe('📑 BILLS GAUNTLET', () => {
  test.beforeEach(async ({ page }) => {
    await registerUser(page, `bill-${Date.now()}@test.local`, TEST_PASSWORD);
    await completeOnboarding(page);
  });

  test('4.1 — Create bill with due day', async ({ page }) => {
    await addBill(page, 'Rent', '1200.00', '1');
    await expect(page.locator('text=Rent')).toBeVisible();
    await expect(page.locator('text=$1,200.00')).toBeVisible();
  });

  test('4.2 — Edit bill updates countdown', async ({ page }) => {
    await addBill(page, 'Internet', '80.00', '15');
    await page.click('button[aria-label="Edit"]');
    await page.fill('input[name="amount"]', '90.00');
    await page.click('button:has-text("Save")');
    await expect(page.locator('text=$90.00')).toBeVisible({ timeout: 3000 });
  });

  test('4.3 — Bill countdown shows days until due', async ({ page }) => {
    await addBill(page, 'Phone', '60.00', '20');
    await expect(page.locator(/days? until/)).toBeVisible();
  });
});

test.describe('🎯 BUDGETS & GOALS GAUNTLET', () => {
  test.beforeEach(async ({ page }) => {
    await registerUser(page, `bg-${Date.now()}@test.local`, TEST_PASSWORD);
    await completeOnboarding(page);
  });

  test('5.1 — Create budget for category', async ({ page }) => {
    await page.goto('/budgets');
    await page.click('button:has-text("Add Budget")');
    await page.fill('input[name="amount"]', '500.00');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=$500.00')).toBeVisible();
  });

  test('5.2 — Create savings goal', async ({ page }) => {
    await page.goto('/goals');
    await page.click('button:has-text("Add Goal")');
    await page.fill('input[name="name"]', 'Vacation Fund');
    await page.fill('input[name="targetAmount"]', '5000.00');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Vacation Fund')).toBeVisible();
    await expect(page.locator('text=$5,000.00')).toBeVisible();
  });

  test('5.3 — Goal progress bar updates', async ({ page }) => {
    await page.goto('/goals');
    await page.click('button:has-text("Add Goal")');
    await page.fill('input[name="name"]', 'Car Fund');
    await page.fill('input[name="targetAmount"]', '10000.00');
    await page.fill('input[name="currentAmount"]', '2500.00');
    await page.click('button[type="submit"]');
    await expect(page.locator('[role="progressbar"]')).toBeVisible();
  });
});

test.describe('⚙️ SETTINGS & ACCOUNTS GAUNTLET', () => {
  test.beforeEach(async ({ page }) => {
    await registerUser(page, `set-${Date.now()}@test.local`, TEST_PASSWORD);
    await completeOnboarding(page);
  });

  test('6.1 — Add bank account', async ({ page }) => {
    await page.goto('/accounts');
    await page.click('button:has-text("Add Account")');
    await page.fill('input[name="name"]', 'RBC Chequing');
    await page.selectOption('select[name="type"]', 'checking');
    await page.fill('input[name="balance"]', '2500.00');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=RBC Chequing')).toBeVisible();
  });

  test('6.2 — Update profile name', async ({ page }) => {
    await page.goto('/settings');
    await page.fill('input[name="name"]', 'Updated Name');
    await page.click('button:has-text("Save")');
    await expect(page.locator('text=Updated Name')).toBeVisible();
  });

  test('6.3 — Category CRUD', async ({ page }) => {
    await page.goto('/categories');
    await page.click('button:has-text("Add Category")');
    await page.fill('input[name="name"]', 'TestCat');
    await page.selectOption('select[name="type"]', 'expense');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=TestCat')).toBeVisible();
    await page.click('button[aria-label="Delete"]');
    await page.click('button:has-text("Confirm")');
    await expect(page.locator('text=TestCat')).not.toBeVisible({ timeout: 3000 });
  });
});

test.describe('🛡️ RESILIENCE GAUNTLET', () => {
  test.beforeEach(async ({ page }) => {
    await registerUser(page, `res-${Date.now()}@test.local`, TEST_PASSWORD);
    await completeOnboarding(page);
  });

  test('7.1 — Empty states render gracefully', async ({ page }) => {
    await page.goto('/transactions');
    await expect(page.locator('text=No transactions')).toBeVisible();
  });

  test('7.2 — 404 page loads with helpful link', async ({ page }) => {
    await page.goto('/nonexistent-page-12345');
    await expect(page.locator('text=404')).toBeVisible();
    await expect(page.locator('text=Go back')).toBeVisible();
  });

  test('7.3 — Validation rejects empty form submissions', async ({ page }) => {
    await page.goto('/transactions');
    await page.click('button:has-text("Add Transaction")');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=required')).toBeVisible({ timeout: 3000 });
  });

  test('7.4 — Unauthorized API calls return 401', async ({ page, browser }) => {
    const anon = await browser.newContext();
    const anonPage = await anon.newPage();
    const res = await anonPage.request.get(`${BASE_URL}/api/export/csv`);
    expect(res.status()).toBe(401);
    await anon.close();
  });
});

test.describe('📱 RESPONSIVENESS GAUNTLET', () => {
  test.beforeEach(async ({ page }) => {
    await registerUser(page, `mob-${Date.now()}@test.local`, TEST_PASSWORD);
    await completeOnboarding(page);
  });

  test('8.1 — Mobile viewport renders sidebar as bottom nav', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/daily');
    await expect(page.locator('nav, [role="navigation"]')).toBeVisible();
    // Bottom nav or hamburger should be present on mobile
    await expect(page.locator('button:has-text("Menu"), [aria-label="Menu"]')).toBeVisible();
  });

  test('8.2 — Tablet viewport shows sidebar', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/daily');
    await expect(page.locator('aside, [role="complementary"]')).toBeVisible();
  });
});

test.describe('🔔 NOTIFICATIONS GAUNTLET', () => {
  test.beforeEach(async ({ page }) => {
    await registerUser(page, `notif-${Date.now()}@test.local`, TEST_PASSWORD);
    await completeOnboarding(page);
  });

  test('9.1 — Push notification endpoint returns formatted messages', async ({ page }) => {
    const res = await page.request.post(`${BASE_URL}/api/push/send`);
    const body = await res.json();
    expect(res.status()).toBe(200);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.messages)).toBe(true);
  });

  test('9.2 — Health check responds 200', async ({ page }) => {
    const res = await page.request.get(`${BASE_URL}/api/health`);
    expect(res.status()).toBe(200);
  });
});

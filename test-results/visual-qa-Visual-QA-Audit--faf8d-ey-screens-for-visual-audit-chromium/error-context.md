# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual-qa.spec.ts >> Visual QA Audit >> Capture key screens for visual audit
- Location: e2e\visual-qa.spec.ts:5:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('input[name="name"]')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e6] [cursor=pointer]:
    - button "Open Next.js Dev Tools" [ref=e7]:
      - img [ref=e8]
    - generic [ref=e11]:
      - button "Open issues overlay" [ref=e12]:
        - generic [ref=e13]:
          - generic [ref=e14]: "0"
          - generic [ref=e15]: "1"
        - generic [ref=e16]: Issue
      - button "Collapse issues badge" [ref=e17]:
        - img [ref=e18]
  - generic [ref=e20]:
    - img [ref=e22]
    - heading "Something went wrong!" [level=2] [ref=e24]
    - paragraph [ref=e25]: We encountered an error while loading this page. This might be due to a temporary glitch or connection issue.
    - generic [ref=e26]:
      - button "Go Home" [ref=e27]
      - button "Try again" [ref=e28]:
        - img [ref=e29]
        - text: Try again
    - generic [ref=e32]:
      - paragraph [ref=e33]: "Invalid `__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$prisma$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__[\"prisma\"].user.count()` invocation in C:\\Users\\camst\\projects\\budget-app\\.next\\dev\\server\\chunks\\ssr\\[root-of-the-server]__874c5236._.js:81:161 78 const dynamic = \"force-dynamic\"; 79 async function RegisterPage() { 80 // Single-user app: once an account exists, registration is closed → 81 const userCount = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$prisma$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__[\"prisma\"].user.count( error: Environment variable not found: DATABASE_URL. --> schema.prisma:11 | 10 | provider = \"postgresql\" 11 | url = env(\"DATABASE_URL\") | Validation Error Count: 1"
      - generic [ref=e34]: "PrismaClientInitializationError: Invalid `__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$prisma$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__[\"prisma\"].user.count()` invocation in C:\\Users\\camst\\projects\\budget-app\\.next\\dev\\server\\chunks\\ssr\\[root-of-the-server]__874c5236._.js:81:161 78 const dynamic = \"force-dynamic\"; 79 async function RegisterPage() { 80 // Single-user app: once an account exists, registration is closed → 81 const userCount = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$prisma$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__[\"prisma\"].user.count( error: Environment variable not found: DATABASE_URL. --> schema.prisma:11 | 10 | provider = \"postgresql\" 11 | url = env(\"DATABASE_URL\") | Validation Error Count: 1 at RegisterPage (about://React/Server/C:%5CUsers%5Ccamst%5Cprojects%5Cbudget-app%5C.next%5Cdev%5Cserver%5Cchunks%5Cssr%5C%5Broot-of-the-server%5D__874c5236._.js?27:81:23) at resolveErrorDev (http://localhost:3000/_next/static/chunks/node_modules_next_dist_compiled_react-server-dom-turbopack_9212ccad._.js:1894:148) at processFullStringRow (http://localhost:3000/_next/static/chunks/node_modules_next_dist_compiled_react-server-dom-turbopack_9212ccad._.js:2402:29) at processFullBinaryRow (http://localhost:3000/_next/static/chunks/node_modules_next_dist_compiled_react-server-dom-turbopack_9212ccad._.js:2361:9) at processBinaryChunk (http://localhost:3000/_next/static/chunks/node_modules_next_dist_compiled_react-server-dom-turbopack_9212ccad._.js:2470:221) at progress (http://localhost:3000/_next/static/chunks/node_modules_next_dist_compiled_react-server-dom-turbopack_9212ccad._.js:2640:13)"
  - generic [ref=e35]:
    - img [ref=e37]
    - button "Open Tanstack query devtools" [ref=e85] [cursor=pointer]:
      - img [ref=e86]
  - alert [ref=e134]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import * as fs from 'fs';
  3  | 
  4  | test.describe('Visual QA Audit', () => {
  5  |   test('Capture key screens for visual audit', async ({ page }) => {
  6  |     // 1. Landing / Login Page
  7  |     await page.goto('/login');
  8  |     await page.waitForTimeout(1000); // Wait for animations
  9  |     await page.screenshot({ path: 'qa-results/1-login-screen.png' });
  10 | 
  11 |     // 2. Register Page (The first impression)
  12 |     await page.goto('/register');
  13 |     await page.waitForTimeout(1000);
  14 |     await page.screenshot({ path: 'qa-results/2-register-screen.png' });
  15 | 
  16 |     // 3. Dark Mode vs Light Mode check (if possible on current state)
  17 |     // We'll simulate a user session by registering
  18 |     const email = `qa-${Date.now()}@test.com`;
> 19 |     await page.fill('input[name="name"]', 'QA Tester');
     |                ^ Error: page.fill: Test timeout of 30000ms exceeded.
  20 |     await page.fill('input[name="email"]', email);
  21 |     await page.fill('input[name="password"]', 'password123');
  22 |     await page.click('button[type="submit"]');
  23 | 
  24 |     // Wait for redirect to Onboarding
  25 |     await expect(page).toHaveURL(/.*onboarding/);
  26 |     await page.waitForTimeout(2000);
  27 |     await page.screenshot({ path: 'qa-results/3-onboarding-start.png' });
  28 | 
  29 |     // 4. Dashboard Visuals (using mock data if available or after onboarding)
  30 |     // For now, let's just see the empty state/loading of daily
  31 |     await page.goto('/daily');
  32 |     await page.waitForTimeout(3000); // Let React Query load
  33 |     await page.screenshot({ path: 'qa-results/4-dashboard-dark.png' });
  34 | 
  35 |     // Toggle to Light Mode
  36 |     // The ThemeToggle is a button with a Sun/Moon icon.
  37 |     // Based on our code, it's in the header.
  38 |     const themeToggle = page.locator('button[aria-label="Toggle theme"], button:has-text("Toggle theme")');
  39 |     if (await themeToggle.isVisible()) {
  40 |         await themeToggle.click();
  41 |         await page.waitForTimeout(1000);
  42 |         await page.screenshot({ path: 'qa-results/5-dashboard-light.png' });
  43 |     }
  44 |   });
  45 | });
  46 | 
```
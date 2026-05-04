import { test, expect } from '@playwright/test';
import * as fs from 'fs';

test.describe('Visual QA Audit', () => {
  test('Capture key screens for visual audit', async ({ page }) => {
    // 1. Landing / Login Page
    await page.goto('/login');
    await page.waitForTimeout(1000); // Wait for animations
    await page.screenshot({ path: 'qa-results/1-login-screen.png' });

    // 2. Register Page (The first impression)
    await page.goto('/register');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'qa-results/2-register-screen.png' });

    // 3. Dark Mode vs Light Mode check (if possible on current state)
    // We'll simulate a user session by registering
    const email = `qa-${Date.now()}@test.com`;
    await page.fill('input[name="name"]', 'QA Tester');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Wait for redirect to Onboarding
    await expect(page).toHaveURL(/.*onboarding/);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'qa-results/3-onboarding-start.png' });

    // 4. Dashboard Visuals (using mock data if available or after onboarding)
    // For now, let's just see the empty state/loading of daily
    await page.goto('/daily');
    await page.waitForTimeout(3000); // Let React Query load
    await page.screenshot({ path: 'qa-results/4-dashboard-dark.png' });

    // Toggle to Light Mode
    // The ThemeToggle is a button with a Sun/Moon icon.
    // Based on our code, it's in the header.
    const themeToggle = page.locator('button[aria-label="Toggle theme"], button:has-text("Toggle theme")');
    if (await themeToggle.isVisible()) {
        await themeToggle.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: 'qa-results/5-dashboard-light.png' });
    }
  });
});

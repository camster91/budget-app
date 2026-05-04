import { test, expect } from '@playwright/test';

test.describe('Budget App Flow', () => {
  test('should redirect to login when unauthenticated', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/.*login/);
  });

  test('should allow registration and show dashboard', async ({ page }) => {
    const email = `test-${Math.random().toString(36).slice(2)}@example.com`;
    
    await page.goto('/register');
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Should redirect to onboarding or daily
    await expect(page).toHaveURL(/.*(onboarding|daily)/);
  });
});

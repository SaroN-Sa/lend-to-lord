import { test, expect } from '@playwright/test';

test.describe('Task 7: Admin Hero & Sponsors Screen Guards & Navigation', () => {
  test('1. Unauthenticated visitor navigating to /admin/content is redirected to /admin/login', async ({
    page,
  }) => {
    // Navigate directly without session
    await page.goto('/admin/content');
    // AdminProtectedLayout checks session cookies and redirects to /admin/login
    await expect(page).toHaveURL(/\/admin\/login(?:\?|$)/);
    await expect(page.locator('h1')).toHaveText('Admin Sign In');
  });

  test('2. Admin login page renders clean login form without errors', async ({ page }) => {
    await page.goto('/admin/login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('3. Existing public pages remain untouched and green', async ({ page }) => {
    await page.goto('/en');
    await expect(page.locator('h1')).toHaveText('Lend To Lord');
    await expect(page.locator('[data-testid="hero-visual-frame"]')).toBeVisible();

    await page.goto('/am');
    await expect(page.locator('h1')).toHaveText('ለጌታ ማበደር');
  });
});

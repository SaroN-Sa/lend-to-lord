import { test, expect } from '@playwright/test';

// 1. Open the home page
test('1. home page loads', async ({ page }) => {
  const response = await page.goto('/am');
  expect(response?.status()).toBeLessThan(400);
  await expect(page.locator('body')).toBeVisible();
});

// 2. Switch the language (am -> en)
test('2. switch language between am and en', async ({ page }) => {
  await page.goto('/am');
  const enLink = page
    .locator('a[href="/en"], button:has-text("EN"), a:has-text("EN")')
    .first();
  await expect(enLink).toBeVisible();
  await enLink.click();
  await expect(page).toHaveURL(/\/en/);
});

// 3. Main menu link works
test('3. main menu links work', async ({ page }) => {
  await page.goto('/am');
  const contributeLink = page.locator('a[href*="/contribute"]').first();
  await expect(contributeLink).toBeVisible();
  await contributeLink.click();
  await expect(page).toHaveURL(/\/contribute/);
});

// 4. Page that doesn't exist
test('4. unknown route shows a 404', async ({ page }) => {
  const response = await page.goto('/am/this-page-does-not-exist');
  expect(response?.status()).toBe(404);
});

// 5. Contribute page loads with its form
test('5. contribute page loads', async ({ page }) => {
  const response = await page.goto('/am/contribute');
  expect(response?.status()).toBeLessThan(400);
  await expect(page.locator('form')).toBeVisible({ timeout: 10000 });
});

// 6. Empty form must be blocked or show an error
test('6. submitting empty contribute form blocks or errors', async ({ page }) => {
  await page.goto('/am/contribute');
  const submitBtn = page.locator('button[type="submit"]');
  await expect(submitBtn).toBeVisible({ timeout: 10000 });
  await submitBtn.click();

  const invalidFields = await page.locator('form :invalid').count();
  const alerts = await page.getByRole('alert').count();
  expect(invalidFields + alerts).toBeGreaterThan(0);
});

// 7. Invalid data must be blocked or show an error
test('7. submit contribute form with invalid data shows error', async ({ page }) => {
  await page.goto('/am/contribute');
  const amountInput = page.locator('input[name="amount_birr"]');
  await expect(amountInput).toBeVisible({ timeout: 10000 });

  await amountInput.fill('-50');
  await page.fill('input[name="reference_no"]', 'AB');
  await page.click('button[type="submit"]');

  const invalidFields = await page.locator('form :invalid').count();
  const alerts = await page.getByRole('alert').count();
  expect(invalidFields + alerts).toBeGreaterThan(0);
});

// 8. keep-alive API
test('8. keep-alive API responds', async ({ request }) => {
  const response = await request.get('/api/keep-alive');
  expect(response.ok()).toBeTruthy();
});

// 9. Admin page without login
test('9. admin page redirects unauthenticated users to login', async ({ page }) => {
  await page.goto('/am/admin');
  await expect(page).toHaveURL(/\/admin\/login/);
});
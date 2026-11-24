import { test, expect } from '@playwright/test';

test.describe('Task 1: i18n Deterministic Routing & Language Switching', () => {
  // 1. GET / redirects to /en and sets <html lang="en">
  test('1. root URL / redirects deterministically to /en with <html lang="en">', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/en(?:\/|$)/);
    const htmlLang = await page.locator('html').getAttribute('lang');
    expect(htmlLang).toBe('en');
  });

  // 2. Clicking [data-testid="lang-switch-am"] switches to /am on same pathname and sets <html lang="am">
  test('2. clicking lang-switch-am switches to /am on the same pathname with <html lang="am">', async ({
    page,
  }) => {
    await page.goto('/en/contribute');
    const switchAm = page.locator('[data-testid="lang-switch-am"]');
    await expect(switchAm).toBeVisible();
    await switchAm.click();

    await expect(page).toHaveURL(/\/am\/contribute(?:\/|$)/);
    const htmlLang = await page.locator('html').getAttribute('lang');
    expect(htmlLang).toBe('am');
  });

  // 3. Switching back via [data-testid="lang-switch-en"] returns to /en
  test('3. switching back via lang-switch-en returns to /en with <html lang="en">', async ({
    page,
  }) => {
    await page.goto('/am/contribute');
    const switchEn = page.locator('[data-testid="lang-switch-en"]');
    await expect(switchEn).toBeVisible();
    await switchEn.click();

    await expect(page).toHaveURL(/\/en\/contribute(?:\/|$)/);
    const htmlLang = await page.locator('html').getAttribute('lang');
    expect(htmlLang).toBe('en');
  });

  // 4. An /api/... route (e.g., /api/keep-alive) is not redirected
  test('4. /api/keep-alive endpoint responds without being redirected by locale routing', async ({
    request,
  }) => {
    const response = await request.get('/api/keep-alive', {
      maxRedirects: 0,
    });
    expect(response.status()).toBe(200);
    const json = await response.json();
    expect(json).toEqual({ status: 'ok' });
  });

  // 5. /admin is not redirected to /en/admin
  test('5. /admin is not redirected to /en/admin', async ({ page }) => {
    await page.goto('/admin');
    // May redirect to /admin/login for unauthenticated users, but MUST NOT redirect to /en/admin
    const url = page.url();
    expect(url).not.toMatch(/\/en\/admin/);
    expect(url).toMatch(/\/admin/);
  });
});

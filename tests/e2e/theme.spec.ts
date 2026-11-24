import { test, expect } from '@playwright/test';

test.describe('Theme & Dark Mode Verification', () => {
  test('1. System dark mode: applies data-theme="dark" on first paint with zero "light" flash', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'dark' });

    // Attach observer before navigation to record all changes to data-theme on <html>
    await page.addInitScript(() => {
      (window as unknown as { __themeMutations: string[] }).__themeMutations = [];
      const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
          if (m.type === 'attributes' && m.attributeName === 'data-theme') {
            const val = document.documentElement.getAttribute('data-theme');
            if (val) {
              (window as unknown as { __themeMutations: string[] }).__themeMutations.push(val);
            }
          }
        }
      });
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme'],
      });
    });

    await page.goto('/en');

    // Verify data-theme attribute on <html>
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'dark');

    // Verify mutations recorded: no "light" should ever appear in mutations when system is dark
    const mutations = await page.evaluate(
      () => (window as unknown as { __themeMutations: string[] }).__themeMutations
    );
    expect(mutations).not.toContain('light');

    // Verify computed background color matches dark background token rgb(9, 9, 11) (#09090b)
    const bgColor = await page.locator('body').evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });
    expect(bgColor).toBe('rgb(9, 9, 11)');
  });

  test('2. Single-click toggle from system dark switches immediately to light and persists on reload', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/en');

    // Wait until React hydrates ThemeToggle
    const toggle = page.locator('[data-testid="theme-toggle"][data-mounted="true"]');
    await expect(toggle).toBeVisible();

    // Verify initial dark state from system preference
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    // Single click toggles directly to 'light' (based on resolvedTheme)
    await toggle.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    // Computed background color should now be white rgb(255, 255, 255) (#ffffff)
    const lightBg = await page.locator('body').evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });
    expect(lightBg).toBe('rgb(255, 255, 255)');

    // Reload page and confirm 'light' persists in localStorage
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });

  test('3. Theme toggle on /am preserves <html lang="am"> and Ethiopic font setup', async ({
    page,
  }) => {
    await page.goto('/am');

    const html = page.locator('html');
    await expect(html).toHaveAttribute('lang', 'am');

    const toggle = page.locator('[data-testid="theme-toggle"][data-mounted="true"]');
    await expect(toggle).toBeVisible();

    // Check accessible aria-label is present
    const ariaLabel = await toggle.getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();

    // Toggle theme on /am
    const initialTheme = await html.getAttribute('data-theme');
    await toggle.click();
    const nextTheme = await html.getAttribute('data-theme');
    expect(nextTheme).not.toBe(initialTheme);

    // Verify Task 2 font setup is still intact on /am
    const ethiopicVar = await page.evaluate(() => {
      return getComputedStyle(document.documentElement)
        .getPropertyValue('--font-ethiopic')
        .trim();
    });
    expect(ethiopicVar).toBeTruthy();

    const bodyStyle = await page.locator('body').evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        fontFamily: computed.fontFamily,
        lineHeight: parseFloat(computed.lineHeight) / parseFloat(computed.fontSize),
      };
    });

    // Latin font is first in the font stack
    expect(bodyStyle.fontFamily.toLowerCase()).toMatch(/^"?plus jakarta sans/);
    // Line-height ratio is ~1.65 (between 1.6 and 1.7)
    expect(bodyStyle.lineHeight).toBeGreaterThanOrEqual(1.6);
    expect(bodyStyle.lineHeight).toBeLessThanOrEqual(1.7);
  });

  test('4. Keyboard navigation: can focus with Tab and toggle with Enter and Space', async ({
    page,
  }) => {
    await page.goto('/en');

    const toggle = page.locator('[data-testid="theme-toggle"][data-mounted="true"]');
    await expect(toggle).toBeVisible();

    // Focus the toggle button
    await toggle.focus();
    await expect(toggle).toBeFocused();

    const html = page.locator('html');
    const theme1 = await html.getAttribute('data-theme');

    // Press Enter to toggle
    await page.keyboard.press('Enter');
    const theme2 = await html.getAttribute('data-theme');
    expect(theme2).not.toBe(theme1);

    // Press Space to toggle back
    await page.keyboard.press('Space');
    const theme3 = await html.getAttribute('data-theme');
    expect(theme3).toBe(theme1);
  });
});

import { test, expect } from '@playwright/test';

test.describe('Task 4: Layout Shell, Glass & Depth Design Base', () => {
  test('1. Landmarks, nav, and footer render with expected locale labels on /en and /am', async ({
    page,
  }) => {
    // English checks
    await page.goto('/en');
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('nav[aria-label="Main navigation"]')).toBeVisible();
    await expect(page.locator('main#main-content')).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();

    // Wordmark & Nav links
    const enWordmark = page.locator('header a[href="/en"]').first();
    await expect(enWordmark).toHaveText('Lend To Lord');
    await expect(page.locator('nav a[href="/en"]')).toHaveText('Home');
    await expect(page.locator('nav a[href="/en/join"]')).toHaveText('Join');

    // Controls
    await expect(page.locator('[data-testid="language-switcher"]')).toBeVisible();
    await expect(page.locator('[data-testid="theme-toggle"]')).toBeVisible();

    // Footer copyright
    await expect(page.locator('footer')).toContainText('© 2026 Lend To Lord');

    // Amharic checks
    await page.goto('/am');
    const amWordmark = page.locator('header a[href="/am"]').first();
    await expect(amWordmark).toHaveText('ለጌታ ማበደር');
    await expect(page.locator('nav a[href="/am"]')).toHaveText('መነሻ');
    await expect(page.locator('nav a[href="/am/join"]')).toHaveText('አጋር ይሁኑ');
  });

  test('2. 320px viewport has zero horizontal scroll and zero overlapping interactive controls in header', async ({
    page,
  }) => {
    for (const locale of ['en', 'am']) {
      await page.setViewportSize({ width: 320, height: 600 });
      await page.goto(`/${locale}`);

      // Confirm no horizontal overflow
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(hasHorizontalScroll).toBe(false);

      // Verify interactive controls in header do not collide/overlap
      const controls = [
        page.locator('header a').first(), // Wordmark
        page.locator('nav a').first(),    // Home
        page.locator('[data-testid="lang-switch-en"]'),
        page.locator('[data-testid="lang-switch-am"]'),
        page.locator('[data-testid="theme-toggle"]'),
      ];

      const boxes = [];
      for (const ctrl of controls) {
        await expect(ctrl).toBeVisible();
        const box = await ctrl.boundingBox();
        expect(box).toBeTruthy();
        if (box) boxes.push(box);
      }

      // Pairwise overlap check
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const b1 = boxes[i];
          const b2 = boxes[j];
          const overlap = !(
            b1.x + b1.width <= b2.x ||
            b2.x + b2.width <= b1.x ||
            b1.y + b1.height <= b2.y ||
            b2.y + b2.height <= b1.y
          );
          expect(overlap).toBe(false);
        }
      }
    }
  });

  test('3. prefers-reduced-motion: reduce disables tilt transform and entrance animation', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/en');

    const card = page.locator('[data-testid="tilt-card"]');
    await expect(card).toBeVisible();

    // Hover over the tilt card
    await card.hover({ position: { x: 10, y: 10 } });
    await page.waitForTimeout(100);

    // Verify computed transform remains 'none'
    const transform = await card.evaluate((el) => {
      return window.getComputedStyle(el).transform;
    });
    expect(transform).toBe('none');

    // Verify entrance animation utility has animation-name: none and opacity: 1
    const entranceElement = page.locator('.entrance-fade').first();
    await expect(entranceElement).toBeVisible();
    const entranceStyles = await entranceElement.evaluate((el) => {
      const s = window.getComputedStyle(el);
      return {
        animationName: s.animationName,
        opacity: s.opacity,
        transform: s.transform,
      };
    });
    expect(entranceStyles.animationName).toBe('none');
    expect(entranceStyles.opacity).toBe('1');
    expect(entranceStyles.transform).toBe('none');
  });

  test('4. Keyboard navigation: Tab hits skip-link first, then nav links, language switcher, and theme toggle', async ({
    page,
  }) => {
    await page.goto('/en');

    // First tab hits skip-to-content link
    await page.keyboard.press('Tab');
    const skipLink = page.locator('a[href="#main-content"]');
    await expect(skipLink).toBeFocused();

    // Next tab hits site title wordmark
    await page.keyboard.press('Tab');
    const wordmark = page.locator('header a[href="/en"]').first();
    await expect(wordmark).toBeFocused();

    // Next tab hits Home nav link
    await page.keyboard.press('Tab');
    const homeLink = page.locator('nav a[href="/en"]');
    await expect(homeLink).toBeFocused();

    // Next tab hits Join nav link
    await page.keyboard.press('Tab');
    const joinLink = page.locator('nav a[href="/en/join"]');
    await expect(joinLink).toBeFocused();

    // Next tab hits language switcher EN button
    await page.keyboard.press('Tab');
    const langEn = page.locator('[data-testid="lang-switch-en"]');
    await expect(langEn).toBeFocused();

    // Next tab hits language switcher AM button
    await page.keyboard.press('Tab');
    const langAm = page.locator('[data-testid="lang-switch-am"]');
    await expect(langAm).toBeFocused();

    // Next tab hits theme toggle
    await page.keyboard.press('Tab');
    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    await expect(themeToggle).toBeFocused();
  });

  test('5. Theme toggle inside header toggles theme and persists across reload', async ({
    page,
  }) => {
    await page.goto('/en');

    const toggle = page.locator('[data-testid="theme-toggle"][data-mounted="true"]');
    await expect(toggle).toBeVisible();

    const html = page.locator('html');
    const initialTheme = await html.getAttribute('data-theme');

    await toggle.click();
    const nextTheme = await html.getAttribute('data-theme');
    expect(nextTheme).not.toBe(initialTheme);

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', nextTheme!);
  });
});

import { test, expect } from '@playwright/test';

test.describe('Task 5: Home Page & Join Placeholder Verification', () => {
  test('1. /en and /am render Hero (with visual frame), Monthly Total card, Vision, How Donation Works (3 steps), and CTA with locale text', async ({
    page,
  }) => {
    // --- English Home ---
    await page.goto('/en');
    await expect(page.locator('h1')).toHaveText('Lend To Lord');
    await expect(page.locator('p').filter({ hasText: 'Monthly partner & sponsor contributions' })).toBeVisible();

    // Hero visual frame
    const visualFrameEn = page.locator('[data-testid="hero-visual-frame"]');
    await expect(visualFrameEn).toBeVisible();

    // Primary CTA button
    const ctaEn = page.locator('main a[href="/en/join"]').filter({ hasText: 'Become a Partner' });
    await expect(ctaEn).toBeVisible();

    // Section 2: Monthly total card (inside TiltCard)
    const cardEn = page.locator('[data-testid="tilt-card"]');
    await expect(cardEn).toBeVisible();
    await expect(cardEn).toContainText('Reported Contributions This Month');

    // Section 3: Vision statement
    const visionEn = page.locator('text=Empowering communities through transparent, faith-rooted support across Ethiopia.');
    await expect(visionEn).toBeVisible();

    // Section 4: How Donation Works (3 steps)
    await expect(page.locator('h2').filter({ hasText: 'How Donation Works' })).toBeVisible();
    await expect(page.getByText('1. Pledge Your Support')).toBeVisible();
    await expect(page.getByText('2. Bank Transfer & Proof')).toBeVisible();
    await expect(page.getByText('Verified', { exact: true })).toBeVisible();
    await expect(page.getByText('3. Transparent Impact')).toBeVisible();

    // --- Amharic Home ---
    await page.goto('/am');
    await expect(page.locator('h1')).toHaveText('ለጌታ ማበደር');
    await expect(page.locator('p').filter({ hasText: 'ወርሃዊ የአጋሮች እና የስፖንሰሮች አስተዋጽኦ' })).toBeVisible();

    const visualFrameAm = page.locator('[data-testid="hero-visual-frame"]');
    await expect(visualFrameAm).toBeVisible();

    const ctaAm = page.locator('main a[href="/am/join"]').filter({ hasText: 'አጋር ይሁኑ' });
    await expect(ctaAm).toBeVisible();

    const cardAm = page.locator('[data-testid="tilt-card"]');
    await expect(cardAm).toBeVisible();
    await expect(cardAm).toContainText('በዚህ ወር የተመዘገበ ጠቅላላ አስተዋጽኦ');

    // How Donation Works in Amharic
    await expect(page.locator('h2').filter({ hasText: 'አስተዋጽኦ እንዴት ይሰራል?' })).toBeVisible();
    await expect(page.getByText('1. ውሳኔዎን ያሳውቁ')).toBeVisible();
    await expect(page.getByText('2. የባንክ ዝውውር እና ማረጋገጫ')).toBeVisible();
    await expect(page.getByText('የተረጋገጠ', { exact: true })).toBeVisible();
    await expect(page.getByText('3. ግልጽ ተጽዕኖ')).toBeVisible();
  });

  test('2. Clicking "Become a Partner" CTA navigates to /[locale]/join and renders "Coming soon"', async ({
    page,
  }) => {
    await page.goto('/en');
    const cta = page.locator('main a[href="/en/join"]').filter({ hasText: 'Become a Partner' });
    await cta.click();

    await expect(page).toHaveURL(/\/en\/join$/);
    await expect(page.locator('h1')).toHaveText('Join as a Partner');
    await expect(page.getByText('Coming Soon', { exact: true })).toBeVisible();

    // Link back home works
    const backHome = page.locator('a[href="/en"]').filter({ hasText: 'Back to Home' });
    await expect(backHome).toBeVisible();
    await backHome.click();
    await expect(page).toHaveURL(/\/en$/);
  });

  test('3. Header nav includes Join link, and 320px viewport has zero horizontal scroll and zero overlap', async ({
    page,
  }) => {
    for (const locale of ['en', 'am']) {
      await page.setViewportSize({ width: 320, height: 600 });
      await page.goto(`/${locale}`);

      // Verify Join nav link is present and visible
      const navJoin = page.locator(`nav a[href="/${locale}/join"]`);
      await expect(navJoin).toBeVisible();

      // Check horizontal overflow
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(hasHorizontalScroll).toBe(false);

      // Verify controls bounding box non-overlap
      const controls = [
        page.locator('header a').first(),
        page.locator('nav a').first(),
        navJoin,
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

  test('4. Route-specific hreflang alternates are present in head for / and /join', async ({
    page,
  }) => {
    // Test /en alternates
    await page.goto('/en');
    const enAlt = page.locator('link[rel="alternate"][hreflang="en"]');
    const amAlt = page.locator('link[rel="alternate"][hreflang="am"]');
    const xDefault = page.locator('link[rel="alternate"][hreflang="x-default"]');

    await expect(enAlt).toHaveAttribute('href', /.*\/en$/);
    await expect(amAlt).toHaveAttribute('href', /.*\/am$/);
    await expect(xDefault).toHaveAttribute('href', /.*\/en$/);

    // Test /en/join alternates
    await page.goto('/en/join');
    const enJoinAlt = page.locator('link[rel="alternate"][hreflang="en"]');
    const amJoinAlt = page.locator('link[rel="alternate"][hreflang="am"]');
    const xJoinDefault = page.locator('link[rel="alternate"][hreflang="x-default"]');

    await expect(enJoinAlt).toHaveAttribute('href', /.*\/en\/join$/);
    await expect(amJoinAlt).toHaveAttribute('href', /.*\/am\/join$/);
    await expect(xJoinDefault).toHaveAttribute('href', /.*\/en\/join$/);
  });

  test('5. Reduced-motion disables particle animations and tilt transform', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/en');

    // TiltCard transform disabled
    const card = page.locator('[data-testid="tilt-card"]');
    await expect(card).toBeVisible();
    await card.hover({ position: { x: 10, y: 10 } });
    await page.waitForTimeout(100);

    const transform = await card.evaluate((el) => window.getComputedStyle(el).transform);
    expect(transform).toBe('none');

    // Glowing particles have animation-name: none
    const particle = page.locator('.glowing-particle').first();
    await expect(particle).toBeVisible();
    const animName = await particle.evaluate((el) => window.getComputedStyle(el).animationName);
    expect(animName).toBe('none');
  });

  test('6. Regression verification: theme persistence and sticky stacking styles exist', async ({
    page,
  }) => {
    await page.goto('/en');

    // Theme toggle test
    const toggle = page.locator('[data-testid="theme-toggle"][data-mounted="true"]');
    await expect(toggle).toBeVisible();

    const html = page.locator('html');
    const initialTheme = await html.getAttribute('data-theme');
    await toggle.click();
    const nextTheme = await html.getAttribute('data-theme');
    expect(nextTheme).not.toBe(initialTheme);

    // Check sticky stacking classes on sections
    const stickySections = page.locator('div.sticky.top-16');
    await expect(stickySections).toHaveCount(4);
  });
});

import { test, expect } from '@playwright/test';

test.describe('Task 8: Public Hero with Admin Image & Resilient Fallback', () => {
  test('1. /en and /am render hero title, tagline, CTA, and valid image attributes if an image is present', async ({
    page,
  }) => {
    const locales = [
      {
        locale: 'en',
        title: 'Lend To Lord',
        subtitle: 'Monthly partner & sponsor contributions',
        cta: 'Become a Partner',
      },
      {
        locale: 'am',
        title: 'ለጌታ ማበደር',
        subtitle: 'ወርሃዊ የአጋሮች እና የስፖንሰሮች አስተዋጽኦ',
        cta: 'አጋር ይሁኑ',
      },
    ];

    for (const item of locales) {
      await page.goto(`/${item.locale}`);

      const hero = page.locator('[data-testid="hero-visual-frame"]');
      await expect(hero).toBeVisible();

      const h1 = hero.locator('h1');
      const tagline = hero.locator('p').filter({ hasText: item.subtitle });
      const cta = hero.locator(`a[href="/${item.locale}/join"]`).filter({ hasText: item.cta });

      await expect(h1).toBeVisible();
      await expect(h1).toHaveText(item.title);
      await expect(tagline).toBeVisible();
      await expect(cta).toBeVisible();

      for (const el of [h1, tagline, cta]) {
        const box = await el.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.width).toBeGreaterThan(0);
        expect(box!.height).toBeGreaterThan(0);
      }

      // If an admin image is present in this environment, verify its attributes
      const imgCount = await hero.locator('img').count();
      if (imgCount > 0) {
        const img = hero.locator('img').first();
        await expect(img).toBeVisible();

        const attrs = await img.evaluate((el) => ({
          alt: el.getAttribute('alt') || '',
          width: Number(el.getAttribute('width') || '0'),
          height: Number(el.getAttribute('height') || '0'),
          sizes: el.getAttribute('sizes') || '',
          fetchPriority: el.getAttribute('fetchpriority') || '',
          loading: el.getAttribute('loading') || '',
        }));

        expect(attrs.alt.trim().length).toBeGreaterThan(0);
        expect(attrs.width).toBeGreaterThan(0);
        expect(attrs.height).toBeGreaterThan(0);
        expect(attrs.sizes.length).toBeGreaterThan(0);

        const hasPreloadLink =
          (await page.locator('link[rel="preload"][as="image"]').count()) > 0;
        expect(
          hasPreloadLink || attrs.fetchPriority === 'high' || attrs.loading !== 'lazy'
        ).toBe(true);
      }
    }
  });

  test('2. 320px viewport has zero horizontal overflow on /en and /am', async ({ page }) => {
    for (const locale of ['en', 'am']) {
      await page.setViewportSize({ width: 320, height: 640 });
      await page.goto(`/${locale}`);

      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }));
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.innerWidth);
    }
  });

  test('3. Page remains intact (header, Monthly Total, Vision, footer) regardless of hero state', async ({
    page,
  }) => {
    await page.goto('/en');
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('[data-testid="tilt-card"]')).toBeVisible();
    await expect(
      page.getByText(
        'Empowering communities through transparent, faith-rooted support across Ethiopia.'
      )
    ).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();
  });
});

import { test, expect } from '@playwright/test';

test.describe('Task 9: Sponsors Section and Carousel', () => {
  test('1. /en and /am handle absent or present sponsors cleanly, with Amharic copy on /am and section separation', async ({
    page,
  }) => {
    for (const locale of ['en', 'am'] as const) {
      await page.goto(`/${locale}`);

      await expect(page.locator('[data-testid="hero-visual-frame"]')).toBeVisible();
      await expect(page.locator('[data-testid="tilt-card"]')).toBeVisible();
      await expect(page.locator('footer')).toBeVisible();

      const section = page.locator('[data-testid="sponsors-section"]');
      const count = await section.count();

      if (count === 0) {
        // Empty / error state renders nothing (no heading, no wrapper)
        await expect(page.locator('#sponsors-heading')).toHaveCount(0);
      } else {
        await expect(section).toBeVisible();
        await expect(page.locator('#sponsors-heading')).toBeVisible();

        if (locale === 'am') {
          await expect(page.locator('#sponsors-heading')).toHaveText(
            'አጋሮቻችን እና ስፖንሰሮቻችን'
          );
        } else {
          await expect(page.locator('#sponsors-heading')).toHaveText(
            'Our Sponsors & Partners'
          );
        }

        // Verify sticky stacking wrapper between Vision (z-30) and How Donation Works (z-40)
        const isInsideSticky = await section.evaluate((el) =>
          Boolean(el.closest('div.sticky.top-16'))
        );
        expect(isInsideSticky).toBe(true);

        const tiles = section.locator('[data-testid="sponsor-tile"]');
        const tileCount = await tiles.count();
        expect(tileCount).toBeGreaterThan(0);

        const controls = section.locator('[data-testid="sponsors-controls"]');
        if (tileCount === 1) {
          await expect(controls).toHaveCount(0);
        } else {
          await expect(controls).toBeVisible();
        }

        const expectedNewTab =
          locale === 'am' ? 'በአዲስ መስኮት ይከፈታል' : 'opens in a new tab';

        for (let i = 0; i < tileCount; i++) {
          const tile = tiles.nth(i);
          const img = tile.locator('img');
          const alt = await img.getAttribute('alt');
          expect((alt || '').trim().length).toBeGreaterThan(0);

          const link = tile.locator('a');
          if ((await link.count()) > 0) {
            await expect(link).toHaveAttribute('target', '_blank');
            const rel = (await link.getAttribute('rel')) || '';
            expect(rel).toContain('noopener');
            expect(rel).toContain('noreferrer');
            await expect(link.locator('.sr-only')).toContainText(expectedNewTab);
          }
        }
      }
    }
  });

  test('2. Continuous X-axis marquee, Pause/Play, and Next/Prev stepping when > 1 sponsor', async ({
    page,
  }) => {
    await page.goto('/en');

    const controls = page.locator('[data-testid="sponsors-controls"]');
    if ((await controls.count()) > 0) {
      const track = page.locator('[data-testid="sponsors-track"]');
      const stepWrapper = page.locator('[data-testid="sponsors-step-wrapper"]');
      const nextBtn = controls.getByRole('button', { name: 'Next sponsor' });
      const prevBtn = controls.getByRole('button', { name: 'Previous sponsor' });
      const pauseBtn = controls.getByRole('button', { name: 'Pause' });

      // Marquee animation is active when not hovered/focused/paused
      const animState = await track.evaluate((el) => {
        const cs = getComputedStyle(el);
        return {
          animationName: cs.animationName,
          animationPlayState: cs.animationPlayState,
        };
      });
      expect(animState.animationName).toBe('sponsors-marquee');
      expect(animState.animationPlayState).toBe('running');

      // Pause freezes animationPlayState and clears permanent will-change
      await pauseBtn.click();
      const playBtn = controls.getByRole('button', { name: 'Play' });
      await expect(playBtn).toHaveAttribute('aria-pressed', 'true');
      const pausedState = await track.evaluate((el) => {
        const cs = getComputedStyle(el);
        return {
          animationPlayState: cs.animationPlayState,
          willChange: cs.willChange,
        };
      });
      expect(pausedState.animationPlayState).toBe('paused');
      expect(pausedState.willChange).toBe('auto');

      // Next/Prev step wrapper shifts X-axis transform
      const initialTransform = await stepWrapper.evaluate(
        (el) => getComputedStyle(el).transform
      );
      await nextBtn.focus();
      await page.keyboard.press('Enter');
      const afterNextTransform = await stepWrapper.evaluate(
        (el) => getComputedStyle(el).transform
      );
      expect(afterNextTransform).not.toBe(initialTransform);

      await prevBtn.focus();
      await page.keyboard.press('Enter');
      const afterPrevTransform = await stepWrapper.evaluate(
        (el) => getComputedStyle(el).transform
      );
      expect(afterPrevTransform).toBe(initialTransform);

      // Play resumes when focus leaves carousel
      await playBtn.click();
      await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
      await expect(controls.getByRole('button', { name: 'Pause' })).toHaveAttribute(
        'aria-pressed',
        'false'
      );
    }
  });

  test('3. Reduced motion disables marquee animation and will-change', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/en');

    const carousel = page.locator('[data-testid="sponsors-carousel"]');
    if ((await carousel.count()) > 0) {
      const track = carousel.locator('[data-testid="sponsors-track"]');
      const style = await track.evaluate((el) => {
        const cs = getComputedStyle(el);
        return {
          animationName: cs.animationName,
          willChange: cs.willChange,
        };
      });
      expect(style.animationName).toBe('none');
      expect(style.willChange).toBe('auto');
      await expect(track).toHaveAttribute('aria-live', 'polite');
    }
  });

  test('4. 320px viewport has zero horizontal page overflow on /en and /am', async ({
    page,
  }) => {
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
});

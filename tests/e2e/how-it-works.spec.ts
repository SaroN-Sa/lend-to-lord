import { test, expect } from '@playwright/test';

test.describe('Task 10: How Donation Works Section & Particle Flow', () => {
  test('1. /en and /am render semantic <ol> of 4 steps with numbers 1-4 and locale copy', async ({
    page,
  }) => {
    for (const locale of ['en', 'am'] as const) {
      await page.goto(`/${locale}`);
      const section = page.locator('[data-testid="how-it-works-section"]');
      await expect(section).toBeVisible();

      const heading = page.locator('#how-it-works-heading');
      if (locale === 'am') {
        await expect(heading).toHaveText('አስተዋጽኦ እንዴት ይሰራል?');
      } else {
        await expect(heading).toHaveText('How Donation Works');
      }

      const items = section.locator('ol > li');
      await expect(items).toHaveCount(4);

      for (let i = 1; i <= 4; i++) {
        await expect(page.locator(`[data-testid="how-step-${i}"]`)).toContainText(
          String(i)
        );
      }
    }
  });

  test('2. Step sequence, cycle repeat (12s), dot clipping, and <= 24 animations via Web Animations API', async ({
    page,
  }) => {
    await page.goto('/en');
    const section = page.locator('[data-testid="how-it-works-section"]');
    await section.scrollIntoViewIfNeeded();
    await expect(
      page.locator('[data-testid="how-it-works-visibility"]')
    ).toHaveAttribute('data-in-view', 'true');

    // Verify running animations count <= 24
    const animCount = await section.evaluate((el) => {
      return document
        .getAnimations()
        .filter((a) => {
          const target = (a.effect as KeyframeEffect | null)?.target;
          return target instanceof Element && el.contains(target);
        }).length;
    });
    expect(animCount).toBeGreaterThan(0);
    expect(animCount).toBeLessThanOrEqual(24);

    // Pause all section animations and scrub currentTime deterministically
    // Step windows (12s cycle): step 1 = 0..3s, step 2 = 3..6s, step 3 = 6..9s, step 4 = 9..12s
    const midTimesMs = [1000, 4000, 7000, 10000];
    for (let activeIdx = 0; activeIdx < 4; activeIdx++) {
      const targetTime = midTimesMs[activeIdx];
      await section.evaluate((el, timeMs) => {
        const anims = document.getAnimations().filter((a) => {
          const target = (a.effect as KeyframeEffect | null)?.target;
          return target instanceof Element && el.contains(target);
        });
        for (const anim of anims) {
          anim.pause();
          anim.currentTime = timeMs;
        }
      }, targetTime);

      for (let s = 1; s <= 4; s++) {
        const opacity = await page
          .locator(`[data-testid="how-step-overlay-${s}"]`)
          .evaluate((el) => Number(getComputedStyle(el).opacity));
        if (s === activeIdx + 1) {
          expect(opacity).toBeGreaterThan(0.8);
        } else {
          expect(opacity).toBeLessThan(0.1);
        }
      }

      // Assert no in-card dot intersects step h3 or p bounding boxes
      const intersectionCount = await section.evaluate((el) => {
        let overlaps = 0;
        for (let s = 1; s <= 4; s++) {
          const card = el.querySelector(`[data-testid="how-step-${s}"]`);
          if (!card) continue;
          const titleRect = card.querySelector('h3')?.getBoundingClientRect();
          const descRect = card.querySelector('p')?.getBoundingClientRect();
          const dots = card.querySelectorAll('.hiw-in-card-dot');
          for (const dot of dots) {
            const d = dot.getBoundingClientRect();
            for (const textRect of [titleRect, descRect]) {
              if (!textRect) continue;
              const intersects = !(
                d.right <= textRect.left ||
                d.left >= textRect.right ||
                d.bottom <= textRect.top ||
                d.top >= textRect.bottom
              );
              if (intersects) overlaps++;
            }
          }
        }
        return overlaps;
      });
      expect(intersectionCount).toBe(0);
    }

    // Verify cycle repeats at 4 * STEP_DURATION (12s + 1s = 13000ms -> step 1 active)
    await section.evaluate((el) => {
      const anims = document.getAnimations().filter((a) => {
        const target = (a.effect as KeyframeEffect | null)?.target;
        return target instanceof Element && el.contains(target);
      });
      for (const anim of anims) {
        anim.pause();
        anim.currentTime = 13000;
      }
    });
    const step1RepeatOpacity = await page
      .locator('[data-testid="how-step-overlay-1"]')
      .evaluate((el) => Number(getComputedStyle(el).opacity));
    expect(step1RepeatOpacity).toBeGreaterThan(0.8);
  });

  test('3. All particles are aria-hidden="true" with no tabindex and zero backdrop-filter', async ({
    page,
  }) => {
    await page.goto('/en');
    const section = page.locator('[data-testid="how-it-works-section"]');

    const particleChecks = await section.evaluate((el) => {
      const particles = el.querySelectorAll('.hiw-in-card-dot, .hiw-connector-dot');
      const issues: string[] = [];
      for (const p of particles) {
        if (p.getAttribute('aria-hidden') !== 'true') {
          issues.push('missing aria-hidden');
        }
        if (p.hasAttribute('tabindex')) {
          issues.push('has tabindex');
        }
      }

      const nodesToCheck = [el, ...Array.from(el.querySelectorAll('*'))];
      for (const node of nodesToCheck) {
        const cs = getComputedStyle(node);
        if (cs.backdropFilter && cs.backdropFilter !== 'none') {
          issues.push(`backdropFilter: ${cs.backdropFilter}`);
        }
      }
      return { count: particles.length, issues };
    });

    expect(particleChecks.count).toBe(11); // 8 in-card + 3 connector
    expect(particleChecks.issues).toEqual([]);
  });

  test('4. Reduced motion disables animations and shows all 4 steps equally', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/en');

    const section = page.locator('[data-testid="how-it-works-section"]');
    await section.scrollIntoViewIfNeeded();

    const states = await section.evaluate((el) => {
      const targets = el.querySelectorAll(
        '.hiw-step-card, .hiw-step-overlay, .hiw-badge-fill, .hiw-in-card-dot, .hiw-connector-dot'
      );
      return Array.from(targets).map((node) => {
        const cs = getComputedStyle(node);
        return {
          animationName: cs.animationName,
          opacity: cs.opacity,
          isOverlay: node.classList.contains('hiw-step-overlay'),
        };
      });
    });

    expect(states.length).toBeGreaterThan(0);
    for (const s of states) {
      expect(s.animationName).toBe('none');
      if (s.isOverlay) {
        expect(s.opacity).toBe('0');
      }
    }
  });

  test('5. IntersectionObserver pauses animations off-screen and runs when visible', async ({
    page,
  }) => {
    await page.goto('/en');
    const visibility = page.locator('[data-testid="how-it-works-visibility"]');
    const step1 = page.locator('[data-testid="how-step-1"]');

    // At top of page (Hero), HowItWorks is below the fold -> paused
    await expect(visibility).toHaveAttribute('data-in-view', 'false');
    await expect(step1).toHaveCSS('animation-play-state', 'paused');

    // Scroll into view -> running
    await visibility.scrollIntoViewIfNeeded();
    await expect(visibility).toHaveAttribute('data-in-view', 'true');
    await expect(step1).toHaveCSS('animation-play-state', 'running');

    // Scroll back to top -> paused again
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(visibility).toHaveAttribute('data-in-view', 'false');
    await expect(step1).toHaveCSS('animation-play-state', 'paused');
  });

  test('6. 320px viewport has zero horizontal overflow and zero overlapping step text on /en and /am', async ({
    page,
  }) => {
    for (const locale of ['en', 'am'] as const) {
      await page.setViewportSize({ width: 320, height: 640 });
      await page.goto(`/${locale}`);

      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }));
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.innerWidth);

      const textOverlaps = await page
        .locator('[data-testid="how-it-works-section"]')
        .evaluate((el) => {
          const textBoxes = Array.from(el.querySelectorAll('h3, p')).map((n) =>
            n.getBoundingClientRect()
          );
          let overlaps = 0;
          for (let i = 0; i < textBoxes.length; i++) {
            for (let j = i + 1; j < textBoxes.length; j++) {
              const a = textBoxes[i];
              const b = textBoxes[j];
              const hit = !(
                a.right <= b.left ||
                a.left >= b.right ||
                a.bottom <= b.top ||
                a.top >= b.bottom
              );
              if (hit) overlaps++;
            }
          }
          return overlaps;
        });
      expect(textOverlaps).toBe(0);
    }
  });

  test('7. Sticky rule: non-sticky on mobile/short screens; sticky and <= (vh - 4rem) at 1280x720 and 1024x720 on /en and /am', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto('/en');
    const wrapper = page.locator('[data-testid="how-it-works-sticky"]');
    await expect(wrapper).toHaveCSS('position', 'relative');

    await page.setViewportSize({ width: 1024, height: 500 });
    await page.goto('/en');
    await expect(wrapper).toHaveCSS('position', 'relative');

    for (const viewport of [
      { width: 1280, height: 720 },
      { width: 1024, height: 720 },
    ]) {
      for (const locale of ['en', 'am'] as const) {
        await page.setViewportSize(viewport);
        await page.goto(`/${locale}`);
        await expect(wrapper).toHaveCSS('position', 'sticky');
        const box = await wrapper.boundingBox();
        expect(box).toBeTruthy();
        if (box) {
          expect(box.height).toBeLessThanOrEqual(viewport.height - 64 + 1);
        }
      }
    }
  });
});

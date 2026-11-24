import { test, expect } from '@playwright/test';

test.describe('Task 2: Ethiopic Font Scoping & Typography', () => {
  test('1. /am renders with Ethiopic CSS variable, Latin-first font stack, and line-height ratio in [1.6, 1.7]', async ({
    page,
  }) => {
    await page.goto('/am');

    // Confirm <html lang="am"> has --font-ethiopic defined on documentElement
    const ethiopicVar = await page.evaluate(() => {
      return getComputedStyle(document.documentElement)
        .getPropertyValue('--font-ethiopic')
        .trim();
    });
    expect(ethiopicVar).toBeTruthy();

    // Confirm computed font-family on body lists Latin font before Ethiopic font
    const computedFontFamily = await page.evaluate(() => {
      return getComputedStyle(document.body).fontFamily;
    });

    // Check that Latin font (Plus Jakarta Sans) appears before Ethiopic font in the stack
    const latinPos = computedFontFamily.indexOf('Jakarta');
    const ethiopicPos = computedFontFamily.indexOf('Ethiopic');
    expect(latinPos).toBeGreaterThanOrEqual(0);
    expect(ethiopicPos).toBeGreaterThan(latinPos);

    // Confirm computed line-height ratio on body is between 1.6 and 1.7
    const ratio = await page.evaluate(() => {
      const style = getComputedStyle(document.body);
      return parseFloat(style.lineHeight) / parseFloat(style.fontSize);
    });
    expect(ratio).toBeGreaterThanOrEqual(1.6);
    expect(ratio).toBeLessThanOrEqual(1.7);
  });

  test('2. /en has empty --font-ethiopic, no loaded Noto Sans Ethiopic face, no Ethiopic preloads, and fewer font requests than /am', async ({
    browser,
  }) => {
    // Collect font requests on /am in a fresh context
    const amContext = await browser.newContext();
    const amPage = await amContext.newPage();
    const amFontRequests: string[] = [];
    amPage.on('request', (req) => {
      if (req.url().includes('.woff2') || req.resourceType() === 'font') {
        amFontRequests.push(req.url());
      }
    });
    await amPage.goto('/am');
    await amPage.evaluate(() => document.fonts.ready);
    await amContext.close();

    // Collect font requests on /en in a fresh context
    const enContext = await browser.newContext();
    const enPage = await enContext.newPage();
    const enFontRequests: string[] = [];
    enPage.on('request', (req) => {
      if (req.url().includes('.woff2') || req.resourceType() === 'font') {
        enFontRequests.push(req.url());
      }
    });
    await enPage.goto('/en');
    await enPage.evaluate(() => document.fonts.ready);

    // Confirm getComputedStyle(document.documentElement).getPropertyValue('--font-ethiopic').trim() is empty
    const enEthiopicVar = await enPage.evaluate(() => {
      return getComputedStyle(document.documentElement)
        .getPropertyValue('--font-ethiopic')
        .trim();
    });
    expect(enEthiopicVar).toBe('');

    // Confirm document.fonts has no loaded Noto Sans Ethiopic face on /en
    const hasEthiopicLoadedOnEn = await enPage.evaluate(() => {
      let loaded = false;
      document.fonts.forEach((font) => {
        if (
          font.family.toLowerCase().includes('ethiopic') &&
          font.status === 'loaded'
        ) {
          loaded = true;
        }
      });
      return loaded;
    });
    expect(hasEthiopicLoadedOnEn).toBe(false);

    // Confirm no Ethiopic preload links exist on /en
    const preloadEthiopicCount = await enPage
      .locator('link[rel="preload"][as="font"]')
      .evaluateAll((links) => {
        return links.filter((link) => {
          const href = (link.getAttribute('href') || '').toLowerCase();
          return href.includes('ethiopic');
        }).length;
      });
    expect(preloadEthiopicCount).toBe(0);

    // Confirm /en triggers strictly fewer .woff2 font requests than /am
    expect(enFontRequests.length).toBeLessThan(amFontRequests.length);

    await enContext.close();
  });
});

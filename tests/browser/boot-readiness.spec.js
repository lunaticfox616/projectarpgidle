const {test, expect} = require('@playwright/test');

test('an early resize waits for deferred combat dependencies before drawing', async ({page}) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://**', route => route.fulfill({status:204, body:''}));
    let release;
    const ready = new Promise(resolve => { release = resolve; });
    await page.route('**/js/talent-cards.js?*', async route => { await ready; await route.continue(); });
    const navigation = page.goto('/');
    try {
        await page.waitForFunction(() => typeof scheduleStableResize === 'function');
        await page.evaluate(() => scheduleStableResize());
        // Deliberately allow both animation frames while the dependency is still in flight.
        await page.waitForTimeout(250);
    } finally { release(); }
    await navigation;
    await page.locator('#btn-startup-guest').click();
    await page.locator('#loop-hero-select-overlay [data-class-id="warrior"]').click();
    await page.waitForFunction(() => battleAssets.ready && !uiRefreshRunning && !uiRefreshQueued);
    await expect(page.locator('#battlefield-canvas')).toBeVisible();
    expect(await page.locator('#battlefield-canvas').evaluate(canvas => canvas.width > 0 && canvas.height > 0)).toBe(true);
    expect(errors).toEqual([]);
});

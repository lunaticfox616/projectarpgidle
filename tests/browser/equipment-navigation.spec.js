const { test, expect } = require('@playwright/test');

test('equipment destinations stay reachable without horizontal navigation on phones', async ({ page }, info) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://**', route => route.fulfill({ status: 204, body: '' }));
    await page.goto('/');
    await page.locator('#btn-startup-guest').click();
    await page.locator('[data-class-id="warrior"]').click();
    await page.waitForFunction(() => battleAssets.ready && !uiRefreshRunning && !uiRefreshQueued);
    await page.evaluate(() => {
        clearInterval(gameTickHandle);
        game.season = 50;
        contentProgression.sync();
        game.contentProgression.inherited = CONTENT_UNLOCK_CATALOG.map(row => row.id);
        contentProgression.sync();
        openTabPane('tab-items');
        updateStaticUI();
    });
    await page.waitForFunction(() => {
        if (uiRefreshRunning || uiRefreshQueued) return false;
        tutorialQueue.length = 0;
        if (activeTutorial) dismissTutorial(false);
        return true;
    });
    const nav = page.locator('#tab-items > .subtab-row');
    if (info.project.use.isMobile) {
        for (const width of [360, 412, 768]) {
            await page.setViewportSize({ width, height: 915 });
            await expect.poll(() => nav.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
            for (const button of await nav.locator('button:visible').all()) {
                const box = await button.boundingBox();
                expect(box.x).toBeGreaterThanOrEqual(0);
                expect(box.x + box.width).toBeLessThanOrEqual(width);
                expect(box.height).toBeGreaterThanOrEqual(44);
            }
        }
    }
    for (const name of ['market', 'hall', 'craft', 'equip']) {
        await page.locator('#btn-item-tab-' + name).click();
        await expect(page.locator('#item-tab-' + name)).toBeVisible();
        await expect(page.locator('#btn-item-tab-' + name)).toHaveClass(/active/);
    }
    expect(errors).toEqual([]);
});

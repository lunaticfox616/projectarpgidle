const { test, expect } = require('@playwright/test');

test('discovered map persists and an earned early loop remains actionable after loading', async ({ page }, info) => {
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.route('https://**', route => route.fulfill({ status: 204, body: '' }));
    await page.goto('/'); await page.locator('#btn-startup-guest').click();
    await page.locator('[data-class-id="warrior"]').click();
    await page.waitForFunction(() => battleAssets.ready && !uiRefreshRunning && !uiRefreshQueued);
    await page.evaluate(() => {
        clearInterval(gameTickHandle); gameTickHandle = null;
        tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false);
        game.maxZoneId = 1; checkUnlocks(); updateStaticUI();
    });
    await page.waitForFunction(() => {
        if (uiRefreshRunning || uiRefreshQueued) return false;
        tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false); return true;
    });
    const map = page.locator('#btn-tab-map');
    await expect(map).toBeVisible(); await map.click();
    await expect(page.locator('#tab-map')).toBeVisible();
    await page.evaluate(() => {
        game = mergeDefaults(JSON.parse(JSON.stringify(game))); checkUnlocks(); updateStaticUI();
    });
    await page.waitForFunction(() => !uiRefreshRunning && !uiRefreshQueued);
    await expect(map).toBeVisible(); await expect(page.locator('#tab-map')).toBeVisible();
    await page.evaluate(() => {
        game.abyssClearedDepths = [getSeasonAbyssDepthCap(game.season)];
        game.pendingLoopReady = false; game.pendingLoopDecision = false;
        game = mergeDefaults(JSON.parse(JSON.stringify(game)));
        switchTab('tab-battle'); updateStaticUI();
    });
    const organize = page.locator('#btn-close-all-windows');
    if (await organize.isVisible()) await organize.click();
    const advance = page.locator('#btn-combat-loop-advance');
    await expect(advance).toBeVisible(); await expect(advance).toBeInViewport();
    await page.screenshot({ path: info.outputPath('loop-recovered.png'), scale: 'css' });
    await advance.click(); await page.locator('#game-dialog-cancel').click();
    expect(await page.evaluate(() => game.season)).toBe(1);
    await expect(advance).toBeVisible();
    await advance.click(); await page.locator('#game-dialog-confirm').click();
    await expect.poll(() => page.evaluate(() => game.season)).toBe(2);
    await page.locator('#loop-hero-select-overlay [data-class-id="warrior"]').click();
    await page.waitForFunction(() => !uiRefreshRunning && !uiRefreshQueued);
    await expect(map).toBeVisible(); await expect(advance).toBeHidden();
    expect(await page.evaluate(() => [game.seasonPoints, game.abyssClearedDepths])).toEqual([1, []]);
    expect(errors).toEqual([]);
});

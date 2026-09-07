const { test, expect } = require('@playwright/test');

test('mobile growth switches sections, invests once and preserves the open workbench', async ({ page }, info) => {
    test.skip(!info.project.use.isMobile, 'Mobile growth layout');
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://**', route => route.fulfill({ status: 204, body: '' }));
    await page.goto('/');
    await page.locator('#btn-startup-guest').tap();
    await page.locator('[data-class-id="warrior"]').tap();
    await page.waitForFunction(() => battleAssets.ready && !uiRefreshRunning && !uiRefreshQueued);
    await page.evaluate(() => {
        clearInterval(gameTickHandle); gameTickHandle = null;
        game.season = 10; game.level = 100;
        game.contentProgression.inherited = CONTENT_UNLOCK_CATALOG.map(row => row.id);
        contentProgression.sync();
        game.seasonPoints = 5; game.seasonNodes = []; game.seasonNodeLevels = {};
        game.loopDeepPoints = 10; game.loopDeepStats = {};
        switchTab('tab-season'); updateStaticUI();
    });
    await page.waitForFunction(() => {
        if (uiRefreshRunning || uiRefreshQueued) return false;
        tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false);
        return true;
    });
    const navigation = page.locator('#tab-season .mobile-section-navigation');
    await expect(navigation).toBeVisible();
    const root = page.locator('.loop-passive-node.origin-node');
    await expect(root.locator('.loop-node-tooltip')).toBeVisible();
    await root.tap();
    await expect.poll(() => page.evaluate(() => game.seasonPoints)).toBe(4);
    expect(await page.evaluate(() => getSeasonNodeLevel('s_root'))).toBe(1);
    await navigation.getByRole('tab', { name: '심화 성장' }).tap();
    await expect(page.locator('#trait-season-section')).toBeHidden();
    await page.locator('#loop-deep-growth > summary').tap();
    const cost = await page.evaluate(() => getLoopDeepStatCost('flatHp'));
    await page.locator('#loop-deep-growth button').first().tap();
    await expect.poll(() => page.evaluate(() => game.loopDeepStats.flatHp)).toBe(1);
    expect(await page.evaluate(() => game.loopDeepPoints)).toBe(10 - cost);
    await expect(page.locator('#loop-deep-growth')).toHaveAttribute('open', '');
    // Milestones belong to the unlock atlas; the retired roadmap must stay hidden.
    await expect(navigation.getByRole('tab', { name: '이정표' })).toHaveCount(0);
    await expect(page.locator('#season-content-section')).toBeHidden();
    await navigation.getByRole('tab', { name: '원환 패시브' }).tap();
    await page.evaluate(() => {
        game.contentProgression.inherited = game.contentProgression.inherited.filter(id => id !== 'loopTree');
        contentProgression.sync(); updateStaticUI();
    });
    await expect(navigation.getByRole('tab', { name: '원환 패시브' })).toBeHidden();
    await expect(page.locator('#trait-season-section')).toBeHidden();
    expect(errors).toEqual([]);
});

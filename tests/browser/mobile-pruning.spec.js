const { test, expect } = require('@playwright/test');

test('pruning offers connected mobile branches with unchanged growth and burden costs', async ({ page }, info) => {
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.route('https://**', route => route.fulfill({ status: 204, body: '' }));
    await page.goto('/'); await page.locator('#btn-startup-guest').click();
    await page.locator('[data-class-id="warrior"]').click();
    await page.waitForFunction(() => battleAssets.ready && !uiRefreshRunning && !uiRefreshQueued);
    await page.evaluate(() => {
        clearInterval(gameTickHandle); gameTickHandle = null; game.season = 100;
        game.contentProgression.inherited = CONTENT_UNLOCK_CATALOG.map(row => row.id); contentProgression.sync();
        advancePruningTreeForLoop(game); game.pruningTree.growthPoints = 20; game.currencies.blightSpore = 20;
        openTabPane('tab-pruning'); updateStaticUI();
    });
    await page.waitForFunction(() => {
        if (uiRefreshRunning || uiRefreshQueued) return false;
        tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false); return true;
    });
    if (!info.project.use.isMobile) {
        await expect(page.locator('.pruning-tree')).toBeVisible();
        await expect(page.locator('.pruning-node')).toHaveCount(29);
        expect(errors).toEqual([]); return;
    }
    const select = page.locator('.pruning-mobile-workspace select');
    await expect(select).toBeVisible();
    await expect(page.locator('.pruning-tree')).toHaveCount(0);
    await select.selectOption('deep_root');
    const grow = page.getByRole('button', { name: /부담을 안고 성장/ });
    await expect(grow).toBeDisabled();
    await page.locator('.pruning-parent-path button').click();
    await expect(select).toHaveValue('first_ring');
    for (let rank = 1; rank <= 3; rank++) {
        await grow.tap();
        await expect.poll(() => page.evaluate(() => game.pruningTree.nodeRanks.first_ring)).toBe(rank);
    }
    expect(await page.evaluate(() => game.pruningTree.growthPoints)).toBe(17);
    await page.getByRole('button', { name: /^부담 가지치기/ }).tap();
    expect(await page.evaluate(() => getPruningNodeActivePenaltyRank('first_ring', game.pruningTree))).toBe(2);
    expect(await page.evaluate(() => game.pruningTree.growthPoints)).toBe(16);
    await page.locator('.pruning-next-branch').filter({ hasText: '깊은 뿌리' }).tap();
    await expect(select).toHaveValue('deep_root');
    await grow.tap();
    expect(await page.evaluate(() => game.pruningTree.nodeRanks.deep_root)).toBe(1);
    await page.locator('.pruning-parent-path button').tap();
    await page.getByRole('button', { name: /^성장 1단계 반환/ }).tap();
    await page.locator('#game-dialog-confirm').tap();
    await expect.poll(() => page.evaluate(() => game.pruningTree.nodeRanks.first_ring)).toBe(2);
    expect(await page.evaluate(() => game.pruningTree.nodeRanks.deep_root || 0)).toBe(0);
    expect(await page.evaluate(() => game.pruningTree.growthPoints)).toBe(17);
    expect(await page.evaluate(() => game.currencies.blightSpore)).toBe(18);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    expect(errors).toEqual([]);
});

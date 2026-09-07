const { test, expect } = require('@playwright/test');

test('hidden management stays idle while stock progresses and opened panels render current state', async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://**', route => route.fulfill({ status: 204, body: '' }));
    await page.goto('/');
    await page.locator('#btn-startup-guest').click();
    await page.locator('[data-class-id="warrior"]').click();
    await page.waitForFunction(() => battleAssets.ready && !uiRefreshRunning && !uiRefreshQueued);
    await page.evaluate(() => {
        clearInterval(gameTickHandle); gameTickHandle = null;
        game.season = 100; game.level = 100;
        game.contentProgression.inherited = CONTENT_UNLOCK_CATALOG.map(row => row.id);
        contentProgression.sync();
        switchTab('tab-battle'); updateStaticUI();
    });
    await page.waitForFunction(() => !uiRefreshRunning && !uiRefreshQueued);
    const sample = await page.evaluate(() => {
        tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false);
        const stock = normalizeBlackMarketState();
        stock.nextRefreshAt = 0;
        const observer = new MutationObserver(() => {});
        for (const id of ['ui-flask-panel', 'ui-market-panel', 'ui-expert-subtabs', 'ui-expert-tree']) {
            observer.observe(document.getElementById(id), { childList: true, subtree: true, attributes: true });
        }
        performUpdateStaticUI();
        const mutations = observer.takeRecords().length;
        observer.disconnect();
        return { mutations, refreshed: stock.nextRefreshAt > Date.now(), offers: stock.offers.length };
    });
    expect(sample.mutations).toBe(0);
    expect(sample.refreshed).toBe(true);
    expect(sample.offers).toBeGreaterThan(0);
    await page.evaluate(() => switchTab('tab-items'));
    await page.waitForFunction(() => !uiRefreshRunning && !uiRefreshQueued);
    await page.locator('#btn-item-tab-market').click();
    await expect(page.locator('#ui-market-panel')).toBeVisible();
    await expect(page.locator('[data-market-section="exchange"]')).toHaveAttribute('aria-selected', 'true');
    await page.evaluate(() => openTabPane('tab-flask'));
    await expect(page.locator('#ui-flask-panel')).not.toBeEmpty();
    await page.evaluate(() => switchTab('tab-expertise'));
    await expect(page.locator('#ui-expert-subtabs button')).not.toHaveCount(0);
    expect(errors).toEqual([]);
});

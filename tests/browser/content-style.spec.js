const { test, expect } = require('@playwright/test');

for (const theme of ['dark', 'light']) test(`content workspaces remain readable and contained in ${theme}`, async ({ page }, testInfo) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://**', route => route.fulfill({ status: 204, body: '' }));
    await page.goto('/');
    await page.locator('#btn-startup-guest').click();
    await page.locator('#loop-hero-select-overlay [data-class-id="warrior"]').click();
    await page.waitForFunction(() => battleAssets.ready && !uiRefreshRunning && !uiRefreshQueued);
    await page.evaluate(theme => applyThemeMode(theme), theme);
    await page.evaluate(() => {
        clearInterval(gameTickHandle); gameTickHandle = null;
        game.level = 200; game.season = 20; game.maxZoneId = 10;
        contentProgression.sync();
        contentProgression.purchase('craft');contentProgression.purchase('flask');
        Object.keys(game.unlocks).forEach(key => { game.unlocks[key] = true; });
        Object.keys(game.currencies).forEach(key => { game.currencies[key] = 100; });
        game.journalEntries = ['act_5', 'woodsman'];
        game.inventory = [createItemFromBase(BASE_ITEM_DB.find(row => row.id === 'war_helm'), 'rare', 10)];
        game.settings.autoEquipEmptySlots = false;
        tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false);
    });
    for (const target of ['craft', 'market', 'flask', 'journal']) {
        const selector = ['craft', 'market'].includes(target) ? '#item-tab-' + target : '#tab-' + target;
        await page.evaluate(target => {
            tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false);
            if (['craft', 'market'].includes(target)) {
                if (target === 'craft') switchTab('tab-items');
                switchItemSubtab('item-tab-' + target);
                if (target === 'craft') selectForCrafting(game.inventory[0].id, false);
            } else switchMergedTabSubtab(target === 'flask' ? 'utility' : 'records', 'tab-' + target);
            updateStaticUI();
        }, target);
        await page.waitForFunction(() => {
            if (uiRefreshRunning || uiRefreshQueued) return false;
            tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false);
            return true;
        });
        await expect(page.locator(selector)).toBeVisible();
        const overflow = await page.locator(selector).evaluate(el => el.scrollWidth - el.clientWidth);
        expect(overflow).toBeLessThanOrEqual(1);
        await verifyWorkspaceActions(page, target);
        await page.screenshot({ path: testInfo.outputPath(target + '.png'), animations: 'disabled' });
    }
    expect(errors).toEqual([]);
});
async function verifyWorkspaceActions(page, target) {
    if (target === 'craft') {
        await expect(page.locator('.craft-target-library')).not.toHaveAttribute('open');
        await page.evaluate(() => useCurrency('rootIron'));
        await expect(page.locator('.craft-result-ledger')).toContainText('품질 0% → 1%');
        await page.locator('[data-repeat-craft="rootIron"]').click();
        await expect.poll(() => page.evaluate(() => getSelectedCraftItem().quality)).toBe(2);
        await page.locator('.craft-target-library > summary').click();
        await expect(page.locator('#ui-craft-inventory-list')).toBeVisible();
        await page.locator('.craft-target-library > summary').click();
    }
    if (target === 'market') {
        await page.locator('[data-market-exchange-once]').click();
        await expect.poll(() => page.evaluate(() => game.currencies.magicBud)).toBe(92);
        await expect.poll(() => page.evaluate(() => game.currencies.formlessDew)).toBe(101);
        await page.waitForFunction(() => {
            if (uiRefreshRunning || uiRefreshQueued) return false;
            tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false);
            return true;
        });
        for (const kind of ['black', 'services']) {
            const section = page.locator('.market-section-' + kind);
            await section.locator('summary').click();
            await page.evaluate(() => renderMarketUI());
            await expect(section).toHaveAttribute('open');
            await section.locator('summary').click();
        }
    }
    if (target === 'flask') {
        await expect(page.locator('#ui-flask-panel')).toBeVisible();
        await page.locator('.flask-slot-box.heal .flask-slot-select').click();
        await expect(page.locator('#flask-picker-overlay')).toBeVisible();
        await page.locator('#flask-picker-overlay').getByRole('button', { name: '닫기', exact: true }).click();
    }
}

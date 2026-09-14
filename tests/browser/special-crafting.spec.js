const { test, expect } = require('@playwright/test');
const {currencyUse}=require('./crafting-helpers');

test('fused and corrupted equipment expose only usable currencies and spend on valid use', async ({ page }, info) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://**', route => route.fulfill({ status: 204, body: '' }));
    await page.goto('/');
    await page.locator('#btn-startup-guest').click();
    await page.locator('[data-class-id="warrior"]').click();
    await page.waitForFunction(() => battleAssets.ready && !uiRefreshRunning && !uiRefreshQueued);
    await page.evaluate(() => {
        clearInterval(gameTickHandle); gameTickHandle = null;
        game.season = 100; game.contentProgression.inherited = CONTENT_UNLOCK_CATALOG.map(row => row.id);
        contentProgression.sync();
        game.inventory = [createItemFromBase(BASE_ITEM_DB.find(row => row.id === 'war_helm'), 'rare', 5)];
        game.inventory[0].fusedRelic = true;
        Object.assign(game.currencies, { goldenRule: 2, emberBranch: 3, blessing: 2, formlessDew: 2 });
        openTabPane('tab-items'); switchItemSubtab('item-tab-craft');
        selectForCrafting(game.inventory[0].id, false); updateStaticUI();
    });
    await settle(page);
    const golden = await currencyUse(page, 'goldenRule');
    await expect(golden).toBeEnabled(); await golden.click();
    await expect.poll(() => page.evaluate(() => game.currencies.goldenRule)).toBe(1);
    await settle(page);
    await expect(await currencyUse(page, 'formlessDew')).toBeDisabled();
    const ember = await currencyUse(page, 'emberBranch');
    await expect(ember).toBeEnabled(); await ember.click();
    await expect.poll(() => page.evaluate(() => game.inventory[0].corrupted)).toBe(true);
    expect(await page.evaluate(() => game.currencies.emberBranch)).toBe(2);
    await settle(page);
    await expect(await currencyUse(page, 'goldenRule')).toBeDisabled();
    await expect(await currencyUse(page, 'emberBranch')).toBeDisabled();
    await page.evaluate(() => {
        Object.assign(game.inventory[0], { slot: '방패', rarity: 'unique', uniqueEffectKey: 'kaleidoscopeShield' });
        game.inventory[0].stats = [{ id: 'flatHp', statName: '최대 생명력', val: 10, tier: 1 }];
        updateStaticUI();
    });
    await settle(page);
    const repeat = await currencyUse(page, 'emberBranch');
    await expect(repeat).toBeEnabled(); await repeat.click();
    await expect.poll(() => page.evaluate(() => game.currencies.emberBranch)).toBe(1);
    expect(await page.evaluate(() => game.currencies.formlessDew)).toBe(2);
    expect(errors).toEqual([]);
});

async function settle(page) {
    await page.waitForFunction(() => {
        if (uiRefreshRunning || uiRefreshQueued) return false;
        tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false);
        return true;
    });
}

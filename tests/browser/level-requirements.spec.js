const { test, expect } = require('@playwright/test');

test('requirements identify the usable glove slot and equip it in the real game', async ({ page }, info) => {
    const failures = [];
    page.on('pageerror', error => failures.push(error.message));
    await page.route('https://**', route => route.fulfill({ status: 204, contentType: 'text/javascript', body: '' }));
    await page.goto('/');
    await page.locator('#btn-startup-guest').click();
    await expect(page.locator('#startup-overlay')).not.toHaveClass(/active/, { timeout: 30000 });
    if (await page.evaluate(() => !game.heroSelectionInitialized)) {
        await page.locator('#loop-hero-select-overlay [data-class-id]').first().click();
    }
    const candidateId = await page.evaluate(() => {
        clearInterval(gameTickHandle); gameTickHandle = null; game.combatHalted = true;
        game.level = 100; game.actRewardBonuses = [{ stat: 'strength', value: 6 }, { stat: 'intelligence', value: 50 }];
        const bases = BASE_ITEM_DB.filter(base => base.slot === '장갑' && base.baseStats.some(stat => stat.id === 'armor'));
        const low = bases.find(base => base.reqTier <= 2), high = bases.find(base => base.reqTier >= 7 && base.reqTier <= 10);
        const left = createItemFromBase(low, 'normal', 1), right = createItemFromBase(low, 'normal', 1);
        const candidate = createItemFromBase(high, 'normal', 10);
        left.stats = [{ id: 'strength', val: 30 }];
        game.equipment['장갑1'] = left; game.equipment['장갑2'] = right; game.inventory = [candidate];
        switchTab('tab-items'); switchItemSubtab('item-tab-equip'); updateStaticUI();
        return candidate.id;
    });
    await page.waitForFunction(() => {
        if (uiRefreshQueued || uiRefreshRunning) return false;
        tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false);
        return true;
    });
    const inventory = page.locator('#btn-equipment-mobile-inventory');
    if (await inventory.isVisible()) await inventory.click();
    await page.locator('#ui-inventory-list .equipment-grid-item').first().click();
    const inspector = page.locator('#ui-equipment-inventory-inspector');
    await expect(inspector).toContainText('장착 가능: 오른쪽 장갑');
    await expect(inspector).not.toContainText('장착 요구:');
    await inspector.getByText('장착 가능: 오른쪽 장갑', { exact: true }).scrollIntoViewIfNeeded();
    await expect(inspector.getByText('장착 가능: 오른쪽 장갑', { exact: true })).toBeInViewport();
    await inspector.screenshot({ path: info.outputPath('eligible-right-glove.png') });
    await inspector.getByRole('button', { name: '장착', exact: true }).click();
    await page.locator('#glove-slot-overlay').getByRole('button', { name: '오른쪽 슬롯', exact: true }).click();
    await expect(page.locator('#glove-slot-overlay')).toBeHidden();
    expect(await page.evaluate(() => game.equipment['장갑2'].id)).toBe(candidateId);
    expect(await page.evaluate(() => getPlayerStats(false).disabledEquipment['장갑2'])).toBeUndefined();
    expect(failures).toEqual([]);
});

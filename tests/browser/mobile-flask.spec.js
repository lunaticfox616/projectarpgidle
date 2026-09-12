const { test, expect } = require('@playwright/test');

test('flask slot management and category picking preserve charge and quality rules', async ({ page }, info) => {
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.route('https://**', route => route.fulfill({ status: 204, body: '' }));
    await page.goto('/'); await page.locator('#btn-startup-guest').click();
    await page.locator('[data-class-id="warrior"]').click();
    await page.waitForFunction(() => battleAssets.ready && !uiRefreshRunning && !uiRefreshQueued);
    await page.evaluate(() => {
        clearInterval(gameTickHandle); gameTickHandle = null; game.season = 100; game.level = 100;
        game.contentProgression.inherited = CONTENT_UNLOCK_CATALOG.map(row => row.id); contentProgression.sync();
        game.equipment['허리띠'] = { slot: '허리띠', rarity: 'normal', baseStats: [{ id: 'flaskUtilSlots', val: 3 }], stats: [] };
        const st = ensureFlaskState(); st.foundKeys = Object.keys(FLASK_DB); st.alchemyGlass = 1000;
        equipUtilityFlask(0, 'granite1'); equipUtilityFlask(1, 'quicksilver1'); equipUtilityFlask(2, 'amethyst1');
        announceMapPrimaryContentUnlocks(); openTabPane('tab-flask'); updateStaticUI();
    });
    await page.waitForFunction(() => {
        if (uiRefreshRunning || uiRefreshQueued) return false;
        game.seenTutorials.push(...MAP_PRIMARY_CONTENTS.map(row => row.noticeKey).filter(Boolean));
        tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false); return true;
    });
    const mobile = info.project.use.isMobile;
    const slots = page.getByRole('combobox', { name: '관리할 플라스크 슬롯' });
    if (mobile) {
        await expect(page.locator('.flask-slot-box:visible')).toHaveCount(1);
        await slots.selectOption('1');
    }
    await page.locator('.flask-slot-box.utility .flask-slot-select').first().click();
    const options = page.locator('#flask-picker-overlay .selection-overlay-option');
    await expect(options).toHaveCount(mobile ? 5 : 25);
    if (mobile) {
        await page.getByRole('combobox', { name: '플라스크 효과 계열' }).selectOption('quicksilver');
        await expect(options.first()).toBeDisabled();
        await page.getByRole('combobox', { name: '플라스크 효과 계열' }).selectOption('granite');
    }
    await options.nth(1).click();
    await expect.poll(() => page.evaluate(() => ensureFlaskState().utils[0].key)).toBe('granite2');
    const before = await page.evaluate(() => ({ glass: ensureFlaskState().alchemyGlass, charges: ensureFlaskState().utils[0].charges, cost: getFlaskQualityUpgradeCost('granite2') }));
    await page.locator('.flask-slot-box.utility').first().getByRole('button', { name: /품질 \+1/ }).click();
    await expect.poll(() => page.evaluate(() => getFlaskQuality('granite2'))).toBe(1);
    expect(await page.evaluate(() => ensureFlaskState().alchemyGlass)).toBe(before.glass - before.cost);
    expect(await page.evaluate(() => ensureFlaskState().utils[0].charges)).toBe(before.charges);
    if (mobile) {
        await expect(slots).toHaveValue('1');
        await page.setViewportSize({ width: 915, height: 412 });
        await expect(page.locator('.flask-slot-box:visible')).toHaveCount(1);
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.evaluate(() => openTabPane('tab-flask'));
        await expect(slots).toBeHidden();
        await expect(page.locator('.flask-slot-box:visible')).toHaveCount(4);
    }
    expect(errors).toEqual([]);
});

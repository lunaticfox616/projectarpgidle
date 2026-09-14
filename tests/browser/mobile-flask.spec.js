const { test, expect } = require('@playwright/test');

async function openFlasks(page) {
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
}

test('flask slot management and category picking preserve charge and quality rules', async ({ page }, info) => {
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await openFlasks(page);
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

test('flask crafting availability, quality comparison and keyboard dismissal reflect actual use', async ({ page }, info) => {
    await openFlasks(page);
    await page.evaluate(() => {
        const st = ensureFlaskState();
        st.utils = []; st.foundKeys = ['h1', 'h2']; st.healTier = 'h2';
        st.qualityByKey = { h2: 20 }; st.alchemyGlass = 6;
        updateStaticUI();
    });
    const workbench = page.locator('.flask-workbench');
    const summary = workbench.locator('summary');
    await expect(summary).toContainText('제작 가능 5개');
    await summary.click();
    await workbench.locator('.flask-craft-card').filter({ hasText: '화강암 플라스크 I' }).getByRole('button').click();
    await expect(summary).toContainText('제작 가능 0개');
    await expect(workbench).toHaveAttribute('open', '');
    expect(await page.evaluate(() => ensureFlaskState().alchemyGlass)).toBe(0);
    expect(await page.evaluate(() => ensureFlaskFoundKeys().includes('granite1'))).toBe(true);
    await expect(workbench.locator('button:enabled')).toHaveCount(0);
    const trigger = page.locator('.flask-slot-box.heal .flask-slot-select');
    await trigger.click();
    const picker = page.locator('#flask-picker-overlay');
    await expect(picker).toHaveAttribute('role', 'dialog');
    await expect(picker.locator('.selection-overlay-help')).toContainText('제작');
    const nextTier = picker.locator('.selection-overlay-option').filter({ hasText: '생명력 플라스크 III' });
    await expect(nextTier).toContainText('38.4% → 40.0% (+1.6%p)');
    await expect(nextTier).toBeDisabled();
    await expect(picker.getByRole('button', { name: '닫기', exact: true })).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(picker.locator('.selection-overlay-option.selected')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(picker.getByRole('button', { name: '닫기', exact: true })).toBeFocused();
    await page.screenshot({ path: info.outputPath('flask-quality-picker.png') });
    await page.keyboard.press('Escape');
    await expect(picker).toHaveCount(0);
    await expect(page.locator('#ui-flask-panel')).toBeVisible();
    await expect(trigger).toBeFocused();
    expect(await page.evaluate(() => ensureFlaskState().healTier)).toBe('h2');
});

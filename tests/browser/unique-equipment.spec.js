const { test, expect } = require('@playwright/test');

test('a corrected unique returns from its old slot and displays its own equip requirements', async ({ page }, info) => {
    const failures = [];
    page.on('pageerror', error => failures.push(error.message));
    await page.route('https://**', route => route.fulfill({ status: 204, body: '' }));
    await page.goto('/');
    await page.locator('#btn-startup-guest').click();
    await page.locator('#loop-hero-select-overlay [data-class-id="warrior"]').click();
    await page.waitForFunction(() => battleAssets.ready && !uiRefreshRunning && !uiRefreshQueued);
    const target = await page.evaluate(() => {
        clearInterval(gameTickHandle); gameTickHandle = null; game.combatHalted = true;
        game.level = 100;
        const item = generateUniqueItem(100, null, '타락각 투구');
        delete item.uniqueEquipmentVersion;
        item.slot = '장갑'; item.baseId = 'hide_gloves'; item.baseName = '가죽 장갑'; item.locked = true;
        game.inventory = []; game.equipment['장갑1'] = item;
        game = mergeDefaults(JSON.parse(JSON.stringify(game)));
        switchTab('tab-items'); switchItemSubtab('item-tab-equip'); updateStaticUI();
        return { id: item.id, requirement: levelProgression.requirements(item) };
    });
    await page.waitForFunction(() => {
        if (uiRefreshQueued || uiRefreshRunning) return false;
        tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false); return true;
    });
    expect(await page.evaluate(() => game.equipment['장갑1'])).toBeNull();
    const inventory = page.locator('#btn-equipment-mobile-inventory');
    if (await inventory.isVisible()) await inventory.click();
    await page.locator('#ui-inventory-list .equipment-grid-item').first().click();
    const inspector = page.locator('#ui-equipment-inventory-inspector');
    await expect(inspector).toContainText('타락각 투구');
    await expect(inspector).toContainText('장착 요구:');
    await expect(inspector).toContainText(`요구 Lv.${target.requirement.level}`);
    await inspector.screenshot({ path: info.outputPath('unique-requirements.png') });
    expect(await page.evaluate(id => equipItemById(id), target.id)).toBe(false);
    await page.evaluate(req => {
        game.actRewardBonuses = Object.entries(req.attributes).map(([stat, value]) => ({ stat, value }));
        updateStaticUI();
    }, target.requirement);
    await expect(inspector).not.toContainText('장착 요구:');
    await inspector.getByRole('button', { name: '장착', exact: true }).click();
    expect(await page.evaluate(() => game.equipment['투구'].id)).toBe(target.id);
    expect(await page.evaluate(() => game.equipment['투구'].locked)).toBe(true);
    expect(failures).toEqual([]);
});

test('a migrated altar mismatch is visible and both offerings can be recovered', async ({ page }, info) => {
    const failures = [];
    page.on('pageerror', error => failures.push(error.message));
    await page.route('https://**', route => route.fulfill({ status: 204, body: '' }));
    await page.goto('/');
    await page.locator('#btn-startup-guest').click();
    await page.locator('#loop-hero-select-overlay [data-class-id="warrior"]').click();
    await page.waitForFunction(() => battleAssets.ready && !uiRefreshRunning && !uiRefreshQueued);
    await page.evaluate(() => {
        clearInterval(gameTickHandle); gameTickHandle = null;
        game.season = 50; game.loopCount = 49; game.level = 100; game.combatHalted = true;
        game.settings.mapCompleteAction = 'stop'; game.settings.autoEquipEmptySlots = false;
        game.contentProgression.inherited = CONTENT_UNLOCK_CATALOG.map(row => row.id);
        game.unlocks.map = true;
        const item = generateUniqueItem(30, null, '타락각 투구');
        delete item.uniqueEquipmentVersion; item.slot = '장갑'; item.baseId = 'hide_gloves';
        game.inventory = []; game.timeRift.altarOpen = true; game.timeRift.altarUnique = item;
        game.timeRift.altarRare = createItemFromBase(BASE_ITEM_DB.find(base => base.id === 'hide_gloves'), 'rare', 10);
        game = mergeDefaults(JSON.parse(JSON.stringify(game))); window.game = game;
        switchTab('tab-map'); switchMapExploreSubtab('map-explore-timerift'); updateStaticUI();
    });
    await page.waitForFunction(() => {
        if (uiRefreshRunning || uiRefreshQueued) return false;
        tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false); return true;
    });
    const panel = page.locator('#ui-timerift-panel');
    const future = panel.locator('[data-rift-stage="future"]');
    await expect(future).toContainText('부위 불일치');
    await expect(future).not.toContainText('융합 준비 완료');
    await expect(future.getByRole('button', { name: '미래 입장' })).toBeDisabled();
    expect(await page.evaluate(() => game.currentZoneId)).toBe(0);
    await panel.screenshot({ path: info.outputPath('altar-mismatch.png') });
    await panel.getByRole('button', { name: '제단 회수', exact: true }).click();
    expect(await page.evaluate(() => game.inventory.map(item => item.slot).sort())).toEqual(['장갑', '투구']);
    await expect(future).toContainText('고유 1개·희귀 1개');
    expect(await page.evaluate(() => game.timeRift.altarOpen)).toBe(false);
    expect(failures).toEqual([]);
});

test('realm codex includes special boss uniques and shows unrestricted cosmos descriptions', async ({ page }, info) => {
    const failures = [];
    page.on('pageerror', error => failures.push(error.message));
    await page.route('https://**', route => route.fulfill({ status: 204, body: '' }));
    await page.goto('/');
    await page.locator('#btn-startup-guest').click();
    await page.locator('#loop-hero-select-overlay [data-class-id="warrior"]').click();
    await page.waitForFunction(() => battleAssets.ready && !uiRefreshRunning && !uiRefreshQueued);
    const bonus = await page.evaluate(() => {
        clearInterval(gameTickHandle); gameTickHandle = null; game.combatHalted = true;
        game.contentProgression.inherited = ['craft', 'codex']; game.unlocks.codex = true;
        game.settings.autoEquipEmptySlots = false; game.uniqueCodex = {};
        const item = generateUniqueItem(30, null, '아스트라의 파편');
        addItemToInventory(item, { guaranteedKeep: true });
        switchTab('tab-codex'); renderUniqueCodexUI();
        return getCodexBonusPct();
    });
    await page.waitForFunction(() => {
        if (uiRefreshRunning || uiRefreshQueued) return false;
        tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false); return true;
    });
    await expect(page.locator('#btn-codex-realm')).toBeVisible();
    await page.locator('#btn-codex-realm').click();
    await expect(page.locator('#ui-codex-summary')).toContainText('1 / 98');
    await expect(page.locator('#ui-codex-summary')).not.toContainText('드랍률');
    await page.evaluate(() => setCodexSlotFilter(UNIQUE_DB.find(row => row.name === '아스트라의 파편').slots[0]));
    await expect(page.locator('.codex-card').filter({ hasText: '아스트라의 파편' })).toContainText('등록됨');
    expect(await page.evaluate(() => getCodexBonusPct())).toBe(bonus);
    await page.evaluate(() => {
        const item = generateUniqueItem(20, null, '잿불의 인장');
        item.uniqueEffect = '우주계 전용 효과 #1: 타격마다 적의 모든 저항 −3%';
        addItemToInventory(item, { guaranteedKeep: true });
        game = mergeDefaults(JSON.parse(JSON.stringify(game)));
        setCodexSlotFilter(item.slot); renderUniqueCodexUI();
    });
    const card = page.locator('.codex-card').filter({ hasText: '잿불의 인장' });
    await expect(card).toContainText('타격마다 적의 모든 저항');
    await expect(card).not.toContainText('우주계 전용 효과');
    await expect(page.locator('#ui-codex-summary')).toContainText('2 / 98');
    await card.scrollIntoViewIfNeeded();
    await expect(card).toBeInViewport();
    await page.screenshot({ path: info.outputPath('realm-codex.png') });
    expect(failures).toEqual([]);
});

const { test, expect } = require('@playwright/test');

test('generated equipment art fits the grid and the equipped preview', async ({ page }, testInfo) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://**', route => route.fulfill({ status: 204, body: '' }));
    await page.goto('/');
    await page.locator('#btn-startup-guest').click();
    await page.locator('#loop-hero-select-overlay [data-class-id="warrior"]').click();
    await page.waitForFunction(() => battleAssets.ready && !uiRefreshRunning && !uiRefreshQueued);
    const count = await page.evaluate(() => {
        clearInterval(gameTickHandle); gameTickHandle = null;
        tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false);
        game.unlocks.items = true;
        game.inventory = Object.keys(ITEM_VISUAL_ASSET_DB.equipmentGrid.baseAssets).map((id, index) => {
            const base = BASE_ITEM_DB.find(item => item.id === id);
            return { id: 99900 + index, instanceId: 'art-' + id, baseId: id,
                baseName: base.name, name: base.name, slot: base.slot,
                rarity: ['normal', 'magic', 'rare', 'unique'][index % 4], stats: [], baseStats: [], level: 1 };
        });
        Object.keys(ITEM_VISUAL_ASSET_DB.equipmentGrid.uniqueAssets).forEach((name, index) => {
            const unique = UNIQUE_DB.find(item => item.name === name);
            const base = BASE_ITEM_DB.find(item => item.slot === unique.slots[0]);
            game.inventory.push({ id: 99000 + index, instanceId: 'art-unique-' + index, name,
                baseId: base.id, baseName: base.name, slot: base.slot, rarity: 'unique', stats: [], baseStats: [], level: 1 });
        });
        const pages = Math.ceil(getInventoryUsedCellCount(game) / 100);
        game.season = pages <= 7 ? Math.max(1, (pages - 1) * 5) : 30 + (pages - 7) * 10;
        game.equipmentInventoryPlacements = {};
        game.settings.autoEquipEmptySlots = false;
        switchTab('tab-items');
        if (window.matchMedia('(max-width: 1080px)').matches) setEquipmentMobilePane('inventory');
        updateStaticUI();
        return game.inventory.length;
    });
    const cards = page.locator('#ui-inventory-list .equipment-grid-item');
    const pageCount = await page.evaluate(() => {
        const layout = equipmentInventoryGridRuntime.ensureState(game);
        return Math.max(...layout.entries.map(entry => Math.floor(entry.row / layout.rowsPerPage) + 1));
    });
    const results = [];
    for (let index = 0; index < pageCount; index++) {
    await page.waitForFunction(() => {
        if (uiRefreshRunning || uiRefreshQueued) return false;
        tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false);
        return true;
    });
    await page.locator('#ui-equipment-inventory-pages button').nth(index).click();
    await page.waitForFunction(() => {
        if (uiRefreshRunning || uiRefreshQueued) return false;
        tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false);
        return true;
    });
    await page.waitForFunction(() => Array.from(document.querySelectorAll('#ui-inventory-list .equipment-grid-item > img'))
        .every(img => img.complete && img.naturalWidth > 0));
    results.push(...await cards.evaluateAll(elements => elements.map(card => {
        const img = card.querySelector('img');
        const box = card.getBoundingClientRect();
        const art = img.getBoundingClientRect();
        return { src: img.getAttribute('src'), filter: getComputedStyle(img).filter,
            inside: art.left >= box.left && art.top >= box.top && art.right <= box.right + 1 && art.bottom <= box.bottom + 1,
            marker: getComputedStyle(card, '::after').backgroundColor };
    })));
    }
    expect(new Set(results.map(row => row.src)).size).toBe(count);
    expect(results.every(row => row.src.startsWith('assets/items/illustrated/') && row.inside && row.filter === 'none')).toBe(true);
    expect(new Set(results.map(row => row.marker)).size).toBe(4);
    await page.locator('#ui-equipment-inventory-pages button').first().click();
    await page.waitForFunction(() => !uiRefreshRunning && !uiRefreshQueued);
    await page.mouse.move(0, 0);
    await page.screenshot({ path: testInfo.outputPath('equipment-art.png') });
    const first = cards.first();
    const name = await first.getAttribute('data-equipment-grid-key');
    await first.dblclick();
    await expect.poll(() => page.evaluate(key => Object.values(game.equipment).some(item => item?.instanceId === key), name)).toBe(true);
    if (testInfo.project.name.startsWith('mobile')) await page.evaluate(() => setEquipmentMobilePane('loadout'));
    await page.locator('#ui-equip-list').scrollIntoViewIfNeeded();
    await expect(page.locator('#ui-equip-list')).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('equipment-art-equipped.png') });
    expect(errors).toEqual([]);
});

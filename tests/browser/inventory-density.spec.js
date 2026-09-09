const { test, expect } = require('@playwright/test');

test('inventory prioritizes equipment while keeping search and management usable', async ({ page }, testInfo) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://**', route => route.fulfill({ status: 204, body: '' }));
    await page.goto('/');
    await page.locator('#btn-startup-guest').click();
    await page.locator('#loop-hero-select-overlay [data-class-id="warrior"]').click();
    await page.waitForFunction(() => battleAssets.ready && !uiRefreshRunning && !uiRefreshQueued);
    await page.evaluate(() => {
        clearInterval(gameTickHandle); gameTickHandle = null;
        const raf = window.requestAnimationFrame.bind(window);
        window.requestAnimationFrame = callback => callback === gameLoop ? 0 : raf(callback);
        tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false);
        game.settings.autoEquipEmptySlots = false;
        game.unlocks.items = true;
        game.inventory = [];
        const random = Math.random;
        try {
            Math.random = createSeededRng(17);
            for (let i = 0; i < 18; i++) {
                const item = generateEquipmentDrop({ isBoss: true }, { minimumRarity: 'rare' });
                item.id = 99500 + i;
                game.inventory.push(item);
            }
        } finally { Math.random = random; }
        switchTab('tab-items');
        if (window.matchMedia('(max-width: 1080px)').matches) setEquipmentMobilePane('inventory');
        updateStaticUI();
    });
    await page.waitForFunction(() => !uiRefreshRunning && !uiRefreshQueued);
    await page.evaluate(() => {
        tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false);
        hideItemTooltip(); hideInfoTooltip();
    });
    await page.mouse.move(0, 0);
    await page.screenshot({ path: testInfo.outputPath('inventory.png') });
    const geometry = await page.evaluate(() => {
        const management = document.querySelector('.inventory-management-row').getBoundingClientRect();
        const toolbar = document.querySelector('.inventory-browse-toolbar').getBoundingClientRect();
        const grid = document.querySelector('#ui-inventory-list > .search-result-list').getBoundingClientRect();
        const paperdoll = document.querySelector('#ui-equip-list').getBoundingClientRect();
        const summary = document.querySelector('#ui-equipment-loadout-summary').getBoundingClientRect();
        return { gridTop: grid.top, controlsHeight: grid.top - toolbar.top,
            managementAbove: management.bottom <= toolbar.top, summaryBelow: summary.top >= paperdoll.bottom,
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
    await testInfo.attach('geometry', { body: JSON.stringify(geometry), contentType: 'application/json' });
    await expect(page.locator('#ui-equipment-inventory-inspector')).toBeHidden();
    expect(geometry.controlsHeight).toBeLessThan(210);
    expect(geometry.managementAbove).toBe(true);
    if (!testInfo.project.name.startsWith('mobile')) expect(geometry.summaryBelow).toBe(true);
    expect(geometry.overflow).toBeLessThanOrEqual(1);
    const search = page.locator('#ui-inventory-list [data-search-key="equip"]');
    const visibleItems = page.locator('.equipment-grid-item[data-equipment-grid-key]');
    const itemCount = await visibleItems.count();
    await search.fill('검색결과가없을문구');
    await expect(page.locator('#ui-inventory-page-label')).toContainText('검색 결과 0개');
    await expect(visibleItems).toHaveCount(itemCount);
    await expect(page.locator('.equipment-grid-item.is-filter-muted')).toHaveCount(itemCount);
    await page.locator('#ui-inventory-list .search-action-row button').click();
    await expect(search).toHaveValue('');
    await expect(page.locator('#btn-auto-salvage')).toBeVisible();
    await page.locator('#btn-auto-salvage').click();
    await expect(page.locator('#auto-salvage-config-overlay')).toBeVisible();
    await page.locator('#auto-salvage-config-overlay').getByRole('button', { name: '닫기', exact: true }).click();
    await page.locator('.equipment-bulk-menu summary').click();
    await expect(page.getByRole('button', { name: '전체 해체', exact: true })).toBeVisible();
    await page.locator('.equipment-bulk-menu summary').click();
    await expect(page.getByRole('button', { name: '전체 해체', exact: true })).toBeHidden();
    await expect(page.locator('#ui-equipment-triage')).toBeVisible();
    await page.locator('#ui-equipment-triage').getByRole('button', {name:'일괄 분석',exact:true}).click();
    await expect(page.locator('#ui-equipment-triage').getByRole('button', {name:'다시 분석',exact:true})).toBeVisible();
    await page.locator('#ui-equipment-triage select').selectOption('special');
    await expect(visibleItems).toHaveCount(itemCount);
    await expect.poll(() => page.locator('.equipment-grid-item.is-filter-muted, .equipment-grid-item.is-filter-match').count()).toBe(itemCount);
    await page.locator('#ui-equipment-triage select').selectOption('all');
    const target = await page.evaluate(() => {
        const item = game.inventory.find(entry => ['투구', '갑옷', '신발', '허리띠'].includes(entry.slot));
        return { id: item.id, slot: item.slot, key: equipmentInventoryGridRuntime.getItemKey(item) };
    });
    const card = page.locator('[data-equipment-grid-key="' + target.key + '"]');
    await page.locator('#ui-equipment-slot-filter').selectOption(target.slot);
    await expect(card).toHaveClass(/is-filter-match/);
    await expect.poll(() => page.locator('.equipment-grid-item.is-filter-muted').count()).toBeGreaterThan(0);
    await search.fill('검색결과가없을문구');
    await expect(card).toHaveClass(/is-filter-muted/);
    await card.scrollIntoViewIfNeeded();
    const beforeClick = await card.boundingBox();
    await card.click();
    const afterClick = await card.boundingBox();
    expect(await page.evaluate(() => equipmentInventoryInteraction.isCarrying())).toBe(false);
    expect(afterClick.y).toBeCloseTo(beforeClick.y, 0);
    await expect(page.locator('#ui-equipment-inventory-inspector')).toBeVisible();
    await expect(page.locator('.equipment-grid-inspector-actions')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#ui-equipment-inventory-inspector')).toBeHidden();
    await expect(card).toBeVisible();
    await card.click();
    await page.mouse.click(beforeClick.x + beforeClick.width / 2, beforeClick.y + beforeClick.height / 2, { clickCount: 2 });
    await expect.poll(() => page.evaluate(slot => game.equipment[slot]?.id, target.slot)).toBe(target.id);
    expect(await page.evaluate(() => equipmentInventoryInteraction.isCarrying())).toBe(false);
    // A valid drag commits on release, without entering a reservation/carry mode.
    const moving = page.locator('#ui-inventory-list .equipment-grid-item').first();
    await moving.scrollIntoViewIfNeeded();
    const dragOrigin = await moving.boundingBox();
    const movingKey = await moving.getAttribute('data-equipment-grid-key');
    const destination = await page.evaluate(({key,height}) => {
        const layout = equipmentInventoryGridRuntime.ensureState();
        const entry = layout.entries.find(item => item.key === key);
        for (const cell of document.querySelectorAll('#ui-inventory-list .equipment-grid-cell')) {
            const column = Number(cell.dataset.gridColumn), row = Number(cell.dataset.gridRow);
            const rect = cell.getBoundingClientRect();
            if (rect.y < 0 || rect.y + height >= innerHeight - 80) continue;
            if (column === entry.column && row === entry.row) continue;
            if (equipmentInventoryGridRuntime.canMoveInLayout(key,column,row,layout).ok)
                return {column,row,x:rect.x,y:rect.y};
        }
        return null;
    }, {key:movingKey,height:dragOrigin.height});
    expect(destination).not.toBeNull();
    await page.mouse.move(dragOrigin.x + dragOrigin.width/2, dragOrigin.y + dragOrigin.height/2);
    await page.mouse.down();
    await page.mouse.move(destination.x + dragOrigin.width/2, destination.y + dragOrigin.height/2, {steps:8});
    await page.mouse.up();
    expect(await page.evaluate(key => game.equipmentInventoryPlacements[key], movingKey)).toEqual({column:destination.column,row:destination.row});
    expect(await page.evaluate(() => equipmentInventoryInteraction.isCarrying())).toBe(false);

    // Dragging outside the grid must cancel, preserving every item and saved cell.
    const remaining = page.locator('#ui-inventory-list .equipment-grid-item').first();
    await remaining.scrollIntoViewIfNeeded();
    const origin = await remaining.boundingBox();
    const inventoryBefore = await page.evaluate(() => JSON.stringify([game.inventory, game.equipmentInventoryPlacements, game.equipmentTemporaryStorage]));
    await page.mouse.move(origin.x + origin.width / 2, origin.y + origin.height / 2);
    await page.mouse.down();
    await page.mouse.move(origin.x + origin.width / 2 + 12, origin.y + origin.height / 2, { steps: 3 });
    expect(await page.evaluate(() => equipmentInventoryInteraction.isCarrying())).toBe(true);
    await page.mouse.move(2, 2, { steps: 4 });
    await page.mouse.up();
    expect(await page.evaluate(() => equipmentInventoryInteraction.isCarrying())).toBe(false);
    expect(await page.evaluate(() => JSON.stringify([game.inventory, game.equipmentInventoryPlacements, game.equipmentTemporaryStorage]))).toBe(inventoryBefore);

    if (!testInfo.project.name.startsWith('mobile')) {
        await page.locator('#btn-ui-rail-misc').click();
        await expect(page.locator('#ui-rail-misc-panel')).toBeVisible();
        const settings = page.locator('#ui-rail-misc-panel #btn-tab-settings');
        await settings.click();
        await expect(page.locator('#tab-settings')).toBeVisible();
        await expect(page.locator('#ui-rail-misc-panel')).toBeHidden();
        await page.locator('#btn-close-all-windows').click();
        const goal = page.locator('#ui-goal-toggle');
        const goalStyle = () => goal.evaluate(el => {
            const rect = el.getBoundingClientRect(), css = getComputedStyle(el);
            return { x: rect.x, y: rect.y, width: rect.width, height: rect.height,
                font: css.fontFamily, background: css.backgroundColor, border: css.borderTopColor, text: el.innerText.trim() };
        });
        if (await goal.getAttribute('aria-expanded') === 'true') await goal.click();
        await page.mouse.move(0, 0);
        await expect(goal).toHaveCSS('background-color', 'rgb(17, 17, 15)');
        const closed = await goalStyle();
        expect(closed.text).toBe('목표');
        await goal.click();
        await page.mouse.move(0, 0);
        await expect.poll(goalStyle).toEqual(closed);
        await expect(page.locator('#ui-goal-body')).toBeVisible();
        await goal.click();
    }
    if (testInfo.project.use.isMobile) await page.locator('#btn-mobile-nav-more').click();
    await page.locator('#btn-tab-character').click();
    await expect(page.locator('#tab-character .character-overview')).toBeVisible();
    await expect(page.locator('#tab-character .character-stat-section')).toHaveCount(3);
    const special = page.locator('#tab-character .character-stat-section').last();
    if (testInfo.project.use.isMobile) {
        await page.locator('#tab-character .mobile-section-navigation').getByRole('tab', {name:'기본 · 특수'}).click();
    } else {
        await special.locator('summary').click();
    }
    await expect(page.locator('#ui-mystique')).toBeVisible();
    await expect(page.locator('#ui-challenge-contract-panel')).toHaveCount(0);
    await page.locator('#ui-mystique').scrollIntoViewIfNeeded();
    const typography = await page.locator('#ui-mystique').evaluate(el => {
        const special=getComputedStyle(el), ehp=getComputedStyle(document.querySelector('.character-ehp-stat strong'));
        return {special:[special.fontFamily,special.fontSize,special.fontWeight],ehp:[ehp.fontFamily,ehp.fontSize,ehp.fontWeight]};
    });
    expect(typography.special).toEqual(typography.ehp);
    await page.screenshot({ path: testInfo.outputPath('character.png') });
    expect(errors).toEqual([]);
});

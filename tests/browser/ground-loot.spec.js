const { test, expect } = require('@playwright/test');

async function openBattle(page) {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://**', route => route.fulfill({ status: 204, contentType: 'text/javascript', body: '' }));
    await page.goto('/');
    await page.locator('#btn-startup-guest').click();
    await expect(page.locator('#startup-overlay')).not.toHaveClass(/active/, { timeout: 30000 });
    if (await page.evaluate(() => !game.heroSelectionInitialized)) {
        await page.locator('#loop-hero-select-overlay [data-class-id]').first().click();
    }
    await page.evaluate(() => {
        clearInterval(gameTickHandle); gameTickHandle = null;
        game.settings.autoEquipEmptySlots = false; game.settings.autoSalvageEnabled = false;
        game.settings.itemFilterEnabled = false; game.settings.showLootLog = false;
        game.level = 10; game.currentZoneId = 1; game.maxZoneId = 1;
        game.gridPlayer = { gx: 3, gy: 3, gridMoveTimer: 0 };
        game.enemies = [createEnemy(getZone(1), { at: 0, count: 1 }, 0)];
        Object.assign(game.enemies[0], { gx: 4, gy: 3 });
        tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false);
        document.getElementById('btn-close-all-windows')?.click();
        switchTab('tab-battle'); updateStaticUI(); refreshCombatTickUi();
    });
    await page.waitForFunction(() => battleAssets.ready && battleVisualState.enemySmoothPos[game.enemies[0].id], { timeout: 30000 });
    return errors;
}

test('actual equipment roll is kept once and animates behind actors without x1', async ({ page }, info) => {
    const errors = await openBattle(page);
    const receipt = await page.evaluate(() => {
        const enemy = game.enemies[0], canvas = document.getElementById('battlefield-canvas');
        const source = battleVisualState.enemySmoothPos[enemy.id];
        const item = rollEquipmentLoot(enemy, getZone(1), 1);
        const count = awardCurrency('goldenRule', 1);
        queueEnemyGroundLoot(enemy, { currency: 'goldenRule', count });
        const dew = awardCurrency('magicBud', 3);
        queueEnemyGroundLoot(enemy, { currency: 'magicBud', count: dew });
        enemy.hp = 0; game.enemies = []; refreshCombatTickUi();
        tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false);
        return { id: item.id, name: item.name, x: source.x / canvas.clientWidth, y: source.y / canvas.clientHeight,
            golden: game.currencies.goldenRule, inventory: game.inventory.length };
    });
    const drops = page.locator('.battle-loot-drop');
    await expect(drops).toHaveCount(3);
    await expect(page.locator('.battle-loot-drop.landed')).toHaveCount(3);
    const golden = page.locator('.battle-loot-drop[data-currency="goldenRule"]');
    await expect(golden.locator('.battle-loot-name')).toHaveText('황금률');
    await expect(golden.locator('.orb-tone')).toHaveCSS('border-top-color', 'rgb(122, 31, 31)');
    await expect(golden).toHaveCSS('opacity', '0.82');
    const point = await golden.evaluate(marker => ({ x: Number(marker.dataset.sourceX), y: Number(marker.dataset.sourceY) }));
    expect(point.x).toBeCloseTo(receipt.x, 2); expect(point.y).toBeCloseTo(receipt.y, 2);
    const depths = await page.evaluate(() => ['.battle-loot-layer', '.battle-loot-foreground', '.battle-loot-air']
        .map(selector => Number(getComputedStyle(document.querySelector(selector)).zIndex)));
    expect(depths[0]).toBeLessThan(depths[1]); expect(depths[1]).toBeLessThan(depths[2]);
    await page.screenshot({ path: info.outputPath('real-ground-loot.png') });
    await expect(page.locator('.battle-loot-mote').first()).toBeAttached();
    await expect(drops).toHaveCount(0);
    await expect(page.locator('.battle-loot-air > *')).toHaveCount(0);
    await expect(page.locator('.battle-loot-foreground')).toBeHidden();
    expect(await page.evaluate(id => game.inventory.filter(item => item.id === id).length, receipt.id)).toBe(1);
    expect(await page.evaluate(() => game.currencies.goldenRule)).toBe(receipt.golden);
    expect(await page.evaluate(() => game.inventory.length)).toBe(receipt.inventory);
    expect(errors).toEqual([]);
});


const { test, expect } = require('@playwright/test');
const { pickClass } = require('./helpers');
const { SHADOW } = require('../../scripts/lib/player-stat-shadow');

// Normal play keeps stat calculations (js/player-stat-cache.js, 2026-10-08). With game ticks as js/main.js runs them, an item
// equipped through the inventory inspector, a passive point spent on the tree and stats the UI asks for, every kept answer must
// equal a fresh calculation, nothing may change a kept calculation, and a click must drop kept calculations before its handlers.
async function play(page, steps) {
    return page.evaluate(count => {
        for (let i = 0; i < count; i += 2) combatEquipmentStats.withinTick(() => { runUiCoreLoop(); runUiCoreLoop(); refreshCombatTickUi(); });
        return JSON.stringify(getPlayerStats(false));
    }, steps);
}

async function equipHelmetThroughInspector(page) {
    await page.evaluate(() => {
        const base = BASE_ITEM_DB.find(row => row.slot === '투구' && row.reqTier <= 1);
        const helmet = createItemFromBase(base, 'normal', 1);
        helmet.stats = [{ id: 'pctHp', val: 40 }];
        game.inventory = [helmet];
        switchTab('tab-items'); switchItemSubtab('item-tab-equip'); updateStaticUI();
    });
    await page.waitForFunction(() => !uiRefreshQueued && !uiRefreshRunning);
    await page.locator('#ui-inventory-list .equipment-grid-item').first().click();
    await page.locator('#ui-equipment-inventory-inspector').getByRole('button', { name: '장착', exact: true }).click();
    await expect.poll(() => page.evaluate(() => (game.equipment['투구'] || {}).baseId)).toBeTruthy();
}

async function spendPassiveOnTree(page) {
    await page.evaluate(() => { game.passivePoints = 2; updateStaticUI(); });
    await page.locator('#btn-tab-char').click();
    await page.waitForFunction(() => passiveCameraInitialized && !uiRefreshRunning && !uiRefreshQueued);
    await page.waitForTimeout(200);
    const target = await page.evaluate(() => {
        const id = [...reachableNodes].find(nodeId => getPassiveActivationPath(nodeId).length === 1
            && PASSIVE_TREE.nodes[nodeId].kind !== 'attribute' && (PASSIVE_TREE.nodes[nodeId].effects || []).length > 0);
        const canvas = document.getElementById('tree-canvas'), rect = canvas.getBoundingClientRect();
        const viewW = passiveCanvasMetrics.width || rect.width, viewH = passiveCanvasMetrics.height || rect.height;
        const node = PASSIVE_TREE.nodes[id];
        return { id, x: rect.left + (viewW / 2 + camX + node.x * camZoom) * rect.width / viewW,
            y: rect.top + (viewH / 2 + camY + node.y * camZoom) * rect.height / viewH };
    });
    await page.mouse.click(target.x, target.y);
    await expect.poll(() => page.evaluate(id => game.passives.includes(id), target.id)).toBe(true);
}

test('kept stats follow build edits made through the real UI', async ({ page }, info) => {
    test.skip(!!info.project.use.isMobile, 'PC inventory and tree flows; the phone flows share the same stat calls');
    const failures = [];
    page.on('pageerror', error => failures.push(error.message));
    await page.route('https://**', route => route.fulfill({ status: 204, contentType: 'text/javascript', body: '' }));
    await page.goto('/');
    await page.locator('#btn-startup-guest').click();
    await expect(page.locator('#startup-overlay')).not.toHaveClass(/active/, { timeout: 30000 });
    if (await page.evaluate(() => !game.heroSelectionInitialized)) await pickClass(page, 'warrior');
    await page.waitForFunction(() => battleAssets.ready && !uiRefreshRunning && !uiRefreshQueued);
    await page.evaluate(code => {
        clearInterval(gameTickHandle); gameTickHandle = null;
        tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false);
        (0, eval)(code);
    }, SHADOW);

    const before = await play(page, 40);
    await equipHelmetThroughInspector(page);
    const equipped = await play(page, 40);
    expect(equipped).not.toBe(before);
    await spendPassiveOnTree(page);
    const allocated = await play(page, 40);
    expect(allocated).not.toBe(equipped);
    // Stats the UI asks for carry breakdowns and are kept apart from the lean ones.
    await page.evaluate(() => { for (let i = 0; i < 5; i++) getUiPlayerStats(); });

    // Player input (a key closing the tree window) drops kept calculations before its handlers run.
    const misses = await page.evaluate(() => { getPlayerStats(false); getPlayerStats(false); return playerStatCache.report().misses; });
    await page.keyboard.press('Escape');
    expect(await page.evaluate(() => { getPlayerStats(false); return playerStatCache.report().misses; })).toBeGreaterThan(misses);

    const shadow = await page.evaluate(() => ({ ...__shadow, health: playerStatCache.report() }));
    expect(shadow.diffs).toEqual([]);
    expect(shadow.mutated).toEqual([]);
    expect(shadow.health.repairs).toBe(0);
    expect(shadow.health.answers).toBeGreaterThan(20);
    expect(failures).toEqual([]);
});

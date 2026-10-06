const { test, expect } = require('@playwright/test');
const { pickClass } = require('./helpers');

// Exploration loot waits on the floor until picked up (2026-10-05 equipment, 2026-10-06 currency): a kill drops one pile, nothing
// is owned until the pile is clicked or walked over, the click grants each drop exactly once, and nothing is lost.
async function openMap(page) {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://**', route => route.fulfill({ status: 204, contentType: 'text/javascript', body: '' }));
    await page.goto('/');
    await page.locator('#btn-startup-guest').click();
    await expect(page.locator('#startup-overlay')).not.toHaveClass(/active/, { timeout: 30000 });
    if (await page.evaluate(() => !game.heroSelectionInitialized)) {
        await pickClass(page);
    }
    await page.waitForFunction(() => !!actExplorationState.current(game), { timeout: 30000 });
    await page.evaluate(() => {
        game.settings.autoEquipEmptySlots = false; game.settings.autoSalvageEnabled = false;
        game.settings.itemFilterEnabled = false; game.settings.showLootLog = false;
        const run = actExplorationState.current(game);
        run.mode = 'manual'; game.settings.autoMove = false;
        run.packs.forEach(pack => { pack.waiting = []; pack.aliveIds = []; pack.eliteIds = []; });
        game.enemies = [];
        tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false);
        document.getElementById('btn-close-all-windows')?.click();
        switchTab('tab-battle'); updateStaticUI();
    });
    await page.waitForFunction(() => battleAssets.ready, { timeout: 30000 });
    return errors;
}

test('a kill drops one floor pile that a click picks up exactly once', async ({ page }) => {
    const errors = await openMap(page);
    const drop = await page.evaluate(() => {
        const run = actExplorationState.current(game), map = actExplorationMap.forRun(run), hero = game.gridPlayer;
        const cell = [[2, 0], [0, 2], [-2, 0], [0, -2], [2, 2]].map(([x, y]) => ({ gx: hero.gx + x, gy: hero.gy + y }))
            .find(c => actExplorationMap.walkable(map, c, true));
        const enemy = Object.assign(createEnemy(getZone(game.currentZoneId), { at: 0, count: 1 }, 0), cell);
        const currency = Object.keys(ORB_DB).find(key => contentProgression.canDropCurrency(key));
        const wallet = game.currencies[currency] || 0, inventory = game.inventory.length;
        rollEquipmentLoot(enemy, getZone(game.currentZoneId), 1);
        keepCurrencyDrop(enemy, currency, 2);
        tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false);
        return { currency, wallet, inventory, ids: run.groundLoot.filter(row => row.item).map(row => row.item.id),
            rows: run.groundLoot.length };
    });
    expect(drop.ids.length).toBeGreaterThanOrEqual(1);
    // Nothing is owned before the pickup.
    expect(await page.evaluate(({ currency }) => game.currencies[currency] || 0, drop)).toBe(drop.wallet);
    expect(await page.evaluate(() => game.inventory.length)).toBe(drop.inventory);
    // One kill, one pile: one picture with every name over it, under the actors and above the floor.
    const pile = page.locator('.battle-loot-drop.is-floor');
    await expect(pile).toHaveCount(1);
    await expect(page.locator('.battle-loot-drop.is-floor.landed')).toHaveCount(1);
    await expect(pile.locator('.battle-loot-name')).toHaveCount(drop.rows);
    await expect(pile.locator(`.battle-loot-name[data-currency="${drop.currency}"]`)).toContainText('×2');
    const depths = await page.evaluate(() => ['.battle-loot-layer', '.battle-loot-foreground', '.battle-loot-air']
        .map(selector => Number(getComputedStyle(document.querySelector(selector)).zIndex)));
    expect(depths[0]).toBeLessThan(depths[1]); expect(depths[1]).toBeLessThan(depths[2]);
    // A click picks the whole pile up wherever the hero stands; the pile flies to the hero and leaves no layer behind.
    await pile.locator('.battle-loot-name').first().click();
    await expect(pile).toHaveCount(0);
    await expect(page.locator('.battle-loot-drop')).toHaveCount(0);
    await expect(page.locator('.battle-loot-air > *')).toHaveCount(0);
    expect(await page.evaluate(() => actExplorationState.current(game).groundLoot.length)).toBe(0);
    expect(await page.evaluate(({ currency }) => game.currencies[currency], drop)).toBe(drop.wallet + 2);
    expect(await page.evaluate(ids => ids.map(id => game.inventory.filter(item => item.id === id).length), drop.ids))
        .toEqual(drop.ids.map(() => 1));
    // Leaving the map with something still on the floor never loses it.
    const left = await page.evaluate(({ currency }) => {
        const run = actExplorationState.current(game), hero = game.gridPlayer;
        keepCurrencyDrop({ id: 0, gx: hero.gx, gy: hero.gy + 1, isBoss: false, isElite: false }, currency, 3);
        const before = game.currencies[currency];
        actExplorationProgress.depart(game);
        return { before, after: game.currencies[currency], floor: run.groundLoot.length };
    }, drop);
    expect(left.after).toBe(left.before + 3);
    expect(left.floor).toBe(0);
    expect(errors).toEqual([]);
});

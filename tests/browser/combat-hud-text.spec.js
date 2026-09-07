const { test, expect } = require('@playwright/test');

test('combat HUD updates labels without layout-dependent text reads or unchanged text writes', async ({ page }) => {
    await page.route('https://**', route => route.fulfill({ status: 204, body: '' }));
    await page.goto('/'); await page.locator('#btn-startup-guest').click();
    await page.locator('[data-class-id="warrior"]').click();
    await page.waitForFunction(() => battleAssets.ready && !uiRefreshRunning && !uiRefreshQueued);
    const result = await page.evaluate(() => {
        clearInterval(gameTickHandle); gameTickHandle = null;
        const stats = getPlayerStats(); stats.energyShield = 100;
        game.level = 2; game.exp = 0; game.playerEnergyShield = 40;
        updateCombatUI(stats);
        const ids = ['ui-exp-level-label', 'ui-exp-note', 'ui-combat-zone-inline', 'ui-es-inline', 'btn-combat-return'];
        const nodes = ids.map(id => document.getElementById(id).firstChild);
        const descriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'innerText');
        let reads = 0;
        Object.defineProperty(HTMLElement.prototype, 'innerText', { ...descriptor, get() { reads++; return descriptor.get.call(this); } });
        try {
            for (let i = 0; i < 20; i++) updateCombatUI(stats);
            const unchanged = ids.every((id, index) => document.getElementById(id).firstChild === nodes[index]);
            game.level = 3; game.playerEnergyShield = 25; updateCombatUI(stats);
            return { reads, unchanged, level: document.getElementById('ui-exp-level-label').textContent,
                exp: document.getElementById('ui-exp-note').textContent, shield: document.getElementById('ui-es-inline').textContent,
                zone: document.getElementById('ui-combat-zone-inline').textContent, mainZone: document.getElementById('ui-combat-zone').textContent };
        } finally { Object.defineProperty(HTMLElement.prototype, 'innerText', descriptor); }
    });
    expect(result.reads).toBe(0); expect(result.unchanged).toBe(true);
    expect(result.level).toBe('Lv.3'); expect(result.exp).toBe('0.0%'); expect(result.shield).toBe('ES 25/100');
    expect(result.zone).toBe(result.mainZone); expect(result.zone.length).toBeGreaterThan(0);
});

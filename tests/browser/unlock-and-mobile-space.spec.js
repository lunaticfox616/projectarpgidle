const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
    await page.route('https://**', route => route.fulfill({ status: 204, body: '' }));
    await page.goto('/'); await page.locator('#btn-startup-guest').click();
    await page.locator('[data-class-id="warrior"]').click();
    await page.waitForFunction(() => battleAssets.ready && !uiRefreshRunning && !uiRefreshQueued);
    await page.evaluate(() => {
        clearInterval(gameTickHandle); gameTickHandle = null;
        tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false);
    });
});

test('healing and trial entry require purchased progression', async ({ page }) => {
    const result = await page.evaluate(() => {
        game = mergeDefaults({ season: 1, maxZoneId: 8, currencies: { trialKey3: 2 } });
        game.playerHp = 10; game.combatTimeMs = 10000; game.enemies = [{ hp: 10 }]; tickFlaskAutoUse({ maxHp: 100 });
        changeZone('trial_1'); enterTrialWithTicket('trial_3'); renderCombatFlaskHud();
        const locked = { hp: game.playerHp, zone: game.currentZoneId, tickets: game.currencies.trialKey3,
            buttons: document.querySelectorAll('#ui-combat-flasks button').length };
        game.season = 2; contentProgression.sync();
        contentProgression.purchase('craft'); contentProgression.purchase('flask');
        renderCombatFlaskHud(); tickFlaskAutoUse({ maxHp: 100 });
        game.combatTimeMs += 1000; tickFlaskAutoUse({ maxHp: 100 });
        return { locked, unlockedHp: game.playerHp, buttons: document.querySelectorAll('#ui-combat-flasks button').length };
    });
    expect(result.locked).toEqual({ hp: 10, zone: 0, tickets: 2, buttons: 0 });
    expect(result.unlockedHp).toBeGreaterThan(10); expect(result.buttons).toBe(1);
});

test('mobile battle and tree use the space above navigation', async ({ page }, info) => {
    test.skip(!info.project.use.isMobile, 'Mobile panel space');
    for (const tab of ['tab-battle', 'tab-char']) {
        await page.evaluate(tab => { switchTab(tab); }, tab);
        await page.screenshot({ path: info.outputPath(tab + '.png'), scale: 'css' });
        const geometry = await page.evaluate(tab => {
            const ids = ['right-pane', tab, 'tab-header-bottom'];
            return ids.map(id => { const el = document.getElementById(id), rect = el.getBoundingClientRect(), style = getComputedStyle(el);
                return { id, top: rect.top, bottom: rect.bottom, padding: style.padding, height: rect.height }; });
        }, tab);
        expect(parseFloat(geometry[0].padding)).toBe(0);
        expect(geometry[2].top - geometry[1].bottom).toBeLessThan(24);
        expect(geometry[1].bottom).toBeLessThanOrEqual(geometry[2].top);
    }
});

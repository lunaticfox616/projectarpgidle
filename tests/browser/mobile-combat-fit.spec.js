const { test, expect } = require('@playwright/test');

test('mobile battle fits the viewport and keeps HP distinct from energy shield', async ({ page }, info) => {
    test.skip(!info.project.use.isMobile, 'Mobile HUD');
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.route('https://**', route => route.fulfill({ status: 204, body: '' }));
    await page.goto('/'); await page.locator('#btn-startup-guest').tap();
    await page.locator('[data-class-id="warrior"]').tap();
    await page.waitForFunction(() => battleAssets.ready && !uiRefreshRunning && !uiRefreshQueued);
    await page.evaluate(() => {
        clearInterval(gameTickHandle); gameTickHandle = null;
        tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false);
        game.season = 2; game.contentProgression.inherited = ['craft', 'flask']; contentProgression.sync();
        game.activeSkill = '연속 베기'; game.enemies = []; updateStaticUI();
    });
    for (const viewport of [{ width: 412, height: 915 }, { width: 360, height: 640 }, { width: 915, height: 412 }]) {
        await page.setViewportSize(viewport);
        await page.waitForFunction(() => !uiRefreshRunning && !uiRefreshQueued);
        await expect(page.locator('#enemy-area .enemy-empty')).toBeHidden();
        const gems = page.locator('.player-hud-skill-slots');
        const rack = await page.locator('.player-hud-skill-rack').boundingBox();
        const last = await gems.locator(':scope > *').last().boundingBox();
        expect(Math.abs(last.x + last.width - rack.x - rack.width)).toBeLessThan(3);
        for (const expanded of [true, false]) {
            const toggle = page.locator('#btn-combat-log-toggle');
            if (await toggle.getAttribute('aria-expanded') !== String(expanded)) await toggle.tap();
            const bounds = await page.evaluate(() => {
                const tab = document.getElementById('tab-battle');
                const panel = document.querySelector('#tab-battle .combat-panel').getBoundingClientRect();
                const log = document.querySelector('#tab-battle .combat-feed').getBoundingClientRect();
                const field = document.getElementById('battlefield-wrap').getBoundingClientRect();
                const nav = document.getElementById('tab-header-bottom').getBoundingClientRect();
                return { overflow: tab.scrollHeight - tab.clientHeight, gap: nav.top - panel.bottom,
                    logBottom: log.bottom, fieldBottom: field.bottom, navTop: nav.top, fieldHeight: field.height };
            });
            expect(bounds.overflow).toBeLessThan(3);
            expect(bounds.gap).toBeGreaterThanOrEqual(0); expect(bounds.gap).toBeLessThan(26);
            expect(bounds.logBottom).toBeLessThanOrEqual(bounds.navTop);
            expect(bounds.fieldBottom).toBeLessThanOrEqual(bounds.navTop);
            expect(bounds.fieldHeight).toBeGreaterThan(160);
        }
        const gauges = await page.evaluate(() => {
            const stats = { ...getPlayerStats(), maxHp: 100, energyShield: 100 };
            game.playerHp = 80; game.playerEnergyShield = 60; updateCombatUI(stats);
            const hp = document.getElementById('ui-hp-bar').getBoundingClientRect();
            const es = document.getElementById('ui-es-track').getBoundingClientRect();
            return { hpBottom: hp.bottom, esTop: es.top, esHeight: es.height };
        });
        expect(gauges.hpBottom).toBeLessThanOrEqual(gauges.esTop);
        expect(gauges.esHeight).toBeGreaterThanOrEqual(12);
        await expect(page.locator('#ui-es-inline')).toHaveText('ES 60/100');
        expect(Number(await page.locator('#ui-hp').textContent())).toBe(80);
        await page.screenshot({ path: info.outputPath(`battle-${viewport.width}.png`), scale: 'css' });
    }
    expect(errors).toEqual([]);
});

test('shared choice controls follow both game themes', async ({ page }, info) => {
    await page.route('https://**', route => route.fulfill({ status: 204, body: '' }));
    await page.goto('/');
    // Native controls are platform boundaries; use the same unclassed controls as legacy screens.
    await page.evaluate(() => {
        const section = document.createElement('section'); section.id = 'choice-preview';
        section.style = 'position:fixed;inset:20px auto auto 20px;z-index:99999;padding:20px;background:var(--ui-surface-1)';
        section.innerHTML = '<label><input type="checkbox" checked> 선택</label><select aria-label="검사 선택"><option>기본</option><option>변경</option></select>';
        document.body.append(section);
    });
    for (const light of [false, true]) {
        await page.evaluate(light => document.body.classList.toggle('light-mode', light), light);
        const colors = await page.locator('#choice-preview').evaluate(el => {
            const checkbox = getComputedStyle(el.querySelector('input')), select = getComputedStyle(el.querySelector('select'));
            return { accent: checkbox.accentColor, scheme: select.colorScheme, background: select.backgroundColor };
        });
        expect(colors.accent).not.toBe('auto'); expect(colors.scheme).toBe(light ? 'light' : 'dark');
        await page.getByRole('combobox', { name: '검사 선택' }).selectOption({ label: '변경' });
        await expect(page.getByRole('combobox', { name: '검사 선택' })).toHaveValue('변경');
        await page.locator('#choice-preview').screenshot({ path: info.outputPath(`choices-${light}.png`) });
    }
});

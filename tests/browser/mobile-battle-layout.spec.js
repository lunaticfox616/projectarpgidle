const { test, expect } = require('@playwright/test');

async function checkStableStatusRow(page, screenshotPath) {
    const field = page.locator('#battlefield-wrap');
    const before = await field.boundingBox();
    await page.evaluate(() => {
        game.playerAilments = ['ignite', 'chill', 'shock', 'poison', 'bleed'].map(type => ({ type, time: 10, duration: 10, power: .1 }));
        updatePlayerCombatEffectHud(getPlayerStats());
    });
    const effects = page.locator('#ui-player-ailments-under');
    await expect(effects.locator('.combat-effect-icon')).toHaveCount(5);
    const boxes = await Promise.all(['.player-hud-skill-rack', '#ui-player-ailments-under', '#ui-combat-flasks'].map(selector => page.locator(selector).boundingBox()));
    expect(boxes[2].x).toBeLessThan(boxes[1].x);
    expect(boxes[1].x).toBeLessThan(boxes[0].x);
    expect(Math.max(...boxes.map(box => box.y)) - Math.min(...boxes.map(box => box.y))).toBeLessThan(2);
    expect((await field.boundingBox()).y).toBeCloseTo(before.y, 0);
    await effects.evaluate(el => { el.scrollLeft = el.scrollWidth; });
    expect(await effects.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
    await page.screenshot({ path: screenshotPath, scale: 'css' });
    await page.evaluate(() => { game.playerAilments = []; updatePlayerCombatEffectHud(getPlayerStats()); });
    expect((await field.boundingBox()).y).toBeCloseTo(before.y, 0);
}

test('mobile battle keeps readable health, touchable flasks and an optional complete log', async ({ page }, info) => {
    test.skip(!info.project.use.isMobile, 'Mobile battle layout');
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://**', route => route.fulfill({ status: 204, body: '' }));
    await page.goto('/');
    await page.locator('#btn-startup-guest').tap();
    await page.locator('[data-class-id="warrior"]').tap();
    await page.waitForFunction(() => battleAssets.ready && !uiRefreshRunning && !uiRefreshQueued);
    await page.evaluate(() => {
        clearInterval(gameTickHandle); gameTickHandle = null;
        tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false);
        game.contentProgression.inherited = ['craft', 'flask']; contentProgression.sync();
        game.season = 2; contentProgression.sync();
        game.settings.combatLogCollapsed = false;
        game.currentZoneId = 1;
        game.activeSkill = '연속 베기';
        game.equippedSummonSkills = Object.keys(SKILL_DB).filter(name => SKILL_DB[name].tags?.includes('summon_attack')).slice(0, 3);
        game.enemies = Array.from({ length: 12 }, (_, id) => createEnemy(getZone(1), { boss: id === 0 }, id));
        addLog('모바일 전투 로그 검증', 'system', { noToast: true });
        updateStaticUI();
    });
    const toggle = page.locator('#btn-combat-log-toggle');
    await expect(page.locator('#btn-combat-chat-tab')).toBeHidden();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#log')).toBeHidden();
    await toggle.tap();
    await expect(page.locator('#log')).toBeVisible();
    await expect(page.locator('#log')).toContainText('모바일 전투 로그 검증');
    await toggle.tap();
    expect(await page.evaluate(() => game.settings.combatLogCollapsed)).toBe(false);
    for (const viewport of [{width:412,height:915},{width:360,height:800},{width:915,height:412}]) {
        await page.setViewportSize(viewport);
        const geometry = await page.evaluate(() => {
            const hp = document.querySelector('.player-health-frame .hp-text');
            const frame = document.querySelector('.player-health-frame').getBoundingClientRect();
            const field = document.getElementById('battlefield-wrap').getBoundingClientRect();
            const flasks = [...document.querySelectorAll('#ui-combat-flasks button')].map(el => el.getBoundingClientRect().width);
            return { font: parseFloat(getComputedStyle(hp).fontSize), hpBottom: frame.bottom, hpRight: frame.right, fieldTop: field.top, fieldLeft: field.left,
                fieldBottom: field.bottom, navigationTop: document.getElementById('tab-header-bottom').getBoundingClientRect().top, flasks };
        });
        expect(geometry.font).toBeGreaterThanOrEqual(14);
        if (viewport.width > viewport.height) {
            expect(geometry.hpRight).toBeLessThanOrEqual(geometry.fieldLeft);
            expect(geometry.fieldBottom).toBeLessThanOrEqual(geometry.navigationTop);
        } else expect(geometry.hpBottom).toBeLessThanOrEqual(geometry.fieldTop);
        expect(geometry.flasks.length).toBeGreaterThan(0);
        expect(Math.min(...geometry.flasks)).toBeGreaterThanOrEqual(44);
        await checkStableStatusRow(page, info.outputPath('battle-effects-' + viewport.width + '.png'));
        await page.screenshot({ path: info.outputPath('battle-' + viewport.width + '.png'), scale: 'css' });
    }
    expect(errors).toEqual([]);
});

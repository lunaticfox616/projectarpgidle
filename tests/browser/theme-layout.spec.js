const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
    await page.route('https://**', route => route.fulfill({ status: 204, body: '' }));
    await page.goto('/');
    await page.locator('#btn-startup-guest').click();
    await page.locator('[data-class-id="warrior"]').click();
    await page.waitForFunction(() => battleAssets.ready && !uiRefreshRunning && !uiRefreshQueued);
    await page.evaluate(() => {
        clearInterval(gameTickHandle); gameTickHandle = null;
        tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false);
        game.unlocks.items = true; game.unlocks.skills = true;
        updateStaticUI();
    });
});

test('theme changes preserve battle and management layout', async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const screens = {
        'tab-battle': ['.combat-zone-row', '.battlefield-wrap', '.player-hud', '.player-health-frame', '.combat-feed', '.ui-goal-drawer'],
        'tab-character': ['.character-stat-section', '.character-ehp-grid'],
        'tab-items': ['.equipment-paperdoll', '.equipment-triage-host', '.inventory-browse-toolbar'],
        'tab-skills': ['.skill-subtab-row', '.attack-library'],
        'tab-settings': ['.cfg-disclosure--card']
    };
    for (const [tab, children] of Object.entries(screens)) {
        await page.evaluate(tab => switchTab(tab, { keepWindowOpen: true }), tab);
        const samples = [];
        for (const theme of ['dark', 'light', 'dark']) {
            await page.evaluate(theme => { applyThemeMode(theme); updateStaticUI(); }, theme);
            await page.waitForFunction(() => !uiRefreshRunning && !uiRefreshQueued);
            const root = page.locator(tab === 'tab-battle' ? '.combat-panel' : '#' + tab);
            await expect(root).toBeVisible();
            samples.push(await root.evaluate((root, children) => {
                return [root, ...children.map(selector => root.querySelector(selector))].map(el => {
                    if (!el || !el.getClientRects().length) return null;
                    const r = el.getBoundingClientRect();
                    return { x: r.x, y: r.y, width: r.width, height: r.height };
                });
            }, children));
        }
        for (const current of samples.slice(1)) current.forEach((rect, i) => {
            if (!rect || !samples[0][i]) return expect(rect).toEqual(samples[0][i]);
            for (const key of Object.keys(rect)) {
                expect(Math.abs(rect[key] - samples[0][i][key]), tab + ' ' + (children[i - 1] || 'window') + ' ' + key).toBeLessThanOrEqual(1);
            }
        });
    }
    expect(errors).toEqual([]);
});

test('elemental effective health belongs to defense with distinct readable colors', async ({ page }, testInfo) => {
    await page.evaluate(() => switchTab('tab-character'));
    const defense = page.locator('.character-stat-section').filter({ has: page.locator('summary', { hasText: '방어 · 회복' }) });
    const health = defense.locator('#ui-character-ehp');
    await expect(health).toBeVisible();
    await expect(health.locator('[data-ehp-element]')).toHaveCount(5);
    for (const theme of ['dark', 'light']) {
        await page.evaluate(theme => applyThemeMode(theme), theme);
        const colors = await health.locator('[data-ehp-element]').evaluateAll(cards => cards.map(card => {
            const name = getComputedStyle(card.querySelector('span')).color;
            const value = getComputedStyle(card.querySelector('strong')).color;
            return { name, value };
        }));
        expect(new Set(colors.map(row => row.value)).size).toBe(5);
        expect(colors.every(row => row.name === row.value)).toBe(true);
        await health.scrollIntoViewIfNeeded();
        await page.screenshot({ path: testInfo.outputPath('defense-' + theme + '.png'), animations: 'disabled' });
        await defense.locator('summary').click();
        await expect(health).not.toBeVisible();
        await defense.locator('summary').click();
        await expect(health).toBeVisible();
    }
});

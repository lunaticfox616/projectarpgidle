const { test, expect } = require('@playwright/test');

test('talent browsing limits mobile cards, searches every owned combination and equips explicitly', async ({ page }, info) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://**', route => route.fulfill({ status: 204, body: '' }));
    await page.goto('/');
    await page.locator('#btn-startup-guest').click();
    await page.locator('[data-class-id="warrior"]').click();
    await page.waitForFunction(() => battleAssets.ready && !uiRefreshRunning && !uiRefreshQueued);
    const fixture = await page.evaluate(() => {
        clearInterval(gameTickHandle); gameTickHandle = null; game.season = 100; game.level = 100;
        game.contentProgression.inherited = CONTENT_UNLOCK_CATALOG.map(row => row.id); contentProgression.sync();
        game.talentCards = {};
        for (const hero of HERO_SELECTION_ORDER) for (const cls of Object.keys(CLASS_TEMPLATES)) {
            game.talentCards[makeTalentComboKey(hero, cls)] = { level: 3, score: 300, count: 1 };
        }
        game.talentCardLoadout = []; openTabPane('tab-talent'); updateStaticUI();
        const keys = Object.keys(game.talentCards), last = keys[keys.length - 1];
        const { heroId, classKey } = parseTalentComboKey(last);
        return { count: keys.length, last, name: getTalentCardName(heroId, classKey).bloomName };
    });
    await page.waitForFunction(() => {
        if (uiRefreshRunning || uiRefreshQueued) return false;
        tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false); return true;
    });
    if (!info.project.use.isMobile) {
        await expect(page.locator('.talent-card')).toHaveCount(fixture.count);
        await expect(page.locator('.talent-bloom-navigator')).toBeVisible();
        await page.locator('.talent-card').last().click();
        await expect.poll(() => page.evaluate(() => game.talentCardLoadout.filter(Boolean))).toEqual([fixture.last]);
        await expect(page.locator('.talent-card.equipped')).toContainText(fixture.name);
        expect(errors).toEqual([]); return;
    }
    await expect(page.locator('.talent-card')).toHaveCount(6);
    await page.locator('[data-talent-page="1"]').tap();
    await expect(page.locator('.talent-mobile-pager')).toContainText('2 /');
    await page.locator('[data-talent-search]').fill(fixture.name);
    await page.locator('[data-talent-search]').press('Enter');
    const equip = page.locator(`[data-talent-equip="${fixture.last}"]`);
    await expect(equip).toBeVisible();
    await page.locator('.talent-card').first().tap();
    expect(await page.evaluate(() => game.talentCardLoadout.filter(Boolean))).toEqual([]);
    await equip.tap();
    await expect.poll(() => page.evaluate(() => game.talentCardLoadout.filter(Boolean))).toEqual([fixture.last]);
    await page.locator('[data-talent-unequip="0"]').tap();
    await expect.poll(() => page.evaluate(() => game.talentCardLoadout.filter(Boolean))).toEqual([]);
    await page.locator('[data-talent-search]').fill('없는-재능-123');
    await page.locator('.talent-mobile-search button').tap();
    await expect(page.locator('.talent-card')).toHaveCount(0);
    await expect(page.locator('.talent-bloom-empty')).toBeVisible();
    await page.locator('[data-talent-search]').fill('');
    await page.locator('[data-talent-search]').press('Enter');
    await page.locator('[data-talent-dimension]').selectOption('class');
    const value = await page.locator('[data-talent-filter] option').nth(1).getAttribute('value');
    await page.locator('[data-talent-filter]').selectOption(value);
    expect(await page.locator('.talent-card').count()).toBeLessThanOrEqual(6);
    const filteredKeys = await page.locator('[data-talent-equip]').evaluateAll(buttons => buttons.map(button => button.dataset.talentEquip));
    expect(filteredKeys.every(key => key.endsWith('__' + value))).toBe(true);
    expect(await page.evaluate(() => Object.keys(game.talentCards).length)).toBe(fixture.count);
    await page.locator('[data-talent-search]').fill('" autofocus onfocus="alert(1)');
    await page.locator('[data-talent-search]').press('Enter');
    await expect(page.locator('[data-talent-search]')).toHaveValue('" autofocus onfocus="alert(1)');
    await expect(page.locator('[data-talent-search]')).not.toHaveAttribute('onfocus');
    await page.evaluate(() => { game.talentCards = {}; renderTalentTab(); });
    await expect(page.locator('.talent-card')).toHaveCount(0);
    await expect(page.locator('.talent-slot.locked')).toHaveCount(6);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    expect(errors).toEqual([]);
});

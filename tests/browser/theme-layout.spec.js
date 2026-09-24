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

test('elemental effective health belongs to defense with distinct readable colors', async ({ page }, testInfo) => {
    await page.evaluate(() => switchTab('tab-character'));
    const navigation = page.locator('#tab-character .mobile-section-navigation');
    if (testInfo.project.use.isMobile) await navigation.getByRole('tab', { name: '방어 · 회복' }).click();
    const defense = page.locator('.character-stat-section').filter({ has: page.locator('summary', { hasText: '방어 · 회복' }) });
    const health = defense.locator('#ui-character-ehp');
    await expect(health).toBeVisible();
    await expect(health.locator('[data-ehp-element]')).toHaveCount(5);
    const colors = await health.locator('[data-ehp-element]').evaluateAll(cards => cards.map(card => {
        const name = getComputedStyle(card.querySelector('span')).color;
        const value = getComputedStyle(card.querySelector('strong')).color;
        return { name, value };
    }));
    expect(new Set(colors.map(row => row.value)).size).toBe(5);
    expect(colors.every(row => row.name === row.value)).toBe(true);
    await health.scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath('defense-dark.png'), animations: 'disabled' });
    if (testInfo.project.use.isMobile) await navigation.getByRole('tab', { name: '공격', exact: true }).click();
    else await defense.locator('summary').click();
    await expect(health).not.toBeVisible();
    if (testInfo.project.use.isMobile) await navigation.getByRole('tab', { name: '방어 · 회복' }).click();
    else await defense.locator('summary').click();
    await expect(health).toBeVisible();
});

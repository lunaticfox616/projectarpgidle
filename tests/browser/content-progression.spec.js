const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
    await page.route('https://**', route => route.fulfill({ status: 204, body: '' }));
    await page.goto('/');
    await page.locator('#btn-startup-guest').click();
    await page.locator('[data-class-id="warrior"]').click();
    await page.waitForFunction(() => battleAssets.ready && !isStartupOverlayOpen() && !isLoadingOverlayOpen() && !uiRefreshRunning && !uiRefreshQueued);
    await page.evaluate(() => {
        clearInterval(gameTickHandle); gameTickHandle = null;
        tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false);
    });
});

test('loop one exposes the four basics and prevents advanced shortcuts', async ({ page }, info) => {
    await expect(page.locator('#ui-combat-flasks')).toBeHidden();
    await expect(page.locator('#ui-combat-flasks .combat-flask-mini')).toHaveCount(0);
    expect(await page.evaluate(() => ['tab-character','tab-char','tab-items','tab-skills'].every(isTabSurfaceAvailable))).toBe(true);
    expect(await page.evaluate(() => ['tab-unlocks','tab-season','tab-map','tab-flask'].some(id => contentProgression.canOpen(id)))).toBe(false);
    expect(await page.evaluate(() => contentProgression.canOpen('tab-journal'))).toBe(true);
    await page.evaluate(() => { switchTab('tab-items'); updateStaticUI(); });
    await expect(page.locator('#item-tab-equip')).toBeVisible();
    for (const id of ['craft','fossil','market','hall','infuser']) await expect(page.locator('#btn-item-tab-' + id)).toBeHidden();
    await page.evaluate(() => { switchItemSubtab('item-tab-craft'); switchTab('tab-skills'); updateStaticUI(); });
    await expect(page.locator('.attack-library')).toBeVisible();
    await expect(page.locator('.support-library')).toBeHidden();
    for (const id of ['enhance','research','condition']) await expect(page.locator('#btn-skill-tab-' + id)).toBeHidden();
    await page.evaluate(() => { switchSkillSubtab('skill-tab-enhance'); switchTab('tab-unlocks'); });
    expect(await page.evaluate(() => game.skillSubtab)).toBe('skill-tab-equip');
    await page.screenshot({ path: info.outputPath('loop-one.png') });
});


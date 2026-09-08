const { test, expect } = require('@playwright/test');

for (const scale of [1, 1.25, 1.5]) test(`desktop scale ${scale} keeps battle and log visible across the layout boundary`, async ({ browser, baseURL }, info) => {
    test.skip(info.project.name !== 'desktop-chromium', 'Desktop display scaling');
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: scale });
    const page = await context.newPage();
    await page.route('https://**', route => route.fulfill({ status: 204, body: '' }));
    await page.goto(baseURL);
    await page.locator('#btn-startup-guest').click();
    await page.locator('[data-class-id="warrior"]').click();
    await page.waitForFunction(() => battleAssets.ready && !uiRefreshRunning && !uiRefreshQueued);
    await page.evaluate(() => {
        clearInterval(gameTickHandle); gameTickHandle = null;
        tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false);
        game.settings.combatLogCollapsed = false; applyPanelLayoutSettings();
    });
    for (const width of [1000, 820, 700, 1000, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await page.evaluate(() => switchTab('tab-battle'));
        await page.screenshot({ path: info.outputPath(`battle-${width}.png`), scale: 'css' });
        await expect(page.locator('#battlefield-wrap')).toBeVisible();
        await expect(page.locator('.combat-feed')).toBeVisible();
        expect(await page.evaluate(() => document.body.classList.contains('mobile-battle-tab')))
            .toBe(await page.evaluate(() => uiDisplay.matches('(max-width: 1080px)')));
        await page.evaluate(() => openCommunityDock());
        await expect(page.locator('#tab-social')).toBeVisible();
        await page.evaluate(() => { closeCommunityDock(); switchTab('tab-battle'); });
    }
    await context.close();
});

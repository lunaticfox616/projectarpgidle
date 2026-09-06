const { test, expect } = require('@playwright/test');

// Same physical panel area as the user's 1186x742 CSS viewport at DPR 1.25.
// OS settings remain untouched; both CSS viewport and DPR change together.
for (const scale of [1, 1.25, 1.5]) test.describe(`display scale ${scale}`, () => {
    test.use({ viewport: { width: Math.round(1482.5 / scale), height: Math.round(927.5 / scale) }, deviceScaleFactor: scale });
    test('choices and saved windows remain usable in dark and light', async ({ page }, info) => {
        test.skip(info.project.name !== 'desktop-chromium', 'Explicit viewport/DPR matrix uses the desktop browser.');
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.route('https://**', route => route.fulfill({ status: 204, body: '' }));
        await page.addInitScript(() => localStorage.setItem('project-arpg-idle-ui-layout-v1', JSON.stringify({
            version: 1, workspacePresentationVersion: 1, passiveTreePresentationVersion: 1,
            windows: { 'tab-character': { x: 900, y: 650, width: 900, height: 750, maximized: false } }
        })));
        await page.goto('/');
        await page.locator('#btn-startup-guest').click();
        await page.locator('[data-class-id="warrior"]').click();
        await page.waitForFunction(() => battleAssets.ready && !isStartupOverlayOpen() && !isLoadingOverlayOpen() && !uiRefreshRunning && !uiRefreshQueued);
        await page.evaluate(() => {
            clearInterval(gameTickHandle); gameTickHandle = null;
            game.season = 2; checkUnlocks(); tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false);
        });
        for (const theme of ['dark', 'light']) {
            await page.evaluate(theme => { applyThemeMode(theme); switchTab('tab-unlocks'); updateStaticUI(); }, theme);
            await expect(page.locator('[data-unlock-content]:enabled')).toHaveCount(1);
            await expect(page.locator('#content-unlock-panel')).toBeVisible();
            expect(await page.locator('#content-unlock-panel').evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
            await page.screenshot({ path: info.outputPath(`choices-${theme}.png`), scale: 'css' });
            for (const tab of ['tab-character', 'tab-items', 'tab-skills', 'tab-settings']) {
                await page.evaluate(tab => { switchTab(tab); updateStaticUI(); }, tab);
                await expect(page.locator('#' + tab)).toBeVisible();
                await assertContained(page, tab);
            }
        }
        if (scale < 1.5) {
            await page.evaluate(() => switchTab('tab-character'));
            await page.setViewportSize({ width: 1100, height: 600 });
            await assertContained(page, 'tab-character');
            const bar = page.locator('#tab-character > .ui-window-titlebar');
            const box = await bar.boundingBox();
            await page.mouse.move(box.x + 60, box.y + 16);
            await page.mouse.down(); await page.mouse.move(box.x + 60, 590); await page.mouse.up();
            await assertContained(page, 'tab-character');
            await page.locator('#tab-character [data-window-action="close"]').click();
            await expect(page.locator('#tab-character')).toBeHidden();
        }
        expect(errors).toEqual([]);
    });
});

async function assertContained(page, tab) {
    const bounds = await page.locator('#' + tab).evaluate(el => {
        const rect = el.getBoundingClientRect();
        return { left: rect.left, right: rect.right, bottom: rect.bottom, width: innerWidth, height: innerHeight,
            desktop: document.body.classList.contains('desktop-windowed-ui'), overflow: el.scrollWidth - el.clientWidth };
    });
    expect(bounds.left).toBeGreaterThanOrEqual(0);
    expect(bounds.right).toBeLessThanOrEqual(bounds.width + 1);
    expect(bounds.overflow).toBeLessThanOrEqual(1);
    if (bounds.desktop) expect(bounds.bottom).toBeLessThanOrEqual(bounds.height);
}

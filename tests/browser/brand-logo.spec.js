const { test, expect } = require('@playwright/test');

test('original logo loads on login and the rail logo clears windows like the cleanup button', async ({ page }, testInfo) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://**', route => route.fulfill({status:204,body:''}));
    await page.goto('/');
    const loginLogo = page.locator('#startup-overlay .startup-logo');
    await expect(loginLogo).toBeVisible();
    await expect.poll(() => loginLogo.evaluate(el => el.complete && el.naturalWidth)).toBe(1254);
    const size = await loginLogo.boundingBox();
    expect(size.width).toBeCloseTo(size.height, 0);
    expect(size.x).toBeGreaterThanOrEqual(0);
    expect(size.x + size.width).toBeLessThanOrEqual(page.viewportSize().width);
    await page.screenshot({path:testInfo.outputPath('login-logo.png')});
    await page.locator('#btn-startup-guest').click();
    await page.locator('#loop-hero-select-overlay [data-class-id]').first().click();
    await page.waitForFunction(() => !uiRefreshRunning && !uiRefreshQueued);
    await page.evaluate(() => {tutorialQueue.length=0;if(activeTutorial)dismissTutorial(false);});
    const logo = page.getByRole('button', {name:'RIGNIN · 열린 창 모두 닫기',exact:true});
    if (testInfo.project.name.startsWith('mobile')) {
        await expect(logo).toHaveCount(0);
        expect(errors).toEqual([]);
        return;
    }
    await expect(logo).toHaveCount(1);
    await expect(logo).toBeVisible();
    await expect.poll(() => logo.locator('img').evaluate(el => el.complete && el.naturalWidth)).toBe(1254);
    for (const trigger of ['#btn-close-all-windows', '#ui-rail-logo']) {
        await page.evaluate(() => {openWindow('tab-character');openWindow('tab-items');minimizeWindow('tab-character');});
        await expect(page.locator('#tab-items')).toBeVisible();
        await page.locator(trigger).click();
        await expect(page.locator('#tab-items')).toBeHidden();
        await expect(page.locator('#tab-character')).toBeHidden();
        await expect(page.locator('.ui-rail-tab-layer .ui-window-open')).toHaveCount(0);
    }
    await page.evaluate(() => openWindow('tab-items'));
    await logo.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#tab-items')).toBeHidden();
    await page.screenshot({path:testInfo.outputPath('rail-logo.png')});
    await page.setViewportSize({width:600,height:800});
    await expect(logo).toHaveCount(0);
    await page.setViewportSize({width:1440,height:900});
    await expect(logo).toHaveCount(1);
    await page.evaluate(() => openWindow('tab-items'));
    await logo.click();
    await expect(page.locator('#tab-items')).toBeHidden();
    expect(errors).toEqual([]);
});

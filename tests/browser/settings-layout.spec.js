const { test, expect } = require('@playwright/test');

test('settings edit unlocked menus independently for PC and mobile', async ({ page }, testInfo) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://**', route => route.fulfill({ status: 204, body: '' }));
    await page.goto('/');
    await page.locator('#btn-startup-guest').click();
    await page.locator('#loop-hero-select-overlay [data-class-id="warrior"]').click();
    await page.waitForFunction(() => battleAssets.ready && !uiRefreshRunning && !uiRefreshQueued);
    await page.evaluate(() => {
        clearInterval(gameTickHandle); gameTickHandle = null;
        tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false);
        game.unlocks.items = true; game.unlocks.char = true; game.unlocks.skills = true;
        updateStaticUI(); switchTab('tab-settings');
    });
    await expect(page.locator('.cfg-disclosure--card')).toHaveAttribute('open', '');
    if(testInfo.project.use.isMobile) await page.locator('#settings-category').selectOption('layout');
    await page.locator('.cfg-disclosure--tab-order > summary').click();
    const editor = page.locator('#ui-tab-order-settings');
    await expect(editor.locator('[data-tab="btn-tab-pruning"]')).toHaveCount(0);
    await expect(editor.locator('[data-tab="btn-tab-growthboard"]')).toHaveCount(0);
    const platform = editor.getByLabel('편집할 화면');
    await platform.selectOption('desktop');
    await editor.locator('[data-move="-1"][data-tab="btn-tab-items"]').click();
    await editor.locator('[data-place="btn-tab-skills"]').selectOption('bottom');
    const desktop = await page.evaluate(() => JSON.stringify(game.settings.tabLayouts.desktop));
    await platform.selectOption('mobile');
    await editor.locator('[data-move="-1"][data-tab="btn-tab-skills"]').click();
    await editor.locator('[data-place="btn-tab-items"]').selectOption('bottom');
    expect(await page.evaluate(() => JSON.stringify(game.settings.tabLayouts.desktop))).toBe(desktop);
    expect(await page.evaluate(() => game.settings.tabLayouts.mobile.tabPlacement['btn-tab-skills'])).toBeUndefined();
    expect(await page.evaluate(() => game.settings.tabLayouts.mobile.tabPlacement['btn-tab-items'])).toBe('bottom');
    const current = testInfo.project.name.startsWith('desktop') ? 'desktop' : 'mobile';
    if (current === 'desktop') {
        expect(await page.locator('#btn-tab-skills').evaluate(el => el.parentElement.id)).toBe('ui-rail-misc-panel');
        expect(await page.locator('#btn-tab-items').evaluate(el => el.parentElement.className)).toBe('ui-rail-tab-layer');
    } else {
        expect(await page.locator('#btn-tab-items').evaluate(el => el.parentElement.id)).toBe('tab-header-main');
        expect(await page.locator('#btn-tab-skills').evaluate(el => el.parentElement.id)).toBe('tab-header-bottom');
    }
    await platform.selectOption(current);
    await editor.scrollIntoViewIfNeeded();
    const bounds = await editor.boundingBox();
    expect(bounds.width).toBeLessThanOrEqual(page.viewportSize().width);
    await page.screenshot({ path: testInfo.outputPath('settings-menu.png') });
    if(testInfo.project.use.isMobile) await page.locator('#settings-category').selectOption('display');
    await page.locator('#sel-theme-mode').selectOption('light');
    await expect(page.locator('body')).toHaveClass(/light-mode/);
    await page.locator('#sel-theme-mode').scrollIntoViewIfNeeded();
    const colors = await page.locator('#sel-theme-mode').evaluate(el => {
        const style = getComputedStyle(el);
        const probe = document.createElement('span');
        probe.style.backgroundColor = 'var(--ui-surface-1)';
        el.parentElement.append(probe);
        const surface = getComputedStyle(probe).backgroundColor;
        probe.remove();
        return { foreground: style.color, background: style.backgroundColor, surface };
    });
    expect(colors.foreground).toBe('rgb(41, 39, 31)');
    expect(colors.background).toBe(colors.surface);
    if (current === 'desktop') {
        expect(await page.locator('#right-pane').evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
        expect(await page.locator('#tab-settings .ui-window-title').evaluate(el => getComputedStyle(el).color)).toBe('rgb(41, 39, 31)');
    }
    await page.screenshot({ path: testInfo.outputPath('settings-light.png') });
    await expect(page.locator('.cfg-disclosure--card')).toHaveAttribute('open', '');
    if (current === 'desktop') {
        await page.setViewportSize({ width: 900, height: 900 });
        await expect(page.locator('body')).toHaveClass(/mobile-primary-navigation/);
        await expect(page.locator('#tab-header-bottom > .tab-btn').first()).toHaveAttribute('id', 'btn-tab-battle');
        expect(await page.locator('#btn-tab-items').evaluate(el => el.parentElement.id)).toBe('tab-header-main');
        await page.locator('#btn-mobile-nav-more').click();
        await expect(page.locator('#btn-tab-items')).toBeVisible();
        await page.screenshot({ path: testInfo.outputPath('settings-tablet.png') });
    }
    expect(errors).toEqual([]);
});

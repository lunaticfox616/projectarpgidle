const { test, expect } = require('@playwright/test');

test('desktop rail sends tabs to miscellaneous only when the available height runs out', async ({page},info) => {
    test.skip(info.project.use.isMobile, 'Desktop rail; mobile keeps its full-menu navigation.');
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.route('https://**',route=>route.fulfill({status:204,body:''}));
    await page.goto('/');
    await page.locator('#btn-startup-guest').click();
    await page.locator('#loop-hero-select-overlay [data-class-id]').first().click();
    await page.waitForFunction(()=>!uiRefreshRunning && !uiRefreshQueued);
    await page.evaluate(()=>{
        clearInterval(gameTickHandle);gameTickHandle=null;
        game.season=60;game.contentProgression.inherited=CONTENT_UNLOCK_CATALOG.map(row=>row.id);
        Object.keys(game.unlocks).forEach(key=>game.unlocks[key]=true);
        const layout=game.settings.tabLayouts.desktop;
        layout.tabPlacement={};
        layout.tabOrder=tabLayoutUi.defaultOrder.filter(id=>id!=='btn-tab-pruning').concat('btn-tab-pruning');
        updateStaticUI();
    });
    await page.waitForFunction(()=>{
        if(uiRefreshRunning||uiRefreshQueued)return false;
        tutorialQueue.length=0;if(activeTutorial)dismissTutorial(false);return true;
    });
    const order=await page.evaluate(()=>JSON.stringify(game.settings.tabLayouts.desktop));
    await page.setViewportSize({width:1440,height:2000});
    await expect(page.locator('#ui-rail-misc-panel')).toHaveAttribute('data-rail-overflow','0');
    const largeCount=await page.locator('.ui-rail-tab-layer .tab-btn:visible').count();
    expect(largeCount).toBeGreaterThan(11);
    await expect(page.locator('.ui-rail-tab-layer #btn-tab-pruning')).toBeVisible();
    await page.setViewportSize({width:1440,height:540});
    await expect(page.locator('#ui-rail-misc-panel #btn-tab-pruning')).toHaveCount(1);
    expect(await page.locator('.ui-rail-tab-layer .tab-btn:visible').count()).toBeLessThan(largeCount);
    expect(await page.locator('.ui-rail-tab-layer').evaluate(el=>el.scrollHeight<=el.clientHeight+1)).toBe(true);
    await page.locator('#btn-ui-rail-misc').click();
    await page.locator('#ui-rail-misc-panel #btn-tab-pruning').click();
    await expect(page.locator('#tab-pruning')).toBeVisible();
    await page.screenshot({path:info.outputPath('small-rail.png'),scale:'css'});
    await page.setViewportSize({width:1440,height:2000});
    await expect(page.locator('#ui-rail-misc-panel')).toHaveAttribute('data-rail-overflow','0');
    await expect(page.locator('.ui-rail-tab-layer #btn-tab-pruning')).toBeVisible();
    await expect(page.locator('.ui-rail-tab-layer .tab-btn:visible')).toHaveCount(largeCount);
    expect(await page.evaluate(()=>JSON.stringify(game.settings.tabLayouts.desktop))).toBe(order);
    expect(errors).toEqual([]);
});

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

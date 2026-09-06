const { test, expect } = require('@playwright/test');

async function start(page) {
    await page.route('https://**', route => route.fulfill({ status: 204, body: '' }));
    await page.goto('/');
    await page.locator('#btn-startup-guest').click();
    await page.locator('[data-class-id="warrior"]').click();
    await page.waitForFunction(() => battleAssets.ready && !isStartupOverlayOpen() && !isLoadingOverlayOpen() && !uiRefreshRunning && !uiRefreshQueued);
    await page.evaluate(() => {
        clearInterval(gameTickHandle); gameTickHandle = null;
        tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false);
        switchTab('tab-settings');
    });
}

test('same physical area keeps identical UI size at Windows 100, 125 and 150 percent', async ({ browser, baseURL }, info) => {
    test.skip(info.project.name !== 'desktop-chromium');
    test.setTimeout(120000);
    let reference;
    for (const dpr of [1, 1.25, 1.5]) {
        const context = await browser.newContext({ baseURL, viewport: { width: 1500 / dpr, height: 900 / dpr }, deviceScaleFactor: dpr, serviceWorkers: 'block' });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await start(page);
        await expect(page.locator('body')).toHaveClass(/desktop-windowed-ui/);
        await expect(page.locator('#sel-ui-scale')).toHaveValue('100');
        const sizes = await page.evaluate(() => {
            const physical = id => {
                const rect = document.getElementById(id).getBoundingClientRect();
                return [rect.x, rect.y, rect.width, rect.height].map(v => v * devicePixelRatio);
            };
            return { factor: uiDisplay.factor, button: physical('btn-tab-items'), window: physical('tab-settings'), scale: physical('sel-ui-scale') };
        });
        expect(sizes.factor).toBeCloseTo(1 / dpr, 5);
        if (!reference) reference = sizes;
        // Native fractional border rounding can slightly shift positions; verify actual sizes.
        for (const key of ['button', 'window', 'scale']) sizes[key].slice(2).forEach((v, i) => expect(Math.abs(v - reference[key][i + 2])).toBeLessThan(2));
        await page.locator('#sel-ui-scale').scrollIntoViewIfNeeded();
        await page.screenshot({ path: info.outputPath(`windows-${dpr * 100}.png`), scale: 'device' });
        await page.locator('#sel-ui-scale').selectOption('125');
        expect(await page.evaluate(() => uiDisplay.factor)).toBeCloseTo(1.25 / dpr, 5);
        const enlarged = await page.locator('#sel-ui-scale').boundingBox();
        expect(enlarged.height * dpr / reference.scale[3]).toBeCloseTo(1.25, 1);
        await page.locator('#sel-ui-scale').selectOption('80');
        await page.reload();
        await page.locator('#btn-startup-guest').click();
        await page.waitForFunction(() => !isStartupOverlayOpen() && !isLoadingOverlayOpen() && !uiRefreshRunning && !uiRefreshQueued);
        expect(await page.evaluate(() => [game.settings.uiScale, uiDisplay.factor])).toEqual([80, .8 / dpr]);
        expect(errors).toEqual([]);
        await context.close();
    }
});

for (const percent of ['80', '125']) test(`manual scale ${percent} keeps canvas hit targets and window dragging aligned`, async ({ page }, info) => {
    await start(page);
    await page.locator('#sel-ui-scale').selectOption(percent);
    await page.evaluate(() => switchTab('tab-char'));
    await page.waitForFunction(() => document.getElementById('tree-canvas').clientWidth > 50);
    const canvas = page.locator('#tree-canvas');
    const dimensions = await canvas.evaluate(el => ({ w: el.getBoundingClientRect().width, parent: el.parentElement.getBoundingClientRect().width }));
    expect(Math.abs(dimensions.w - dimensions.parent)).toBeLessThan(2);
    const position = await page.evaluate(() => {
        const node = passiveRenderCache.nodes.find(n => getPassiveVisibility(n.id) !== 'hidden');
        camX = -node.x * camZoom; camY = -node.y * camZoom; drawPassiveTree();
        const rect = document.getElementById('tree-canvas').getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    });
    if (info.project.name === 'desktop-chromium') {
        await page.mouse.move(position.x, position.y);
        await expect(page.locator('#canvas-tooltip')).toBeVisible();
        await page.evaluate(() => { closeAllWindows(); switchTab('tab-settings'); });
        const title = page.locator('#tab-settings > .ui-window-titlebar');
        const before = await title.boundingBox();
        await page.mouse.move(before.x + 90, before.y + 16);
        await page.mouse.down(); await page.mouse.move(before.x + 130, before.y + 16); await page.mouse.up();
        const after = await title.boundingBox();
        expect(after.x - before.x).toBeCloseTo(40, 0);
        await page.locator('#tab-settings [data-window-action="close"]').click();
        await expect(page.locator('#tab-settings')).toBeHidden();
    }
});

test('monitor changes preserve the user scale and inventory drag coordinates', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop-chromium');
    await start(page);
    await page.locator('#sel-ui-scale').selectOption('110');
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1000, height: 600, deviceScaleFactor: 1.5, mobile: false });
    await expect.poll(() => page.evaluate(() => uiDisplay.factor)).toBeCloseTo(1.1 / 1.5, 5);
    await expect(page.locator('#sel-ui-scale')).toHaveValue('110');
    await expect(page.locator('body')).toHaveClass(/desktop-windowed-ui/);
    await page.evaluate(() => {
        closeAllWindows();
        game.inventory = [createItemFromBase(BASE_ITEM_DB.find(row => row.id === 'war_helm'), 'rare', 10)];
        game.equipmentInventoryPlacements = {};
        switchTab('tab-items'); updateStaticUI();
    });
    const item = page.locator('#ui-inventory-list .equipment-grid-item').first();
    await item.scrollIntoViewIfNeeded();
    const source = await item.boundingBox();
    const target = await page.locator('#ui-inventory-list [data-grid-column="4"][data-grid-row="2"]').boundingBox();
    const x = target.x + source.width / 2, y = target.y + source.height / 2;
    await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
    await page.mouse.down(); await page.mouse.move(x, y, { steps: 8 });
    const ghost = page.locator('.equipment-grid-cursor-item');
    await expect(ghost).toBeVisible();
    await expect.poll(async () => (await ghost.boundingBox()).x).toBeCloseTo(target.x, 0);
    await expect.poll(async () => (await ghost.boundingBox()).width).toBeCloseTo(source.width, 0);
    await page.mouse.up();
    expect(await page.evaluate(() => Object.values(game.equipmentInventoryPlacements)[0])).toEqual({ column: 4, row: 2 });
    await page.setViewportSize({ width: 700, height: 500 });
    expect(await page.evaluate(() => game.settings.uiScale)).toBe(110);
});

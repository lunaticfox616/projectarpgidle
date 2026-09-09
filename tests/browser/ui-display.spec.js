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

test('battle survives repeated large-scale and viewport mode transitions', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop-chromium');
    await start(page);
    await page.evaluate(() => { game.settings.leftPaneCollapsed = true; applyPanelLayoutSettings(); });
    for (const percent of ['175', '200', '225', '250']) {
        await page.evaluate(() => { closeAllWindows(); switchTab('tab-settings'); });
        await page.locator('#sel-ui-scale').selectOption(percent);
        await expect(page.locator('body')).not.toHaveClass(/desktop-windowed-ui/);
        await page.locator('#sel-ui-scale').selectOption('100');
        await page.evaluate(() => closeAllWindows());
        await expect(page.locator('body')).toHaveClass(/desktop-windowed-ui/);
        await expect(page.locator('#left-pane #battle-column')).toBeVisible();
        await expect(page.locator('#battlefield-canvas')).toBeVisible();
    }
    await page.setViewportSize({ width: 800, height: 700 });
    await page.evaluate(() => switchTab('tab-skills'));
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.evaluate(() => closeAllWindows());
    await expect(page.locator('#left-pane #battle-column')).toBeVisible();
});

test('desktop battle uses viewport height and reclaims collapsed log space', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop-chromium');
    await start(page);
    for (const percent of ['80', '100', '175', '200', '225', '250']) {
        const height = 900 * Number(percent) / 100;
        await page.setViewportSize({ width: 1400 * Number(percent) / 100, height });
        await page.evaluate(() => { closeAllWindows(); switchTab('tab-settings'); });
        await page.locator('#sel-ui-scale').selectOption(percent);
        await page.evaluate(() => {
            closeAllWindows();
            game.settings.combatLogCollapsed = false; applyPanelLayoutSettings();
        });
        const bounds = await page.locator('#left-pane').boundingBox();
        expect(Math.abs(bounds.y + bounds.height - height)).toBeLessThan(3);
        const expanded = await page.locator('#battlefield-wrap').boundingBox();
        await page.locator('#btn-combat-log-toggle').click();
        const collapsed = await page.locator('#battlefield-wrap').boundingBox();
        expect(collapsed.width).toBeGreaterThan(expanded.width);
        await expect(page.locator('.player-hud')).toBeVisible();
    }
});

test('embedded previews apply the same viewport scaling to external styles', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop-chromium');
    await page.route('https://**', route => route.fulfill({ status: 204, body: '' }));
    await page.goto('/');
    await page.evaluate(() => {
        const frame = document.createElement('iframe');
        frame.id = 'scale-preview';
        frame.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;border:0;z-index:999999';
        frame.srcdoc = `<base href="${location.origin}/"><link rel="stylesheet" href="css/ui-windows.css">
            <body class="desktop-windowed-ui"><div id="left-pane"></div><select id="sel-ui-scale"></select>
            <script src="js/utils.js"><\/script><script src="js/ui-display.js"><\/script></body>`;
        document.body.appendChild(frame);
    });
    const frame = page.frameLocator('#scale-preview');
    await expect(frame.locator('#left-pane')).toBeAttached();
    await expect.poll(async () => frame.locator('body').evaluate(() => typeof uiDisplay)).toBe('object');
    const bounds = await frame.locator('body').evaluate(() => {
        uiDisplay.apply(80);
        return { height: document.getElementById('left-pane').getBoundingClientRect().height, viewport: innerHeight };
    });
    expect(Math.abs(bounds.height - bounds.viewport)).toBeLessThan(3);
});

test('4K display keeps large scales in desktop layout with accessible controls', async ({ browser, baseURL }, info) => {
    test.skip(info.project.name !== 'desktop-chromium');
    const context = await browser.newContext({ baseURL, viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2, serviceWorkers: 'block' });
    const page = await context.newPage();
    await start(page);
    const select = page.locator('#sel-ui-scale');
    const baseHeight = (await select.boundingBox()).height;
    for (const percent of ['175', '200', '225', '250']) {
        await select.selectOption(percent);
        await select.scrollIntoViewIfNeeded();
        await select.click({ trial: true });
        await expect(page.locator('body')).toHaveClass(/desktop-windowed-ui/);
        expect((await select.boundingBox()).height / baseHeight).toBeCloseTo(Number(percent) / 100, 1);
        await page.screenshot({ path: info.outputPath(`4k-scale-${percent}.png`), scale: 'device' });
    }
    await page.evaluate(() => closeAllWindows());
    await expect(page.locator('#left-pane #battle-column')).toBeVisible();
    await context.close();
});

test('large UI scales apply, survive reload, and allow returning to normal size', async ({ page }, info) => {
    await start(page);
    const select = page.locator('#sel-ui-scale');
    const baseFactor = await page.evaluate(() => uiDisplay.factor);
    for (const percent of ['175', '200', '225', '250']) {
        await select.selectOption(percent);
        await expect(select).toHaveValue(percent);
        expect(await page.evaluate(() => uiDisplay.factor)).toBeCloseTo(baseFactor * Number(percent) / 100, 5);
    }
    await select.scrollIntoViewIfNeeded();
    await page.mouse.move(0, 0);
    await select.click({ trial: true });
    await page.screenshot({ path: info.outputPath('ui-scale-250.png') });
    await page.reload();
    await page.locator('#btn-startup-guest').click();
    await page.waitForFunction(() => !isStartupOverlayOpen() && !isLoadingOverlayOpen());
    expect(await page.evaluate(() => game.settings.uiScale)).toBe(250);
    await page.evaluate(() => { closeAllWindows(); switchTab('tab-settings'); });
    await select.selectOption('100');
    expect(await page.evaluate(() => uiDisplay.factor)).toBeCloseTo(baseFactor, 5);
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

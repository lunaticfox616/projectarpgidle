const { test, expect } = require('@playwright/test');

test('display scaling traverses imported and layered styles once', async ({ page }) => {
    await page.route('https://**', route => route.fulfill({ status: 204, body: '' }));
    await page.route('**/css/scale-fixture.css', route => route.fulfill({
        contentType: 'text/css', body: '@import "scale-child.css";'
    }));
    await page.route('**/css/scale-child.css', route => route.fulfill({
        contentType: 'text/css', body: '@layer components { #scale-probe { position:fixed; width:20vw; height:10px; } }'
    }));
    await page.goto('/');
    await page.evaluate(async () => {
        const link = document.createElement('link');
        link.rel = 'stylesheet'; link.href = 'css/scale-fixture.css';
        await new Promise((resolve, reject) => {
            link.onload = resolve; link.onerror = reject; document.head.append(link);
        });
        const probe = document.createElement('div');
        probe.id = 'scale-probe'; document.body.append(probe);
        uiDisplay.apply(100);
    });
    const width = () => page.locator('#scale-probe').evaluate(node => node.getBoundingClientRect().width);
    const initial = await width();
    expect(initial).toBeGreaterThan(10);
    for (const scale of [200, 250, 100, 200]) {
        await page.evaluate(value => uiDisplay.apply(value), scale);
        expect(Math.abs(await width() - initial)).toBeLessThan(1);
    }
});

test('layered styles preserve the startup curtain and renderer-hidden navigation', async ({ page }) => {
    await page.route('https://**', route => route.fulfill({ status: 204, body: '' }));
    await page.goto('/');
    await expect(page.locator('#startup-overlay')).toBeVisible();
    await expect(page.locator('#left-pane')).toBeHidden();
    await expect(page.locator('#right-pane')).toBeHidden();
    await page.locator('#btn-startup-guest').click();
    await page.locator('[data-class-id="warrior"]').click();
    await page.waitForFunction(() => battleAssets.ready && !uiRefreshRunning && !uiRefreshQueued);
    await page.evaluate(() => {
        clearInterval(gameTickHandle); gameTickHandle = null;
        tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false);
        game.season = 50;
        game.contentProgression.inherited = CONTENT_UNLOCK_CATALOG.filter(def => def.cost > 0).map(def => def.id);
        contentProgression.sync(); updateStaticUI();
        switchTab('tab-char');
    });
    const visibility = await page.locator('[data-merged-tab-member="1"], .merged-tab-subtabs[hidden]').evaluateAll(nodes =>
        nodes.map(node => getComputedStyle(node).display));
    expect(visibility.length).toBeGreaterThan(0);
    expect(visibility.every(display => display === 'none')).toBe(true);
    for (const skin of ['reliquary', 'verdigris', 'crimson']) {
        await page.evaluate(value => applyUiSkin(value), skin);
        await expect(page.locator('#tab-char')).toBeVisible();
        expect(await page.locator('body').evaluate(node => getComputedStyle(node).fontFamily)).toContain('Malgun Gothic');
    }
});

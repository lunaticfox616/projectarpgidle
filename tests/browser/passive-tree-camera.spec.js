const { test, expect } = require('@playwright/test');

// Review 2026-10-01: a new character kept the default class's reachable nodes, so the first skill-tree open fitted
// half the tree at the minimum zoom with the start node off screen; phone taps also had to land within ~5 px of a node.
async function openTreeAsPlayer(page, touch) {
    await page.route('https://**', route => route.fulfill({ status: 204, body: '' }));
    await page.goto('/');
    const press = locator => touch ? locator.tap() : locator.click();
    await press(page.locator('#btn-startup-guest'));
    await press(page.locator('[data-class-id="warrior"]'));
    await page.waitForFunction(() => battleAssets.ready && !uiRefreshRunning && !uiRefreshQueued);
    await page.evaluate(() => {
        clearInterval(gameTickHandle); gameTickHandle = null;
        tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false);
        game.passivePoints = 1; updateStaticUI();
    });
    if (touch) await press(page.locator('#btn-mobile-nav-more'));
    await press(page.locator('#btn-tab-char'));
    await page.waitForFunction(() => passiveCameraInitialized);
    await page.waitForTimeout(200);
}

function nodeOnScreen(page, id) {
    return page.evaluate(nodeId => {
        const canvas = document.getElementById('tree-canvas'), rect = canvas.getBoundingClientRect();
        const viewW = passiveCanvasMetrics.width || rect.width, viewH = passiveCanvasMetrics.height || rect.height;
        const node = PASSIVE_TREE.nodes[nodeId];
        const x = rect.left + (viewW / 2 + camX + node.x * camZoom) * rect.width / viewW;
        const y = rect.top + (viewH / 2 + camY + node.y * camZoom) * rect.height / viewH;
        return { x, y, zoom: camZoom, rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom } };
    }, id);
}

test('the first skill-tree open centres the chosen class start at a readable zoom', async ({ page }, info) => {
    const touch = !!info.project.use.isMobile;
    await openTreeAsPlayer(page, touch);
    expect(await page.evaluate(() => [...reachableNodes].filter(id => /^pt_start_/.test(id) && id !== getPassiveTreeRootNodeId()))).toEqual([]);
    const start = await nodeOnScreen(page, 'pt_start_warrior');
    expect(start.zoom).toBeGreaterThan(0.25);
    const middleX = (start.rect.left + start.rect.right) / 2;
    expect(Math.abs(start.x - middleX)).toBeLessThan(40);
    expect(start.y).toBeGreaterThan(start.rect.top + 40);
    expect(start.y).toBeLessThan(start.rect.bottom - 40);
});

test('a finger near a small passive node selects it on phones', async ({ page }, info) => {
    test.skip(!info.project.use.isMobile, 'Touch hit radius');
    await openTreeAsPlayer(page, true);
    const next = await page.evaluate(() => [...reachableNodes].find(id => getPassiveActivationPath(id).length === 1));
    const spot = await nodeOnScreen(page, next);
    await page.touchscreen.tap(spot.x + 12, spot.y + 9);
    await expect(page.locator('#passive-mobile-detail')).toBeVisible();
    await expect(page.locator('#passive-mobile-detail')).toContainText(await page.evaluate(id => getPassiveNodeDisplayName(PASSIVE_TREE.nodes[id]), next));
});

test('the first-passive guide steps aside for the phone node sheet and points at its confirm button', async ({ page }, info) => {
    test.skip(!info.project.use.isMobile, 'Phone node sheet');
    await openTreeAsPlayer(page, true);
    await page.evaluate(() => { tutorialActionUi.start({ key: 'tutorial_first_passive', tabId: 'tab-char' }); });
    await expect(page.locator('#tutorial-action-card')).toBeVisible();
    const next = await page.evaluate(() => [...reachableNodes].find(id => getPassiveActivationPath(id).length === 1));
    const spot = await nodeOnScreen(page, next);
    await page.touchscreen.tap(spot.x, spot.y);
    const confirm = page.locator('#passive-mobile-detail [data-passive-confirm]');
    await expect(confirm).toHaveClass(/tutorial-action-target/);
    await expect(page.locator('#tutorial-action-card')).toBeHidden();
    const box = await confirm.boundingBox();
    expect(await page.evaluate(([x, y]) => !!document.elementFromPoint(x, y)?.closest('[data-passive-confirm]'), [box.x + box.width / 2, box.y + box.height / 2])).toBe(true);
    await confirm.tap();
    await expect.poll(() => page.evaluate(() => game.passives.length)).toBe(1);
});

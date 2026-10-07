const { test, expect } = require('@playwright/test');
const { pickClass } = require('./helpers');

test.beforeEach(async ({ page }) => {
    await page.route('https://**', route => route.fulfill({ status: 204, body: '' }));
    await page.goto('/');
    await page.locator('#btn-startup-guest').click();
    await pickClass(page, 'warrior');
    await page.waitForFunction(() => battleAssets.ready && !isStartupOverlayOpen() && !isLoadingOverlayOpen() && !uiRefreshRunning && !uiRefreshQueued);
    await page.evaluate(() => {
        clearInterval(gameTickHandle); gameTickHandle = null;
        tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false);
    });
});

test('loop one exposes the four basics and prevents advanced shortcuts', async ({ page }, info) => {
    expect(await page.evaluate(() => ['tab-character','tab-char','tab-items','tab-skills'].every(isTabSurfaceAvailable))).toBe(true);
    expect(await page.evaluate(() => ['tab-unlocks','tab-season','tab-map'].some(id => contentProgression.canOpen(id)))).toBe(false);
    expect(await page.evaluate(() => contentProgression.canOpen('tab-journal'))).toBe(true);
    await page.evaluate(() => { switchTab('tab-items'); updateStaticUI(); });
    await expect(page.locator('#item-tab-equip')).toBeVisible();
    for (const id of ['craft','fossil','market','hall']) await expect(page.locator('#btn-item-tab-' + id)).toBeHidden();
    await page.evaluate(() => { switchItemSubtab('item-tab-craft'); switchTab('tab-skills'); updateStaticUI(); });
    await expect(page.locator('.attack-library')).toBeVisible();
    await expect(page.locator('.support-library')).toBeHidden();
    for (const id of ['enhance','research','condition']) await expect(page.locator('#btn-skill-tab-' + id)).toBeHidden();
    await page.evaluate(() => { switchSkillSubtab('skill-tab-enhance'); switchTab('tab-unlocks'); });
    expect(await page.evaluate(() => game.skillSubtab)).toBe('skill-tab-equip');
    await page.screenshot({ path: info.outputPath('loop-one.png') });
});


// Review round 3 #4: at 1366×768 the 해금 window body ends above the HUD and the buy button sat below it, out of view.
test('the unlock buy button stays visible in a small desktop window', async ({ page }, info) => {
    test.skip(info.project.use.isMobile, 'Desktop window size');
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.evaluate(() => { game.season = 2; game.loopCount = 1; contentProgression.sync(); updateStaticUI(); openTabPane('tab-unlocks'); });
    const buy = page.locator('#content-unlock-panel .unlock-detail-action button');
    await expect(buy).toBeVisible();
    const hit = await buy.evaluate(button => {
        const box = button.getBoundingClientRect();
        return document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)?.closest('button') === button;
    });
    expect(hit).toBe(true);
});

// Review round 4 #2 #16: the unlock tree's step columns fit the window (6단계 '젬 각성' hid under the detail panel behind a
// scrollbar below the fold), and phones list the steps top to bottom instead of a hidden sideways scroll.
test('the unlock tree fits its window without hidden columns', async ({ page }, info) => {
    await page.evaluate(() => {
        game.season = 20; game.contentProgression.highestLoop = 20;
        for (const row of CONTENT_UNLOCK_CATALOG) {
            if (row.id === 'gemAwakening' || game.contentProgression.unlocked.includes(row.id)) continue;
            game.contentProgression.unlocked.push(row.id); game.contentProgression.paidCosts[row.id] = row.cost;
        }
        contentProgression.sync(); updateStaticUI(); openTabPane('tab-unlocks');
    });
    const map = page.locator('#content-unlock-panel .unlock-map');
    await expect(map).toBeVisible();
    const fit = await map.evaluate(el => ({ overflow: el.scrollWidth - el.clientWidth,
        node: el.querySelector('[data-unlock-select="gemAwakening"]').getBoundingClientRect().right, edge: el.getBoundingClientRect().right }));
    expect(fit.overflow).toBeLessThanOrEqual(1);
    expect(fit.node).toBeLessThanOrEqual(fit.edge + 1);
    await page.screenshot({ path: info.outputPath('unlock-tree.png') });
});

// 2026-10-07 review: at loop 10 the atlas opened (혼돈 20) but its window stayed blank until the chaos realm gate. The window's
// route belongs to the 혼돈계 entry, and the screen applied that entry's lock instead of contentProgression.canOpen.
test('the atlas window shows as soon as the atlas opens, before the chaos realm gate', async ({ page }) => {
    await page.evaluate(() => {
        game.season = 10; game.atlas.unlocked = true;
        contentProgression.sync(); updateStaticUI();
        switchTab('tab-map'); switchMapSubtab('map-tab-zones'); switchMapExploreSubtab('map-explore-worldtree');
    });
    expect(await page.evaluate(() => [contentProgression.isUnlocked('chaosRealm'), contentProgression.canOpen('map-explore-worldtree')]))
        .toEqual([false, true]);
    await expect(page.locator('#map-explore-worldtree')).not.toHaveAttribute('data-content-locked', '');
    await expect(page.locator('#map-explore-worldtree')).toBeVisible();
});

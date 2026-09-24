const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
    await page.route('https://**', route => route.fulfill({ status: 204, body: '' }));
    await page.goto('/');
    await page.locator('#btn-startup-guest').click();
    await page.locator('[data-class-id="warrior"]').click();
    await page.waitForFunction(() => battleAssets.ready && !uiRefreshRunning && !uiRefreshQueued);
    await page.evaluate(() => {
        clearInterval(gameTickHandle); gameTickHandle = null;
        tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false);
        game.level = 7; game.exp = 100; game.playerHp = 0;
        game.recentDamageEvents = [];
        recordIncomingDamage('light', 90, '번개 정령', { sourceType: 'monster', sourceId: 1 });
        recordIncomingDamage('phys', 10, '측근의 기사', { sourceType: 'monster', sourceId: 2 });
        handlePlayerDefeat(getZone(0), getPlayerStats(), null,
            { fatalElement: 'phys', sourceName: '측근의 기사', noToast: true });
    });
    await page.waitForFunction(() => !uiRefreshRunning && !uiRefreshQueued);
    await page.evaluate(() => { tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false); });
});

test('death report separates final damage, blocks background controls and closes without another penalty', async ({ page }, info) => {
    const report = page.locator('#death-overlay');
    await expect(report).toBeVisible();
    await expect(report.locator('#deathlog-body')).toContainText('마지막 피해: 측근의 기사 · 물리');
    await expect(report.locator('#deathlog-body')).toContainText('최근 주요 피해: 번개');
    const before = await page.evaluate(() => ({ exp: game.exp, deaths: game.loopDeaths, log: JSON.stringify(game.lastDeathLog) }));
    await expect(report.getByRole('button', { name: '확인', exact: true })).toBeFocused();
    for (let i = 0; i < 6; i++) {
        await page.keyboard.press('Tab');
        // Native dialogs may move focus into browser chrome, represented by body.
        expect(await report.evaluate(el => document.activeElement === document.body || el.contains(document.activeElement))).toBe(true);
    }
    expect(await page.evaluate(() => {
        const backgroundButton = document.getElementById('btn-tab-char');
        backgroundButton.focus();
        return document.activeElement === backgroundButton;
    })).toBe(false);
    await report.getByRole('tab', { name: '몬스터별' }).click();
    await expect(report.locator('#deathlog-damage-list')).toContainText('측근의 기사');
    const bounds = await report.locator('.deathlog-card').boundingBox();
    const viewport = page.viewportSize();
    expect(bounds.x).toBeGreaterThanOrEqual(8);
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width - 8);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height);
    await page.screenshot({ path: info.outputPath('death-dark.png') });
    await page.keyboard.press('Escape');
    await expect(report).toBeHidden();
    expect(await page.evaluate(() => ({ exp: game.exp, deaths: game.loopDeaths, log: JSON.stringify(game.lastDeathLog) }))).toEqual(before);
    await page.evaluate(() => openLastDeathLog());
    await expect(report).toBeVisible();
    await report.getByRole('button', { name: '확인', exact: true }).click();
    await expect(report).toBeHidden();
});

test('older death records do not invent a final element', async ({ page }) => {
    await page.evaluate(() => {
        closeDeathOverlay();
        const legacy = { ...game.lastDeathLog }; delete legacy.fatalElement;
        game.lastDeathLog = mergeDefaults({ lastDeathLog: legacy }).lastDeathLog;
        openLastDeathLog();
    });
    await expect(page.locator('#deathlog-body')).toContainText('마지막 피해: 측근의 기사 · 속성 미기록');
    await expect(page.locator('#deathlog-body')).toContainText('최근 주요 피해: 번개');
});

test('short windows keep the death summary and confirmation reachable', async ({ page }, info) => {
    await page.setViewportSize({ width: 844, height: 390 });
    const card = page.locator('#death-overlay .deathlog-card');
    const confirm = card.getByRole('button', { name: '확인', exact: true });
    const summary = card.locator('.deathlog-panel');
    expect((await summary.boundingBox()).height).toBeGreaterThanOrEqual(80);
    await summary.getByRole('tab', { name: '몬스터별' }).click();
    await expect(summary.getByRole('tab', { name: '몬스터별' })).toBeInViewport();
    await confirm.scrollIntoViewIfNeeded();
    await expect(confirm).toBeInViewport();
    await card.screenshot({ path: info.outputPath('death-short.png') });
    await confirm.click();
    await expect(card).toBeHidden();
});

const { test, expect } = require('@playwright/test');

// 균열 등불(rift) 스킨의 "전장 전체 화면" 배치 계약.
// 전장 캔버스가 화면을 채우고, 메뉴·기록·미니맵·HUD·관리 창은 그 위에 겹친다(전장 크기는 바뀌지 않음).
async function openGame(page, info) {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://**', route => route.fulfill({ status: 204, body: '' }));
    await page.goto('/');
    const tap = info.project.use.isMobile ? 'tap' : 'click';
    await page.locator('#btn-startup-guest')[tap]();
    await page.locator('[data-class-id="warrior"]')[tap]();
    await page.waitForFunction(() => battleAssets.ready && !uiRefreshRunning && !uiRefreshQueued);
    await page.evaluate(() => {
        clearInterval(gameTickHandle); gameTickHandle = null;
        tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false);
        game.contentProgression.inherited = ['craft', 'flask']; contentProgression.sync();
        game.unlocks.items = true; updateStaticUI();
    });
    await page.waitForFunction(() => !uiRefreshRunning && !uiRefreshQueued);
    return errors;
}

const rectOf = (page, selector) => page.locator(selector).evaluate(el => {
    const r = el.getBoundingClientRect();
    return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
});

test('desktop battlefield fills the screen and management windows overlay it', async ({ page }, info) => {
    test.skip(info.project.use.isMobile, 'Desktop stage');
    const errors = await openGame(page, info);
    expect(await page.evaluate(() => document.body.dataset.uiSkin)).toBe('rift');
    const viewport = page.viewportSize();
    const field = await rectOf(page, '#battlefield-wrap');
    expect(field.left).toBeLessThanOrEqual(1);
    expect(field.top).toBeLessThanOrEqual(1);
    expect(field.width).toBeGreaterThanOrEqual(viewport.width - 1);
    expect(field.height).toBeGreaterThanOrEqual(viewport.height - 1);
    const canvasPixels = await page.locator('#battlefield-canvas').evaluate(canvas => canvas.width / Number(canvas.dataset.renderScale || 1));
    expect(Math.abs(canvasPixels - field.width)).toBeLessThan(2);

    // 메뉴 레일·지역 줄·HUD·전투 기록은 화면 안에서 서로 겹치지 않고 전장 위에 떠 있다.
    const rail = await rectOf(page, '#tab-header-main');
    const zone = await rectOf(page, '.combat-zone-row');
    const hud = await rectOf(page, '.player-hud');
    const feed = await rectOf(page, '.combat-feed');
    expect(zone.left).toBeGreaterThanOrEqual(rail.right);
    expect(zone.right).toBeLessThanOrEqual(feed.left);
    expect(hud.left).toBeGreaterThanOrEqual(rail.right - 1);
    expect(hud.right).toBeLessThanOrEqual(feed.left + 1);
    expect(hud.bottom).toBeLessThanOrEqual(viewport.height);

    // 전투 기록을 접어도, 장비 창(도킹)을 열어도 전장 크기는 그대로다.
    await page.locator('#btn-combat-log-toggle').click();
    await expect(page.locator('#log')).toBeHidden();
    expect((await rectOf(page, '#battlefield-wrap')).width).toBeCloseTo(field.width, 0);
    await page.evaluate(() => switchTab('tab-items'));
    await expect(page.locator('#tab-items')).toBeVisible();
    const window = await rectOf(page, '#tab-items');
    expect(window.left).toBeGreaterThan(rail.right);
    const docked = await rectOf(page, '#battlefield-wrap');
    expect(docked.width).toBeCloseTo(field.width, 0);
    expect(docked.height).toBeCloseTo(field.height, 0);
    expect(errors).toEqual([]);
});

test('mobile portrait battlefield runs under the HUD and log', async ({ page }, info) => {
    test.skip(!info.project.use.isMobile, 'Mobile stage');
    const errors = await openGame(page, info);
    const zone = await rectOf(page, '#tab-battle .combat-zone-row');
    const field = await rectOf(page, '#battlefield-wrap');
    const hud = await rectOf(page, '#tab-battle .player-hud');
    const feed = await rectOf(page, '#tab-battle .combat-feed');
    const nav = await rectOf(page, '#tab-header-bottom');
    expect(field.top).toBeGreaterThanOrEqual(zone.bottom - 1);
    expect(field.bottom).toBeLessThanOrEqual(nav.top + 1);
    // HUD와 전투 기록 줄은 전장 아래쪽 위에 겹친다.
    expect(hud.top).toBeGreaterThan(field.top + field.height / 2);
    expect(hud.bottom).toBeLessThanOrEqual(field.bottom + 1);
    expect(feed.bottom).toBeLessThanOrEqual(hud.top + 1);
    expect(feed.top).toBeGreaterThan(field.top);
    expect(errors).toEqual([]);
});


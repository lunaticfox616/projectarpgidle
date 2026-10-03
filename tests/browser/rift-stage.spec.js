const { test, expect } = require('@playwright/test');
const { pickClass } = require('./helpers');

// 균열 등불(rift) 스킨의 "전장 전체 화면" 배치 계약.
// 전장 캔버스가 화면을 채우고, 기록·HUD(미니맵·메뉴 포함)·관리 창은 그 위에 겹친다(전장 크기는 바뀌지 않음).
async function openGame(page, info) {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://**', route => route.fulfill({ status: 204, body: '' }));
    await page.goto('/');
    const tap = info.project.use.isMobile ? 'tap' : 'click';
    await page.locator('#btn-startup-guest')[tap]();
    await pickClass(page, 'warrior', { tap: tap === 'tap' });
    await page.waitForFunction(() => battleAssets.ready && !uiRefreshRunning && !uiRefreshQueued);
    await page.evaluate(() => {
        clearInterval(gameTickHandle); gameTickHandle = null;
        tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false);
        game.contentProgression.inherited = ['craft']; contentProgression.sync();
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

    // 메뉴는 하단 HUD 안(미니맵 양옆 두 날개)에 있고, 지역 줄·HUD·전투 기록은 화면 안에서 서로 겹치지 않고 전장 위에 떠 있다.
    // 전투 기록은 옮기고 크기를 바꾸는 창이다(js/message-frames-ui.js, 2026-10-03). 처음 자리는 예전 기록 판 자리다.
    const zone = await rectOf(page, '.combat-zone-row');
    const hud = await rectOf(page, '.player-hud');
    const feed = await rectOf(page, '#message-frame-main');
    const map = await rectOf(page, '#act-exploration-panel');
    for (const wing of ['.ui-rail-wing-left', '.ui-rail-wing-right']) {
        const menu = await rectOf(page, wing);
        expect(menu.width).toBeGreaterThan(0);
        expect(menu.left).toBeGreaterThanOrEqual(hud.left);
        expect(menu.right).toBeLessThanOrEqual(hud.right);
        expect(menu.bottom).toBeLessThanOrEqual(hud.bottom);
    }
    expect(await page.locator('#tab-header-main .tab-btn:visible').count()).toBeGreaterThan(1);
    expect(Math.abs((map.left + map.right) / 2 - (hud.left + hud.right) / 2)).toBeLessThan(2);
    expect(zone.left).toBeGreaterThanOrEqual(0);
    expect(zone.right).toBeLessThanOrEqual(feed.left);
    expect(zone.bottom).toBeLessThanOrEqual(hud.top);
    expect(feed.bottom).toBeLessThanOrEqual(hud.top + 1);
    expect(hud.left).toBeGreaterThanOrEqual(0);
    expect(hud.right).toBeLessThanOrEqual(viewport.width);
    expect(hud.bottom).toBeLessThanOrEqual(viewport.height);

    // 전투 기록을 접어도, 장비 창(도킹)을 열어도 전장 크기는 그대로다.
    const fold = page.locator('#message-frame-main [data-message-action="collapse"]');
    await fold.click();
    await expect(page.locator('#log')).toBeHidden();
    expect((await rectOf(page, '#battlefield-wrap')).width).toBeCloseTo(field.width, 0);
    // 접은 기록은 같은 자리, 같은 폭의 탭 줄만 남는다(빈 판이 그대로 남고 단추가 세로로 갈라졌다, 2026-10-02).
    const folded = await rectOf(page, '#message-frame-main');
    expect(folded.height).toBeLessThan(90);
    expect(folded.width).toBeCloseTo(feed.width, 0);
    expect(folded.bottom).toBeCloseTo(feed.bottom, 0);
    await expect(page.locator('#message-frame-main [data-message-tab]').first()).toBeVisible();
    await expect(fold).toHaveAttribute('title', '펼치기');
    await fold.click();
    await expect(page.locator('#log')).toBeVisible();
    expect((await rectOf(page, '#message-frame-main')).height).toBeCloseTo(feed.height, 0);
    // 보던 탭을 따로 띄우면(⇱) 기록과 채팅이 두 창으로 함께 보이고, 합치면(⇲) 한 창으로 돌아온다.
    await page.locator('#message-frame-main [data-message-action="split"]').click();
    await expect(page.locator('#message-frame-side')).toBeVisible();
    await expect(page.locator('#log')).toBeVisible();
    await expect(page.locator('#tab-social')).toBeVisible();
    await page.locator('#message-frame-side [data-message-action="merge"]').click();
    await expect(page.locator('#message-frame-side')).toBeHidden();
    await expect(page.locator('#log')).toBeVisible();
    await fold.click();
    await expect(page.locator('#log')).toBeHidden();
    await page.evaluate(() => switchTab('tab-items'));
    await expect(page.locator('#tab-items')).toBeVisible();
    const window = await rectOf(page, '#tab-items');
    expect(window.left).toBeGreaterThanOrEqual(0);
    // 창은 HUD 판 윗변까지 내려와 솟은 미니맵을 덮는다(2026-10-03 사용자 요청). 메뉴 단추 줄은 가려지지 않는다.
    const menu = await rectOf(page, '.ui-rail-wing-left');
    expect(window.bottom).toBeGreaterThan(hud.top);
    expect(window.bottom).toBeLessThanOrEqual(menu.top);
    await expect(page.locator('#btn-tab-character')).toBeVisible();
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


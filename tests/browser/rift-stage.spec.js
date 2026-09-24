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

test('exploration minimap sits on the battlefield and follows the player', async ({ page }, info) => {
    const errors = await openGame(page, info);
    const panel = page.locator('#act-exploration-panel');
    await expect(panel).toBeVisible();
    expect(await panel.evaluate(el => !!el.closest('#battlefield-wrap'))).toBe(true);
    const field = await rectOf(page, '#battlefield-wrap');
    const map = await rectOf(page, '#act-exploration-panel');
    expect(map.left).toBeGreaterThanOrEqual(field.left);
    expect(map.right).toBeLessThanOrEqual(field.right + 1);
    expect(map.top).toBeGreaterThanOrEqual(field.top);
    // 미니맵은 지도 전체가 아니라 플레이어 둘레만 보여준다.
    const view = await page.evaluate(() => {
        const [x0, y0, cols, rows] = document.getElementById('act-exploration-map').dataset.view.split(',').map(Number);
        const layout = actExplorationMap.layout(actExplorationState.current(game).act);
        return { x0, y0, cols, rows, mapColumns: layout.columns, player: { ...game.gridPlayer } };
    });
    expect(view.cols).toBeLessThan(view.mapColumns);
    expect(view.player.gx).toBeGreaterThanOrEqual(view.x0);
    expect(view.player.gx).toBeLessThan(view.x0 + view.cols);
    expect(view.player.gy).toBeGreaterThanOrEqual(view.y0);
    expect(view.player.gy).toBeLessThan(view.y0 + view.rows);

    if (info.project.use.isMobile) {
        // 작은 화면에서는 미니맵을 누르면 칸을 고르지 않고 큰 지도를 연다.
        await page.locator('#act-exploration-map').tap();
        await expect(page.locator('#act-exploration-dialog')).toBeVisible();
        expect(await page.evaluate(() => actExplorationState.current(game).destination)).toBeNull();
    } else {
        // PC에서는 미니맵의 칸을 눌러 목적지를 고른다(밝혀진 걸을 수 있는 칸).
        const target = await page.evaluate(() => {
            const run = actExplorationState.current(game);
            const layout = actExplorationMap.layout(run.act);
            const canvas = document.getElementById('act-exploration-map');
            const [x0, y0, cols, rows] = canvas.dataset.view.split(',').map(Number);
            const rect = canvas.getBoundingClientRect();
            for (const id of run.discovered) {
                const cell = { gx: id % layout.columns, gy: Math.floor(id / layout.columns) };
                const inside = cell.gx >= x0 && cell.gx < x0 + cols && cell.gy >= y0 && cell.gy < y0 + rows;
                const self = cell.gx === game.gridPlayer.gx && cell.gy === game.gridPlayer.gy;
                if (!inside || self || !actExplorationMap.walkable(layout, cell, true)) continue;
                const copy = { ...run, discovered: [...run.discovered] };
                if (!actExplorationState.selectDestination(copy, cell)) continue;
                return { cell, x: rect.left + (cell.gx - x0 + .5) * rect.width / cols, y: rect.top + (cell.gy - y0 + .5) * rect.height / rows };
            }
            return null;
        });
        expect(target).not.toBeNull();
        await page.mouse.click(target.x, target.y);
        expect(await page.evaluate(() => actExplorationState.current(game).destination)).toEqual(target.cell);
        await page.locator('#btn-act-exploration-map').click();
        await expect(page.locator('#act-exploration-dialog')).toBeVisible();
    }
    // 탐험 방식·관문 봉인·임시 전리품은 큰 지도 창에 있다.
    const dialog = page.locator('#act-exploration-dialog');
    await expect(dialog.locator('[data-exploration-mode]')).toHaveCount(3);
    await expect(dialog.locator('#act-exploration-seal')).toBeVisible();
    await expect(dialog.locator('[data-exploration-loot]')).toHaveCount(1);
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

test('light mode is gone and old light saves open in the dark theme', async ({ page }, info) => {
    const errors = await openGame(page, info);
    await expect(page.locator('#sel-theme-mode')).toHaveCount(0);
    const restored = await page.evaluate(() => {
        const save = JSON.parse(serializeSaveState());
        save.settings.themeMode = 'light';
        const merged = mergeDefaults(save);
        return { hasTheme: 'themeMode' in merged.settings, lightClass: document.body.classList.contains('light-mode') };
    });
    expect(restored).toEqual({ hasTheme: false, lightClass: false });
    expect(errors).toEqual([]);
});

test('desktop hotkeys open and close management windows like an ARPG', async ({ page }, info) => {
    test.skip(info.project.use.isMobile, 'Keyboard shortcuts are desktop-only');
    const errors = await openGame(page, info);
    await expect(page.locator('#btn-tab-items')).toHaveAttribute('aria-keyshortcuts', 'I');
    await page.keyboard.press('i');
    await expect(page.locator('#tab-items')).toBeVisible();
    await page.keyboard.press('i');
    await expect(page.locator('#tab-items')).toBeHidden();
    await page.keyboard.press('c');
    await expect(page.locator('#tab-character')).toBeVisible();
    // 입력칸에 글자를 칠 때는 단축키가 동작하지 않는다.
    await page.keyboard.press('i');
    await page.locator('#tab-items').getByPlaceholder(/장비 검색/).click();
    await page.keyboard.type('mi');
    await expect(page.locator('#tab-items')).toBeVisible();
    await expect(page.locator('#tab-map')).toBeHidden();
    expect(errors).toEqual([]);
});

test('high contrast mode brightens copy, drops the lighting pass and survives a save round trip', async ({ page }, info) => {
    const errors = await openGame(page, info);
    const before = await page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--color-text-secondary').trim());
    await page.evaluate(() => { switchTab('tab-settings'); });
    const toggle = page.locator('#chk-high-contrast');
    await toggle.scrollIntoViewIfNeeded();
    if (info.project.use.isMobile) await toggle.tap(); else await toggle.click();
    const state = await page.evaluate(() => ({
        on: document.body.classList.contains('high-contrast'),
        saved: game.settings.highContrast,
        lighting: isBattleLightingEnabled(),
        secondary: getComputedStyle(document.body).getPropertyValue('--color-text-secondary').trim(),
        restored: mergeDefaults(JSON.parse(serializeSaveState())).settings.highContrast,
        oldSave: mergeDefaults({ settings: { highContrast: 'yes' } }).settings.highContrast
    }));
    expect(state).toMatchObject({ on: true, saved: true, lighting: false, restored: true, oldSave: false });
    expect(state.secondary).not.toBe(before);
    expect(errors).toEqual([]);
});

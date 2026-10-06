const { test, expect } = require('@playwright/test');
const { pickClass } = require('./helpers');

// 전장 위에 겹치는 것들(2026-10-07 플레이 테스트 요청): 몬스터 수는 맵에 몇 마리 남았을 때만 보이고,
// 전투 기록 창과 하단 HUD 판은 전장이 비치며, 고대비에서도 맨 위 지역 줄은 상자로 두르지 않는다.
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
    });
    return errors;
}

test('the monster count shows only when a few regular monsters are left on the map', async ({ page }, info) => {
    const errors = await openGame(page, info);
    const caption = page.locator('#ui-battlefield-caption');
    // 맵의 일반 무리(기다리는 무리 포함, 보스 무리 제외)에 keep 마리만 남기고 전장을 다시 그린다.
    const leave = keep => page.evaluate(count => {
        let budget = count;
        for (const pack of actExplorationState.current(game).packs.filter(p => p.stage === null)) {
            pack.aliveIds = pack.aliveIds.slice(0, Math.min(budget, pack.aliveIds.length));
            budget -= pack.aliveIds.length;
        }
        renderBattlefield(true);
        return getMapMonstersLeft();
    }, keep);
    expect(await page.evaluate(() => { renderBattlefield(true); return getMapMonstersLeft(); })).toBeGreaterThan(5);
    await expect(caption).toBeHidden();
    expect(await leave(3)).toBe(3);
    await expect(caption).toHaveText('몬스터 3마리 남음');
    await expect(caption).toBeVisible();
    expect(await leave(0)).toBe(0);
    await expect(caption).toBeHidden();
    expect(errors).toEqual([]);
});

test('the battle log window and the HUD plate are see-through; high contrast keeps the zone row boxless', async ({ page }, info) => {
    test.skip(info.project.use.isMobile, 'PC message window');
    const errors = await openGame(page, info);
    const look = await page.evaluate(() => {
        const alpha = color => {
            const slash = color.match(/\/\s*([\d.]+)\s*\)$/);
            if (slash) return Number(slash[1]);
            const values = (color.match(/rgba?\(([^)]+)\)/) || [, ''])[1].split(',');
            return values.length === 4 ? Number(values[3]) : 1;
        };
        const plate = getComputedStyle(document.querySelector('#battle-column .player-hud-shell'), '::before');
        return { frame: alpha(getComputedStyle(document.getElementById('message-frame-main')).backgroundColor), plate: Number(plate.opacity) };
    });
    expect(look.frame).toBeGreaterThan(0.3);
    expect(look.frame).toBeLessThan(0.8);
    expect(look.plate).toBeGreaterThan(0.3);
    expect(look.plate).toBeLessThan(1);
    // 고대비 테마가 금색 테를 다시 둘러 지역 이름과 귀환 단추가 긴 상자 하나로 묶였다(여러 번 지적받은 그 상자).
    await page.evaluate(() => { game.settings.highContrast = true; applyHighContrast(true); });
    const row = await page.locator('.combat-zone-row').first().evaluate(el => {
        const style = getComputedStyle(el);
        return { border: style.borderTopColor, background: style.backgroundColor, image: style.backgroundImage, shadow: style.boxShadow };
    });
    expect(row).toEqual({ border: 'rgba(0, 0, 0, 0)', background: 'rgba(0, 0, 0, 0)', image: 'none', shadow: 'none' });
    expect(errors).toEqual([]);
});

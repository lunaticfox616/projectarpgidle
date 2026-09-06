const { test, expect } = require('@playwright/test');

test('unlock lab uses real choices and leaves persistent saves untouched', async ({ page }, info) => {
    const errors = [], external = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://**', route => { external.push(route.request().url()); return route.fulfill({ status:204, body:'' }); });
    await page.goto('/artifacts/unlock-ui/test.html');
    await page.evaluate(() => {
        localStorage.setItem('poeIdleSaveData_lab_sentinel', 'real-save-must-stay');
        sessionStorage.setItem('lab-sentinel', 'session-must-stay');
    });
    await expect(page.locator('#controls')).toBeEnabled({ timeout:60000 });
    const game = page.frameLocator('#game');
    await expect(game.locator('.unlock-node.is-ready')).toHaveCount(1);
    await game.locator('[data-unlock-content="craft"]').click();
    await page.locator('#loop').selectOption('3');
    await game.locator('[data-unlock-select="loopTree"]').click();
    await game.locator('[data-unlock-content="loopTree"]').click();
    await expect(game.locator('.content-unlock-balance strong')).toHaveText('1');
    await page.locator('#loop').selectOption('10');
    await page.locator('[data-action="discover"]').click();
    await expect(page.locator('#status')).toContainText('발견 기록을 채웠습니다');
    await game.locator('[data-unlock-select="deepTree"]').click();
    await game.locator('[data-unlock-content="deepTree"]').click();
    await game.locator('[data-open-content="deepTree"]').click();
    await game.locator('#loop-deep-growth button').first().click();
    await expect(game.locator('#loop-deep-growth summary')).toContainText('9');
    await page.locator('[data-action="point"]').click();
    await expect(game.locator('.content-unlock-balance strong')).toHaveText('15');
    await page.locator('[data-action="investment"]').click();
    await expect(page.locator('#status')).toContainText('심화 19P');
    await game.locator('#btn-tab-unlocks').click();
    await game.locator('[data-unlock-view="progress"]').click();
    await game.locator('[data-unlock-select="deepChaos"]').click();
    await expect(game.locator('[data-open-content="deepChaos"]')).toBeEnabled();
    await page.screenshot({ path:info.outputPath('unlock-lab.png') });
    expect(await page.evaluate(() => [localStorage.getItem('poeIdleSaveData_lab_sentinel'), sessionStorage.getItem('lab-sentinel')]))
        .toEqual(['real-save-must-stay','session-must-stay']);
    await page.locator('#reset').click();
    await expect(page.locator('#controls')).toBeEnabled({ timeout:60000 });
    await expect(game.locator('.content-unlock-balance strong')).toHaveText('2');
    await expect(game.locator('.unlock-node.is-ready')).toHaveCount(1);
    expect(await page.evaluate(() => localStorage.getItem('poeIdleSaveData_lab_sentinel'))).toBe('real-save-must-stay');
    expect(errors).toEqual([]);
    expect(external.filter(url => !/fonts\./.test(url))).toEqual([]);
});

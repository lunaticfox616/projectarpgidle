const { test, expect } = require('@playwright/test');

test('equipment guidance follows a real equip and can be skipped without spending', async ({ page }, testInfo) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://**', route => route.fulfill({ status: 204, body: '' }));
    await page.goto('/');
    await page.locator('#btn-startup-guest').click();
    await page.locator('#loop-hero-select-overlay [data-class-id="warrior"]').click();
    await page.waitForFunction(() => battleAssets.ready && !uiRefreshRunning && !uiRefreshQueued);
    await page.evaluate(() => {
        clearInterval(gameTickHandle); gameTickHandle = null;
        tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false);
        game.level = 1; game.unlocks.items = true;
        game.settings.autoEquipEmptySlots = false;
        game.inventory = [createItemFromBase(BASE_ITEM_DB.find(row => row.id === 'war_helm'), 'normal', 1)];
        game.seenTutorials = game.seenTutorials.filter(key => !['unlock_items', 'unlock_char'].includes(key));
        queueTutorialNotice('unlock_items', '장비 장착', '장비를 장착해 보세요.', 'tab-items');
    });
    await page.locator('#tutorial-open-btn').click();
    const coach = page.locator('#tutorial-action-card');
    await expect(coach).toBeVisible();
    await expect(page.locator('#tutorial-overlay')).not.toHaveClass(/active/);
    await expect(page.locator('#ui-inventory-list .tutorial-action-target')).toHaveCount(1);
    await coach.getByRole('button', { name: '화면 보기' }).click();
    await expect(page.locator('#ui-inventory-list')).toBeVisible();
    await page.evaluate(() => queueTutorialNotice('guide_followup', '다음 안내', '중복 표시 검사'));
    await expect(page.locator('#tutorial-overlay')).not.toHaveClass(/active/);
    await page.screenshot({ path: testInfo.outputPath('equip-guide.png'), animations: 'disabled' });
    await page.locator('#ui-inventory-list .equipment-grid-item').dblclick();
    await expect.poll(() => page.evaluate(() => game.equipment['투구']?.baseId)).toBe('war_helm');
    await expect(coach).toBeHidden();
    await expect(page.locator('#tutorial-title')).toHaveText('다음 안내');
    await page.locator('#tutorial-dismiss-btn').click();
    const before = await page.evaluate(() => {
        game.unlocks.char = true; game.passivePoints = 1;
        queueTutorialNotice('unlock_char', '스킬트리', '첫 포인트를 사용해 보세요.', 'tab-char');
        return { points: game.passivePoints, passives: game.passives.slice() };
    });
    await page.locator('#tutorial-open-btn').click();
    await expect(coach).toBeVisible();
    await coach.getByRole('button', { name: '안내 닫기' }).click();
    await expect(coach).toBeHidden();
    expect(await page.evaluate(() => ({ points: game.passivePoints, passives: game.passives }))).toEqual(before);
    expect(await page.evaluate(() => game.seenTutorials.filter(key => key === 'action_unlock_items').length)).toBe(1);
    await page.evaluate(() => {
        game.inventory = []; tutorialQueue.length = 0;
        game.seenTutorials = game.seenTutorials.filter(key => key !== 'unlock_items');
        queueTutorialNotice('unlock_items', '제작 재화 발견', '장비를 얻으면 착용할 수 있습니다.', 'tab-items');
    });
    await expect(page.locator('#tutorial-open-btn')).toHaveText('화면 열기');
    await page.locator('#tutorial-open-btn').click();
    await expect(coach).toBeHidden();
    expect(errors).toEqual([]);
});

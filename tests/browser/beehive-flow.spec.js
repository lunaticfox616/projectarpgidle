const {test, expect} = require('@playwright/test');

test('hive costs, choices and forfeit remain clear', async ({page}, info) => {
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.route('https://**', route => route.fulfill({status: 204, body: ''}));
    await page.goto('/'); await page.locator('#btn-startup-guest').click();
    await page.locator('[data-class-id="warrior"]').click();
    await page.waitForFunction(() => battleAssets.ready && !uiRefreshRunning && !uiRefreshQueued);
    await page.evaluate(() => {
        clearInterval(gameTickHandle); gameTickHandle = null;
        game.season = 10; game.loopCount = 9; contentProgression.sync();
        game.seenTutorials = [...new Set([...game.seenTutorials, ...MAP_PRIMARY_CONTENTS.map(row => row.noticeKey).filter(Boolean)])];
        game.seenTutorials.push(...STORY_JOURNAL_SCENES.map(scene => 'story_' + scene.id));
        game.currentZoneId = 8; game.maxZoneId = 8; game.currencies.hiveKey = 2;
        startBeehiveRun(); game.currencies.pollen = 0;
        for (const key of ['a', 'b', 'c']) game.beehive.pendingChoice[key] = {
            effect: 'pollen', amount: 10, timing: 'immediate', text: '[즉시 보상] 꽃가루 +10 / 대가: 꽃가루 -6',
            penalty: {key: 'pollen_tax', text: '꽃가루 -6'}
        };
        closeBeehiveChoiceOverlay(); switchTab('tab-battle');
        openBeehiveChoiceOverlay(); updateStaticUI();
        tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false);
    });
    await page.waitForFunction(() => !uiRefreshRunning && !uiRefreshQueued);
    await page.evaluate(() => { tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false); });
    const card = page.locator('.beehive-choice-card');
    await expect(card).toBeVisible();
    await expect(card.locator('.hive-choice:disabled')).toHaveCount(2);
    await expect(card.locator('.hive-choice:not(:disabled)')).toContainText('군체 분노 +1');
    await expect(card).toContainText('재료 부족으로 대가 변경');
    expect(await card.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
    if (info.project.name.startsWith('mobile')) {
        const cardBox = await card.boundingBox();
        const lastChoice = await card.locator('.hive-choice').last().boundingBox();
        expect(lastChoice.y + lastChoice.height).toBeLessThanOrEqual(cardBox.y + cardBox.height);
        expect(cardBox.y + cardBox.height).toBeLessThan(page.viewportSize().height - 55);
    }
    await page.screenshot({path: info.outputPath('hive-choice.png')});
    await card.locator('.hive-choice:not(:disabled)').click();
    await expect(card).toHaveCount(0);
    expect(await page.evaluate(() => ({pollen: game.currencies.pollen, step: game.beehive.branchStep, risk: game.beehive.enemyEmpower})))
        .toEqual({pollen: 10, step: 1, risk: 1});
    await page.evaluate(() => {
        game.beehive.pendingQueenRewards.push({effect: 'enchantedHoney', amount: 2, chance: 1, text: '벌꿀 +2'});
        void forfeitBeehiveRun(); void forfeitBeehiveRun();
    });
    const dialog = page.locator('#game-dialog-overlay');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('입장 열쇠는 반환되지 않습니다');
    await page.screenshot({path: info.outputPath('hive-forfeit.png')});
    await dialog.getByRole('button', {name: '계속 탐험', exact: true}).click();
    await expect(dialog).not.toBeVisible();
    expect(await page.evaluate(() => game.beehive.inRun)).toBe(true);
    expect(await page.evaluate(() => game.beehive.pendingQueenRewards.length)).toBe(1);
    await page.evaluate(() => { void forfeitBeehiveRun(); });
    await dialog.getByRole('button', {name: '포기하고 귀환', exact: true}).click();
    await expect.poll(() => page.evaluate(() => game.beehive.inRun)).toBe(false);
    expect(await page.evaluate(() => ({pollen: game.currencies.pollen, keys: game.currencies.hiveKey, queen: game.beehive.pendingQueenRewards.length, zone: game.currentZoneId})))
        .toEqual({pollen: 10, keys: 1, queen: 0, zone: 8});
    await page.evaluate(() => {
        switchTab('tab-map'); switchMapSubtab('map-tab-zones'); switchMapExploreSubtab('map-explore-beehive');
    });
    await page.getByRole('button', {name: '벌집 입장', exact: true}).click();
    const choices = page.locator('.map-hive-choices');
    await expect(choices.locator('.hive-choice')).toHaveCount(3);
    const edge = await choices.evaluate(el => ({right: el.getBoundingClientRect().right, last: el.lastElementChild.getBoundingClientRect().right}));
    expect(Math.abs(edge.right - edge.last)).toBeLessThanOrEqual(2);
    await page.screenshot({path: info.outputPath('hive-map.png')});
    await page.getByRole('button', {name: '원정 포기', exact: true}).click();
    await expect(dialog).toBeVisible();
    await page.evaluate(() => { exitBeehiveRun(); game.currencies.hiveKey = 1; startBeehiveRun(); });
    await dialog.getByRole('button', {name: '포기하고 귀환', exact: true}).click();
    await expect(dialog).not.toBeVisible();
    expect(await page.evaluate(() => game.beehive.inRun)).toBe(true, 'an old confirmation must not abandon a new run');
    expect(errors).toEqual([]);
});

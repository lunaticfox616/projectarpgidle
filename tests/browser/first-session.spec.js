// A real first-kill flow, without injecting loot or changing progression state.
// This verifies usability prerequisites; only human participants can judge fun.
const { test, expect } = require('@playwright/test');

for (const [classId, label] of [['occultist', '비술사'], ['warrior', '전사']]) {
    test(`initial ${classId} selection updates HUD before the paused prologue ends`, async ({page}) => {
        await page.route('https://**',route=>route.fulfill({status:204,body:''}));
        await page.goto('/');await page.locator('#btn-startup-guest').click();
        await page.locator(`[data-class-id="${classId}"]`).click();
        await expect(page.locator('#tutorial-overlay')).toHaveClass(/active/);
        await expect(page.locator('#ui-player-name-label')).toHaveText(label);
        const resource=await page.evaluate(()=>({hp:game.playerHp,cap:getPlayerHpCap(getPlayerStats())}));
        expect(resource.hp).toBe(resource.cap);
        expect(Number(await page.locator('#ui-hp').innerText())).toBe(Number(await page.locator('#ui-maxhp').innerText()));
        expect(await page.evaluate(()=>game.loopKills)).toBe(0);
    });
}

test('a new warrior earns and equips the first gem through visible controls', async ({ page }, testInfo) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://**', route => route.fulfill({ status: 204, body: '' }));
    await page.goto('/');
    await page.locator('#btn-startup-guest').click();
    await page.locator('#loop-hero-select-overlay [data-class-id="warrior"]').click();
    const startedAt = Date.now();
    const notices = [];
    let firstGemMs = null;
    await expect.poll(async () => {
        if (firstGemMs === null && await page.evaluate(() => !!game.starterGemTutorialPending)) {
            firstGemMs = Date.now() - startedAt;
        }
        if (await page.locator('#tutorial-dismiss-btn').isVisible()) {
            const title = await page.locator('#tutorial-title').innerText();
            notices.push(title);
            if (title === '첫 스킬 젬 장착') await page.locator('#tutorial-open-btn').click();
            else await page.locator('#tutorial-dismiss-btn').click();
        }
        return page.locator('#tutorial-action-card').isVisible();
    }, { timeout: 45000, intervals: [250, 500] }).toBe(true).catch(async error => {
        const state = await page.evaluate(() => ({
            seen: game.seenTutorials, pending: game.starterGemTutorialPending, skill: game.activeSkill,
            queue: tutorialQueue, active: activeTutorial, guide: tutorialActionUi.active?.notice,
            level: game.level, kills: game.loopKills
        }));
        console.log(JSON.stringify({ notices, errors, state }));
        throw error;
    });
    await page.locator('.starter-gem-tutorial-target').click();
    // The coach mark follows into the detail popover: its 장착 button is what the player presses next.
    await expect(page.locator('#gem-selection .gem-equip-primary')).toHaveClass(/tutorial-action-target/);
    await page.locator('#gem-selection').getByRole('button', { name: '장착', exact: true }).click();
    await expect(page.locator('#tutorial-action-card')).toBeHidden();
    await expect(page.locator('#game-toast-region')).toContainText('스킬 젬 장착 완료');
    expect(await page.evaluate(() => game.activeSkill)).toBe('연속 베기');
    await expect(page.locator('#log')).toContainText('스킬 젬 [연속 베기] 획득');
    await expect(page.locator('#log')).not.toContainText('직업에 맞는 스킬 젬');
    expect(await page.evaluate(() => game.starterGemTutorialPending)).toBeFalsy();
    expect(errors).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath('natural-first-gem.png') });
    await testInfo.attach('first-session-observation', {
        body: JSON.stringify({ firstGemMs, notices, kind: 'automated walkthrough, not human feedback' }, null, 2),
        contentType: 'application/json'
    });
});

// Review round 3 #1: a player who closes the first-gem card instead of following it (idle play) used to fight with the
// basic attack and die repeatedly in acts 1-2. Closing the card equips the starter gem; 스킬 젬 can still change it.
test('closing the first-gem card without following equips the starter gem', async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://**', route => route.fulfill({ status: 204, body: '' }));
    await page.goto('/');
    await page.locator('#btn-startup-guest').click();
    await page.locator('#loop-hero-select-overlay [data-class-id="warrior"]').click();
    await expect.poll(async () => {
        if (await page.locator('#tutorial-dismiss-btn').isVisible()) {
            const title = await page.locator('#tutorial-title').innerText();
            await page.locator('#tutorial-dismiss-btn').click();
            if (title === '첫 스킬 젬 장착') return 'closed';
        }
        return 'waiting';
    }, { timeout: 45000, intervals: [250, 500] }).toBe('closed');
    await expect.poll(() => page.evaluate(() => game.activeSkill)).toBe('연속 베기');
    await expect(page.locator('#game-toast-region')).toContainText('[연속 베기] 젬을 장착했습니다');
    expect(await page.evaluate(() => game.starterGemTutorialPending)).toBeFalsy();
    expect(errors).toEqual([]);
});

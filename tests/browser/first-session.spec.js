// A real first-kill flow, without injecting loot or changing progression state.
// This verifies usability prerequisites; only human participants can judge fun.
const { test, expect } = require('@playwright/test');

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
            level: game.level, kills: game.totalKills
        }));
        console.log(JSON.stringify({ notices, errors, state }));
        throw error;
    });
    await page.locator('.starter-gem-tutorial-target').click();
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

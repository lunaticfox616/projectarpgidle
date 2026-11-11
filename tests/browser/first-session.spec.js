// A real first-kill flow, without injecting loot or changing progression state.
// This verifies usability prerequisites; only human participants can judge fun.
const { test, expect } = require('@playwright/test');
const { pickClass } = require('./helpers');

/** One step of the first start's lessons after the intro (js/opening-journey-ui.js), the way a player takes them: the lying hero is
 * pressed, the floor beside it is clicked (move), the door toward Haken's room, then the monster striking him (attack), then the weapon
 * it dropped. What is not on screen yet (a phone shows a few cells) is walked toward along the hero's row. The top-down field (no
 * stage art, as in CI) has no lessons. Returns the lesson acted on, or null. */
async function takeOpeningStep(page) {
    const step = await page.evaluate(() => openingJourney.lesson());
    if (step === 'pickup') await page.locator('.battle-loot-drop.is-floor').first().dispatchEvent('click');
    if (!['rise', 'move', 'attack'].includes(step)) return step;
    const point = await page.evaluate(lesson => {
        const canvas = document.getElementById('battlefield-canvas'), rect = canvas.getBoundingClientRect(), k = rect.width / canvas.clientWidth;
        const screen = at => ({ x: rect.left + at.x * k, y: rect.top + at.y * k }), hero = battleVisualState.playerPos;
        if (lesson !== 'attack') return screen(lesson === 'rise' ? { x: hero.x, y: hero.y - 20 } : { x: hero.x + 70, y: hero.y });
        const enemy = game.enemies.find(row => row && row.rescue), shown = enemy && battleVisualState.enemySmoothPos[enemy.id];
        if (shown && shown.x > 0 && shown.x < canvas.clientWidth) return screen(shown);
        const run = actExplorationState.current(game), map = actExplorationDoors.stageMap(run), pack = run.packs.find(row => row.rescue);
        const here = actExplorationDoors.room(run), there = pack && map.rooms.find(room => room.id === pack.roomId);
        const door = !enemy && here && there && here !== there ? map.hops[here.index][there.index] : null, cell = enemy || (door && door.cell);
        for (let y = 0; door && y < canvas.clientHeight; y += 6) for (let x = 0; x < canvas.clientWidth; x += 6) {
            const at = actExplorationView.cellAt({ x, y }), px = rect.left + (x + 3) * k, py = rect.top + (y + 3) * k;
            if (at && at.gx === door.cell.gx && at.gy === door.cell.gy && document.elementFromPoint(px, py) === canvas) return { x: px, y: py };
        }
        if (!cell) return null;
        return screen({ x: hero.x + Math.sign(cell.gx - game.gridPlayer.gx) * Math.min(120, canvas.clientWidth / 2 - 20), y: hero.y });
    }, step);
    if (point) await page.mouse.click(point.x, point.y);
    return step;
}

for (const [classId, label] of [['occultist', '비술사'], ['warrior', '전사']]) {
    test(`initial ${classId} selection updates HUD before the paused prologue ends`, async ({page}) => {
        await page.route('https://**',route=>route.fulfill({status:204,body:''}));
        await page.goto('/');await page.locator('#btn-startup-guest').click();
        await pickClass(page, classId, { opening: true });
        await expect(page.locator('#opening-intro')).toBeVisible();
        await expect(page.locator('#ui-player-name-label')).toHaveText(label);
        const resource=await page.evaluate(()=>({hp:game.playerHp,cap:getPlayerHpCap(getPlayerStats())}));
        expect(resource.hp).toBe(resource.cap);
        expect(Number(await page.locator('#ui-hp').innerText())).toBe(Number(await page.locator('#ui-maxhp').innerText()));
        expect(await page.evaluate(()=>game.loopKills)).toBe(0);
    });
}

test('a new warrior earns and equips the first weapon through visible controls', async ({ page }, testInfo) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://**', route => route.fulfill({ status: 204, body: '' }));
    await page.goto('/');
    await page.locator('#btn-startup-guest').click();
    await pickClass(page, 'warrior', { opening: true });
    // The class window's element step gave the greatsword basic skill; it rests until the weapon is held (js/basic-skills.js).
    expect(await page.evaluate(() => [game.weaponBlockedSkill === basicSkills.nameOf('greatsword', game.basicSkillElement), getEquippedWeaponStance()])).toEqual([true, 'unarmed']);
    await page.locator('#opening-intro .opening-intro-skip').click();
    await expect(page.locator('#opening-intro')).toHaveCount(0);
    await expect(page.locator('#btn-act-exploration-auto')).toBeHidden();
    expect(await page.evaluate(() => ['tab-skills', 'tab-items', 'tab-char', 'tab-map', 'tab-journal']
        .filter(route => contentProgression.canOpen(route)))).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath('first-session-wake.png') });
    const startedAt = Date.now();
    const notices = [];
    let firstWeaponMs = null;
    let restoredWeapon = false;
    await expect.poll(async () => {
        await takeOpeningStep(page);
        if (firstWeaponMs === null && await page.evaluate(() => game.starterWeaponTutorialPending != null)) firstWeaponMs = Date.now() - startedAt;
        if (await page.locator('#tutorial-dismiss-btn').isVisible()) {
            const title = await page.locator('#tutorial-title').innerText();
            notices.push(title);
            await page.locator('#tutorial-dismiss-btn').click();
        }
        // The new opening shows the weapon step as a lesson button; the waiting weapon survives a reload before it is worn.
        const equip = page.locator('[data-opening-weapon]');
        if (!restoredWeapon && await equip.isVisible()) {
            restoredWeapon = true;
            await expect(page.locator('#btn-act-exploration-auto')).toBeHidden();
            await page.evaluate(() => saveGame({ skipCloudSync: true }));
            await page.reload();
            await page.locator('#btn-startup-guest').click();
            await expect(equip).toBeVisible();
            expect(await page.evaluate(() => game.starterWeaponTutorialPending != null)).toBe(true);
            await expect(page.locator('#btn-act-exploration-auto')).toBeHidden();
            await equip.click();
        }
        return page.locator('#tutorial-action-card').isVisible();
    }, { timeout: 60000, intervals: [250, 500] }).toBe(true).catch(async error => {
        const state = await page.evaluate(() => ({
            seen: game.seenTutorials, pending: game.starterWeaponTutorialPending, skill: game.activeSkill,
            queue: tutorialQueue, active: activeTutorial, guide: tutorialActionUi.active?.notice,
            level: game.level, kills: game.loopKills
        }));
        console.log(JSON.stringify({ notices, errors, state }));
        throw error;
    });
    // The guide points at the weapon in the bag, then at the inspector's 장착 button.
    await page.locator('#ui-inventory-list .equipment-grid-item').first().click();
    await page.locator('#tab-items .equipment-card-primary').click();
    await expect(page.locator('#tutorial-action-card')).toBeHidden();
    expect(await page.evaluate(() => [getEquippedWeaponStance(), game.activeSkill === basicSkills.nameOf('greatsword', game.basicSkillElement)])).toEqual(['greatsword', true]);
    expect(await page.evaluate(() => game.starterWeaponTutorialPending)).toBeNull();
    await expect(page.locator('#btn-act-exploration-auto')).toBeVisible();
    await expect(page.locator('#btn-act-exploration-auto')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('#btn-act-exploration-auto')).toHaveClass(/is-opening-glow/);
    await page.locator('#btn-act-exploration-auto').click();
    await expect(page.locator('#btn-act-exploration-auto')).toHaveAttribute('aria-pressed', 'true');
    expect(notices).not.toContain('첫 무기 장착');
    expect(restoredWeapon).toBe(true);
    expect(errors).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath('natural-first-weapon.png') });
    await testInfo.attach('first-session-observation', {
        body: JSON.stringify({ firstWeaponMs, notices, kind: 'automated walkthrough, not human feedback' }, null, 2),
        contentType: 'application/json'
    });
});

// Review round 3 #1 (then the first gem, 2026-11-09 the first weapon): a player who closes the first-weapon card instead of following it
// (idle play) would fight bare-handed with the basic attack. Closing the card equips the weapon; 장비 can still change it.
test('closing the first-weapon card without following equips the weapon', async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://**', route => route.fulfill({ status: 204, body: '' }));
    await page.goto('/');
    await page.locator('#btn-startup-guest').click();
    await pickClass(page, 'warrior');
    await expect.poll(async () => {
        if (await page.locator('#tutorial-dismiss-btn').isVisible()) {
            const title = await page.locator('#tutorial-title').innerText();
            await page.locator('#tutorial-dismiss-btn').click();
            if (title === '첫 무기 장착') return 'closed';
        }
        return 'waiting';
    }, { timeout: 45000, intervals: [250, 500] }).toBe('closed');
    await expect.poll(() => page.evaluate(() => getEquippedWeaponStance())).toBe('greatsword');
    await expect(page.locator('#game-toast-region')).toContainText('무기를 장착했습니다');
    expect(await page.evaluate(() => game.starterWeaponTutorialPending)).toBe(null);
    expect(errors).toEqual([]);
});

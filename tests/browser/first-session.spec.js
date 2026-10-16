// A real first-kill flow, without injecting loot or changing progression state.
// This verifies usability prerequisites; only human participants can judge fun.
const { test, expect } = require('@playwright/test');
const { pickClass } = require('./helpers');

/** One step of the first start's lessons after the intro (js/opening-journey-ui.js), the way a player takes them: the lying hero is
 * pressed, the floor beside it is clicked (move), the door toward Haken's room, then the monster striking him (attack), then the gem
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

test('a new warrior earns and equips the first gem through visible controls', async ({ page }, testInfo) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://**', route => route.fulfill({ status: 204, body: '' }));
    await page.goto('/');
    await page.locator('#btn-startup-guest').click();
    await pickClass(page, 'warrior', { opening: true });
    await page.locator('#opening-intro .opening-intro-skip').click();
    await expect(page.locator('#opening-intro')).toHaveCount(0);
    const startedAt = Date.now();
    const notices = [];
    let firstGemMs = null;
    await expect.poll(async () => {
        await takeOpeningStep(page);
        if (firstGemMs === null && await page.evaluate(() => !!game.starterGemTutorialPending)) {
            firstGemMs = Date.now() - startedAt;
        }
        if (await page.locator('#tutorial-dismiss-btn').isVisible()) {
            const title = await page.locator('#tutorial-title').innerText();
            notices.push(title);
            if (title === '첫 스킬룬 장착') await page.locator('#tutorial-open-btn').click();
            else await page.locator('#tutorial-dismiss-btn').click();
        }
        return page.locator('#tutorial-action-card').isVisible();
    }, { timeout: 60000, intervals: [250, 500] }).toBe(true).catch(async error => {
        const state = await page.evaluate(() => ({
            seen: game.seenTutorials, pending: game.starterGemTutorialPending, skill: game.activeSkill,
            queue: tutorialQueue, active: activeTutorial, guide: tutorialActionUi.active?.notice,
            level: game.level, kills: game.loopKills
        }));
        console.log(JSON.stringify({ notices, errors, state }));
        throw error;
    });
    // Review 2026-10-01: the coach card sat on the gem it pointed at, and the detail popover ran out of the window over the HUD.
    const desktop = !testInfo.project.use.isMobile;
    const layout = () => page.evaluate(() => {
        const box = node => node && node.getBoundingClientRect().toJSON();
        return { card: box(document.getElementById('tutorial-action-card')), target: box(document.querySelector('.tutorial-action-target')),
            popover: box(document.querySelector('#gem-selection:popover-open')), frame: box(document.getElementById('tab-skills')),
            chosen: box(document.querySelector('.is-gem-selected')) };
    });
    const apart = (a, b) => a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top;
    const opening = await layout();
    if (desktop) expect(apart(opening.card, opening.target)).toBe(true);
    await page.locator('.starter-gem-tutorial-target').click();
    // The coach mark follows into the detail popover: its 장착 button is what the player presses next.
    await expect(page.locator('#gem-selection .gem-equip-primary')).toHaveClass(/tutorial-action-target/);
    if (desktop) {
        const { card, target, popover, frame, chosen } = await layout();
        expect([apart(card, target), apart(card, popover), apart(card, chosen)]).toEqual([true, true, true]);
        expect([popover.left >= frame.left, popover.top >= frame.top, popover.right <= frame.right, popover.bottom <= frame.bottom]).toEqual([true, true, true, true]);
    }
    await page.locator('#gem-selection').getByRole('button', { name: '장착', exact: true }).click();
    await expect(page.locator('#tutorial-action-card')).toBeHidden();
    await expect(page.locator('#game-toast-region')).toContainText('스킬룬 장착 완료');
    expect(await page.evaluate(() => game.activeSkill)).toBe('연속 베기');
    await expect(page.locator('#log')).toContainText('스킬룬 [연속 베기] 획득');
    await expect(page.locator('#log')).not.toContainText('직업에 맞는 스킬룬');
    expect(await page.evaluate(() => game.starterGemTutorialPending)).toBeFalsy();
    expect(errors).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath('natural-first-gem.png') });
    await testInfo.attach('first-session-observation', {
        body: JSON.stringify({ firstGemMs, notices, kind: 'automated walkthrough, not human feedback' }, null, 2),
        contentType: 'application/json'
    });
});

// Review round 3 #1: a player who closes the first-gem card instead of following it (idle play) used to fight with the
// basic attack and die repeatedly in acts 1-2. Closing the card equips the starter gem; 스킬룬 can still change it.
test('closing the first-gem card without following equips the starter gem', async ({ page }) => {
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
            if (title === '첫 스킬룬 장착') return 'closed';
        }
        return 'waiting';
    }, { timeout: 45000, intervals: [250, 500] }).toBe('closed');
    await expect.poll(() => page.evaluate(() => game.activeSkill)).toBe('연속 베기');
    await expect(page.locator('#game-toast-region')).toContainText('[연속 베기] 룬을 장착했습니다');
    expect(await page.evaluate(() => game.starterGemTutorialPending)).toBeFalsy();
    expect(errors).toEqual([]);
});

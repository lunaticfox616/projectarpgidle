const { test, expect } = require('@playwright/test');
const { pickClass } = require('./helpers');

test.beforeEach(async ({ page }) => {
    await page.route('https://**', route => route.fulfill({ status: 204, body: '' }));
    await page.goto('/');
    await page.locator('#btn-startup-guest').click();
    await pickClass(page, 'warrior');
    await page.waitForFunction(() => battleAssets.ready && !isStartupOverlayOpen() && !isLoadingOverlayOpen() && !window.GameModules.uiRuntime.status().running && !window.GameModules.uiRuntime.status().queued);
    await page.evaluate(() => {
        window.GameModules.application.timers.stopCombat();
        tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false);
    });
});

test('loop one exposes the basics and keeps the skill tree locked', async ({ page }, info) => {
    expect(await page.evaluate(() => ['tab-character','tab-items','tab-skills'].every(isTabSurfaceAvailable))).toBe(true);
    expect(await page.evaluate(() => isTabSurfaceAvailable('tab-char'))).toBe(false);
    expect(await page.evaluate(() => ['tab-unlocks','tab-season','tab-map'].some(id => contentProgression.canOpen(id)))).toBe(false);
    expect(await page.evaluate(() => contentProgression.canOpen('tab-journal'))).toBe(true);
    await page.evaluate(() => { switchTab('tab-items'); updateStaticUI(); });
    await expect(page.locator('#item-tab-equip')).toBeVisible();
    for (const id of ['craft','fossil','market','hall']) await expect(page.locator('#btn-item-tab-' + id)).toBeHidden();
    await page.evaluate(() => { switchItemSubtab('item-tab-craft'); switchTab('tab-skills'); updateStaticUI(); });
    await expect(page.locator('.attack-library')).toBeVisible();
    await expect(page.locator('.support-library')).toBeHidden();
    for (const id of ['enhance','condition']) await expect(page.locator('#btn-skill-tab-' + id)).toBeHidden();
    await page.evaluate(() => { switchSkillSubtab('skill-tab-enhance'); switchTab('tab-unlocks'); });
    expect(await page.evaluate(() => game.skillSubtab)).toBe('skill-tab-equip');
    await page.screenshot({ path: info.outputPath('loop-one.png') });
});

test('the opening explains equipment on pickup and introduces the other menus separately', async ({ page }, info) => {
    const routes = () => page.evaluate(() => ['tab-map', 'tab-items', 'tab-char', 'tab-character', 'tab-journal', 'tab-trade', 'tab-records', 'tab-social']
        .filter(id => contentProgression.canOpen(id)));
    // Skip fight duration while running the production clear handler.
    const clearAct = async (id, claimSlot) => {
        await page.evaluate(zoneId => {
            finishZoneClear(getZone(zoneId), 'stop', { say: addLog, redraw: updateStaticUI, unlocks: checkUnlocks, reveal: triggerMapUnlockReveal });
        }, id);
        await page.waitForFunction(() => !actRewardPromptPending() || isRewardOpen());
        if (claimSlot) {
            const key = await page.evaluate(([zone, slot]) => encodeURIComponent(getActRewardChoices(zone).find(row => row.slot === slot).claimKey), [id, claimSlot]);
            await page.locator(`#reward-overlay [data-choice-key="${key}"]`).click();
            await expect.poll(() => page.evaluate(zone => game.claimedActRewards.includes(zone), id)).toBe(true);
            return;
        }
        const later = page.locator('#reward-overlay').getByRole('button', { name: '나중에', exact: true });
        if (await later.isVisible()) await later.click();
    };
    await page.evaluate(() => {
        contentProgression.opening.enroll(game);
        game.level = 4;
        game.settings.autoMove = false;
        game.settings.autoEquipEmptySlots = false;
        storyJournalUi.setAutoShow(false);
        game.seenTutorials.push('story_prologue', 'story_act_1_start', 'tutorial_battle_basics');
        window.GameModules.state.tutorials.sync(game);
        if (activeTutorial) dismissTutorial(false);
        npcShop.meet(STORY_NPCS.haken, 0);
        updateStaticUI();
    });
    await expect.poll(routes).toEqual([]);
    await page.evaluate(() => {
        const run = actExplorationState.current(game);
        const item = generateEquipmentDrop({}, { zone: getZone(0), slot: '장갑', minimumRarity: 'magic' });
        actExplorationState.groundLoot.place(run, game.gridPlayer, item);
        commitCurrencyGain('magicBud', 1);
        updateStaticUI();
    });
    await expect.poll(routes).toEqual([]);
    await expect(page.locator('[data-opening-route]')).toHaveCount(0);
    await page.evaluate(() => {
        const run = actExplorationState.current(game);
        collectExplorationFloorLoot(actExplorationState.groundLoot.takeAt(run, game.gridPlayer));
        updateStaticUI();
    });
    await expect.poll(routes).toEqual(['tab-items']);
    await expect(page.locator('.opening-lesson')).toContainText('착용 중인 장비와 비교');
    await page.screenshot({ path: info.outputPath('act-one-gear-pickup.png'), animations: 'disabled' });
    await page.getByRole('button', { name: '첫 장비 살펴보기' }).click();
    await expect(page.locator('#item-tab-equip')).toBeVisible();
    await expect(page.locator('#tutorial-action-card [data-step]')).toHaveText('1 / 2단계');
    await page.locator('#item-tab-equip .tutorial-action-target').click();
    await expect(page.locator('#tutorial-action-card [data-step]')).toHaveText('2 / 2단계');
    await expect(page.locator('#ui-equipment-inventory-inspector .eqw-pick + #tutorial-action-card')).toBeVisible();
    await page.screenshot({ path: info.outputPath('act-one-first-equipment.png') });
    await page.evaluate(() => switchTab('tab-battle'));
    await expect(page.locator('#tutorial-action-card')).toBeHidden();
    await page.evaluate(() => openTabPane('tab-items'));
    await expect(page.locator('#tutorial-action-card [data-step]')).toHaveText('1 / 2단계');
    await page.locator('#ui-inventory-list .tutorial-action-target').click();
    await expect.poll(() => page.evaluate(() => !!game.equipment['장갑1'] || !!game.equipment['장갑2'])).toBe(false);
    await page.locator('#ui-equipment-inventory-inspector .equipment-card-primary.tutorial-action-target').click();
    await expect.poll(() => page.evaluate(() => !!game.equipment['장갑1'] || !!game.equipment['장갑2'])).toBe(true);
    await expect(page.locator('#tutorial-action-card')).toBeHidden();
    await page.evaluate(() => switchTab('tab-battle'));

    const rewardKey = await page.evaluate(() => {
        game.settings.mapCompleteAction = 'stop';
        const run = actExplorationState.current(game);
        run.status = 'cleared';
        run.mode = 'manual';
        delete run.arrival;
        finishEncounterRun();
        const choice = getActRewardChoices(0).find(row => row.slot === '장갑');
        return encodeURIComponent(choice.claimKey);
    });
    const reward = page.locator(`#reward-overlay [data-choice-key="${rewardKey}"]`);
    await expect(reward).toBeVisible();
    await expect.poll(routes).toEqual(['tab-map', 'tab-items']);
    await expect(page.locator('[data-opening-route]:visible')).toHaveCount(0);
    await reward.click();
    await expect.poll(() => page.evaluate(() => game.claimedActRewards.includes(0))).toBe(true);
    const map = page.getByRole('button', { name: '다음 지역 지도 보기' });
    await expect(map).toBeVisible();
    await expect(page.locator('[data-opening-route]')).toHaveCount(1);
    await expect.poll(routes).toEqual(['tab-map', 'tab-items']);
    await expect(page.getByRole('button', { name: '첫 장비 살펴보기' })).toHaveCount(0);
    await expect(page.locator('#ui-goal-drawer')).not.toContainText('새 이야기 저널 확인');
    await expect(page.locator('#ui-goal-drawer')).not.toContainText('스킬트리 포인트');
    await expect(page.locator(':is(#btn-combat-chat-tab, [data-message-tab="chat"]):visible')).toHaveCount(0);
    await page.screenshot({ path: info.outputPath('act-one-reward-to-map.png') });
    await map.click();
    const go = page.locator('.wm-side[data-wm="act-02"] .atlas-hunt-now');
    await expect(go).toBeVisible();
    await go.click();
    await expect.poll(() => page.evaluate(() => game.currentZoneId)).toBe(1);
    expect(await routes()).toEqual(['tab-map', 'tab-items']);
    await page.screenshot({ path: info.outputPath('act-two-arrival.png') });
    await expect.poll(routes).toEqual(['tab-map', 'tab-items']);
    await page.evaluate(() => {
        switchTab('tab-battle');
        npcShop.meet(STORY_NPCS.orga, 1);
        contentUnlockUi.openNpc({ id: 'orga', ...STORY_NPCS.orga }, 'shop');
    });
    await expect(page.locator('#npc-dialog [data-npc-topic]')).not.toHaveCount(0);
    await expect(page.locator('#npc-dialog [data-npc-topic="shop"], #npc-dialog [data-npc-topic="exchange"], #npc-dialog .shop-view')).toHaveCount(0);
    await page.locator('#npc-dialog [data-npc-close]').click();

    await clearAct(1);
    await expect.poll(routes).toEqual(['tab-map', 'tab-items']);
    await clearAct(2, '반지');
    expect(await page.evaluate(() => Object.values(game.equipment).concat(game.inventory).some(item => item?.slot === '반지'))).toBe(true);
    await expect.poll(() => page.evaluate(() => contentProgression.canOpen('skill-tab-condition'))).toBe(true);
    await expect.poll(() => page.evaluate(() => game.tutorialHistory.find(row => row.key === 'unlock_content_tactics')?.status)).toBe('unread');
    await expect.poll(routes).toEqual(['tab-map', 'tab-items']);
    await page.evaluate(() => {
        openTabPane('tab-skills');
        switchSkillSubtab('skill-tab-condition');
        updateStaticUI();
    });
    const tacticTarget = page.locator('#sel-combat-target-priority');
    await expect(tacticTarget).toHaveClass(/tutorial-callout/);
    const alternative = await tacticTarget.evaluate(node => [...node.options].find(option => option.value !== node.value).value);
    await tacticTarget.selectOption(alternative);
    await expect(tacticTarget).not.toHaveClass(/tutorial-callout/);
    expect(await page.evaluate(() => game.settings.combatTargetPriority)).toBe(alternative);
    await page.evaluate(() => switchTab('tab-battle'));
    await clearAct(3);
    await expect.poll(routes).toEqual(['tab-map', 'tab-items', 'tab-journal']);
    expect(await page.evaluate(() => ['act_1', 'act_2', 'act_3', 'act_4'].every(id => game.journalEntries.includes(id)))).toBe(true);
    await expect(page.getByRole('button', { name: '새 기록 읽기' })).toBeVisible();
    await page.screenshot({ path: info.outputPath('act-five-journal.png') });
    await clearAct(4);
    await expect.poll(routes).toEqual(['tab-map', 'tab-items', 'tab-journal']);
    await page.evaluate(() => {
        game.currentZoneId = 5;
        npcShop.meet(STORY_NPCS.bern, 5);
        updateStaticUI();
    });
    await expect.poll(routes).toEqual(['tab-map', 'tab-items', 'tab-journal', 'tab-trade']);
    await page.getByRole('button', { name: 'NPC 상점 보기' }).click();
    await page.locator('#npc-roster-panel [data-npc-open="bern"][data-npc-mode="shop"]').click();
    await expect(page.locator('#npc-dialog [data-npc-shop="bern"] .shop-item').first()).toBeVisible();
    await page.screenshot({ path: info.outputPath('act-six-trade.png') });
});

test('loop two teaches a paid skill tree unlock and a manual first investment', async ({ page }, info) => {
    await page.evaluate(() => {
        storyJournalUi.setAutoShow(false);
        game.seenTutorials.push('tutorial_battle_basics', 'unlock_stump_box', 'tutorial_stump_starter');
        game.season = 2;
        game.loopCount = 1;
        contentProgression.sync();
        checkUnlocks();
    });
    const notice = page.locator('#tutorial-overlay.active');
    await expect(notice).toContainText('스킬트리 해금');
    await notice.getByRole('button', { name: '따라 해보기' }).click();
    const purchase = page.locator('[data-unlock-content="passiveTree"]');
    await expect(purchase).toBeVisible();
    await expect(page.locator('#tutorial-action-card')).toContainText('해금 후 1점이 남습니다.');
    expect(await page.evaluate(() => [contentProgression.balance(), contentProgression.canOpen('tab-char')])).toEqual([2, false]);
    await page.screenshot({ path: info.outputPath('skill-tree-purchase.png') });
    await purchase.click();
    await expect.poll(() => page.evaluate(() => [contentProgression.balance(), contentProgression.canOpen('tab-char')])).toEqual([1, true]);
    expect(await page.evaluate(() => game.tutorialHistory.some(row => row.key === 'tutorial_first_passive'))).toBe(false);
    await page.evaluate(() => {
        switchTab('tab-battle');
        game.exp = getExpReq(game.level);
        grantExpAndGem({ level: 1 }, getPlayerStats());
        updateStaticUI();
    });
    await expect(notice).toContainText('첫 스킬트리 포인트');
    await notice.getByRole('button', { name: '따라 해보기' }).click();
    const ring = page.locator('.passive-guide-ring').first();
    await expect(ring).toBeVisible();
    const box = await ring.boundingBox();
    const node = await ring.getAttribute('data-guide-node');
    const attribute = await page.evaluate(id => PASSIVE_TREE.nodes[id].kind === 'attribute', node);
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    await page.screenshot({ path: info.outputPath('skill-tree-first-node.png') });
    if (info.project.use.hasTouch) {
        await page.touchscreen.tap(x, y);
        await page.locator('[data-passive-confirm]').click();
    } else {
        await page.mouse.click(x, y);
    }
    if (attribute) await page.locator('#game-dialog-confirm').click();
    await expect.poll(() => page.evaluate(() => [game.passivePoints, ...game.passives])).toEqual([0, node]);
});


// Review round 3 #4: at 1366×768 the 해금 window body ends above the HUD and the buy button sat below it, out of view.
test('the unlock buy button stays visible in a small desktop window', async ({ page }, info) => {
    test.skip(info.project.use.isMobile, 'Desktop window size');
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.evaluate(() => { game.season = 2; game.loopCount = 1; contentProgression.sync(); updateStaticUI(); openTabPane('tab-unlocks'); });
    const buy = page.locator('#content-unlock-panel .unlock-detail-action [data-unlock-content]');
    await expect(buy).toBeVisible();
    const hit = await buy.evaluate(button => {
        const box = button.getBoundingClientRect();
        return document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)?.closest('button') === button;
    });
    expect(hit).toBe(true);
});

// 2026-11-02: the unlock tab is one tree from three roots: it scrolls along the loops and the panel itself stays inside the window.
test('the unlock tab draws one tree that scrolls by loop', async ({ page }, info) => {
    await page.evaluate(() => {
        game.season = 20; game.contentProgression.highestLoop = 20;
        contentProgression.sync(); updateStaticUI(); openTabPane('tab-unlocks'); unlockTabUi.render();
    });
    const panel = page.locator('#content-unlock-panel');
    await expect(panel.locator('.unlocks-canvas [data-unlock-select="gemAwakening"]')).toHaveCount(1);
    await expect(panel.locator('.unlock-lines [data-to="gemAwakening"]')).toHaveCount(2);
    expect(await panel.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
    expect(await panel.locator('.unlocks-scroll').evaluate(el => el.scrollWidth > el.clientWidth)).toBe(true);
    await expect(panel.locator('.unlock-detail img[src*="portrait"]')).toHaveCount(0);
    await page.screenshot({ path: info.outputPath('unlock-tab.png') });
});

// An older atlas unlock remains usable independently of Chaos Realm, even below today's initial unlock loop.
test('the atlas window shows as soon as the atlas opens, before the chaos realm gate', async ({ page }) => {
    await page.evaluate(() => {
        game.season = 10; game.atlas.unlocked = true;
        contentProgression.sync(); updateStaticUI();
        switchTab('tab-map'); switchMapSubtab('map-tab-zones'); switchMapExploreSubtab('map-explore-worldtree');
    });
    expect(await page.evaluate(() => [contentProgression.isUnlocked('chaosRealm'), contentProgression.canOpen('map-explore-worldtree')]))
        .toEqual([false, true]);
    await expect(page.locator('#map-explore-worldtree')).not.toHaveAttribute('data-content-locked', '');
    await expect(page.locator('#map-explore-worldtree')).toBeVisible();
});

test('the underworld announces itself once and leads to the blocked entrance', async ({ page }, info) => {
    await page.evaluate(() => {
        storyJournalUi.setAutoShow(false);
        game.season = 20;
        game.currentZoneId = game.maxZoneId = 9;
        game.seenTutorials.push('opening_done');
        game.combatHalted = true;
        game.chaosRealm.unlocked = true;
        game.underworldProgress.highestFloor = 11;
        game.contentProgression.automatic.push('chaosRealm', 'underworld');
        contentProgression.sync();
        updateStaticUI();
    });
    await page.waitForFunction(() => !window.GameModules.uiRuntime.status().queued && !window.GameModules.uiRuntime.status().running);
    await page.evaluate(() => {
        const key = 'unlock_content_underworld';
        if (activeTutorial && activeTutorial.key !== key) dismissTutorial(false);
        underworldRuneUi.pages().select('stones');
        contentUnlockUi.announceContent('underworld');
        const history = window.GameModules.state.tutorials;
        history.reset();
        history.sync(game);
        for (let i = tutorialQueue.length - 1; i >= 0; i--) if (tutorialQueue[i].key !== key) tutorialQueue.splice(i, 1);
        tutorialActionUi.quietUntil = 0;
        showNextTutorial();
    });
    await expect(page.locator('#btn-adventure-guide, #adventure-guide, [data-guide-open]')).toHaveCount(0);
    await expect(page.locator('#tutorial-title')).toHaveText('지하계');
    await expect(page.locator('#tutorial-body')).toContainText('지도 → 탐험 → 지하계 → 탐사');
    await expect(page.locator('#tutorial-body')).toContainText('10층을 돌파하면 첫 지하석');
    await page.locator('#tutorial-open-btn').click();
    const entry = page.locator('#ui-underworld-list .underworld-entry-card');
    await expect(entry).toBeVisible();
    await expect(entry).toContainText('이번 루프 혼돈 20 클리어 필요');
    await expect(entry).toContainText('최고 개방 11층');
    await expect(entry.getByRole('button', { name: '최고층 11 입장' })).toBeDisabled();
    await page.screenshot({ path: info.outputPath('underworld-entry.png') });
    await entry.getByRole('button', { name: '조건을 채울 곳 보기' }).click();
    expect(await page.evaluate(() => [game.mapExploreSubtab, game.currentZoneId])).toEqual(['map-explore-atlas', 9]);
    expect(await page.evaluate(() => {
        contentUnlockUi.announceContent('underworld');
        return game.tutorialHistory.filter(row => row.key === 'unlock_content_underworld').map(row => row.status);
    })).toEqual(['read']);
});

test('the outside-chaos notice opens the actual entry in the loop panel', async ({ page }) => {
    await page.evaluate(() => {
        storyJournalUi.setAutoShow(false);
        game.season = 10;
        game.currentZoneId = game.maxZoneId = 9;
        game.seenTutorials.push('opening_done');
        game.combatHalted = true;
        game.loopProgressCurrent.chaos20Cleared = true;
        contentProgression.sync();
        updateStaticUI();
    });
    await page.waitForFunction(() => !window.GameModules.uiRuntime.status().queued && !window.GameModules.uiRuntime.status().running);
    await page.evaluate(() => {
        const key = 'unlock_outside_chaos';
        if (activeTutorial && activeTutorial.key !== key) dismissTutorial(false);
        contentUnlockUi.announceOutsideChaos();
        for (let i = tutorialQueue.length - 1; i >= 0; i--) if (tutorialQueue[i].key !== key) tutorialQueue.splice(i, 1);
        tutorialActionUi.quietUntil = 0;
        showNextTutorial();
    });
    await expect(page.locator('#tutorial-title')).toHaveText('혼돈 밖');
    await expect(page.locator('#tutorial-body')).toContainText('루프 → 루프 패시브 → 심화 등반과 영구 강화 → 혼돈 밖 진입');
    await page.locator('#tutorial-open-btn').click();
    const section = page.locator('#ui-loop10-section');
    await expect(section).toHaveAttribute('open', '');
    await expect(section.getByRole('button', { name: '혼돈 밖 진입' })).toBeEnabled();
});

test('cosmos opens the star map and sky explains the current loop gate next to its rewards', async ({ page }) => {
    await page.evaluate(() => {
        storyJournalUi.setAutoShow(false);
        game.season = 25;
        game.currentZoneId = game.maxZoneId = 9;
        game.seenTutorials.push('opening_done');
        game.combatHalted = true;
        game.skyTower.unlocked = true;
        game.cosmosAtlas.unlocked = true;
        game.contentProgression.automatic.push('sky', 'cosmos');
        contentProgression.sync();
        announceMapPrimaryContentUnlocks();
        cosmosRouteUi.pages().select('mastery');
        contentUnlockUi.open('cosmos');
        updateStaticUI();
    });
    await expect.poll(() => page.evaluate(() => [game.mapSubtab, cosmosRouteUi.pages().items.find(item => item.on)?.id]))
        .toEqual(['map-tab-cosmos', 'route']);
    await page.evaluate(() => {
        contentUnlockUi.open('sky');
        updateStaticUI();
    });
    const entry = page.locator('#ui-sky-tower-panel .map-expedition-intro');
    await expect(entry).toBeVisible();
    await expect(entry).toContainText('응축된 창공의 정수');
    await expect(entry).toContainText('이번 루프 혼돈 입성 후 입장할 수 있습니다.');
    await expect(entry.getByRole('button', { name: '1층 입장' })).toBeDisabled();
    await expect(entry.getByRole('button', { name: '혼돈으로 가는 길 보기' })).toBeEnabled();
});

test('the atlas appears on the world map only after its own unlock', async ({ page }) => {
    await page.evaluate(() => {
        storyJournalUi.setAutoShow(false);
        game.season = ATLAS.unlockLoop;
        game.currentZoneId = game.maxZoneId = 9;
        game.seenTutorials.push('opening_done');
        game.combatHalted = true;
        game.chaosRealm.unlocked = true;
        game.contentProgression.automatic.push('chaosRealm');
        contentProgression.sync();
        updateStaticUI();
    });
    await page.waitForFunction(() => !window.GameModules.uiRuntime.status().queued && !window.GameModules.uiRuntime.status().running);
    await page.evaluate(() => explorationAtlasUi.open());
    const atlas = page.locator('.wm-atlas-entrance');
    await expect(atlas).toHaveCount(0);
    await page.evaluate(() => {
        game.loopProgressCurrent.chaos20Cleared = true;
        atlasRun.onChaos20();
        updateStaticUI();
    });
    await expect(atlas).toHaveCount(1);
    await expect(page.locator('[data-guide-open]')).toHaveCount(0);
});

test('Records replays in place and automatically returns after each completed action', async ({ page }, info) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.evaluate(() => {
        storyJournalUi.setAutoShow(false);
        game.season = 2;
        game.seenTutorials.push('opening_done', 'unlock_stump_box', 'tutorial_stump_starter');
        game.combatHalted = true;
        game.stumpBox.acquired = true;
        game.contentProgression.inherited.push('passiveTree', 'stump');
        contentProgression.sync();
        persistLocalSave({ touchModifiedAt: false });
        window.guideTestLiveGame = game;
        openTabPane('tab-guide');
        updateStaticUI();
    });
    const guide = page.locator('#ui-player-guide');
    const replayBar = page.locator('.guide-replay-bar');
    const navigations = [];
    page.on('request', request => { if (request.isNavigationRequest()) navigations.push(request.url()); });
    await expect(guide.getByText('해금 포인트', { exact: true })).toBeVisible();
    const actual = () => page.evaluate(() => ({ live: game === window.guideTestLiveGame, equipment: game.equipment,
        inventory: game.inventory, skill: game.activeSkill, passives: game.passives, points: game.passivePoints, stump: game.stumpBox }));
    const before = await actual();
    let slotBefore;
    const open = async key => {
        slotBefore = await page.evaluate(() => localStorage.getItem(getSaveSlot().key));
        await page.evaluate(() => showGameToast('다시보기 전 안내', { duration: 1500 }));
        await guide.locator(`[data-guide-lesson="${key}"]`).click();
        await expect(replayBar).toBeVisible();
        await expect(page.locator('#loading-overlay, #startup-overlay, #tutorial-overlay').filter({ visible: true })).toHaveCount(0);
        await expect(page.locator('.game-toast').filter({ visible: true })).toHaveCount(0);
        expect(page.frames()).toHaveLength(1);
        return page;
    };
    const returned = async () => {
        await expect(replayBar).toHaveCount(0);
        await expect(guide).toBeVisible();
        await expect(page.getByText('가이드 완료', { exact: true }).last()).toBeVisible();
        expect(await actual()).toEqual(before);
    };
    const frame = await open('unlock_items');
    await expect(frame.locator('#item-tab-equip')).toBeVisible();
    await expect(frame.locator('#tutorial-action-card [data-step]')).toHaveText('1 / 2단계');
    const isolation = await page.evaluate(() => {
        const queued = { key: 'tutorial_battle_basics', title: '기존 대기 안내', body: '다시보기와 무관한 안내' };
        tutorialQueue.unshift(queued);
        try {
            showNextTutorial();
            runGameTick();
            queueTutorialNotice('guide_test_notice', '예시 안내', '다시보기와 무관한 안내');
            return [game !== window.guideTestLiveGame, persistLocalSave({ allowRecoveryWrite: true }),
                tutorialQueue[0] === queued, game.tutorialHistory.length];
        } finally {
            const index = tutorialQueue.indexOf(queued);
            if (index >= 0) tutorialQueue.splice(index, 1);
        }
    });
    expect(isolation).toEqual([true, false, true, 0]);
    await expect(page.locator('#tutorial-overlay.active')).toHaveCount(0);
    const item = frame.locator('#ui-inventory-list .equipment-grid-item.tutorial-action-target');
    await expect(item).toHaveCSS('animation-name', 'tutorial-control-pulse');
    expect(await item.evaluate(node => {
        const pulse = node.getAnimations().find(animation => animation.animationName === 'tutorial-control-pulse');
        tutorialActionUi.refresh();
        return !!pulse && node.getAnimations().includes(pulse);
    })).toBe(true);
    await item.click();
    await expect(frame.locator('#ui-equipment-inventory-inspector .eqw-deltas')).toBeVisible();
    await expect(replayBar).toBeVisible();
    expect(await page.evaluate(previous => localStorage.getItem(getSaveSlot().key) === previous, slotBefore)).toBe(true);
    const equip = frame.locator('#ui-equipment-inventory-inspector .equipment-card-primary.tutorial-action-target');
    await expect(equip).toHaveCSS('animation-name', 'tutorial-control-pulse');
    await page.screenshot({ path: info.outputPath('records-gear-replay.png') });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(equip).toHaveCSS('animation-name', 'none');
    await expect(equip).toHaveCSS('outline-style', 'solid');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await equip.click();
    await returned();
    const skills = await open('unlock_skills');
    await skills.locator('[data-attack-rune="화염 참격"].tutorial-action-target').click();
    await skills.locator('#gem-selection .gem-equip-primary.tutorial-action-target').click();
    await returned();
    const tree = await open('unlock_char');
    await expect(tree.locator('#tree-canvas')).toBeVisible();
    const ring = tree.locator('.passive-guide-ring').first();
    await expect(ring).toBeVisible();
    const nodeId = await ring.getAttribute('data-guide-node');
    const attribute = await ring.evaluate((_, id) => PASSIVE_TREE.nodes[id].kind === 'attribute', nodeId);
    const box = await ring.boundingBox();
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    if (info.project.use.hasTouch) {
        await page.touchscreen.tap(x, y);
        await tree.locator('[data-passive-confirm].tutorial-action-target').click();
    } else {
        await page.mouse.click(x, y);
    }
    if (attribute) await tree.locator('#game-dialog-confirm').click();
    await returned();
    const stump = await open('unlock_stump_box');
    await stump.locator('#stump-box-storage .stump-item.tutorial-action-target').click();
    await stump.locator('#stump-box-board .stump-cell.tutorial-action-target').click();
    if (info.project.use.hasTouch) await stump.locator('[data-stump-action="placement-apply"].tutorial-action-target').click();
    await returned();
    await open('unlock_items');
    await replayBar.getByRole('button', { name: '가이드로 돌아가기' }).click();
    await expect(replayBar).toHaveCount(0);
    await expect(guide).toBeVisible();
    expect(await actual()).toEqual(before);
    await open('unlock_items');
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
    await expect(replayBar).toHaveCount(0);
    expect(await actual()).toEqual(before);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem(getSaveSlot().key)).inventory)).toEqual(before.inventory);
    expect(navigations).toEqual([]);
});

test('system guide replays complete through real shop, craft and rune controls', async ({ page }, info) => {
    await page.evaluate(() => {
        storyJournalUi.setAutoShow(false);
        game.season = 6;
        game.combatHalted = true;
        game.seenTutorials.push('opening_done');
        game.contentProgression.inherited.push('support', 'craft', 'gemForge', 'engraving');
        npcShop.meet(STORY_NPCS.bern, 0);
        contentProgression.sync();
        window.guideTestLiveGame = game;
        openTabPane('tab-guide');
        updateStaticUI();
    });
    const guide = page.locator('#ui-player-guide');
    const target = page.locator('.tutorial-action-target');
    const live = () => page.evaluate(() => JSON.stringify([game === window.guideTestLiveGame, game.equippedSupports, game.skyGemEnhancements, game.inventory, game.currencies]));
    const original = await live();
    const open = key => guide.locator(`[data-guide-lesson="${key}"]`).click();
    const returned = async () => {
        await expect(guide).toBeVisible();
        await expect(page.locator('.guide-replay-bar')).toHaveCount(0);
        await expect(target).toHaveCount(0);
        expect(await live()).toBe(original);
    };

    await open('tutorial_support_equip');
    await expect(target).toHaveAttribute('data-board-pick', 'support');
    await target.click();
    await expect(page.locator('#gem-slot-dialog #tutorial-action-card')).toBeVisible();
    await expect(target).toHaveAttribute('data-slot-action', 'choose');
    await page.screenshot({ path: info.outputPath('support-tutorial.png') });
    await target.click();
    await returned();

    await open('tutorial_rune_engrave');
    await expect(target).toHaveAttribute('data-board-engrave', '0');
    await target.click();
    await expect(page.locator('#gem-engrave-slot-overlay #tutorial-action-card')).toBeVisible();
    await expect(target).toHaveAttribute('data-action', 'apply');
    await target.click();
    await returned();

    await open('tutorial_craft_gear');
    await expect(page.locator('#item-tab-craft')).toBeVisible();
    await target.click();
    await expect(target).toHaveAttribute('data-craft-resource', 'magicBud');
    await target.click();
    await returned();

    await open('tutorial_shop_buy');
    await expect(target).toHaveAttribute('data-npc-mode', 'shop');
    await target.click();
    await expect(page.locator('#npc-dialog #tutorial-action-card')).toBeVisible();
    await expect(target).toHaveAttribute('data-shop-pick', /^ware:/);
    await target.click();
    await expect(target).toHaveAttribute('data-npc-buy', /\d+/);
    await target.click();
    await returned();

    await open('tutorial_salvage_gear');
    await target.click();
    if (info.project.use.hasTouch) {
        await expect(target).toHaveClass(/eqw-manage-toggle/);
        await target.click();
    }
    await expect(target).toHaveClass(/equipment-card-danger/);
    await target.click();
    await returned();
});

test('first system visits coach real transactions without stacking notices', async ({ page }) => {
    await page.evaluate(() => {
        storyJournalUi.setAutoShow(false);
        game.season = 6;
        game.level = 12;
        game.combatHalted = true;
        game.seenTutorials.push('opening_done', 'unlock_skills', 'tutorial_battle_basics');
        game.contentProgression.inherited.push('support', 'craft', 'gemForge', 'engraving');
        game.equipment['무기'] = createClassStarterWeapon('warrior');
        game.equipment['투구'] = createItemFromBase(chooseItemBase('투구', 1, getZone(0)), 'normal', 1);
        game.skills.push('화염 참격');
        game.activeSkill = '화염 참격';
        game.gemData['화염 참격'] = normalizeGemRecord(null);
        gemDropRewards.grant(game, { kind: 'support', name: '가속', tier: 1 });
        game.currencies.magicBud = game.currencies.skyEssence = 1;
        contentProgression.sync();
        openTabPane('tab-skills');
    });
    const coach = page.locator('#tutorial-action-card');
    const target = page.locator('.tutorial-action-target');
    await expect(coach).toContainText('보조스킬룬 장착');
    await target.click();
    await target.click();
    await expect.poll(() => page.evaluate(() => game.equippedSupports.includes('가속'))).toBe(true);
    await expect(coach).toBeHidden();
    await page.locator('#gem-slot-dialog [data-selection-close]').click();

    await page.evaluate(() => { openTabPane('tab-items'); switchItemSubtab('item-tab-craft'); });
    await expect(coach).toContainText('첫 장비 제작');
    await target.click();
    await expect(target).toHaveAttribute('data-craft-resource', 'magicBud');
    await target.click();
    await expect.poll(() => page.evaluate(() => game.seenTutorials.includes('action_tutorial_craft_gear'))).toBe(true);
    expect(await page.evaluate(() => game.currencies.magicBud)).toBe(0);
    await expect(coach).toBeHidden();

    await page.evaluate(() => { openTabPane('tab-skills'); switchSkillSubtab('skill-tab-enhance'); updateStaticUI(); });
    await expect(coach).toContainText('스킬룬 각인');
    await expect(target).toHaveAttribute('data-slot-state', 'open');
    await target.click();
    await expect(target).toHaveAttribute('data-action', 'apply');
    await target.click();
    await expect.poll(() => page.evaluate(() => game.seenTutorials.includes('action_tutorial_rune_engrave'))).toBe(true);
    expect(await page.evaluate(() => game.currencies.skyEssence)).toBe(0);

    await page.evaluate(() => {
        game.currencies.magicBud = game.currencies.formlessDew = 10;
        npcShop.meet(STORY_NPCS.bern, 0);
        openTabPane('tab-trade');
        contentUnlockUi.openNpc(STORY_NPCS.bern);
    });
    await expect(target).toHaveAttribute('data-npc-topic', 'shop');
    await target.click();
    await expect(target).toHaveAttribute('data-shop-pick', /^ware:/);
    await target.click();
    await expect(target).toHaveAttribute('data-npc-buy', /\d+/);
    await target.click();
    await expect.poll(() => page.evaluate(() => game.seenTutorials.includes('action_tutorial_shop_buy'))).toBe(true);
    expect(await page.evaluate(() => game.inventory.length)).toBe(1);
    await expect(page.locator('#tutorial-overlay.active')).toHaveCount(0);
});

test('a destination opened in away settlement saves its notice before presenting it', async ({ page }) => {
    const result = await page.evaluate(async () => {
        game.season = ATLAS.unlockLoop;
        game.currentZoneId = game.maxZoneId = 9;
        game.seenTutorials.push('opening_done');
        const now = Date.now();
        backgroundCombatRuntime.hiddenAtMs = now - 12 * 60 * 1000;
        backgroundCombatRuntime.snapshot = cloneBackgroundCombatState(game);
        backgroundCombatRuntime.signature = getBackgroundCombatSignature(game);
        // Keep the real settlement, save, and presentation. Supply a replay ending at the first atlas opening.
        const simulate = window.simulateBackgroundCombatChunked;
        window.simulateBackgroundCombatChunked = async options => {
            const replay = createCombatReplay(options.elapsedMs, options.snapshot, options.startNowMs);
            replay.processedMs = 60_000;
            replay.game.loopProgressCurrent.chaos20Cleared = true;
            atlas.sync(replay.game);
            return finishCombatReplay(replay);
        };
        try {
            const settled = await startBackgroundCombatReturn(now);
            const save = JSON.parse(readLocalSaveString());
            const notices = save.tutorialHistory.filter(row => row.key === 'unlock_world_tree_atlas');
            return { settled, opened: save.atlas.unlocked, notices: notices.map(row => [row.status, row.subtabId]) };
        } finally { window.simulateBackgroundCombatChunked = simulate; }
    });
    expect(result).toEqual({ settled: true, opened: true, notices: [['pending', 'map-explore-worldtree']] });
    await expect(page.locator('#background-combat-result-overlay')).toBeVisible();
});

test('the live rune and seed tutorials wait for the real equip and placement', async ({ page }, info) => {
    await page.evaluate(() => {
        game.season = 2;
        game.level = 12;
        game.combatHalted = true;
        game.seenTutorials.push('opening_done', 'unlock_stump_box', 'tutorial_stump_starter');
        game.equipment['무기'] = createClassStarterWeapon('warrior');
        game.stumpBox.acquired = true;
        game.contentProgression.inherited.push('stump', 'passiveTree');
        stumpBox.createItem(game, { family: 'seed', color: 'fire', roll: 1 });
        contentProgression.sync();
        game.skills.push('화염 참격');
        checkUnlocks();
        tutorialActionUi.quietUntil = 0;
        showNextTutorial();
    });
    const notice = page.locator('#tutorial-overlay.active');
    await expect(notice).toContainText('새 스킬룬');
    await notice.getByRole('button', { name: '따라 해보기' }).click();
    const card = page.locator('#tutorial-action-card');
    await expect(card.locator('[data-step]')).toHaveText('1 / 2단계');
    await page.locator('[data-attack-rune="화염 참격"].tutorial-action-target').click();
    await expect(card.locator('[data-step]')).toHaveText('2 / 2단계');
    await expect(card).toBeVisible();
    expect(await page.evaluate(() => game.activeSkill)).not.toBe('화염 참격');
    await page.locator('#gem-selection .gem-equip-primary.tutorial-action-target').click();
    await expect.poll(() => page.evaluate(() => game.activeSkill)).toBe('화염 참격');
    await expect(card).toBeHidden();
    await page.evaluate(() => tutorialActionUi.start({ key: 'unlock_stump_box', tabId: 'tab-stump' }));
    const seed = page.locator('#stump-box-storage .stump-item.tutorial-action-target');
    const id = Number(await seed.getAttribute('data-item'));
    await seed.click();
    const cell = page.locator('#stump-box-board .stump-cell.tutorial-action-target');
    await expect(cell).toBeVisible();
    expect(await page.evaluate(seedId => game.stumpBox.board.includes(seedId), id)).toBe(false);
    await cell.click();
    if (info.project.use.hasTouch) {
        const plant = page.locator('[data-stump-action="placement-apply"].tutorial-action-target');
        await expect(card.locator('[data-step]')).toHaveText('3 / 3단계');
        expect(await page.evaluate(seedId => game.stumpBox.board.includes(seedId), id)).toBe(false);
        await plant.click();
    }
    await expect.poll(() => page.evaluate(seedId => game.stumpBox.board.includes(seedId), id)).toBe(true);
    await expect(card).toBeHidden();
});

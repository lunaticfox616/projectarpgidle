const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
    await page.route('https://**', route => route.fulfill({ status: 204, body: '' }));
    await page.goto('/');
    await page.locator('#btn-startup-guest').click();
    await page.locator('[data-class-id="warrior"]').click();
    await page.waitForFunction(() => battleAssets.ready && !isStartupOverlayOpen() && !isLoadingOverlayOpen() && !uiRefreshRunning && !uiRefreshQueued);
    await page.evaluate(() => {
        clearInterval(gameTickHandle); gameTickHandle = null;
        tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false);
    });
});

test('point cap keeps funded choices available and shows completion after the last purchase', async ({ page }, info) => {
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.evaluate(() => {
        game.season=50;contentProgression.sync();
        switchTab('tab-unlocks');updateStaticUI();
    });
    await expect(page.locator('.content-unlock-balance strong')).toHaveText('38');
    expect(await page.evaluate(()=>loopSettlementUi.summaryHtml())).not.toContain('해금 포인트 +');
    await page.evaluate(() => {
        game.contentProgression.inherited=CONTENT_UNLOCK_CATALOG.filter(def=>def.cost>0&&def.id!=='craft').map(def=>def.id);
        contentProgression.sync();contentUnlockUi.render();
    });
    await expect(page.locator('.content-unlock-balance strong')).toHaveText('1');
    await page.waitForFunction(()=>!uiRefreshRunning && !uiRefreshQueued);
    await page.evaluate(()=>{tutorialQueue.length=0;if(activeTutorial)dismissTutorial(false);});
    await page.locator('[data-unlock-content="craft"]').click();
    await expect(page.locator('.content-unlock-balance')).toHaveText('전체 해금 완료');
    await expect(page.locator('.content-unlock-balance strong')).toHaveCount(0);
    expect(await page.evaluate(()=>contentProgression.balance())).toBe(0);
    await page.evaluate(() => {
        game=mergeDefaults(JSON.parse(JSON.stringify(game)));contentProgression.sync();
        tutorialQueue.length=0;if(activeTutorial)dismissTutorial(false);
        contentUnlockUi.render();
    });
    await expect(page.locator('.content-unlock-balance')).toHaveText('전체 해금 완료');
    await page.locator('.content-unlock-heading').scrollIntoViewIfNeeded();
    await expect(page.locator('.content-unlock-balance')).toBeInViewport();
    await page.screenshot({path:info.outputPath('unlock-complete.png')});
    expect(await page.evaluate(()=>loopSettlementUi.summaryHtml())).toContain('전체 해금 완료');
    expect(errors).toEqual([]);
});

test('loop one exposes the four basics and prevents advanced shortcuts', async ({ page }, info) => {
    await expect(page.locator('#ui-combat-flasks')).toBeHidden();
    await expect(page.locator('#ui-combat-flasks .combat-flask-mini')).toHaveCount(0);
    expect(await page.evaluate(() => ['tab-character','tab-char','tab-items','tab-skills'].every(isTabSurfaceAvailable))).toBe(true);
    expect(await page.evaluate(() => ['tab-unlocks','tab-season','tab-map','tab-flask','tab-journal'].some(id => contentProgression.canOpen(id)))).toBe(false);
    await page.evaluate(() => { switchTab('tab-items'); updateStaticUI(); });
    await expect(page.locator('#item-tab-equip')).toBeVisible();
    for (const id of ['craft','fossil','market','hall','infuser']) await expect(page.locator('#btn-item-tab-' + id)).toBeHidden();
    await page.evaluate(() => { switchItemSubtab('item-tab-craft'); switchTab('tab-skills'); updateStaticUI(); });
    await expect(page.locator('.attack-library')).toBeVisible();
    await expect(page.locator('.support-library')).toBeHidden();
    for (const id of ['enhance','research','condition']) await expect(page.locator('#btn-skill-tab-' + id)).toBeHidden();
    await page.evaluate(() => { switchSkillSubtab('skill-tab-enhance'); switchTab('tab-unlocks'); });
    expect(await page.evaluate(() => game.skillSubtab)).toBe('skill-tab-equip');
    await page.screenshot({ path: info.outputPath('loop-one.png') });
});

test('unlock details explain mixed growth and expose included systems without extra purchases', async ({ page }, info) => {
    const errors=[];
    page.on('pageerror', error=>errors.push(error.message));
    await page.evaluate(() => {
        game.season=25; contentProgression.sync(); contentProgression.purchase('craft');
        checkUnlocks(); tutorialQueue.length=0; if(activeTutorial) dismissTutorial(false);
        switchTab('tab-unlocks'); updateStaticUI();
    });
    await page.waitForFunction(()=>!uiRefreshRunning && !uiRefreshQueued);
    await page.evaluate(()=>{tutorialQueue.length=0;if(activeTutorial)dismissTutorial(false);});
    await page.locator('[data-unlock-group="support"]').click();
    await page.locator('[data-unlock-select="gemForge"]').click();
    await page.locator('.unlock-lifetime summary').click();
    await expect(page.locator('.unlock-lifetime')).toContainText('일부 유지');
    await expect(page.locator('.unlock-lifetime')).toContainText('군주의 핵·창공의 힘');
    await expect(page.locator('.unlock-requirements')).toContainText('2P');
    await page.locator('#unlock-related-gemForge summary').click();
    await expect(page.locator('#unlock-related-gemForge')).toContainText('응축된 창공의 힘');
    await page.locator('.unlock-lifetime').scrollIntoViewIfNeeded();
    await page.screenshot({path:info.outputPath('lifecycle-gems.png')});
    await page.locator('[data-unlock-group="craft"]').click();
    await page.locator('[data-unlock-select="growth"]').click();
    await page.locator('.unlock-lifetime summary').click();
    await page.locator('#unlock-related-growth summary').click();
    await expect(page.locator('#unlock-related-growth li')).toHaveText([
        '루프 25 · 기본 인접','루프 28 · 벽과 방향','루프 32 · 행과 열','루프 38 · 태그 공명','루프 45 · 복합 시너지'
    ]);
    await expect(page.locator('.unlock-lifetime')).toContainText('보드 배치');
    await page.locator('.unlock-lifetime').scrollIntoViewIfNeeded();
    await page.screenshot({path:info.outputPath('lifecycle-growth.png')});
    await page.locator('[data-unlock-view="progress"]').click();
    await page.locator('[data-unlock-horizon]').click();
    await page.locator('#unlock-milestone-11 summary').click();
    await page.locator('[data-unlock-select="fishing"]').click();
    await page.locator('.unlock-lifetime summary').click();
    await expect(page.locator('.unlock-lifetime')).toContainText('보유 어획물');
    await expect(page.locator('[data-open-content="fishing"]')).toBeEnabled();
    expect(await page.evaluate(()=>contentProgression.balance())).toBe(37);
    expect(errors).toEqual([]);
});

test('separate unlock tab keeps a compact header and split growth gates', async ({ page }, info) => {
    const errors=[]; page.on('pageerror', error=>errors.push(error.message));
    await page.evaluate(() => {
        game.season=6;contentProgression.sync();
        ['craft','support','research','gemForge','flask'].forEach(id=>contentProgression.purchase(id));
        game.skills=['연속 베기'];game.activeSkill='연속 베기';game.gemData['연속 베기']=normalizeGemRecord({});
        game.currencies.skyEssence=10;game.currencies.bossCore=10;
        game.equipment['허리띠']={baseStats:[{id:'flaskUtilSlots',val:2}]};
        checkUnlocks();switchTab('tab-unlocks');updateStaticUI();
    });
    await expect(page.locator('#tab-unlocks #content-unlock-panel')).toBeVisible();
    await expect(page.locator('.content-unlock-heading')).toContainText('루프 6');
    await expect(page.locator('.content-unlock-balance strong')).toHaveText('3');
    await expect(page.locator('#tab-season #content-unlock-panel')).toHaveCount(0);
    if (info.project.use.isMobile) await page.locator('#btn-mobile-nav-more').click();
    await page.locator('#btn-tab-season').click();
    await expect(page.locator('#loop-passive-locked')).toBeVisible();
    await page.locator('#loop-passive-locked button').click();
    await expect(page.locator('.unlock-detail h3')).toHaveText('루프 패시브');
    await page.evaluate(() => { switchTab('tab-skills');switchSkillSubtab('skill-tab-enhance'); });
    await expect(page.locator('#ui-gem-upgrade-actions')).toBeVisible();
    await expect(page.locator('.gem-inscription-section')).toBeHidden();
    await page.evaluate(() => { switchTab('tab-unlocks');contentUnlockUi.select('engraving'); });
    await page.locator('[data-unlock-content="engraving"]').click();
    await page.locator('[data-open-content="engraving"]').click();
    await expect(page.locator('.gem-inscription-section')).toBeVisible();
    await page.evaluate(() => switchTab('tab-flask'));
    await expect(page.locator('.flask-slot-box.heal')).toBeVisible();
    await expect(page.locator('.flask-slot-box.utility')).toHaveCount(0);
    await page.evaluate(() => { switchTab('tab-unlocks');contentUnlockUi.select('flaskUtility'); });
    await page.locator('[data-unlock-content="flaskUtility"]').click();
    await page.screenshot({path:info.outputPath('split-unlocks.png')});
    await page.locator('[data-open-content="flaskUtility"]').click();
    await expect(page.locator('.flask-slot-box.utility')).toHaveCount(2);
    expect(errors).toEqual([]);
});

test('flask purchase opens the panel and enables healing on the battlefield', async ({ page }, info) => {
    await expect(page.locator('#ui-combat-flasks')).toBeHidden();
    await page.evaluate(() => {
        game.season=2; contentProgression.sync();
        contentProgression.purchase('craft');
        checkUnlocks(); switchTab('tab-unlocks'); updateStaticUI();
    });
    await expect(page.locator('#ui-combat-flasks .combat-flask-mini')).toHaveCount(0);
    await page.locator('[data-unlock-group="condition"]').click();
    await page.locator('[data-unlock-select="flask"]').click();
    await expect(page.locator('.unlock-detail')).toContainText('생명력 플라스크');
    await page.locator('[data-unlock-content="flask"]').click();
    expect(await page.evaluate(() => [contentProgression.balance(),contentProgression.isUnlocked('condition')])).toEqual([0,false]);
    await page.locator('[data-open-content="flask"]').click();
    await expect(page.locator('#ui-flask-panel')).toBeVisible();
    await expect(page.locator('.flask-slot-box.heal')).toContainText('생명력 플라스크 I');
    await page.screenshot({path:info.outputPath('flask-unlocked.png')});
    await page.evaluate(() => { switchTab('tab-battle'); renderCombatFlaskHud(); });
    await expect(page.locator('#ui-combat-flasks .combat-flask-mini.heal')).toBeVisible();
    expect(await page.evaluate(() => {
        game.playerHp=10;game.enemies=[{hp:10}];game.combatTimeMs=10000;
        tickFlaskAutoUse({maxHp:100});game.combatTimeMs+=1000;tickFlaskAutoUse({maxHp:100});
        return game.playerHp>10;
    })).toBe(true);
});

test('boundary rewards explain locked choices and protect a stale saved selection', async ({ page }, info) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.evaluate(() => {
        game.season=50; game.beyondBoundary.unlocked=true;
        game.contentProgression.automatic.push('beyond'); contentProgression.sync();
        game.beyondBoundary.selectedRewardFocusId='gem';
        checkUnlocks(); tutorialQueue.length=0; if(activeTutorial) dismissTutorial(false);
        contentUnlockUi.open('beyond'); updateStaticUI();
    });
    const panel = page.locator('#ui-beyond-boundary-panel');
    await expect(panel).toBeVisible();
    await page.waitForFunction(() => !uiRefreshRunning && !uiRefreshQueued);
    await page.evaluate(() => { tutorialQueue.length=0; if(activeTutorial) dismissTutorial(false); });
    await panel.locator('.beyond-focus-grid').scrollIntoViewIfNeeded();
    await page.screenshot({path:info.outputPath('boundary-reward-state.png')});
    const gem = panel.getByRole('button', {name:/각인의 메아리/});
    await expect(gem).toBeDisabled();
    await expect(gem).toContainText('젬 연구 해금 필요');
    await expect(panel.getByRole('button', {name:/단계 도전 시작/})).toBeDisabled();
    await panel.getByRole('button', {name:/무기고의 메아리/}).click();
    await expect(panel.getByRole('button', {name:/단계 도전 시작/})).toBeEnabled();
    await page.evaluate(() => {
        contentProgression.purchase('craft'); contentProgression.purchase('support'); contentProgression.purchase('research');
        renderBeyondBoundaryPanel();
    });
    await expect(gem).toBeEnabled();
    await gem.click();
    await expect(gem).toHaveClass(/selected/);
    await page.screenshot({path:info.outputPath('boundary-reward-owned.png')});
    expect(errors).toEqual([]);
});

test('flask HUD survives switching saves with identical equipped flasks', async ({ page }) => {
    await page.evaluate(() => {
        game.season = 2; game.contentProgression.inherited.push('flask'); updateStaticUI(); renderCombatFlaskHud();
    });
    await expect(page.locator('#ui-combat-flasks .combat-flask-mini.heal')).toBeVisible();
    await page.evaluate(() => { game=mergeDefaults({}); updateStaticUI(); renderCombatFlaskHud(); });
    await expect(page.locator('#ui-combat-flasks')).toBeHidden();
    await page.evaluate(() => {
        game.season = 2; game.contentProgression.inherited.push('flask'); updateStaticUI(); renderCombatFlaskHud();
    });
    await expect(page.locator('#ui-combat-flasks .combat-flask-mini.heal')).toBeVisible();
});

test('craft entry opens branches and loop progress works without a normal item or crafting', async ({ page }, info) => {
    await page.evaluate(() => {
        game.season = 2; game.inventory = []; checkUnlocks();
        tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false);
        switchTab('tab-unlocks'); updateStaticUI();
    });
    const buds = await page.evaluate(() => game.currencies.magicBud);
    await expect(page.locator('.unlock-node')).toHaveCount(1);
    await expect(page.locator('.unlock-node.is-ready')).toHaveCount(1);
    await expect(page.locator('.unlock-craft-guide')).toContainText('노멀 장비가 없다면');
    await expect(page.locator('[data-unlock-reward="craft"]')).toHaveCount(0);
    if(info.project.name==='desktop-chromium') await expect(page.locator('[data-unlock-content="craft"]')).toBeInViewport({ratio:1});
    await page.screenshot({ path: info.outputPath('craft-entry.png') });
    await page.locator('[data-unlock-content="craft"]').click();
    expect(await page.evaluate(() => game.currencies.magicBud)).toBe(buds + 1);
    await expect(page.locator('.content-unlock-balance strong')).toHaveText('1');
    await expect(page.locator('.unlock-filters button')).toHaveCount(5);
    await page.locator('[data-unlock-select="support"]').click();
    await expect(page.locator('[data-unlock-content="support"]')).toBeDisabled();
    await page.evaluate(() => saveGame({ skipCloudSync:true }));
    await page.reload();
    await page.locator('#btn-startup-guest').click();
    await page.waitForFunction(() => battleAssets.ready && game.heroSelectionInitialized && !isStartupOverlayOpen() && !isLoadingOverlayOpen() && !uiRefreshRunning && !uiRefreshQueued);
    expect(await page.evaluate(() => {
        clearInterval(gameTickHandle); gameTickHandle = null;
        return [contentProgression.balance(), contentProgression.isUnlocked('craft'), game.currencies.magicBud];
    })).toEqual([1, true, buds + 1]);
    await page.evaluate(() => triggerSeasonReset());
    await page.locator('#loop-hero-select-overlay [data-class-id="warrior"]').click();
    await page.waitForFunction(() => !uiRefreshRunning && !uiRefreshQueued);
    expect(await page.evaluate(() => game.season)).toBe(3);
    await page.evaluate(() => {
        checkUnlocks(); checkUnlocks(); tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false);
        switchTab('tab-unlocks'); updateStaticUI();
    });
    await expect(page.locator('.content-unlock-balance strong')).toHaveText('3');
    await page.locator('[data-unlock-select="support"]').click();
    await page.locator('[data-unlock-reward="support"]').selectOption('무자비');
    await page.locator('[data-unlock-content="support"]').click();
    await page.screenshot({ path:info.outputPath('craft-branches.png') });
    await page.locator('[data-open-content="support"]').click();
    if (info.project.use.isMobile) await page.locator('[data-mobile-gem-library="support"]').click();
    await expect(page.locator('.support-library')).toBeVisible();
    expect(await page.evaluate(() => hasSupportGemOwned('무자비'))).toBe(true);
    await expect(page.locator('#btn-skill-tab-research')).toBeHidden();
});

test('condition choice prepares an editable boss evasion rule', async ({ page }, info) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.evaluate(() => {
        game.season = 3; checkUnlocks(); contentProgression.purchase('craft'); tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false);
        switchTab('tab-unlocks'); updateStaticUI();
    });
    await page.locator('[data-unlock-select="condition"]').click();
    await page.locator('[data-unlock-content="condition"]').click();
    await page.locator('[data-open-content="condition"]').click();
    await expect(page.locator('#skill-tab-condition')).toBeVisible();
    const rule = page.locator('.condition-pattern-rule').first();
    await expect(rule.locator('select').nth(0)).toHaveValue('boss_warning');
    await expect(rule.locator('select').last()).toHaveValue('긴급 회피');
    await rule.locator('input[type="checkbox"]').uncheck();
    expect(await page.evaluate(() => game.skillAutoRules[0].enabled)).toBe(false);
    await rule.locator('input[type="checkbox"]').check();
    await page.screenshot({ path: info.outputPath('condition-evasion.png') });
    const result = await page.evaluate(() => {
        game.gridPlayer = { gx: 3, gy: 4, gridMoveTimer: 0 };
        game.enemies = [{ id: 'evasion-review', hp: 100, gx: 7, gy: 4, ailments: [],
            patternArea: { cells: [{ gx: 3, gy: 4 }, { gx: 4, gy: 4 }] } }];
        const hp = game.playerHp;
        runConditionGemAutoRules(getPlayerStats());
        return { moved: game.gridPlayer.gx !== 3 || game.gridPlayer.gy !== 4,
            unchangedHp: game.playerHp === hp, cast: game.lastConditionGemCast?.name,
            cooldown: game.conditionGemCooldowns['긴급 회피'] > getCombatTime() };
    });
    expect(result).toEqual({ moved: true, unchangedHp: true, cast: '긴급 회피', cooldown: true });
    expect(errors).toEqual([]);
});

test('craft reward is usable and automatic combat needs no purchase', async ({ page }) => {
    await page.evaluate(() => {
        game.season = 3; checkUnlocks(); tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false);
        game.inventory.push(createItemFromBase(BASE_ITEM_DB.find(row => row.id === 'war_helm'), 'normal', 10));
        game.currencies.magicBud = 0;
        switchTab('tab-unlocks'); updateStaticUI();
    });
    await page.locator('[data-unlock-select="craft"]').click();
    await page.locator('[data-unlock-content="craft"]').click();
    await page.locator('[data-open-content="craft"]').click();
    await expect(page.locator('#item-tab-craft')).toBeVisible();
    const baseBefore = await page.evaluate(() => JSON.stringify(game.inventory[0].baseStats));
    await page.evaluate(async () => { selectForCrafting(game.inventory[0].id, false); await useCurrency('magicBud'); });
    expect(await page.evaluate(() => [game.currencies.magicBud, game.inventory[0].rarity])).toEqual([0, 'magic']);
    expect(await page.evaluate(() => game.inventory[0].stats.length)).toBeGreaterThan(0);
    expect(await page.evaluate(() => JSON.stringify(game.inventory[0].baseStats))).toBe(baseBefore);
    await expect(page.locator('.craft-result-ledger')).toBeVisible();
    await page.evaluate(() => { switchTab('tab-unlocks'); updateStaticUI(); });
    await page.locator('[data-unlock-view="progress"]').click();
    await page.locator('[data-unlock-select="labyrinth"]').click();
    await expect(page.locator('[data-open-content="labyrinth"]')).toBeEnabled();
    await expect(page.locator('.content-unlock-balance strong')).toHaveText('3');
    await page.locator('[data-open-content="labyrinth"]').click();
    await expect(page.locator('#map-explore-labyrinth')).toBeVisible();
});

test('milestones distinguish world progress from choices and passive points stay usable after unlocking', async ({ page }, info) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.evaluate(() => {
        game.season = 10; game.seasonPoints = 7; game.loopDeepPoints = 20;
        checkUnlocks(); tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false);
        switchTab('tab-unlocks'); updateStaticUI();
    });
    await expect(page.locator('#trait-season-section')).toBeHidden();
    await expect(page.locator('#loop-deep-growth')).toBeHidden();
    await page.locator('[data-unlock-content="craft"]').click();
    await page.locator('[data-unlock-group="loopTree"]').click();
    await page.locator('[data-unlock-select="deepTree"]').click();
    await expect(page.locator('[data-unlock-content="deepTree"]')).toBeDisabled();
    await expect(page.locator('.unlock-requirements')).toContainText('루프 패시브 해금');
    await page.locator('[data-unlock-select="loopTree"]').click();
    await page.locator('[data-unlock-content="loopTree"]').click();
    if (info.project.use.isMobile) await page.locator('#btn-mobile-nav-more').click();
    await expect(page.locator('#btn-tab-season')).toBeVisible();
    if (info.project.use.isMobile) await page.locator('#btn-mobile-nav-more').click();
    await page.locator('[data-unlock-select="deepTree"]').click();
    await page.locator('[data-unlock-content="deepTree"]').click();
    expect(await page.evaluate(() => [game.seasonPoints, game.loopDeepPoints])).toEqual([7,20]);
    await page.locator('[data-open-content="deepTree"]').click();
    if (info.project.use.isMobile) await page.locator('#ui-loop10-section-tab').click();
    await page.locator('#loop-deep-growth button').first().click();
    expect(await page.evaluate(() => [game.loopDeepPoints, game.loopDeepStats.flatHp])).toEqual([19,1]);
    if (info.project.use.isMobile) await page.locator('#btn-mobile-nav-more').click();
    await page.locator('#btn-tab-unlocks').click();
    await page.locator('[data-unlock-view="progress"]').click();
    await page.locator('[data-unlock-select="deepChaos"]').click();
    await expect(page.locator('.unlock-detail-action button')).toBeDisabled();
    await expect(page.locator('.unlock-requirements')).toContainText('혼돈 20층 클리어');
    await page.evaluate(() => {
        game.loopProgressCurrent.chaos20Cleared = true; game.loopProgressCurrent.bestAbyssDepth = 20;
        checkUnlocks(); updateStaticUI();
    });
    await expect(page.locator('[data-open-content="deepChaos"]')).toBeEnabled();
    await expect(page.locator('.content-unlock-balance strong')).toHaveText('13');
    await page.locator('[data-unlock-view="choice"]').click();
    await page.locator('[data-unlock-group="all"]').click();
    await page.locator('[data-unlock-select="deepTree"]').click();
    if (info.project.name === 'desktop-chromium') await expect(page.locator('[data-unlock-select="deepTree"]')).toBeInViewport();
    await page.locator('#content-unlock-panel').scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath('unlock-passives-dark.png') });
    await page.evaluate(() => applyThemeMode('light'));
    await page.screenshot({ path: info.outputPath('unlock-passives-light.png') });
    expect(await page.locator('#content-unlock-panel img').evaluateAll(images => images.every(img => img.complete && img.naturalWidth > 0))).toBe(true);
    expect(errors).toEqual([]);
});

const {test, expect} = require('@playwright/test');

async function openRoute(page) {
    await page.route('https://**', route => route.fulfill({status:204,body:''}));
    await page.goto('/');
    await page.locator('#btn-startup-guest').click();
    await page.locator('#loop-hero-select-overlay [data-class-id="warrior"]').click();
    await expect(page.locator('#loading-overlay')).not.toHaveClass(/active/);
    await page.evaluate(() => {
        clearInterval(gameTickHandle); gameTickHandle = null;
        game.level = 100; game.season = 50; game.combatHalted = true;
        game.contentProgression.inherited = CONTENT_UNLOCK_CATALOG.map(row => row.id);
        contentProgression.sync();
        game.journalEntries.push('woodsman'); game.underworldProgress.highestFloor = 30;
        game.cosmosAtlas.cleared = []; game.cosmosAtlas.bossClears = [];
        game.settings.mapCompleteAction = 'repeatZone';
        game.seenTutorials.push('tutorial_starter_gem_equip');
        game.equipment['무기'] = {id:99101,name:'항로 검증 무기',slot:'무기',rarity:'rare',
            baseStats:[{id:'flatDmg',val:10000000000}],stats:[]};
        game.equipment['갑옷'] = {id:99102,name:'항로 검증 갑옷',slot:'갑옷',rarity:'rare',
            baseStats:[{id:'flatHp',val:100000000}],stats:[]};
        game.playerHp = getPlayerHpCap(getPlayerStats());
        reconcileMapPrimaryContentUnlocks(game); updateStaticUI(); switchTab('tab-map');
        switchMapSubtab('map-tab-cosmos'); switchCosmosInnerTab('route');
    });
    await page.waitForFunction(() => {
        if (uiRefreshQueued || uiRefreshRunning) return false;
        tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false); return true;
    });
}

test('planned route runs actual combat across four expeditions and completes with no duplicate rewards', async ({page}, info) => {
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await openRoute(page);
    await expect(page.locator('.cosmos-route-offers button')).toHaveCount(0);
    await page.screenshot({path:info.outputPath('route-plan.png'),scale:'css'});
    await expect(page.locator('.cosmos-expedition-stage')).toHaveCount(4);
    await page.locator('[data-route-disclosure="leg-3"] summary').click();
    await expect(page.locator('[data-planned-node]')).toHaveCount(26);
    await expect(page.locator('[data-planned-node="planet-46"]')).toBeVisible();
    await page.locator('[data-route-disclosure="leg-3"] summary').click();
    const plan=await page.evaluate(()=>cosmosRouteRuntime.preview(game).plan);
    await page.locator('[data-route-action="start"]').click();
    const result=await page.evaluate(()=>{
        let ticks=0;
        while(game.cosmosRoute.history.length<1&&ticks++<4000)coreLoop(getCombatTime()+100);
        renderCosmosAtlas();
        return {phase:game.cosmosRoute.phase,stage:game.cosmosRoute.stage,kills:game.loopKills,dust:game.currencies.starDust};
    });
    expect(result.phase).toBe('fighting');expect(result.stage).toBe(0);expect(result.kills).toBeGreaterThan(0);
    expect(await page.evaluate(()=>getZone(game.currentZoneId).cosmosHabitat)).toBe(await page.evaluate(()=>COSMOS_ROUTE_G1.habitatByNode[game.cosmosRoute.queue[0]]));
    await page.evaluate(()=>exploreSelectedCosmosNode('planet-0'));
    expect(await page.evaluate(()=>game.currencies.starDust)).toBe(result.dust);
    expect(await page.evaluate(()=>shouldStopBackgroundReplay(game))).toBe(false);
    await page.locator('[data-route-action="battle"]').click();
    await expect(page.locator('#tab-map')).not.toBeVisible();
    await expect(page.locator('#battlefield-canvas')).toBeVisible();
    await expect(page.locator('#ui-cosmos-route-progress')).toHaveText('1차 탐사 1/8');
    const badge=await page.locator('#ui-cosmos-route-progress').boundingBox();
    const progressGauge=await page.locator('.map-progress-gauge').boundingBox();
    expect(badge.x+badge.width).toBeLessThanOrEqual(progressGauge.x+1);
    expect(Math.abs(badge.y+badge.height/2-progressGauge.y-progressGauge.height/2)).toBeLessThan(3);
    await page.screenshot({path:info.outputPath('expedition-hud.png'),scale:'css'});
    await page.locator('#btn-tab-map').click();
    await page.evaluate(()=>{for(let i=0;i<15;i++)finishEncounterRun();renderCosmosAtlas();});
    expect(await page.evaluate(()=>game.cosmosRoute.stage)).toBe(2);
    await page.evaluate(()=>cosmosRouteUi.updateHud());
    await expect(page.locator('#ui-cosmos-route-progress')).toHaveText('3차 탐사 0/8');
    expect(await page.evaluate(()=>getZone(game.currentZoneId).cosmosHabitat)).toBe(await page.evaluate(()=>COSMOS_ROUTE_G1.habitatByNode[game.cosmosRoute.queue[0]]));
    await page.evaluate(()=>{for(let i=0;i<8;i++)finishEncounterRun();renderCosmosAtlas();cosmosRouteUi.updateHud();});
    await expect(page.locator('#ui-cosmos-route-progress')).toHaveText('4차 탐사 0/2');
    await page.evaluate(()=>{for(let i=0;i<2;i++)finishEncounterRun();renderCosmosAtlas();});
    await expect(page.locator('.cosmos-route-outcome')).toContainText('탐사 종료');
    const complete=await page.evaluate(()=>({phase:game.cosmosRoute.phase,history:game.cosmosRoute.history.map(row=>row.id),
        boss:game.cosmosAtlas.bossKills['planet-46'],dust:game.cosmosRoute.dust,wallet:game.currencies.starDust}));
    expect(complete.history).toEqual(plan.flat());expect(complete.boss).toBe(1);expect(complete.wallet).toBe(complete.dust);
    await page.evaluate(()=>finishEncounterRun());
    expect(await page.evaluate(()=>game.currencies.starDust)).toBe(complete.wallet);
    await page.evaluate(()=>{returnToTown();updateStaticUI();});
    await expect(page.locator('#ui-cosmos-route-progress')).toBeHidden();
    expect(await page.locator('#cosmos-inner-route').evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
    await expect(page.locator('#cosmos-galaxy')).toBeVisible();
    await page.locator('#btn-cosmos-sub-mastery').click();
    await expect(page.locator('#cosmos-inner-mastery')).toBeVisible();
    expect(errors).toEqual([]);
});

test('all five galaxies expose their own route and preserve previous-boss gates',async({page},info)=>{
    await openRoute(page);
    for(const galaxy of [1,2,3,4,5]){
        await page.locator('#cosmos-galaxy').selectOption(String(galaxy));
        const definition=await page.evaluate(id=>COSMOS_ROUTE_GALAXIES[id],galaxy);
        await expect(page.locator('[data-planned-node]')).toHaveCount(definition.total);
        await expect(page.locator('.cosmos-expedition-stage')).toHaveCount(4);
        if(galaxy>1){
            await expect(page.locator('[data-route-action="start"]')).toHaveCount(0);
            await page.evaluate(id=>{game.cosmosAtlas.bossClears.push(COSMOS_ROUTE_GALAXIES[id-1].boss);renderCosmosAtlas();},galaxy);
        }
        await page.locator('[data-route-action="start"]').click();
        expect(await page.evaluate(()=>game.cosmosRoute.galaxy)).toBe(galaxy);
        expect(await page.evaluate(()=>game.cosmosRoute.queue[0])).toBe(definition.start);
        if(galaxy===5)await page.screenshot({path:info.outputPath('galaxy-five.png'),scale:'css'});
        await page.locator('[data-route-action="retreat"]').click();
    }
});

test('Sirius gravity becomes visible during real combat and clears on return',async({page},info)=>{
    await openRoute(page);
    await page.locator('[data-route-action="start"]').click();
    await page.locator('[data-route-action="battle"]').click();
    const field=await page.evaluate(()=>{
        for(let i=0;i<500&&!game.cosmosGravity;i++)coreLoop(getCombatTime()+100);
        refreshCombatTickUi();renderBattlefield(true);return cosmosRouteRuntime.gravityView();
    });
    expect(field).not.toBeNull();
    expect(field.gx).toBe(4);expect(field.gy).toBe(3);
    await page.screenshot({path:info.outputPath('gravity-battle.png'),scale:'css'});
    await page.locator('#btn-combat-return').click();
    expect(await page.evaluate(()=>cosmosRouteRuntime.gravityView())).toBeNull();
});

test('defeat keeps paid loot, blocks retry for 30 seconds and then offers new routes',async({page},info)=>{
    await openRoute(page);
    await page.clock.setFixedTime(new Date('2026-09-09T12:00:00Z'));
    const previous=await page.evaluate(()=>({plan:cosmosRouteRuntime.preview(game).plan,board:game.cosmosRouteBoard.seed}));
    await page.locator('[data-route-action="start"]').click();
    const failed=await page.evaluate(()=>{
        finishEncounterRun();
        const dust=game.currencies.starDust,clears=[...game.cosmosAtlas.cleared];
        game.moveTimer=0;game.isTownReturning=false;
        handlePlayerDefeat(getZone(game.currentZoneId),getPlayerStats(),'항로 검증',{noToast:true});
        document.getElementById('death-overlay')?.classList.remove('active');
        renderCosmosAtlas();
        return {dust,clears,phase:game.cosmosRoute.phase,zone:game.currentZoneId,blocked:!cosmosRouteRuntime.start(game)};
    });
    expect(failed.phase).toBe('failed');expect(failed.zone).not.toBe('cosmos_challenge');expect(failed.blocked).toBe(true);
    await expect(page.locator('[data-route-retry]')).toHaveText('30');
    await expect(page.locator('[data-route-action="start"]')).toHaveCount(0);
    await page.screenshot({path:info.outputPath('route-cooldown.png'),scale:'css'});
    await page.evaluate(()=>{
        const saved=JSON.parse(JSON.stringify(game));game=cloneDefaultGame();game=mergeDefaults(saved);
        renderCosmosAtlas();
    });
    await expect(page.locator('[data-route-retry]')).toHaveText('30');
    expect(await page.evaluate(()=>isCombatDecisionPending(game))).toBe(false);
    await page.clock.setFixedTime(new Date('2026-09-09T12:00:30Z'));
    await page.evaluate(()=>cosmosRouteUi.updateVitals());
    await expect(page.locator('[data-route-action="start"]')).toBeVisible();
    expect(await page.evaluate(()=>game.currencies.starDust)).toBe(failed.dust);
    expect(await page.evaluate(()=>game.cosmosAtlas.cleared)).toEqual(failed.clears);
    expect(await page.evaluate(()=>game.cosmosRouteBoard.seed)).toBe(previous.board+1);
    expect(await page.evaluate(()=>cosmosRouteRuntime.preview(game).plan)).not.toEqual(previous.plan);
    await page.locator('[data-route-action="start"]').click();
    expect(await page.evaluate(()=>game.cosmosRoute.history.length)).toBe(0);
    expect(await page.evaluate(()=>game.cosmosRoute.stage)).toBe(0);
});

test('planned route survives a real reload with its remaining path and light theme',async({page},info)=>{
    await openRoute(page);
    await page.locator('[data-route-action="start"]').click();
    const saved=await page.evaluate(()=>{
        finishEncounterRun();saveGame({touchModifiedAt:true,skipCloudSync:true});
        return {plan:game.cosmosRoute.plan,habitat:game.cosmosAtlas.activeChallenge.habitat,dust:game.currencies.starDust};
    });
    await page.reload();await page.locator('#btn-startup-guest').click();
    await page.waitForFunction(()=>!document.body.classList.contains('startup-active'));
    await page.evaluate(()=>{
        clearInterval(gameTickHandle);gameTickHandle=null;
        tutorialQueue.length=0;if(activeTutorial)dismissTutorial(false);
        if(!document.getElementById('tab-map').classList.contains('active'))switchTab('tab-map');
        switchMapSubtab('map-tab-cosmos');switchCosmosInnerTab('route');
        document.body.classList.add('light-mode');
    });
    expect(await page.evaluate(()=>game.cosmosRoute.phase)).toBe('fighting');
    expect(await page.evaluate(()=>game.cosmosRoute.plan)).toEqual(saved.plan);
    expect(await page.evaluate(()=>getZone(game.currentZoneId).cosmosHabitat)).toBe(saved.habitat);
    expect(await page.evaluate(()=>game.currencies.starDust)).toBeGreaterThanOrEqual(saved.dust);
    await page.locator('.cosmos-star-header').scrollIntoViewIfNeeded();
    await page.screenshot({path:info.outputPath('route-light.png'),scale:'css'});
});

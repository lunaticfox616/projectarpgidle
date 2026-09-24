const {test,expect}=require('@playwright/test');

async function openSky(page) {
    await page.route('https://**',route=>route.fulfill({status:204,body:''}));
    await page.goto('/');await page.locator('#btn-startup-guest').click();
    await page.locator('[data-class-id="warrior"]').click();
    await page.waitForFunction(()=>battleAssets.ready&&!uiRefreshRunning&&!uiRefreshQueued);
    await page.evaluate(()=>{
        clearInterval(gameTickHandle);gameTickHandle=null;game.combatHalted=true;
        game.level=100;game.season=50;game.maxZoneId=29;
        game.seenTutorials.push(...Object.keys(TUTORIAL_GUIDES));
        game.contentProgression.inherited=CONTENT_UNLOCK_CATALOG.map(row=>row.id);contentProgression.sync();
        game.loopProgressCurrent.chaos20Cleared=true;
        game.settings.mapCompleteAction='stop';
        Object.assign(ensureSkyTowerState(),{highestFloor:1,currentFloor:1,clearedFloors:[],clearedThisLoop:0,condensedPower:20});
        reconcileMapPrimaryContentUnlocks(game);switchTab('tab-map');switchMapSubtab('map-tab-sky');performUpdateStaticUI();
    });
    await page.waitForFunction(()=>{
        if(uiRefreshQueued||uiRefreshRunning)return false;
        tutorialQueue.length=0;if(activeTutorial)dismissTutorial(false);return true;
    });
}

test('sky investment pays once, stops at insufficient funds and opens real gem growth',async({page})=>{
    await openSky(page);
    const growth=page.locator('#ui-sky-tower-list');
    await growth.getByRole('button',{name:'창공석 제작',exact:true}).click();
    expect(await page.evaluate(()=>({power:game.skyTower.condensedPower,level:game.skyTower.skyStone.level,reduction:getSkyStoneReductionPct()})))
        .toEqual({power:0,level:1,reduction:5});
    await expect(growth.getByRole('button',{name:'창공석 강화',exact:true})).toBeDisabled();
    await page.evaluate(()=>upgradeSkyStone());
    expect(await page.evaluate(()=>game.skyTower.skyStone.level)).toBe(1);
    await page.evaluate(()=>{game.skyTower.condensedPower=100;game.woodsmanBuildLock=true;upgradeSkyStone();});
    expect(await page.evaluate(()=>[game.skyTower.condensedPower,game.skyTower.skyStone.level])).toEqual([100,1]);
    await page.evaluate(()=>{game.woodsmanBuildLock=false;});
    await growth.getByRole('button',{name:'젬 강화로 이동',exact:true}).click();
    await expect(page.locator('#skill-tab-enhance')).toBeVisible();
});

test('sky tenth-floor receipt and journal survive restore without repeating first reward',async({page})=>{
    await openSky(page);
    await page.evaluate(()=>{
        Object.assign(game.skyTower,{highestFloor:10,currentFloor:10});
        game.currentZoneId=SKY_TOWER_ZONE_ID;finishEncounterRun();renderSkyTowerMapPanel();
    });
    expect(await page.evaluate(()=>({power:game.skyTower.condensedPower,highest:game.skyTower.highestFloor,
        clears:game.skyTower.clearedFloors,remaining:getSkyTowerRemainingClears(),journal:game.journalEntries.includes('sky_tower_10')})))
        .toEqual({power:25,highest:11,clears:[10],remaining:24,journal:true});
    await expect(page.locator('#ui-sky-tower-panel')).toContainText('반복 돌파 보상');
    await expect(page.locator('#ui-sky-tower-panel')).toContainText('1개 · 16% 확률');
    await page.evaluate(()=>{
        game=mergeDefaults(JSON.parse(JSON.stringify(game)));window.game=game;
        const random=Math.random;Math.random=()=>.9;
        try { finishEncounterRun(); } finally { Math.random=random; }
    });
    expect(await page.evaluate(()=>[game.skyTower.condensedPower,getSkyTowerRemainingClears(),game.skyTower.clearedFloors.length]))
        .toEqual([25,23,1]);
});

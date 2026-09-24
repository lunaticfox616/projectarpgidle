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

test('sky has one direct first-floor entry and preserves focused controls',async({page},info)=>{
    await openSky(page);
    const panel=page.locator('#ui-sky-tower-panel');
    const entry=panel.getByRole('button',{name:'1층 입장',exact:true});
    await expect(panel.getByRole('button',{name:'다른 층 선택'})).toHaveCount(0);
    await entry.focus();
    expect(await entry.evaluate(el=>{
        game.skyTower.condensedPower++;renderSkyTowerMapPanel();
        return el.isConnected&&document.activeElement===el;
    })).toBe(true);
    await panel.getByText('등반 · 보상 규칙',{exact:true}).click();
    await page.evaluate(()=>{game.skyTower.condensedPower++;renderSkyTowerMapPanel();});
    await expect(page.locator('#sky-tower-guide')).toHaveAttribute('open','');
    await panel.getByText('등반 · 보상 규칙',{exact:true}).click();
    await expect(page.locator('#game-toast-region .game-toast, .mobile-log-toast')).toHaveCount(0);
    await panel.scrollIntoViewIfNeeded();
    await page.screenshot({path:info.outputPath('sky-dark.png')});
    expect(await panel.evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(2);
    await entry.click();
    await expect.poll(()=>page.evaluate(()=>game.currentZoneId===SKY_TOWER_ZONE_ID)).toBe(true);
    await expect(page.locator('#game-dialog-control')).not.toBeVisible();
});

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

test('exhausted sky allowance requires explicit practice and keeps clear rewards stopped',async({page})=>{
    await openSky(page);
    await page.evaluate(()=>{game.skyTower.clearedThisLoop=25;renderSkyTowerMapPanel();});
    await page.getByRole('button',{name:'1층 연습 입장',exact:true}).click();
    await expect(page.getByText('보상 없는 연습 전투',{exact:true})).toBeVisible();
    await page.getByRole('button',{name:'취소',exact:true}).click();
    expect(await page.evaluate(()=>game.currentZoneId===SKY_TOWER_ZONE_ID)).toBe(false);
    await page.getByRole('button',{name:'1층 연습 입장',exact:true}).click();
    await page.getByRole('button',{name:'연습 입장',exact:true}).click();
    await page.evaluate(()=>finishEncounterRun());
    expect(await page.evaluate(()=>({power:game.skyTower.condensedPower,highest:game.skyTower.highestFloor,clears:game.skyTower.clearedFloors})))
        .toEqual({power:20,highest:1,clears:[]});
});

test('sky floor dialog cannot apply to a replaced save',async({page})=>{
    await openSky(page);
    await page.evaluate(()=>{game.skyTower.highestFloor=5;renderSkyTowerMapPanel();});
    await page.getByRole('button',{name:'다른 층 선택',exact:true}).click();
    await page.locator('#game-dialog-number').fill('4');
    await page.evaluate(()=>{game.skyTower=JSON.parse(JSON.stringify(game.skyTower));});
    await page.getByRole('button',{name:'입장',exact:true}).click();
    expect(await page.evaluate(()=>game.skyTower.currentFloor)).toBe(1);
    expect(await page.evaluate(()=>game.currentZoneId===SKY_TOWER_ZONE_ID)).toBe(false);
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

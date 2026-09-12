const {test,expect}=require('@playwright/test');

test('treasure shows the minimum boss tier and preserves it when the player postpones',async({page},testInfo)=>{
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.route('https://**',route=>route.fulfill({status:204,body:''}));
    await page.goto('/');await page.locator('#btn-startup-guest').click();
    await page.locator('#loop-hero-select-overlay [data-class-id="warrior"]').click();
    await page.waitForFunction(()=>battleAssets.ready&&!uiRefreshRunning&&!uiRefreshQueued);
    await page.evaluate(()=>{
        clearInterval(gameTickHandle);gameTickHandle=null;
        tutorialQueue.length=0;if(activeTutorial)dismissTutorial(false);
        game.season=2;contentProgression.sync();game.currentZoneId=8;
        game.bountyHunt=bountyRuntime.restore(null);
        startEncounterRun();game.runProgress=37;
        const enemy=createEnemy(getZone(8),{at:20,count:1},0);game.enemies=[enemy];
        for(let kill=0;kill<9;kill++) bountyRuntime.advanceAfterBossKill(getZone(kill===3?0:8),{isBoss:true});
        switchTab('tab-battle');updateStaticUI();bountyUi.renderHud();
    });
    await page.waitForFunction(()=>{
        if(uiRefreshRunning||uiRefreshQueued)return false;
        tutorialQueue.length=0;if(activeTutorial)dismissTutorial(false);
        return true;
    });
    await expect(page.locator('#ui-bounty-box')).toContainText('1 · 기준 T1');
    await page.evaluate(()=>{
        bountyRuntime.advanceAfterBossKill(getZone(8),{isBoss:true});
        bountyUi.renderHud();
    });
    const offer=page.locator('#ui-bounty-box button');
    await expect(offer).toContainText('보물사냥 · 기준 T1');
    await offer.click();
    await expect(page.locator('#game-dialog-message')).toContainText('10마리 중 최저 보스 T1 기준 · 일반 재료 ×1');
    await expect(page.locator('.game-choice-option')).toHaveCount(3);
    const targets=await page.locator('.game-choice-option').evaluateAll(buttons=>buttons.map(button=>button.dataset.choiceValue));
    expect(new Set(targets).size).toBe(3);
    await page.screenshot({path:testInfo.outputPath('bounty-minimum-tier.png')});
    await page.getByRole('button',{name:'나중에',exact:true}).click();
    await expect(page.locator('#game-dialog-card')).toBeHidden();
    await page.evaluate(()=>{
        game=mergeDefaults(JSON.parse(JSON.stringify(game)));
        bountyUi.renderHud();
    });
    await offer.click();
    await expect(page.locator('#game-dialog-message')).toContainText('최저 보스 T1 기준');
    expect(await page.locator('.game-choice-option').evaluateAll(buttons=>buttons.map(button=>button.dataset.choiceValue))).toEqual(targets);
    const before=await page.evaluate(()=>({zone:game.currentZoneId,progress:game.runProgress,hp:game.playerHp,
        enemies:JSON.stringify(game.enemies),plan:JSON.stringify(game.encounterPlan),moveTimer:game.moveTimer}));
    await page.locator('.game-choice-option').nth(1).click();
    await page.getByRole('button',{name:'다음 지역에 예약',exact:true}).click();
    await expect(page.locator('#ui-bounty-box')).toContainText('다음 지역 등장 예정');
    expect(await page.evaluate(()=>({zone:game.currentZoneId,progress:game.runProgress,hp:game.playerHp,
        enemies:JSON.stringify(game.enemies),plan:JSON.stringify(game.encounterPlan),moveTimer:game.moveTimer}))).toEqual(before);
    expect(await page.evaluate(()=>game.bountyHunt.pending.targetId)).toBe(targets[1]);
    const spawned=await page.evaluate(()=>{
        game.currentZoneId=4;startEncounterRun();bountyUi.renderHud();
        const marker=game.encounterPlan.find(row=>row.bountyId);
        const enemy=createEnemy(getZone(4),marker,0);
        return {targetId:enemy.bountyId,isTarget:enemy.isBountyTarget,count:game.encounterPlan.filter(row=>row.bountyId).length};
    });
    expect(spawned).toEqual({targetId:targets[1],isTarget:true,count:1});
    await expect(page.locator('#ui-bounty-box')).toContainText('추적 중');
    expect(errors).toEqual([]);
});

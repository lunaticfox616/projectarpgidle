const {test,expect}=require('@playwright/test');
test('attacking with life leech keeps health finite and visible through recovery ticks',async({page})=>{
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.route('https://**',r=>r.fulfill({status:204,body:''}));
    await page.goto('/');await page.locator('#btn-startup-guest').click();await page.locator('[data-class-id="warrior"]').click();
    await page.waitForFunction(()=>battleAssets.ready&&!uiRefreshRunning&&!uiRefreshQueued);
    const result=await page.evaluate(()=>{
        clearInterval(gameTickHandle);gameTickHandle=null;
        tutorialQueue.length=0;if(activeTutorial)dismissTutorial(false);
        game.settings.pauseGameOnOverlay=false;game.currentZoneId=1;game.moveTimer=0;
        game.gridPlayer={gx:3,gy:4,gridMoveTimer:0};
        game.equipment['장갑']={id:998,name:'흡혈 검증',slot:'장갑',rarity:'normal',tier:1,
            baseStats:[],stats:[{id:'leech',val:10}]};
        const enemy=createEnemy(getZone(1),{at:20,count:1},0);
        Object.assign(enemy,{id:100,gx:4,gy:4,hp:10000000,maxHp:10000000,noAttack:true,regenRate:0,
            armor:0,evasion:0,evasionChance:0,firstHitGuard:0,hitRateGuard:0});
        game.enemies=[enemy];game.playerHp=60;
        performPlayerAttack(getPlayerStats(),{forcedCrit:false});
        pendingSkillStageHits.forEach(row=>{row.at=0;});processPendingSkillStageHits();
        const hasLeech=game.playerLeechInstances.length>0;
        const hp=[];
        for(let tick=0;tick<5;tick++) {
            game.runProgress=20;coreLoop(getCombatTime()+100);
            hp.push(game.playerHp);
        }
        updateCombatUI(getPlayerStats());
        return {hasLeech,damage:enemy.maxHp-enemy.hp,hp,hpText:document.getElementById('ui-hp').textContent};
    });
    expect(result.hasLeech).toBe(true);expect(result.damage).toBeGreaterThan(0);
    expect(result.hp.every(hp=>Number.isFinite(hp)&&hp>60)).toBe(true);
    expect(Number(result.hpText.replaceAll(',',''))).toBeGreaterThan(60);
    expect(errors).toEqual([]);
});

test('painting combat HUD never changes player health or applies a stale recovery cap',async({page})=>{
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.route('https://**',r=>r.fulfill({status:204,body:''}));
    await page.goto('/');await page.locator('#btn-startup-guest').click();await page.locator('[data-class-id="warrior"]').click();
    await page.waitForFunction(()=>battleAssets.ready&&!uiRefreshRunning&&!uiRefreshQueued);
    const result=await page.evaluate(()=>{
        clearInterval(gameTickHandle);gameTickHandle=null;
        const stats=getPlayerStats();
        game.playerHp=stats.maxHp*2;const before=game.playerHp;
        for(let i=0;i<5;i++)updateCombatUI({...stats,lifeRecoveryCap:1});
        const afterPaint=game.playerHp;
        const prepared=prepareCombatTick(getCombatTime()+100);
        const cap=getPlayerRecoveryHpCap(prepared);
        const afterTick=game.playerHp;
        updateCombatUI({...stats,lifeRecoveryCap:1});
        return{before,afterPaint,afterTick,cap,afterStalePaint:game.playerHp};
    });
    expect(result.afterPaint).toBe(result.before);
    expect(result.afterTick).toBe(result.cap);
    expect(result.afterStalePaint).toBe(result.cap);
    expect(errors).toEqual([]);
});

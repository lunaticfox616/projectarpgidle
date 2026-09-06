const {test,expect}=require('@playwright/test');

test('boss warning stays fixed and an equipped evasion rule escapes its real impact',async({page},testInfo)=> {
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.route('https://**',route=>route.fulfill({status:204,body:''}));
    await page.goto('/');
    await page.locator('#btn-startup-guest').click();
    await page.locator('#loop-hero-select-overlay [data-class-id="warrior"]').click();
    await page.waitForFunction(()=>battleAssets.ready && !uiRefreshRunning && !uiRefreshQueued);
    await page.evaluate(()=> {
        clearInterval(gameTickHandle);gameTickHandle=null;
        const raf=window.requestAnimationFrame.bind(window);
        window.requestAnimationFrame=callback=>callback===gameLoop ? 0 : raf(callback);
        tutorialQueue.length=0;if(activeTutorial)dismissTutorial(false);
        game.settings.pauseGameOnOverlay=false;game.currentZoneId=1;game.moveTimer=0;
        game.combatTimeMs=getCombatTime();
        game.season=3;game.contentProgression.inherited=['condition'];contentProgression.sync();
        game.conditionGemUnlocked=true;game.conditionGemPool=['긴급 회피'];
        game.skillAutoRules=[{enabled:true,priority:1,triggerType:'boss_warning',actionType:'condition_gem',skillName:'긴급 회피'}];
        game.gridPlayer={gx:3,gy:4,gridMoveTimer:0};
        const boss=createEnemy(getZone(1),{boss:true,at:100},0);
        Object.assign(boss,{id:100,gx:7,gy:4,hp:100000,maxHp:100000,regenRate:0,
            patternMode:'slam',patternAttackCount:2,attackTimer:0.5});
        game.enemies=[boss];game.playerHp=getPlayerStats().maxHp;
        switchTab('tab-battle');performMonsterAttacks(getPlayerStats());renderBattlefield(true);
    });
    await page.screenshot({path:testInfo.outputPath('boss-warning.png')});
    const result=await page.evaluate(async()=> {
        const boss=game.enemies[0], area=JSON.stringify(boss.patternArea), hp=game.playerHp;
        const cells=boss.patternArea.cells.map(cell=>({...cell}));
        for(let tick=0;tick<15;tick++) {
            game.combatTimeMs+=100;
            runConditionGemAutoRules(getPlayerStats());
            updateCombatHazardEvasion(getPlayerStats());renderBattlefield(true);
            await new Promise(resolve=>setTimeout(resolve,100));
        }
        const fixed=JSON.stringify(boss.patternArea)===area;
        const escaped=!cells.some(cell=>cell.gx===game.gridPlayer.gx && cell.gy===game.gridPlayer.gy);
        boss.attackTimer=1;performMonsterAttacks(getPlayerStats());
        const pending=pendingEnemyCombatAttacks[0];
        game.combatTimeMs=pending.at;
        performMonsterAttacks(getPlayerStats());renderBattlefield(true);
        return {fixed,escaped,hp,after:game.playerHp,remaining:pendingEnemyCombatAttacks.length};
    });
    await page.screenshot({path:testInfo.outputPath('boss-escaped.png')});
    expect(result.fixed).toBe(true);expect(result.escaped).toBe(true);
    expect(result.after).toBe(result.hp);expect(result.remaining).toBe(0);
    expect(errors).toEqual([]);
});

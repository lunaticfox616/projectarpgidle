const {test,expect}=require('@playwright/test');

test('high-speed channel renders, deals damage and cancels on freeze',async({page},testInfo)=> {
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.route('https://**',route=>route.fulfill({status:204,body:''}));
    await page.goto('/');
    await page.locator('#btn-startup-guest').click();
    await page.locator('#loop-hero-select-overlay [data-class-id="warrior"]').click();
    await page.waitForFunction(()=>battleAssets.ready && !uiRefreshRunning && !uiRefreshQueued);
    const result=await page.evaluate(async()=> {
        clearInterval(gameTickHandle);gameTickHandle=null;
        const raf=window.requestAnimationFrame.bind(window);
        window.requestAnimationFrame=callback=>callback===gameLoop ? 0 : raf(callback);
        tutorialQueue.length=0;if(activeTutorial)dismissTutorial(false);
        game.settings.pauseGameOnOverlay=false;game.currentZoneId=1;game.moveTimer=0;
        game.gridPlayer={gx:3,gy:4,gridMoveTimer:0};
        game.skills=['기본 공격','공허 절삭광'];game.activeSkill='공허 절삭광';
        game.gemData['공허 절삭광']={level:1,exp:0,quality:0};
        game.equipment['장갑']={id:999,name:'공속 경계 검수',slot:'장갑',rarity:'normal',tier:1,
            baseStats:[],stats:[{id:'aspd',val:5000}]};
        const enemy=createEnemy(getZone(1),{at:20,count:1},0);
        Object.assign(enemy,{id:100,gx:4,gy:4,hp:10000000,maxHp:10000000,noAttack:true,regenRate:0});
        game.enemies=[enemy];switchTab('tab-battle');
        const start=getCombatTime(),castIds=new Set();
        for(let tick=1;tick<=60;tick++) {
            game.runProgress=20;battleVisualState.visualNow=1000+tick*100;
            battleVisualState.lastWallNow=performance.now();coreLoop(start+tick*100);
            battleFx.filter(fx=>fx.type==='playerSwing').forEach(fx=>castIds.add(fx.id));
            renderBattlefield(true);
            await new Promise(resolve=>setTimeout(resolve,100));
        }
        const damage=enemy.maxHp-enemy.hp;
        const image=document.getElementById('battlefield-canvas').toDataURL();
        game.playerAilments=[{type:'freeze',time:1,power:1}];
        updateCombatChannelRuntime(getCombatTime());
        return {aspd:getPlayerStats().aspd,casts:castIds.size,damage,image,
            damageLabels:battleVisualState.damageTexts.filter(text=>!text.bodyCue).length,
            maxLabelHits:Math.max(...battleVisualState.damageTexts.map(text=>text.hitCount)),
            pendingChannel:pendingSkillStageHits.filter(row=>row.channelId).length};
    });
    expect(result.aspd).toBe(12);expect(result.casts).toBeGreaterThanOrEqual(70);
    expect(result.damage).toBeGreaterThan(0);expect(result.pendingChannel).toBe(0);
    expect(result.damageLabels).toBeLessThanOrEqual(8);expect(result.maxLabelHits).toBeGreaterThanOrEqual(4);
    await testInfo.attach('high-speed-channel.png',{body:Buffer.from(result.image.split(',')[1],'base64'),contentType:'image/png'});
    await page.screenshot({path:testInfo.outputPath('channel-gameplay.png')});
    expect(errors).toEqual([]);
});

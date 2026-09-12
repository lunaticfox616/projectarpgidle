const {test,expect}=require('@playwright/test');

test('new gems use production acquisition, contacts, art, explicit equip and save ownership',async({page})=>{
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.route('https://**',route=>route.fulfill({status:204,body:''}));
    await page.goto('/');await page.locator('#btn-startup-guest').click();
    await page.locator('#loop-hero-select-overlay [data-class-id="warrior"]').click();
    await page.waitForFunction(()=>battleAssets.ready&&!uiRefreshRunning&&!uiRefreshQueued);
    const result=await page.evaluate(()=>{
        clearInterval(gameTickHandle);gameTickHandle=null;
        game.season=100;game.level=30;
        game.contentProgression.inherited=CONTENT_UNLOCK_CATALOG.map(row=>row.id);contentProgression.sync();
        game.skills=['기본 공격'];game.sealedSkills=[];game.currencies.gemShard=1000;
        const names=Object.keys(SKILL_DB).filter(name=>SKILL_DB[name].nativeCastId),cost=getGemResearchCost('attack');
        for(const name of names)researchMissingGem('attack',name);
        const spent=1000-game.currencies.gemShard;
        researchMissingGem('attack',names[0]);
        const doubleSpent=1000-game.currencies.gemShard,rows=[],random=Math.random;Math.random=()=>.5;
        try {
            for(const name of names) {
                changeSkill(name);resetCombatTacticsRuntime();resetCombatChannelRuntime();
                game.currentZoneId=1;game.combatTimeMs=100000;game.combatHalted=false;
                game.gridPlayer={gx:3,gy:4};game.playerHp=10000;game.playerAilments=[];game.playerCastDelayUntil=0;
                const boss=Object.assign(createEnemy(getZone(1),{boss:true,at:0},0),
                    {id:901,gx:4,gy:4,hp:1e7,maxHp:1e7,energyShield:0,evasion:0,facingDirection:4});
                game.enemies=[boss];const stats=getPlayerStats(),art=[];
                performPlayerAttack(stats);
                for(let t=0;t<=6500;t+=50) {
                    game.combatTimeMs=100000+t;updateSkillGemCombat(stats);
                    if(name==='인과'&&t>0&&t<=500&&t%100===0)receiveSkillGemPlayerHit(1,stats);
                    for(const event of skillGemCombatRuntime?.events||[]) {
                        worldTreeNativeFx.create(event).layout(getCombatTime(),sprite=>art.push(sprite));
                    }
                }
                rows.push({name,damage:1e7-boss.hp,draws:art.length,
                    finite:art.every(s=>[s.x,s.y,s.scale,s.scaleY,s.angle,s.alpha].every(Number.isFinite))});
            }
        }finally{Math.random=random;}
        game.combatHalted=true;changeSkill('기본 공격');
        game.skills=['기본 공격','인과'];switchTab('tab-skills');updateStaticUI();
        return {rows,spent,doubleSpent,cost};
    });
    expect(result.rows).toHaveLength(10);expect(result.spent).toBe(result.cost*10);expect(result.doubleSpent).toBe(result.spent);
    for(const row of result.rows){expect(row.damage,row.name).toBeGreaterThan(0);expect(row.draws,row.name).toBeGreaterThan(0);expect(row.finite,row.name).toBe(true);}
    await page.waitForFunction(()=>{
        if(uiRefreshRunning||uiRefreshQueued)return false;
        tutorialQueue.length=0;if(activeTutorial)dismissTutorial(false);return true;
    });
    await page.getByRole('group',{name:'인과',exact:true}).click();
    expect(await page.evaluate(()=>game.activeSkill)).toBe('기본 공격');
    await page.locator('#gem-selection').getByRole('button',{name:'장착',exact:true}).click();
    const saved=await page.evaluate(()=>{
        const restored=mergeDefaults(JSON.parse(serializeSaveState(game)));
        return {active:restored.activeSkill,owned:restored.skills.includes('인과'),level:restored.gemData['인과'].level};
    });
    expect(saved).toEqual({active:'인과',owned:true,level:1});expect(errors).toEqual([]);
});

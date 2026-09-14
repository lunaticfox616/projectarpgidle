const {test,expect}=require('@playwright/test');

async function openGame(page) {
    await page.route('https://**',route=>route.fulfill({status:204,body:''}));
    await page.goto('/');
    await page.locator('#btn-startup-guest').click();
    await page.locator('#loop-hero-select-overlay [data-class-id="warrior"]').click();
    await expect(page.locator('#loading-overlay')).not.toHaveClass(/active/);
}

test('player oblique pierce stays straight across real hit contacts',async({page},info)=>{
    await openGame(page);
    const result=await page.evaluate(async()=>{
        clearInterval(gameTickHandle);gameTickHandle=null;game.combatHalted=true;
        tutorialQueue.length=0;if(activeTutorial)dismissTutorial(false);closeAllWindows();
        await battleAssets.images.skillFxWorldTree.decode();
        resetCombatChannelRuntime();pendingSkillStageHits=[];clearBattleVisualBacklog();game.combatTimeMs=getCombatTime();
        game.gridPlayer={gx:1,gy:2};game.playerCastDelayUntil=0;game.activeSkill='얼음 창';
        game.enemies=[{gx:3,gy:3},{gx:6,gy:5}].map((cell,i)=>Object.assign(createEnemy(getZone(1),{at:20,count:1},i),
            cell,{hp:1000000,maxHp:1000000,evasion:0,evasionChance:0}));
        performPlayerAttack(getPlayerStats(),{skillName:'얼음 창',forcedCrit:false});
        const fx=battleFx.find(row=>row.type==='combatTravel'),path=fx.travelPath,from=path[0],to=path.at(-1);
        game.combatTimeMs=pendingSkillStageHits[0].at;processPendingSkillStageHits();renderBattlefield(true);
        return {length:path.length,errors:path.map(p=>(p.gx-from.gx)*(to.gy-from.gy)-(p.gy-from.gy)*(to.gx-from.gx)),
            hit:game.enemies[0].hp<1000000,later:game.enemies[1].hp};
    });
    expect(result.length).toBeGreaterThanOrEqual(3);
    for(const value of result.errors)expect(Math.abs(value)).toBeLessThan(1e-8);
    expect(result.hit).toBe(true);expect(result.later).toBe(1000000);
    await page.screenshot({path:info.outputPath('player-straight-pierce.png'),scale:'css'});
});

test('enemy cast bar progresses and silence cancels its warning and damage',async({page},info)=>{
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await openGame(page);
    const casting=await page.evaluate(()=>{
        clearInterval(gameTickHandle);gameTickHandle=null;game.combatHalted=true;
        tutorialQueue.length=0;if(activeTutorial)dismissTutorial(false);closeAllWindows();
        pendingEnemyCombatAttacks=[];clearBattleVisualBacklog();game.combatTimeMs=getCombatTime();
        game.gridPlayer={gx:3,gy:4};game.enemies=[Object.assign(createEnemy(getZone(1),{boss:true,at:90},0),
            {gx:6,gy:4,isBoss:true,patternMode:'slam',patternAttackCount:2,attackTimer:.5,
                attackKind:'ranged',attackRange:99,noAttack:false,ailments:[]})];
        const enemy=game.enemies[0];performMonsterAttacks(getPlayerStats());
        game.combatTimeMs+=700;enemy.attackTimer=.85;renderBattlefield(true);
        return {bar:enemyAttackRules.castBar(enemy,getCombatTime()),cells:enemy.patternArea.cells.length};
    });
    expect(casting.bar.progress).toBeGreaterThan(0);
    expect(casting.bar.progress).toBeLessThan(1);
    expect(casting.cells).toBeGreaterThan(0);
    await page.screenshot({path:info.outputPath('enemy-casting.png'),scale:'css'});
    const cancelled=await page.evaluate(()=>{
        const hp=game.playerHp,enemy=game.enemies[0];
        enemy.ailments=[{type:'silence',time:3,power:0}];performMonsterAttacks(getPlayerStats());
        renderBattlefield(true);
        return {hp:game.playerHp,before:hp,bar:enemyAttackRules.castBar(enemy,getCombatTime()),
            cells:getBossWarningCells(game,pendingEnemyCombatAttacks).length,pending:pendingEnemyCombatAttacks.length};
    });
    expect(cancelled.bar.cancelled).toBe(true);
    expect(cancelled.hp).toBe(cancelled.before);
    expect(cancelled.cells).toBe(0);expect(cancelled.pending).toBe(0);
    await page.screenshot({path:info.outputPath('enemy-cancelled.png'),scale:'css'});
    expect(errors).toEqual([]);
});

test('ordinary windups stay unlabelled and special casts stay above health at canvas edges',async({page})=>{
    await openGame(page);
    const result=await page.evaluate(()=>{
        clearInterval(gameTickHandle);gameTickHandle=null;game.combatHalted=true;
        tutorialQueue.length=0;if(activeTutorial)dismissTutorial(false);closeAllWindows();
        pendingEnemyCombatAttacks=[];game.combatTimeMs=getCombatTime();
        const canvas=document.createElement('canvas');canvas.width=320;canvas.height=240;
        const ctx=canvas.getContext('2d'),labels=[],frames=[];
        const fillText=ctx.fillText.bind(ctx),roundRect=ctx.roundRect.bind(ctx);
        ctx.fillText=(text,...args)=>{labels.push(text);fillText(text,...args);};
        ctx.roundRect=(...args)=>{frames.push(args);roundRect(...args);};
        const enemy=Object.assign(createEnemy(getZone(1),{at:20,count:1},0),
            {isBoss:false,hp:100,attackTimer:1,attackCastMs:900,attackLabel:'집중 관통',ailments:[]});
        enemyAttackRules.ready(enemy,getCombatTime(),game.gridPlayer);
        drawBossPatternLabel(ctx,{x:310,y:120},enemy);
        const ordinaryLabels=labels.slice();
        const ordinaryFrames=frames.length;
        enemy.attackCast=null;enemy.attackCastSpecial=true;
        enemyAttackRules.ready(enemy,getCombatTime(),game.gridPlayer);
        game.combatTimeMs+=450;
        drawBossPatternLabel(ctx,{x:310,y:120},enemy);
        drawBossPatternLabel(ctx,{x:5,y:120},enemy);
        return {ordinaryLabels,ordinaryFrames,labels,frames};
    });
    expect(result.ordinaryLabels).toEqual([]);
    expect(result.ordinaryFrames).toBe(0);
    expect(result.labels).toEqual([]);
    expect(result.frames).toHaveLength(4);
    for(const [x,y,width,height] of result.frames){
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x+width).toBeLessThanOrEqual(320);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y+height).toBeLessThan(120-56);
    }
});

test('a confirmed projectile contact shows damage without replaying the skill on its victim',async({page},info)=>{
    await openGame(page);
    const result=await page.evaluate(async()=>{
        clearInterval(gameTickHandle);gameTickHandle=null;game.combatHalted=true;
        tutorialQueue.length=0;if(activeTutorial)dismissTutorial(false);closeAllWindows();
        await battleAssets.images.skillFxWorldTree.decode();
        resetCombatChannelRuntime();pendingSkillStageHits=[];clearBattleVisualBacklog();
        game.gridPlayer={gx:2,gy:4};game.playerCastDelayUntil=0;game.activeSkill='얼음 창';
        game.enemies=[Object.assign(createEnemy(getZone(1),{at:20,count:1},0),
            {gx:3,gy:4,hp:1000000,maxHp:1000000,evasion:0,evasionChance:0})];
        performPlayerAttack(getPlayerStats(),{skillName:'얼음 창',forcedCrit:false});
        const row=pendingSkillStageHits[0];
        game.combatTimeMs=row.at-1;processPendingSkillStageHits();renderBattlefield(true);
        const before={hp:game.enemies[0].hp,numbers:battleVisualState.damageTexts.length};
        game.combatTimeMs=row.at;processPendingSkillStageHits();renderBattlefield(true);
        return {before,hp:game.enemies[0].hp,resolved:row.contactState.resolved,
            numbers:battleVisualState.damageTexts.length,
            repeatedImages:battleVisualState.skillEffects.filter(fx=>fx.family==='hitSpark').length};
    });
    expect(result.before).toEqual({hp:1000000,numbers:0});
    expect(result.hp).toBeLessThan(1000000);
    expect(result.resolved).toBe(true);
    expect(result.numbers).toBeGreaterThan(0);
    expect(result.repeatedImages).toBe(0);
    await page.screenshot({path:info.outputPath('skill-contact.png'),scale:'css'});
});

test('new journey shows supplied prologue and unlocked journal illustrations replay',async({page},info)=>{
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await openGame(page);
    await expect(page.locator('#tutorial-overlay')).toHaveClass(/is-story-scene/);
    await expect(page.locator('.story-scene-copy')).toContainText('정원사에게 복수하세요.');
    await expect(page.locator('.story-scene-art')).toBeVisible();
    await page.waitForFunction(()=>document.querySelector('.story-scene-art')?.naturalWidth>0);
    await page.screenshot({path:info.outputPath('prologue.png'),scale:'css'});
    await page.locator('#tutorial-dismiss-btn').click();
    await page.evaluate(()=>{
        clearInterval(gameTickHandle);gameTickHandle=null;
        tutorialQueue.length=0;if(activeTutorial)dismissTutorial(false);
        game.journalEntries=JOURNAL_ENTRY_ORDER.slice();game.season=2;
        game.contentProgression.inherited=CONTENT_UNLOCK_CATALOG.map(row=>row.id);contentProgression.sync();
        game.seenTutorials.push(...STORY_JOURNAL_SCENES.map(scene=>'story_'+scene.id));
        updateStaticUI();switchTab('tab-journal');
    });
    await expect(page.locator('#ui-journal-list img')).toHaveCount(0);
    await page.locator('[data-journal-entry="act_10"]').click();
    await expect(page.locator('#journal-reader')).toContainText('두 손 사이에는 아직 작은 틈이 남아 있었습니다.');
    await page.locator('#journal-reader .story-scene-art').evaluate(image=>image.decode());
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    await page.screenshot({path:info.outputPath('journal-ending.png'),scale:'css'});
    expect(errors).toEqual([]);
});

test('all mapped skill art uses shared atlas and real footprint without changing combat',async({page},info)=>{
    await openGame(page);
    const result=await page.evaluate(async()=>{
        clearInterval(gameTickHandle);gameTickHandle=null;
        tutorialQueue.length=0;if(activeTutorial)dismissTutorial(false);
        const atlas=battleAssets.images.skillFxWorldTree;
        await atlas.decode();
        const canvas=document.createElement('canvas');canvas.width=864;canvas.height=768;
        const ctx=canvas.getContext('2d'),original=ctx.drawImage.bind(ctx);
        const calls=[],transforms=[];ctx.drawImage=(...args)=>{calls.push(args);transforms.push(ctx.getTransform());original(...args);};
        const projection={tileW:80,tileH:80,cellToScreen:(gx,gy)=>({x:gx*80+40,y:gy*80+40})};
        const source={gx:3,gy:4},enemy={id:1,gx:4,gy:4,hp:1000,maxHp:1000};
        const before=JSON.stringify(game),rows=[];
        for(const [name,spec] of Object.entries(SKILL_FX_ATLAS)) {
            if(!SKILL_DB[name] || SKILL_DB[name].nativeCastId)continue;
            worldTreeSkillFx.beginFrame();calls.length=0;transforms.length=0;
            const area=getSkillStageFootprint(name,SKILL_DB[name],{targets:[{enemy}]},source);
            const footprint=projectSkillFootprint(area,projection,source);
            worldTreeSkillFx.impact(ctx,{skillName:name,element:'cold',family:'test',footprint,
                x:360,y:360,fromX:280,fromY:360,toX:360,toY:360,size:80},.3);
            let direction=true;
            if(name==='용화 숨결'){
                const h=0,m=transforms[0];
                const dx=m.a*Math.cos(h)+m.c*Math.sin(h),dy=m.b*Math.cos(h)+m.d*Math.sin(h);
                direction=Math.abs(Math.atan2(dy,dx)-footprint.cone.angle)<.001;
            }
            rows.push({name,count:calls.length,direction,shared:calls.every(args=>args[0]===atlas),
                crops:calls.every(args=>args[1]>=0&&args[2]>=0&&args[3]>0&&args[4]>0&&args[1]+args[3]<=1024&&args[2]+args[4]<=1920),finite:calls.every(args=>args.slice(1).every(Number.isFinite))});
        }
        return {rows,unchanged:JSON.stringify(game)===before};
    });
    expect(result.rows).toHaveLength(43);
    for(const row of result.rows){expect(row.count,row.name).toBeGreaterThan(0);expect(row.shared&&row.crops&&row.finite&&row.direction,row.name).toBe(true);}
    expect(result.unchanged).toBe(true);
    await info.attach('mapped-effects',{body:JSON.stringify(result,null,2),contentType:'application/json'});
});

test('interrupting a real channel removes its remaining supplied effect',async({page})=>{
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await openGame(page);
    const result=await page.evaluate(async()=>{
        clearInterval(gameTickHandle);gameTickHandle=null;
        tutorialQueue.length=0;if(activeTutorial)dismissTutorial(false);
        await battleAssets.images.skillFxWorldTree.decode();
        resetCombatChannelRuntime();pendingSkillStageHits=[];battleFx=[];
        game.activeSkill='집중 광선';game.skills.push(game.activeSkill);
        game.gemData[game.activeSkill]={level:1,exp:0,quality:0};
        game.gridPlayer={gx:3,gy:4};game.playerCastDelayUntil=0;
        game.enemies=[Object.assign(createEnemy(getZone(1),{at:20,count:1},0),{gx:4,gy:4,hp:100000,maxHp:100000})];
        performPlayerAttack(getPlayerStats(),{skillName:'집중 광선',forcedCrit:false});
        const fx=battleFx.find(row=>row.type==='combatTravel');
        const canvas=document.createElement('canvas');canvas.width=432;canvas.height=384;
        const ctx=canvas.getContext('2d'),projection={tileW:48,tileH:48,cellToScreen:(gx,gy)=>({x:gx*48+24,y:gy*48+24})};
        const render=()=>{ctx.clearRect(0,0,432,384);worldTreeSkillFx.beginFrame();worldTreeSkillFx.travel(ctx,fx,fx.start+fx.flightMs+80,projection);
            return ctx.getImageData(0,0,432,384).data.some((value,index)=>index%4===3&&value>0);};
        const before=render(),pendingBefore=pendingSkillStageHits.length,hp=game.enemies[0].hp;
        cancelCombatChannel('기절');
        const after=render();
        return {before,after,pendingBefore,pendingAfter:pendingSkillStageHits.length,unchangedHp:game.enemies[0].hp===hp};
    });
    expect(result.before).toBe(true);expect(result.after).toBe(false);
    expect(result.pendingBefore).toBeGreaterThan(0);expect(result.pendingAfter).toBe(0);
    expect(result.unchangedHp).toBe(true);expect(errors).toEqual([]);
});

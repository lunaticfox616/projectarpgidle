const {test,expect}=require('@playwright/test');

async function openPreparedGame(page) {
    await page.route('https://**',route=>route.fulfill({status:204,body:''}));
    await page.goto('/');await page.locator('#btn-startup-guest').click();
    await page.locator('[data-class-id="warrior"]').click();
    await page.waitForFunction(()=>battleAssets.ready&&!uiRefreshRunning&&!uiRefreshQueued);
    await page.evaluate(()=>{
        clearInterval(gameTickHandle);gameTickHandle=null;game.combatHalted=true;
        game.season=10;game.loopCount=9;game.maxZoneId=29;game.level=100;
        game.currentZoneId=8;game.moveTimer=0;game.pendingLoopReady=false;
        game.seenTutorials.push(...MAP_PRIMARY_CONTENTS.map(row=>row.noticeKey).filter(Boolean));
        game.seenTutorials.push(...STORY_JOURNAL_SCENES.map(scene=>'story_'+scene.id));
        game.seenTutorials.push('meteor_unlocked',...Object.keys(TUTORIAL_GUIDES));
        contentProgression.sync();performUpdateStaticUI();
    });
    await settlePreparationUi(page);
    return page;
}

async function settlePreparationUi(page) {
    await page.waitForFunction(()=>{
        if(uiRefreshQueued||uiRefreshRunning)return false;
        tutorialQueue.length=0;if(activeTutorial)dismissTutorial(false);
        return true;
    });
    await expect(page.locator('#tutorial-overlay.active')).toHaveCount(0);
}

test('boss preparation shows obtainable rewards and ticket sources without exposing locked currency',async({page},info)=>{
    const child=await openPreparedGame(page);
    await child.evaluate(()=>explorationAtlasUi.open());
    const frame=page;
    await frame.getByRole('button',{name:'탐험',exact:true}).click();
    await frame.locator('[data-atlas-route="map-explore-root-boss"]').click();
    const boss=frame.locator('[data-boss-id="s2_boss_flame"]');
    await expect(boss.locator('.encounter-reward')).toContainText('고유 장비');
    await expect(boss).not.toContainText('군주의 핵');
    await expect(boss.locator('.encounter-entry-source')).toContainText('정예·보스');
    await expect(boss.getByRole('button',{name:'도전',exact:true})).toHaveCount(0);
    await child.evaluate(()=>{
        game.contentProgression.inherited=CONTENT_UNLOCK_CATALOG.map(row=>row.id);
        contentProgression.sync();game.currencies.bossKeyFlame=1;updateStaticUI();
    });
    await settlePreparationUi(page);
    await expect(boss.locator('.encounter-reward')).toContainText('군주의 핵');
    await expect(boss.getByRole('button',{name:'도전',exact:true})).toBeEnabled();
    await settlePreparationUi(page);
    await boss.screenshot({path:info.outputPath('boss-preparation-dark.png')});
    expect(await boss.evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(2);
    expect(await child.evaluate(()=>game.currencies.bossKeyFlame)).toBe(1);
});

test('expedition entry button survives combat stat refresh and charge changes',async({page})=>{
    const child=await openPreparedGame(page);
    const frame=page;
    await child.evaluate(()=>{
        game.starWedge.unlocked=true;game.starWedge.skyRiftReady=true;
        game.contentProgression.inherited=CONTENT_UNLOCK_CATALOG.map(row=>row.id);contentProgression.sync();
        switchTab('tab-map');switchMapSubtab('map-tab-zones');
        switchMapExploreSubtab('map-explore-meteor');performUpdateStaticUI();
    });
    await settlePreparationUi(page);
    const button=frame.locator('#ui-meteor-list').getByRole('button',{name:'운석 원정 입장'});
    await button.focus();
    expect(await child.evaluate(()=>{
        const before=document.querySelector('#ui-meteor-list button');
        const power=document.querySelector('#ui-meteor-list [data-player-ehp]').dataset.playerEhp;
        for(let i=0;i<3;i++) {
            game.starWedge.skyRiftGauge=i;
            game.level+=5;
            performUpdateStaticUI();
        }
        return {sameButton:before===document.querySelector('#ui-meteor-list button'),
            powerChanged:power!==document.querySelector('#ui-meteor-list [data-player-ehp]').dataset.playerEhp};
    })).toEqual({sameButton:true,powerChanged:true});
    await expect(button).toBeFocused();
    await child.evaluate(()=>{game.starWedge.skyRiftReady=false;performUpdateStaticUI();});
    await expect(button).toBeDisabled();
    await child.evaluate(()=>{game.starWedge.skyRiftReady=true;performUpdateStaticUI();});
    await expect(button).toBeEnabled();
    await button.click();
    expect(await child.evaluate(()=>[game.currentZoneId,game.starWedge.skyRiftReady]))
        .toEqual(['meteor_fall_site',false]);
});

test('completed grand breach receipt stays readable and does not grant rewards on viewing',async({page},info)=>{
    await openPreparedGame(page);
    await page.evaluate(()=>{
        game.contentProgression.inherited=CONTENT_UNLOCK_CATALOG.map(row=>row.id);contentProgression.sync();
        game.voidRift.grandBreachUnlock=true;enterGrandBreach();
        Object.assign(game.voidRift.grandRun,{kills:121,timeLeft:0});
        tickGrandBreachRun(getZone(game.currentZoneId));
        game.enemies[0].hp=0;handleEnemyDeath(game.enemies[0],getPlayerStats());
        game.combatHalted=true;
        switchTab('tab-map');switchMapSubtab('map-tab-zones');switchMapExploreSubtab('map-explore-voidrift');
        performUpdateStaticUI();
    });
    await settlePreparationUi(page);
    const receipt=page.getByLabel('최근 원정 결과');
    await expect(page.locator('#game-toast-region .game-toast')).toHaveCount(0);
    await page.waitForFunction(()=>mobileToastQueue.length===0&&mobileToastActiveCount===0);
    await expect(receipt).toContainText('군주 격파');
    await expect(receipt).toContainText('121처치');
    await expect(receipt).toContainText('공허의 끌 +14');
    const balance=await page.evaluate(()=>game.currencies.voidChisel);
    await page.evaluate(()=>performUpdateStaticUI());
    await settlePreparationUi(page);
    expect(await receipt.evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(2);
    await receipt.screenshot({path:info.outputPath('grand-result-dark.png')});
    expect(await page.evaluate(()=>game.currencies.voidChisel)).toBe(balance);
    await page.evaluate(()=>{
        game.voidRift.grandRun={inRun:false,phase:'failed',kills:5,rewardVoidChisel:null};
        performUpdateStaticUI();
    });
    await expect(receipt).toContainText('군주 격파 실패');
    await expect(receipt).toContainText('군주 보상 없음');
});

test('power estimate distinguishes hit survival and explains sustained damage on focus or touch',async({page},info)=>{
    await openPreparedGame(page);
    await page.evaluate(()=>{
        game.contentProgression.inherited=CONTENT_UNLOCK_CATALOG.map(row=>row.id);contentProgression.sync();
        switchTab('tab-map');switchMapSubtab('map-tab-zones');switchMapExploreSubtab('map-explore-trials');
        performUpdateStaticUI();
    });
    await settlePreparationUi(page);
    const estimate=page.locator('#ui-trial-list .map-power-estimate').first();
    await expect(estimate).toContainText('권장 전투력');
    await expect(estimate).toContainText('보상 감소');
    if(info.project.name.startsWith('mobile'))await estimate.tap();else await estimate.focus();
    await expect(page.locator('#info-tooltip')).toBeVisible();
    await expect(page.locator('#info-tooltip')).toContainText('중독·출혈 등 지속 피해');
    await expect(page.locator('#info-tooltip')).toContainText('장기전의 회복 능력');
    await page.screenshot({path:info.outputPath('hit-survival-tooltip.png')});
});

test('crowd pause explains stalled progress and resumes without discarding progress',async({page})=>{
    const child=await openPreparedGame(page);
    const frame=page;
    await child.evaluate(()=>{
        game.runProgress=36;game.woodsmanEntrancePending=false;
        game.enemies=Array.from({length:ENEMY_CROWD_PAUSE_LIMIT},(_,i)=>createEnemy(getZone(8),{boss:false,elite:false},i));
        switchTab('tab-battle');updateCombatUI(getPlayerStats());
    });
    await expect(frame.locator('#ui-progress-label')).toHaveText('적 정리 중');
    await expect(frame.locator('#ui-move-time-text')).toHaveText('36%');
    await child.evaluate(()=>{game.enemies[0].hp=0;updateCombatUI(getPlayerStats());});
    await expect(frame.locator('#ui-progress-label')).toHaveText('진행도');
    await expect(frame.locator('#ui-move-time-text')).toHaveText('36%');
    expect(await child.evaluate(()=>game.runProgress)).toBe(36);
});

test('time rift guides altar selection with eligible equipment and preserves a failed expedition',async({page},info)=>{
    await openPreparedGame(page);
    await page.evaluate(()=>{
        game.season=50;game.loopCount=49;game.settings.mapCompleteAction='stop';game.settings.showDeathNotice=false;
        game.contentProgression.inherited=CONTENT_UNLOCK_CATALOG.map(row=>row.id);contentProgression.sync();
        const unique=generateUniqueItem(10,null,'첫 계약');unique.name='제단 고유';
        const base=BASE_ITEM_DB.find(b=>b.id===unique.baseId);
        const rare=createItemFromBase(base,'rare',10);rare.name='제단 희귀';
        const wrong=createItemFromBase(BASE_ITEM_DB.find(b=>b.slot!==unique.slot),'rare',10);wrong.name='다른 부위';
        const bad=createItemFromBase(base,'rare',10);bad.corrupted=true;bad.name='타락 장비';
        game.inventory=[unique,rare,wrong,bad];
        switchTab('tab-map');switchMapSubtab('map-tab-zones');switchMapExploreSubtab('map-explore-timerift');performUpdateStaticUI();
    });
    await settlePreparationUi(page);
    const panel=page.locator('#ui-timerift-panel');
    await expect(panel).toContainText('혼돈 1 상당 · 전투 난이도 8');
    await panel.getByRole('button',{name:'시간압 높이기'}).click();
    await expect(panel).toContainText('혼돈 6 상당 · 전투 난이도 13');
    await panel.getByRole('button',{name:'시간압 낮추기'}).click();
    await expect(panel.getByRole('button',{name:'미래 입장',exact:true})).toBeDisabled();
    await panel.getByRole('button',{name:'과거 입장',exact:true}).click();
    expect(await page.evaluate(()=>game.currentZoneId)).toBe('time_rift_past');
    await page.evaluate(()=>{startEncounterRun();finishEncounterRun();performUpdateStaticUI();});
    for(const name of ['제단 고유','제단 희귀']) {
        await panel.getByRole('button',{name:'장비 고르기',exact:true}).click();
        const picker=page.locator('#craft-item-picker-overlay');
        await expect(picker).not.toContainText('타락 장비');
        if(name==='제단 희귀')await expect(picker).not.toContainText('다른 부위');
        await picker.getByRole('button',{name:new RegExp(name)}).click();
        await panel.getByRole('button',{name:'선택 장비 올리기',exact:true}).click();
    }
    const stored=await page.evaluate(()=>JSON.stringify([game.timeRift.altarUnique,game.timeRift.altarRare]));
    await panel.getByRole('button',{name:'미래 입장',exact:true}).click();
    await page.evaluate(()=>{handlePlayerDefeat(getZone(game.currentZoneId),getPlayerStats(),null,{noToast:true});performUpdateStaticUI();});
    expect(await page.evaluate(()=>JSON.stringify([game.timeRift.altarUnique,game.timeRift.altarRare]))).toBe(stored);
    await expect(panel.getByRole('button',{name:'미래 입장',exact:true})).toBeEnabled();
    await page.waitForFunction(()=>mobileToastQueue.length===0&&mobileToastActiveCount===0);
    if(info.project.name.startsWith('mobile')) {
        for(const name of ['past','altar','future']) {
            const stage=panel.locator(`[data-rift-stage="${name}"]`);
            await stage.scrollIntoViewIfNeeded();
            await page.screenshot({path:info.outputPath(`time-rift-${name}-dark.png`)});
        }
    } else await panel.screenshot({path:info.outputPath('time-rift-dark.png')});
    expect(await panel.evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(2);
    await panel.getByRole('button',{name:'제단 회수',exact:true}).click();
    const recovered=await page.evaluate(()=>game.inventory.map(item=>({id:item.id,name:item.name})));
    expect(recovered.map(item=>item.id)).toEqual(expect.arrayContaining(JSON.parse(stored).map(item=>item.id)));
    await expect(panel.getByRole('button',{name:'과거 입장',exact:true})).toBeEnabled();
});

test('colony preparation keeps entry difficulty and completed waves consistent through retreat',async({page},info)=>{
    await openPreparedGame(page);
    await page.evaluate(()=>{
        game.season=50;game.loopCount=49;game.abyssEndlessDepth=40;game.loopProgressCurrent.bestAbyssDepth=30;
        game.contentProgression.inherited=CONTENT_UNLOCK_CATALOG.map(row=>row.id);contentProgression.sync();
        game.currencies.colonyTrace=1;game.colony.wave=8;game.colony.entryDeepChaosDepth=21;
        switchTab('tab-map');switchMapExploreSubtab('map-explore-colony');performUpdateStaticUI();
    });
    await settlePreparationUi(page);
    const panel=page.locator('#ui-colony-panel');
    await expect(panel).toContainText('기준 혼돈 심화 30');
    await expect(panel.locator('.map-power-estimate')).toContainText('권장 전투력');
    await expect(panel).toContainText('완료 7웨이브');
    const entry=panel.getByRole('button',{name:'군락지 입장',exact:true});
    await entry.focus();
    await page.evaluate(()=>{game.level++;performUpdateStaticUI();});
    await expect(entry).toBeFocused();
    await entry.click();
    expect(await page.evaluate(()=>[game.currentZoneId,game.colony.wave,game.colony.entryDeepChaosDepth,game.currencies.colonyTrace])).toEqual(['colony_run',1,30,0]);
    expect(await page.evaluate(()=>game.combatHalted)).toBe(false);
    const owned=await page.evaluate(()=>JSON.stringify([game.inventory,game.colony.wardInventory,game.currencies.colonyShard]));
    await panel.getByRole('button',{name:'철수',exact:true}).click();
    await expect(panel).toContainText('완료 0웨이브');
    expect(await page.evaluate(()=>game.currentZoneId)).toBe(8);
    expect(await page.evaluate(()=>JSON.stringify([game.inventory,game.colony.wardInventory,game.currencies.colonyShard]))).toBe(owned);
    await expect(entry).toBeDisabled();
    await page.waitForFunction(()=>mobileToastQueue.length===0&&mobileToastActiveCount===0);
    await panel.screenshot({path:info.outputPath('colony-dark.png')});
    expect(await panel.evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(2);
    await panel.getByRole('button',{name:'액막이 관리',exact:true}).click();
    await expect(page.locator('#ui-colony-ward-talisman-panel')).toBeVisible();
});

test('labyrinth entry and floor choice remain operable during stat refresh',async({page},info)=>{
    await openPreparedGame(page);
    await page.evaluate(()=>{
        game.labyrinthFloor=1;game.labyrinthUnlockedMaxFloor=3;
        switchTab('tab-map');switchMapSubtab('map-tab-zones');switchMapExploreSubtab('map-explore-labyrinth');
        performUpdateStaticUI();
    });
    await settlePreparationUi(page);
    const panel=page.locator('#ui-labyrinth-list');
    const entry=panel.getByRole('button',{name:'1층 입장',exact:true});
    await expect(entry).toBeVisible();
    await entry.focus();
    expect(await page.evaluate(()=>{
        const entry=document.querySelector('#ui-labyrinth-list button');
        game.level+=5;performUpdateStaticUI();
        return entry===document.querySelector('#ui-labyrinth-list button');
    })).toBe(true);
    await expect(entry).toBeFocused();
    await expect(panel).not.toContainText('미궁 화석:');
    await panel.getByRole('button',{name:'층 선택',exact:true}).click();
    await expect(page.locator('#game-dialog-number')).toHaveValue('3');
    await page.getByRole('button',{name:'취소',exact:true}).click();
    expect(await page.evaluate(()=>game.currentZoneId)).toBe(8);
    await expect(page.locator('#game-toast-region .game-toast')).toHaveCount(0);
    await panel.screenshot({path:info.outputPath('labyrinth-dark.png')});
    expect(await panel.evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(2);
    await entry.click();
    expect(await page.evaluate(()=>[game.currentZoneId,game.labyrinthFloor])).toEqual(['labyrinth_endless',1]);
    await page.evaluate(()=>{
        game.contentProgression.inherited=CONTENT_UNLOCK_CATALOG.map(row=>row.id);contentProgression.sync();
        game.currencies.fossil=2;performUpdateStaticUI();
    });
    await expect(panel).toContainText('미궁 화석 2개');
});

test('meteor progress distinguishes approach from the unfinished core battle',async({page})=>{
    await openPreparedGame(page);
    await page.evaluate(()=>{
        prepareMeteorEncounterEntry(8);game.currentZoneId=METEOR_FALL_ZONE_ID;
        game.moveTimer=0;game.runProgress=76;game.enemies=[];
        switchTab('tab-battle');updateCombatUI(getPlayerStats());
    });
    await expect(page.locator('#ui-progress-label')).toHaveText('운석 접근');
    await expect(page.locator('#ui-move-time-text')).toHaveText('76%');
    await page.evaluate(()=>{
        game.runProgress=100;game.enemies=[createEnemy(getZone(game.currentZoneId),{boss:true},0)];
        updateCombatUI(getPlayerStats());
    });
    await expect(page.locator('#ui-progress-label')).toHaveText('운석 핵 파괴');
    await expect(page.locator('#ui-move-time-text')).toHaveText('처치 중');
    await expect(page.locator('#ui-enemy-list')).not.toContainText('undefined');
    await page.evaluate(()=>{game.currentZoneId=8;game.enemies=[];game.runProgress=0;updateCombatUI(getPlayerStats());});
    await expect(page.locator('#ui-progress-label')).toHaveText('진행도');
    await expect(page.locator('#ui-move-time-text')).toHaveText('0%');
});

test('grand breach counter does not overlap the battlefield or combat HUDs',async({page},info)=>{
    await openPreparedGame(page);
    await page.evaluate(()=>{
        game.currentZoneId='grand_breach_run';game.moveTimer=0;
        game.contentProgression.inherited=CONTENT_UNLOCK_CATALOG.map(row=>row.id);contentProgression.sync();
        game.playerAilments=[{type:'poison',time:3,duration:3,power:0.1,hitDamage:100}];
        game.voidRift.grandRun={inRun:true,phase:'survival',timeLeft:27,kills:5};
        game.enemies=[createEnemy(getZone(game.currentZoneId),{boss:false},0)];
        switchTab('tab-battle');performUpdateStaticUI();updateCombatUI(getPlayerStats());
    });
    await settlePreparationUi(page);
    const counter=page.locator('#side-encounter-hud');
    await expect(counter).toBeVisible();
    for(const compact of info.project.name.startsWith('desktop')?[false,true]:[false]) {
        if(compact)await page.setViewportSize({width:1014,height:742});
        const row=await counter.boundingBox(),field=await page.locator('#battlefield-wrap').boundingBox();
        // 균열 등불은 전장이 화면 전체에 깔리므로 계수기는 전장 위에 떠 있고, 다른 판에 가려지지 않아야 한다.
        const fullBleed=await page.evaluate(()=>document.body.dataset.uiSkin==='rift'&&getComputedStyle(document.getElementById('side-encounter-hud')).position==='absolute');
        if(fullBleed) {
            expect(row.y).toBeGreaterThanOrEqual(field.y-1);
            expect(row.y+row.height).toBeLessThanOrEqual(field.y+field.height+1);
            const onTop=await counter.evaluate(el=>{const r=el.getBoundingClientRect();const hit=document.elementFromPoint(r.left+8,r.top+r.height/2);return el.contains(hit);});
            expect(onTop).toBe(true);
        } else expect(field.y+field.height).toBeLessThanOrEqual(row.y+1);
        for(const selector of ['.player-hud-shell','#ui-enemy-list','#ui-player-ailments-under','#ui-combat-flasks','#ui-battlefield-caption','.combat-feed']) {
            const hud=await page.locator(selector).boundingBox();
            const overlap=Math.min(row.y+row.height,hud.y+hud.height)-Math.max(row.y,hud.y);
            expect(overlap,selector).toBeLessThanOrEqual(1);
        }
    }
    await page.screenshot({path:info.outputPath('grand-breach-hud.png')});
});

test('rift preparation reports actual reinforcements and conditional entry',async({page},info)=>{
    await openPreparedGame(page);
    await page.evaluate(()=>{
        game.currentZoneId=19;
        Object.assign(game.voidRift,{active:true,totalToSpawn:6,spawnedCount:2,defeatedCount:1});
        switchTab('tab-map');switchMapSubtab('map-tab-zones');switchMapExploreSubtab('map-explore-voidrift');
        performUpdateStaticUI();
    });
    await settlePreparationUi(page);
    const panel=page.locator('#ui-voidrift-panel');
    await expect(panel).toContainText('1/6 처치');
    await expect(panel).toContainText('완료 시 8% 확률');
    await expect(panel.getByRole('button',{name:'대균열 입장'})).toBeDisabled();
    await page.evaluate(()=>{
        const enemy=createEnemy(getZone(19),{boss:false},0);
        enemy.fromVoidRift=true;enemy.hp=0;game.enemies=[enemy];
        handleEnemyDeath(enemy,getPlayerStats());performUpdateStaticUI();
    });
    await expect(panel).toContainText('2/6 처치');
    await panel.screenshot({path:info.outputPath('rift-preparation-dark.png')});
    expect(await panel.evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(2);
});

for(const result of ['clear','defeat']) for(const source of [0,19]) test(`manual meteor ${result} returns to hunting area ${source}`,async({page})=>{
    await openPreparedGame(page);
        await page.evaluate(source=>{
            game.currentZoneId=source;game.combatHalted=false;game.pendingLoopReady=false;
            game.starWedge.unlocked=true;game.starWedge.skyRiftReady=true;
            game.contentProgression.inherited=CONTENT_UNLOCK_CATALOG.map(row=>row.id);contentProgression.sync();
            switchTab('tab-map');switchMapSubtab('map-tab-zones');switchMapExploreSubtab('map-explore-meteor');
            performUpdateStaticUI();
        },source);
        await settlePreparationUi(page);
        await page.locator('#ui-meteor-list').getByRole('button',{name:'운석 원정 입장',exact:true}).click();
        expect(await page.evaluate(()=>game.starWedge.meteorReturnZoneId)).toBe(source);
        await page.evaluate(result=>{
            game.moveTimer=0;game.enemies=[];game.runProgress=100;
            if(result==='clear')finishEncounterRun();
            else handlePlayerDefeat(getZone(game.currentZoneId),getPlayerStats(),'원정 실패 검사',{noToast:true});
        },result);
        expect(await page.evaluate(()=>[game.currentZoneId,game.starWedge.meteorReturnZoneId,game.starWedge.skyRiftReady]))
            .toEqual([source,null,false]);
});

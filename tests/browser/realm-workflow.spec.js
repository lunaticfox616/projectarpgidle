const {test, expect} = require('@playwright/test');

async function openRealms(page) {
    await page.route('https://**', route=>route.fulfill({status:204,body:''}));
    await page.goto('/');
    await page.locator('#btn-startup-guest').click();
    await page.locator('#loop-hero-select-overlay [data-class-id]').first().click();
    await expect(page.locator('#loading-overlay')).not.toHaveClass(/active/);
    await page.evaluate(()=>{
        clearInterval(gameTickHandle);gameTickHandle=null;
        game.level=100; game.season=50; game.combatHalted=true;
        game.contentProgression.inherited=CONTENT_UNLOCK_CATALOG.map(row=>row.id); contentProgression.sync();
        Object.keys(game.unlocks).forEach(key=>game.unlocks[key]=true);
        game.journalEntries.push('woodsman'); game.abyssEndlessDepth=30; game.labyrinthUnlockedMaxFloor=100;
        game.chaosRealm.unlocked=true; game.loopProgressCurrent.chaos20Cleared=true;
        game.clearedRootBosses.push('s6_beast_cerberus');
        game.underworldProgress={currentFloor:12,highestFloor:30,floor10Cleared:true};
        game.underworldRunes.unlockedSlots=3; game.underworldRunes.unlockedRunesMaxNumber=9;
        game.underworldRunes.obtainedRunes=[1,2,2]; game.underworldRunes.equippedRunes=[1,null,2,null,null,null];
        reconcileMapPrimaryContentUnlocks(game); updateStaticUI(); switchTab('tab-map');
        switchCosmosInnerTab('route');
    });
    await page.waitForFunction(()=>{
        if(uiRefreshQueued||uiRefreshRunning)return false;
        tutorialQueue.length=0;if(activeTutorial)dismissTutorial(false);return true;
    });
}


test('expeditions preserve all planets and galaxy gates without individual exploration',async({page},info)=>{
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await openRealms(page);
    await page.evaluate(()=>switchMapSubtab('map-tab-cosmos'));
    await expect(page.locator('#cosmos-atlas-canvas')).toHaveCount(0);
    await expect(page.locator('#btn-cosmos-sub-atlas')).toHaveCount(0);
    await expect(page.getByText('개별 천체 탐사',{exact:true})).toHaveCount(0);
    await expect(page.locator('[data-route-action="node"]')).toHaveCount(0);
    await expect(page.locator('#ui-cosmos-detail')).toBeHidden();
    const displayed = new Set(await page.locator('[data-planned-node]').evaluateAll(nodes=>nodes.map(node=>node.dataset.plannedNode)));
    for(const galaxy of [2,3,4,5]){
        await page.locator('#cosmos-galaxy').selectOption(String(galaxy));
        for(const id of await page.locator('[data-planned-node]').evaluateAll(nodes=>nodes.map(node=>node.dataset.plannedNode)))displayed.add(id);
        await expect(page.locator('[data-route-action="start"]')).toHaveCount(0);
        await expect(page.locator('.cosmos-route-notice')).toContainText(`${galaxy-1}은하 보스 격파`);
        await expect(page.locator('[data-route-action="node"]')).toHaveCount(0);
    }
    const existingIds=await page.evaluate(()=>[...COSMOS_PLANETS.map((_,i)=>'planet-'+i),...COSMOS_ASTEROID_NUMBERS.map(n=>'asteroid-'+n)]);
    expect([...displayed].sort()).toEqual(existingIds.sort());
    await page.locator('#cosmos-galaxy').selectOption('1');
    const selectedPlan=await page.evaluate(()=>cosmosRouteRuntime.preview(game).plan.flat());
    expect(await page.locator('[data-planned-node]').evaluateAll(nodes=>nodes.map(n=>n.dataset.plannedNode))).toEqual(selectedPlan);
    await page.screenshot({path:info.outputPath('star-map.png'),scale:'css'});
    await page.locator('[data-route-action="start"]').click();
    expect(await page.evaluate(()=>game.cosmosAtlas.activeChallenge.nodeId)).toBe('planet-0');
    await page.evaluate(()=>{for(let i=0;i<26;i++)finishEncounterRun();renderCosmosAtlas();});
    expect(await page.evaluate(()=>game.cosmosAtlas.bossClears)).toContain('planet-46');
    await page.waitForFunction(()=>{
        if(uiRefreshQueued||uiRefreshRunning)return false;
        tutorialQueue.length=0;if(activeTutorial)dismissTutorial(false);return true;
    });
    await page.locator('#cosmos-galaxy').selectOption('2');
    await page.locator('[data-route-action="start"]').click();
    expect(await page.evaluate(()=>game.currentZoneId)).toBe('cosmos_challenge');
    expect(await page.evaluate(()=>game.cosmosAtlas.activeChallenge.nodeId)).not.toBe('planet-0');
    await expect(page.locator('.cosmos-planet-stop.current')).toHaveCount(1);
    await expect(page.locator('[data-route-action="battle"]')).toBeVisible();
    expect(errors).toEqual([]);
});

test('expedition controls work at UI scales and do not redraw while idle',async({page},info)=>{
    await openRealms(page);
    if(!info.project.use.isMobile)await page.setViewportSize({width:3200,height:1800});
    await page.evaluate(()=>switchMapSubtab('map-tab-cosmos'));
    await page.locator('#cosmos-galaxy').selectOption('2');
    for(const scale of [100,175,250]){
        await page.evaluate(value=>uiDisplay.apply(value),scale);
        await page.locator('[data-route-disclosure="leg-3"] summary').click();
        await expect(page.locator('[data-planned-node="planet-47"]')).toBeVisible();
        await page.locator('[data-route-disclosure="leg-3"] summary').click();
        await expect(page.locator('[data-planned-node="planet-47"]')).toBeHidden();
    }
    await page.evaluate(()=>uiDisplay.apply(100));
    if(!info.project.use.isMobile)await page.setViewportSize({width:1440,height:900});
    await page.locator('[data-route-action="stones"]').click();
    await expect(page.locator('#cosmos-stone-overlay')).toBeVisible();
    await page.locator('.cosmos-stone-overlay-close').click();
    await expect(page.locator('#cosmos-stone-overlay')).toBeHidden();
    const changes=await page.evaluate(async()=>{
        let count=0;const host=document.getElementById('cosmos-inner-route');
        const observer=new MutationObserver(rows=>count+=rows.length);
        observer.observe(host,{childList:true,subtree:true,attributes:true});
        renderCosmosAtlas();renderCosmosAtlas();
        await new Promise(resolve=>requestAnimationFrame(resolve));
        observer.disconnect();return count;
    });
    expect(changes).toBe(0);
    await page.locator('.cosmos-star-header').scrollIntoViewIfNeeded();
    await page.screenshot({path:info.outputPath('star-map-scale.png'),scale:'css'});
});

test('cosmos mastery preserves controls and reveals the next investment at its prerequisite',async({page},info)=>{
    await openRealms(page);
    await page.evaluate(()=>{
        clearInterval(gameTickHandle);gameTickHandle=null;
        switchMapSubtab('map-tab-cosmos');
        game.cosmosAtlas.cleared=Array.from({length:8},(_,i)=>'planet-'+i);
        game.cosmosAtlas.mastery={planetRelief:5};
        switchCosmosInnerTab('mastery');
    });
    const cards=page.locator('.cosmos-mastery-card');
    const first=cards.nth(0),second=cards.nth(1);
    await first.scrollIntoViewIfNeeded();
    await page.screenshot({path:info.outputPath('cosmos-mastery.png'),scale:'css'});
    await expect(first.getByRole('button')).toContainText('1P');
    await expect(second.getByRole('button')).toBeDisabled();
    await first.getByRole('button').click();
    await expect(first).toContainText('6/30');
    await expect(second.getByRole('button')).toBeEnabled();
    await second.getByRole('button').focus();
    await page.evaluate(()=>{
        window.masteryMutations=0;
        new MutationObserver(rows=>masteryMutations+=rows.length).observe(document.getElementById('cosmos-inner-mastery'),{childList:true,subtree:true});
        renderCosmosAtlas();renderCosmosAtlas();
    });
    expect(await page.evaluate(()=>masteryMutations)).toBe(0);
    await expect(second.getByRole('button')).toBeFocused();
    await second.getByRole('button').click();
    await second.getByRole('button').click();
    expect(await page.evaluate(()=>game.cosmosAtlas.masteryPointsSpent)).toBe(8);
    await expect(first.getByRole('button')).toBeDisabled();
    await page.evaluate(()=>{
        switchCosmosInnerTab('route');masteryMutations=0;
        game.cosmosAtlas.cleared.push('planet-8');renderCosmosAtlas();
    });
    expect(await page.evaluate(()=>masteryMutations)).toBe(0);
    await page.evaluate(()=>switchCosmosInnerTab('mastery'));
    await expect(first.getByRole('button')).toBeEnabled();
});

test('realm controls and themes remain usable; pruning stays outside miscellaneous', async ({page},info)=>{
    await openRealms(page);
    await page.evaluate(()=>{
        for(const platform of ['desktop','mobile']) game.settings.tabLayouts[platform].tabPlacement['btn-tab-pruning']='bottom';
        applyTabHeaderOrder(true);
        clearInterval(gameTickHandle); gameTickHandle=null;
    });
    expect(await page.evaluate(()=>tabLayoutUi.isMisc('btn-tab-pruning'))).toBe(false);
    if (!info.project.use.isMobile) {
        await expect(page.locator('.ui-rail-tab-layer #btn-tab-pruning')).toBeVisible();
        await expect(page.locator('.ui-rail-misc-panel #btn-tab-pruning')).toHaveCount(0);
    }
    if (info.project.use.isMobile) await page.locator('#mobile-map-destination').selectOption('btn-map-tab-underworld');
    else await page.locator('#btn-map-tab-underworld').click();
    await expect(page.locator('.underworld-rune-slot')).toHaveCount(6);
    await page.locator('.underworld-rune-slot.unlocked').first().click();
    await expect(page.locator('.underworld-rune-overlay')).toBeVisible();
    await page.evaluate(()=>document.querySelector('.underworld-rune-overlay').remove());
    for(const light of [false,true]) {
        await page.evaluate(light=>document.body.classList.toggle('light-mode',light),light);
        if (info.project.use.isMobile) await page.locator('#mobile-map-destination').selectOption('btn-map-tab-ocean');
        else await page.locator('#btn-map-tab-ocean').click();
        await expect(page.getByRole('progressbar',{name:'남은 산소'})).toBeVisible();
        await expect(page.locator('.ocean-upgrade-card')).toHaveCount(3);
        await page.locator('#ui-ocean-panel').getByRole('button',{name:'낚시 · 제작'}).click();
        await expect(page.locator('#map-tab-fishing')).toHaveClass(/active/);
        if (info.project.use.isMobile) await expect(page.locator('#mobile-map-destination')).toHaveValue('btn-map-tab-fishing');
        await expect(page.locator('.ocean-fish-grid')).toBeHidden();
        if (info.project.use.isMobile) await page.getByRole('tab', { name:'도감', exact:true }).click();
        else await page.locator('.ocean-collection-disclosure > summary').click();
        await expect(page.locator('.ocean-fish-grid')).toBeVisible();
        await page.evaluate(()=>renderFishingPanel());
        await expect(page.locator('.ocean-fish-grid')).toBeVisible();
        if (info.project.use.isMobile) await page.getByRole('tab', { name:'채집 · 전략', exact:true }).click();
        else await page.locator('.ocean-collection-disclosure > summary').click();
        await page.screenshot({path:info.outputPath(`fishing-${light}.png`)});
    }
});

test('settlement buttons disclose sacrifice, double repeatedly and request finish once', async ({page},info)=>{
    await openRealms(page);
    await page.evaluate(()=>{backgroundCombatRuntime.processing=true;updateBackgroundProgressOverlay(0,100000,86400000)});
    await expect(page.locator('#background-combat-sacrifice')).toContainText('절반');
    for (const progress of [0.5, 25, 70]) {
        await page.evaluate(progress=>updateBackgroundProgressOverlay(progress*1000,100000,86400000),progress);
        await expect(page.locator('.background-combat-progress-track')).toHaveAttribute('aria-valuenow', String(progress));
        const ratio=await page.locator('#background-combat-progress-bar-fill').evaluate(el=>el.getBoundingClientRect().width/el.parentElement.clientWidth);
        expect(ratio).toBeCloseTo(progress/100,2);
    }
    for(const tier of [1,2,3,4]) {
        await page.locator('#background-combat-fast-button').click();
        expect(await page.evaluate(()=>backgroundCombatRuntime.accelerationTier)).toBe(tier);
    }
    await expect(page.locator('#background-combat-fast-button')).toBeDisabled();
    await page.evaluate(()=>updateBackgroundProgressOverlay(80000,100000,86400000,75000));
    await expect(page.locator('#background-combat-skipped')).toContainText('보상 미지급');
    await page.screenshot({path:info.outputPath('settlement.png')});
    await page.locator('#background-combat-finish-button').click();
    expect(await page.evaluate(()=>backgroundCombatRuntime.finishRequested)).toBe(true);
    await expect(page.locator('#background-combat-finish-button')).toBeDisabled();
});

test('finishing a pending settlement commits once and clears the replayable absence', async ({page})=>{
    await openRealms(page);
    await page.evaluate(()=>{
        game.combatHalted=false;
        backgroundCombatRuntime.hiddenAtMs=Date.now()-8*60*60*1000;
        backgroundCombatRuntime.snapshot=cloneBackgroundCombatState(game);
        backgroundCombatRuntime.signature=getBackgroundCombatSignature(game);
        window.settlementReviewTask=startBackgroundCombatReturn(Date.now());
        // Pause at the native lifecycle boundary so the test can reliably exercise the pending controls.
        backgroundCombatRuntime.appInactive=true;
    });
    await page.locator('#background-combat-fast-button').click();
    await page.locator('#background-combat-finish-button').click();
    await page.evaluate(()=>{backgroundCombatRuntime.appInactive=false});
    expect(await page.evaluate(()=>window.settlementReviewTask)).toBe(true);
    await expect(page.locator('#background-combat-result-overlay')).toContainText('해당 시간 보상 미지급');
    expect(await page.evaluate(()=>backgroundCombatRuntime.snapshot)).toBeNull();
    expect(await page.evaluate(()=>startBackgroundCombatReturn(Date.now()))).toBe(false);
    await expect(page.locator('#background-combat-progress-overlay')).toHaveCount(0);
});

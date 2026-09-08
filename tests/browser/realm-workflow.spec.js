const {test, expect} = require('@playwright/test');

async function countCosmosFrames(page) {
    return page.evaluate(async()=>{
        const nextFrame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
        await nextFrame();
        const before=window.cosmosDraws;
        for(let i=0;i<8;i++)await nextFrame();
        return window.cosmosDraws-before;
    });
}

async function openRealms(page) {
    await page.route('https://**', route=>route.fulfill({status:204,body:''}));
    await page.goto('/');
    await page.locator('#btn-startup-guest').click();
    await page.locator('#loop-hero-select-overlay [data-class-id]').first().click();
    await expect(page.locator('#loading-overlay')).not.toHaveClass(/active/);
    await page.evaluate(()=>{
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
    });
    await page.waitForFunction(()=>{
        if(uiRefreshQueued||uiRefreshRunning)return false;
        tutorialQueue.length=0;if(activeTutorial)dismissTutorial(false);return true;
    });
}

test('cosmos destination directory reaches selection, map and battle without traversing the map', async ({page},info)=>{
    const errors=[]; page.on('pageerror',e=>errors.push(e.message));
    await openRealms(page);
    await page.evaluate(()=>switchMapSubtab('map-tab-cosmos'));
    await expect(page.locator('#cosmos-atlas-canvas')).toBeHidden();
    await expect(page.locator('.cosmos-destination')).toHaveCount(1);
    await page.locator('#cosmos-directory-status').selectOption('boss');
    await expect(page.locator('.cosmos-destination')).toHaveCount(6);
    await page.locator('.cosmos-destination').last().scrollIntoViewIfNeeded();
    const directoryScroll=await page.locator('#cosmos-destination-list').evaluate(el=>el.scrollTop);
    await page.locator('.cosmos-destination').last().click();
    await expect(page.locator('#ui-cosmos-detail .primary')).toBeDisabled();
    if(info.project.use.isMobile){
        await page.getByRole('button',{name:'목적지 목록으로',exact:true}).click();
        await expect(page.locator('#cosmos-directory-status')).toBeInViewport();
        await expect(page.locator('.cosmos-destination[aria-pressed="true"]')).toBeFocused();
    }
    await expect(page.locator('#cosmos-directory-status')).toHaveValue('boss');
    expect(await page.locator('#cosmos-destination-list').evaluate(el=>el.scrollTop)).toBe(directoryScroll);
    await page.locator('#cosmos-directory-status').selectOption('available');
    await page.locator('.cosmos-destination').first().click();
    await expect(page.locator('#ui-cosmos-detail')).toContainText('시리온');
    await expect(page.locator('#ui-cosmos-detail .primary')).toBeEnabled();
    await page.screenshot({path:info.outputPath('cosmos-directory.png')});
    await page.locator('#ui-cosmos-detail').getByRole('button',{name:'별지도 보기',exact:true}).click();
    await expect(page.locator('#cosmos-atlas-canvas')).toBeVisible();
    await page.evaluate(()=>{
        const ctx=document.getElementById('cosmos-atlas-canvas').getContext('2d');
        const clear=ctx.clearRect.bind(ctx);window.cosmosDraws=0;
        ctx.clearRect=(...args)=>{window.cosmosDraws++;return clear(...args);};
        game.cosmosAtlas.bossStones={'1':'test stone'};
        renderCosmosAtlas();
    });
    expect(await countCosmosFrames(page)).toBeGreaterThan(0);
    await page.locator('#cosmos-map-disclosure > summary').click();
    expect(await countCosmosFrames(page)).toBe(0);
    await page.locator('#cosmos-map-disclosure > summary').click();
    expect(await countCosmosFrames(page)).toBeGreaterThan(0);
    await page.locator('#btn-cosmos-sub-mastery').click();
    await expect(page.locator('#cosmos-inner-mastery')).toBeVisible();
    expect(await countCosmosFrames(page)).toBe(0);
    await page.locator('#btn-cosmos-sub-atlas').click();
    expect(await countCosmosFrames(page)).toBeGreaterThan(0);
    await page.evaluate(()=>switchTab('tab-items'));
    expect(await countCosmosFrames(page)).toBe(0);
    await page.evaluate(()=>switchTab('tab-map'));
    expect(await countCosmosFrames(page)).toBeGreaterThan(0);
    await page.locator('#ui-cosmos-detail .primary').click();
    await expect.poll(()=>page.evaluate(()=>game.currentZoneId)).toBe('cosmos_challenge');
    expect(errors).toEqual([]);
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
        switchCosmosInnerTab('atlas');masteryMutations=0;
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
        applyTabHeaderOrder(true); switchMapSubtab('map-tab-underworld'); updateStaticUI();
    });
    expect(await page.evaluate(()=>tabLayoutUi.isMisc('btn-tab-pruning'))).toBe(false);
    await expect(page.locator('.underworld-rune-slot')).toHaveCount(6);
    await page.locator('.underworld-rune-slot.unlocked').first().click();
    await expect(page.locator('.underworld-rune-overlay')).toBeVisible();
    await page.evaluate(()=>document.querySelector('.underworld-rune-overlay').remove());
    for(const light of [false,true]) {
        await page.evaluate(light=>{document.body.classList.toggle('light-mode',light);switchMapSubtab('map-tab-ocean');updateStaticUI()},light);
        await expect(page.getByRole('progressbar',{name:'남은 산소'})).toBeVisible();
        await expect(page.locator('.ocean-upgrade-card')).toHaveCount(3);
        await page.locator('#ui-ocean-panel').getByRole('button',{name:'낚시 · 제작'}).click();
        await expect(page.locator('#map-tab-fishing')).toHaveClass(/active/);
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

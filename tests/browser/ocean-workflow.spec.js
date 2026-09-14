const {test,expect}=require('@playwright/test');

async function openOcean(page) {
    await page.route('https://**',route=>route.fulfill({status:204,body:''}));
    await page.goto('/');await page.locator('#btn-startup-guest').click();
    await page.locator('[data-class-id="warrior"]').click();
    await page.waitForFunction(()=>battleAssets.ready&&!uiRefreshRunning&&!uiRefreshQueued);
    await page.evaluate(()=>{
        clearInterval(gameTickHandle);gameTickHandle=null;game.combatHalted=true;
        game.season=50;game.level=100;game.maxZoneId=29;
        game.seenTutorials.push(...Object.keys(TUTORIAL_GUIDES));
        game.seenTutorials.push(...STORY_JOURNAL_SCENES.map(scene=>'story_'+scene.id));
        game.contentProgression.inherited=CONTENT_UNLOCK_CATALOG.map(row=>row.id);contentProgression.sync();
        game.ocean=createDefaultOceanState();game.ocean.unlocked=true;
        Object.assign(game.currencies,{skyEssence:6,oceanRerollShard:1,reefFragment:2});
        reconcileMapPrimaryContentUnlocks(game);switchTab('tab-map');switchMapSubtab('map-tab-ocean');performUpdateStaticUI();
    });
    await page.waitForFunction(()=>{
        if(uiRefreshQueued||uiRefreshRunning)return false;
        tutorialQueue.length=0;if(activeTutorial)dismissTutorial(false);return true;
    });
}

test('first fish appears in the collection and crafting preserves discovery',async({page},info)=>{
    await openOcean(page);
    await page.getByRole('button',{name:'잠수 시작 · 0m',exact:true}).click();
    await page.evaluate(()=>{
        for(let clear=0;clear<5;clear++)finishEncounterRun();
        forceSurfaceOcean('manual');
    });
    await page.getByRole('button',{name:'낚시 · 제작',exact:true}).click();
    await expect(page.locator('.ocean-last-catch')).toContainText('은빛 비늘치');
    if(info.project.use.isMobile)await page.getByRole('tab',{name:'도감',exact:true}).click();
    else await page.locator('#fishing-collection > summary').click();
    const fish=page.locator('.ocean-fish-card').filter({hasText:'은빛 비늘치'});
    await expect(fish.locator('.ocean-fish-count b')).toHaveText('1');
    await expect(fish).toContainText('누적 1');
    await page.evaluate(()=>{
        enterOceanDive();
        for(let clear=0;clear<20;clear++)finishEncounterRun();
        forceSurfaceOcean('manual');renderFishingPanel();renderSeaGiftPanel();
    });
    if(info.project.use.isMobile)await page.getByRole('tab',{name:'제작',exact:true}).click();
    const craft=page.locator('[data-sea-recipe="reefBundle"] button');
    await expect(craft).toBeEnabled();
    const reefBefore=await page.evaluate(()=>game.currencies.reefFragment||0);
    await craft.click();await expect(craft).toBeDisabled();
    expect(await page.evaluate(()=>game.currencies.reefFragment)).toBe(reefBefore+2);
    if(info.project.use.isMobile)await page.getByRole('tab',{name:'도감',exact:true}).click();
    await expect(fish.locator('.ocean-fish-count b')).toHaveText('0');
    await expect(fish).toContainText('누적 5');
    await page.screenshot({path:info.outputPath('caught-and-crafted.png'),scale:'css'});
});

test('collection puts caught fish first and keeps reward controls stable during refresh',async({page},info)=>{
    await openOcean(page);
    await page.getByRole('button',{name:'낚시 · 제작',exact:true}).click();
    if(info.project.use.isMobile)await page.getByRole('tab',{name:'도감',exact:true}).click();
    else await page.locator('#fishing-collection > summary').click();
    const panel=page.locator('#ui-fishing-collection');
    await expect(panel.locator('.ocean-collection-empty')).toBeVisible();
    const rewards=panel.locator('[data-collection="rewards"]');
    const unknown=panel.locator('[data-collection="unknown"]');
    await expect(unknown.locator('.ocean-fish-grid')).toBeHidden();
    await page.evaluate(()=>{
        game.ocean.fishStock={shallowSilverfin:0,tidalEel:1};
        game.ocean.fishCaughtTotal={shallowSilverfin:5,tidalEel:1};
        game.ocean.lastCatch={key:'tidalEel',at:Date.now(),guaranteed:false};renderFishingPanel();
    });
    await expect(panel.locator(':scope > .ocean-fish-grid .ocean-fish-card').first()).toContainText('조류 장어');
    await expect(rewards.locator('summary')).toContainText('1개 수령 가능');
    const first=await panel.locator(':scope > .ocean-fish-grid').boundingBox();
    const rewardBox=await rewards.boundingBox();expect(first.y+first.height).toBeLessThanOrEqual(rewardBox.y);
    await rewards.locator('summary').click();
    const claim=rewards.getByRole('button',{name:'보상 받기',exact:true});await claim.focus();
    expect(await claim.evaluate(el=>{
        game.ocean.fishStock.tidalEel++;renderFishingPanel();
        return el.isConnected&&document.activeElement===el;
    })).toBe(true);
    const reef=await page.evaluate(()=>game.currencies.reefFragment||0);
    await claim.click();
    await expect(rewards).toHaveAttribute('open');
    expect(await page.evaluate(()=>game.currencies.reefFragment)).toBe(reef+4);
    await expect(rewards.getByRole('button',{name:'완료',exact:true})).toBeDisabled();
    await page.evaluate(()=>{renderFishingPanel();claimOceanFishCollectionMilestone(2);});
    expect(await page.evaluate(()=>game.currencies.reefFragment)).toBe(reef+4);
    await unknown.locator('summary').click();
    await expect(unknown.locator('.ocean-fish-card')).toHaveCount(6);
    await page.evaluate(()=>renderFishingPanel());await expect(unknown).toHaveAttribute('open');
    await unknown.locator('summary').click();await rewards.locator('summary').click();
    await panel.scrollIntoViewIfNeeded();
    await page.screenshot({path:info.outputPath('collection-overview.png'),scale:'css'});
});

test('ocean live refresh keeps focused entry and fishing strategies connected',async({page})=>{
    await openOcean(page);
    const entry=page.getByRole('button',{name:'잠수 시작 · 0m',exact:true});await entry.focus();
    expect(await entry.evaluate(el=>{
        game.currencies.skyEssence++;renderOceanDepthMapPanel();
        return el.isConnected&&document.activeElement===el;
    })).toBe(true);
    await page.getByRole('button',{name:'낚시 · 제작',exact:true}).click();
    const strategy=page.locator('.ocean-strategy-card').filter({hasText:'어군 추적'});await strategy.focus();
    expect(await strategy.evaluate(el=>{
        game.ocean.fishingGauge++;renderFishingPanel();
        return el.isConnected&&document.activeElement===el;
    })).toBe(true);
    await strategy.click();expect(await page.evaluate(()=>game.ocean.fishingStrategy)).toBe('shoal');
});

test('ocean upgrade shows actual owned costs and spends exactly once',async({page},info)=>{
    await openOcean(page);
    const panel=page.locator('#ui-ocean-panel');
    await expect(panel.locator('.ocean-upgrade-cost').first()).toContainText('심해의 파편 1 / 1');
    await page.getByRole('button',{name:'산소 최대치 강화',exact:true}).click();
    expect(await page.evaluate(()=>[game.currencies.skyEssence,game.currencies.oceanRerollShard,game.currencies.reefFragment,game.ocean.permanentUpgrades.oxygenMax]))
        .toEqual([0,0,0,1]);
    await expect(page.getByRole('button',{name:'산소 최대치 강화',exact:true})).toBeDisabled();
    for(const light of [false,true]) {
        await page.evaluate(light=>applyThemeMode(light?'light':'dark'),light);
        await panel.scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath(`ocean-${light?'light':'dark'}.png`),scale:'css'});
        expect(await panel.evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(2);
    }
});

test('locked travel and repeated dive cannot reset oxygen or overwrite an encounter',async({page})=>{
    await openOcean(page);
    for(const mode of ['loop','boundary','hive']) {
        const result=await page.evaluate(mode=>{
            if(mode==='loop')game.pendingLoopReady=true;
            else if(mode==='boundary')game.beyondBoundary.activeRun={wave:1};
            else {game.currentZoneId=8;game.currencies.hiveKey=1;startBeehiveRun();}
            const before=JSON.stringify({ocean:game.ocean,zone:game.currentZoneId,hive:game.beehive});
            const entered=enterOceanDive();
            return {entered,unchanged:before===JSON.stringify({ocean:game.ocean,zone:game.currentZoneId,hive:game.beehive})};
        },mode);
        expect(result).toEqual({entered:false,unchanged:true});
        await page.evaluate(mode=>{
            game.pendingLoopReady=false;game.beyondBoundary.activeRun=null;
            if(mode==='hive'){exitBeehiveRun();closeBeehiveChoiceOverlay();}
        },mode);
    }
    await page.getByRole('button',{name:'잠수 시작 · 0m',exact:true}).click();
    expect(await page.evaluate(()=>{
        game.ocean.oxygenCur=40;enterOceanDive();return game.ocean.oxygenCur;
    })).toBe(40);
});

test('diving strategy stays readable and refined fish pay the named currency',async({page},info)=>{
    await openOcean(page);
    await page.evaluate(()=>{enterOceanDive();switchMapSubtab('map-tab-fishing');renderFishingPanel();});
    const strategy=page.locator('.ocean-strategy-card.selected');
    await expect(strategy).toBeDisabled();await expect(strategy).toContainText('적용 중');
    expect(await strategy.evaluate(el=>Number(getComputedStyle(el).opacity))).toBeGreaterThanOrEqual(.9);
    expect(await strategy.evaluate(el=>getComputedStyle(el).boxShadow)).not.toBe('none');
    await strategy.scrollIntoViewIfNeeded();
    await page.screenshot({path:info.outputPath('fishing-active.png'),scale:'css'});
    await page.evaluate(()=>{
        game.ocean.fishStock.tidalEel=4;game.ocean.fishCaughtTotal.tidalEel=4;renderSeaGiftPanel();
        craftSeaGift('tidalCharm');renderSeaGiftPanel();
    });
    expect(await page.evaluate(()=>[game.ocean.fishStock.tidalEel,game.ocean.fishCaughtTotal.tidalEel,game.currencies.oceanRerollShard]))
        .toEqual([0,4,2]);
    await expect(page.locator('[data-sea-recipe="tidalCharm"]')).toContainText('심해의 파편');
    await expect(page.locator('[data-sea-recipe="tidalCharm"] button')).toBeDisabled();
});

test('sea gift picker, blocked target and successful seal stay consistent',async({page},info)=>{
    await openOcean(page);
    await page.evaluate(()=>{
        game.inventory=[{id:991001,name:'심해 제작 투구',baseName:'심해 제작 투구',slot:'투구',
            rarity:'rare',itemTier:10,hiddenTier:10,baseStats:[],
            stats:[{id:'flatHp',val:100,tier:4}]}];
        game.ocean.fishStock.tidelordKoi=1;game.ocean.fishStock.glowfinTrout=3;
        switchMapSubtab('map-tab-fishing');renderSeaGiftPanel();
    });
    if(info.project.use.isMobile) {
        await page.getByRole('tab',{name:'제작',exact:true}).click();
        await page.getByRole('combobox',{name:'바다의 선물 제작 종류',exact:true}).selectOption('chase');
    }
    await page.locator('#ui-sea-gift-panel').getByRole('button',{name:'인벤토리',exact:true}).click();
    await page.locator('#craft-item-picker-overlay').getByRole('button').filter({hasText:'심해 제작 투구'}).click();
    await expect(page.locator('.ocean-craft-target')).toContainText('심해 제작 투구');
    const group=page.locator('[data-ui-disclosure="sea-gift-chase"]');
    if(!info.project.use.isMobile) await group.locator('summary').click();
    const button=page.locator('[data-sea-recipe="sealOffering"] button');
    for(const mode of ['corrupted','woodsmanBuildLock']) {
        await page.evaluate(mode=>{
            if(mode==='corrupted')game.inventory[0].corrupted=true;
            else {game.inventory[0].corrupted=false;game.woodsmanBuildLock={};}
            renderSeaGiftPanel();
        },mode);
        await expect(button).toBeDisabled();
        await expect(button).toHaveText(mode==='corrupted'?'타락 장비 가공 불가':'세팅 변경 잠김');
    }
    await page.evaluate(()=>{game.woodsmanBuildLock=null;renderSeaGiftPanel();});
    await button.click();
    expect(await page.evaluate(()=>({locked:game.inventory[0].stats[0].lockedByHoney,
        rareFish:game.ocean.fishStock.tidelordKoi,fish:game.ocean.fishStock.glowfinTrout})))
        .toEqual({locked:true,rareFish:0,fish:0});
    await expect(button).toBeDisabled();
    await expect(group).toHaveAttribute('open');
});

const {test,expect}=require('@playwright/test');
test('sea gift option categories survive inventory and resource refreshes',async({page},info)=>{
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.route('https://**',r=>r.fulfill({status:204,body:''}));await page.goto('/');
    await page.locator('#btn-startup-guest').click();await page.locator('[data-class-id="warrior"]').click();
    await page.waitForFunction(()=>battleAssets.ready&&!uiRefreshRunning&&!uiRefreshQueued);
    await page.evaluate(require('../../scripts/lib/offline-endgame-fixture'));
    await page.evaluate(()=>{clearInterval(gameTickHandle);game.contentProgression.inherited=CONTENT_UNLOCK_CATALOG.map(r=>r.id);contentProgression.sync();openTabPane('tab-map');switchMapSubtab('map-tab-fishing');updateStaticUI();});
    await page.waitForFunction(()=>{if(uiRefreshRunning||uiRefreshQueued)return false;tutorialQueue.length=0;if(activeTutorial)dismissTutorial(false);return true;});
    await page.evaluate(()=>{switchMapSubtab('map-tab-fishing');updateStaticUI();});
    await page.waitForFunction(()=>!uiRefreshRunning&&!uiRefreshQueued);
    if(info.project.use.isMobile)await page.getByRole('tab',{name:'제작',exact:true}).click();
    const groups=page.getByRole('combobox',{name:'바다의 선물 제작 종류',exact:true});
    if(info.project.use.isMobile){
        await expect(page.locator('.ocean-craft-target')).toBeHidden();
        await groups.selectOption('forge');
        await expect(page.locator('.ocean-craft-target')).toBeVisible();
    }
    const category=page.locator('#ui-sea-gift-panel select.ocean-recipe-select').first();
    await category.selectOption('저항');
    await category.evaluate(el=>window.originalSeaCategory=el);
    await page.evaluate(()=>{game.ocean.fishStock[Object.keys(OCEAN_FISH_DB)[0]]+=1;updateStaticUI();});
    await page.waitForFunction(()=>!uiRefreshRunning&&!uiRefreshQueued);
    await expect(category).toHaveValue('저항');
    expect(await category.evaluate(el=>el===window.originalSeaCategory)).toBe(true);
    await page.evaluate(()=>{
        const observer=new MutationObserver(()=>{});
        observer.observe(document.getElementById('ui-sea-gift-panel'),{childList:true,subtree:true,attributes:true});
        for(let i=0;i<10;i++)renderSeaGiftPanel();
        window.unchangedSeaGiftMutations=observer.takeRecords().length;observer.disconnect();
    });
    expect(await page.evaluate(()=>unchangedSeaGiftMutations)).toBe(0);
    await page.evaluate(()=>renderSeaGiftPanel());
    await expect(category).toHaveValue('저항');
    const recipe=await page.evaluate(()=>{
        const row=SEA_GIFT_RECIPES.find(r=>!SEA_GIFT_ITEM_EFFECT_TYPES.has(r.effect.type));
        for(const [key,cost] of Object.entries(row.requires))game.ocean.fishStock[key]=cost;
        updateStaticUI();return {id:row.id,keys:Object.keys(row.requires)};
    });
    const craft=page.locator(`[data-sea-recipe="${recipe.id}"] button`);
    if(info.project.use.isMobile)await groups.selectOption('supply');
    await expect(craft).toBeEnabled();await craft.click();
    await expect.poll(()=>page.evaluate(keys=>keys.every(key=>game.ocean.fishStock[key]===0),recipe.keys)).toBe(true);
    await expect(craft).toBeDisabled();
    expect(await category.evaluate(el=>el===window.originalSeaCategory)).toBe(true);
    if(info.project.use.isMobile){
        await groups.selectOption('chase');
        await expect(page.locator('[data-ui-disclosure="sea-gift-chase"] .ocean-recipe-list')).toBeVisible();
        await expect(page.locator('[data-ui-disclosure="sea-gift-supply"]')).toBeHidden();
        await groups.selectOption('forge');await expect(category).toHaveValue('저항');
    }
    expect(errors).toEqual([]);
    await page.screenshot({path:info.outputPath('sea-gift-workshop.png'),scale:'css'});
});

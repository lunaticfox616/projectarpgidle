const {test,expect}=require('@playwright/test');

test('craft target libraries render only when open and refresh after inventory changes',async({page},info)=>{
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.route('https://**',r=>r.fulfill({status:204,body:''}));
    await page.goto('/');await page.locator('#btn-startup-guest').click();await page.locator('[data-class-id="warrior"]').click();
    await page.waitForFunction(()=>battleAssets.ready&&!uiRefreshRunning&&!uiRefreshQueued);
    await page.evaluate(()=>{
        clearInterval(gameTickHandle);gameTickHandle=null;game.season=100;
        game.contentProgression.inherited=CONTENT_UNLOCK_CATALOG.map(r=>r.id);contentProgression.sync();
        game.inventory=Array.from({length:3},(_,i)=>({...createItemFromBase(BASE_ITEM_DB.find(b=>b.id==='war_helm'),'normal',1),id:71000+i}));
        openTabPane('tab-items');switchItemSubtab('item-tab-equip');updateStaticUI();
    });
    await page.waitForFunction(()=>{if(uiRefreshRunning||uiRefreshQueued)return false;tutorialQueue.length=0;if(activeTutorial)dismissTutorial(false);return true;});
    const craft=page.locator('#ui-craft-inventory-list');
    await page.evaluate(()=>{
        window.hiddenCraftChanges=0;
        for(const id of ['ui-fossil-actions','ui-chaos-infuser-panel'])new MutationObserver(rows=>hiddenCraftChanges+=rows.length).observe(document.getElementById(id),{childList:true,subtree:true});
        game.currencies.fossilBound=1;game.chaosInfuserUnlocked=true;updateStaticUI();
    });
    await page.waitForFunction(()=>!uiRefreshRunning&&!uiRefreshQueued);
    expect(await page.evaluate(()=>hiddenCraftChanges)).toBe(0);
    await expect(craft.locator(':scope > *')).toHaveCount(0);
    await expect(page.locator('#ui-fossil-inventory-list > *')).toHaveCount(0);
    await expect(page.locator('#ui-infuser-inventory-list > *')).toHaveCount(0);
    await page.locator('#btn-item-tab-craft').click();
    await expect(craft.locator(':scope > *')).toHaveCount(0);
    const summary=page.locator('.craft-target-library > summary');
    await summary.click();
    await expect(craft.locator(':scope > *')).toHaveCount(3);
    await summary.click();
    await page.evaluate(()=>{
        window.craftMutationCount=0;
        new MutationObserver(rows=>window.craftMutationCount+=rows.length).observe(document.getElementById('ui-craft-inventory-list'),{childList:true,subtree:true});
        game.inventory.splice(0,2);updateStaticUI();
    });
    await page.waitForFunction(()=>!uiRefreshRunning&&!uiRefreshQueued);
    expect(await page.evaluate(()=>window.craftMutationCount)).toBe(0);
    await summary.click();
    await expect(craft.locator(':scope > *')).toHaveCount(1);
    await craft.locator(':scope > *').click();
    expect(await page.evaluate(()=>getSelectedCraftItem().id)).toBe(71002);
    await expect(page.locator('#ui-fossil-inventory-list > *')).toHaveCount(0);
    await expect(page.locator('#ui-infuser-inventory-list > *')).toHaveCount(0);
    expect(errors).toEqual([]);
    await page.locator('#btn-item-tab-fossil').click();
    await page.evaluate(()=>{game.currencies.fossilBound=1;game.currencies.fossil=2;updateStaticUI();});
    const recipe=page.locator('.fossil-recipe');
    await expect(recipe).toContainText('생명');
    await recipe.getByRole('button').click();
    await expect.poll(()=>page.evaluate(()=>game.currencies.fossilBound)).toBe(0);
    await expect(page.locator('#ui-fossil-actions')).toContainText('보유 중인 타입 화석이 없습니다');
    if(info.project.use.isMobile){
        await page.getByRole('tab',{name:'재료 정제 · 복원',exact:true}).click();
        await expect(page.locator('#fossil-reroll')).toBeHidden();
    }
    await page.locator('#ui-fossil-material-actions').getByRole('button',{name:/기본 화석 정제/}).click();
    await page.getByRole('spinbutton').fill('1');
    await page.getByRole('button',{name:'정제',exact:true}).click();
    await expect.poll(()=>page.evaluate(()=>game.currencies.fossil)).toBe(1);
    if(info.project.use.isMobile)await page.getByRole('tab',{name:'장비 재련',exact:true}).click();
    await expect(page.locator('#ui-fossil-inventory-list > *')).toHaveCount(0);
    await page.locator('#item-tab-fossil > details > summary').click();
    await expect(page.locator('#ui-fossil-inventory-list > *')).toHaveCount(1);
    await expect(page.locator('#ui-infuser-inventory-list > *')).toHaveCount(0);
    expect(errors).toEqual([]);
    await page.evaluate(()=>{game.chaosInfuserUnlocked=true;updateStaticUI();});
    for (const kind of ['fossil','infuser']) {
        await page.locator('#btn-item-tab-'+kind).click();
        await page.locator('#item-tab-'+kind).getByRole('button',{name:'인벤토리 검색',exact:true}).click();
        await expect(page.locator('#craft-item-picker-overlay')).toBeVisible();
        await page.locator('#craft-item-picker-overlay .craft-picker-card').first().click();
        await expect(page.locator('#craft-item-picker-overlay')).toHaveCount(0);
        await expect(page.locator('#item-tab-'+kind)).toBeVisible();
        expect(await page.evaluate(()=>getSelectedCraftItem().id)).toBe(71002);
    }
    await expect(page.locator('#ui-infuser-inventory-list > *')).toHaveCount(0);
    await page.locator('#item-tab-infuser > details > summary').click();
    await expect(page.locator('#ui-infuser-inventory-list > *')).toHaveCount(1);
    expect(errors).toEqual([]);
});

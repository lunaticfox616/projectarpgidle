const {test,expect}=require('@playwright/test');

test('craft target libraries render only when open and refresh after inventory changes',async({page})=>{
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
    await expect(page.locator('#ui-fossil-inventory-list > *')).toHaveCount(1);
    await expect(page.locator('#ui-infuser-inventory-list > *')).toHaveCount(0);
    expect(errors).toEqual([]);
});

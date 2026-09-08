const {test,expect}=require('@playwright/test');
test('craft picker searches the entire inventory and selects the correct item after paging',async({page},info)=>{
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.route('https://**',r=>r.fulfill({status:204,body:''}));
    await page.goto('/');await page.locator('#btn-startup-guest').click();await page.locator('[data-class-id="warrior"]').click();
    await page.waitForFunction(()=>battleAssets.ready&&!uiRefreshRunning&&!uiRefreshQueued);
    await page.evaluate(()=>{
        clearInterval(gameTickHandle);gameTickHandle=null;game.season=100;
        game.contentProgression.inherited=CONTENT_UNLOCK_CATALOG.map(r=>r.id);contentProgression.sync();
        game.inventory=Array.from({length:20},(_,i)=>({...createItemFromBase(BASE_ITEM_DB.find(b=>b.id==='war_helm'),'normal',1),id:76000+i,name:'제작 투구 '+i}));
        game.inventory[19].stats=[{id:'str',statName:'테스트 특수옵션',val:5}];
        openTabPane('tab-items');switchItemSubtab('item-tab-craft');updateStaticUI();
    });
    await page.waitForFunction(()=>{if(uiRefreshRunning||uiRefreshQueued)return false;tutorialQueue.length=0;if(activeTutorial)dismissTutorial(false);return true;});
    await page.locator('#forge-item-display').getByRole('button',{name:'인벤토리',exact:true}).click();
    const picker=page.locator('#craft-item-picker-overlay');
    const cards=picker.locator('.craft-picker-card');
    await expect(cards).toHaveCount(info.project.use.isMobile?6:20);
    if(info.project.use.isMobile){
        await picker.getByRole('button',{name:'다음',exact:true}).click();
        await expect(picker.locator('.craft-picker-pages')).toContainText('2 / 4');
        const search=picker.getByRole('searchbox');
        await search.fill('없는대상');await picker.getByRole('button',{name:'검색',exact:true}).click();
        await expect(cards).toHaveCount(0);
        await search.fill('특수옵션');await picker.getByRole('button',{name:'검색',exact:true}).click();
        await expect(cards).toHaveCount(1);
        await expect(cards).toContainText('제작 투구 19');
        await expect(picker.locator('.craft-picker-pages')).toContainText('1 / 1');
    }
    await cards.filter({hasText:'제작 투구 19'}).click();
    await expect(picker).toHaveCount(0);
    expect(await page.evaluate(()=>getSelectedCraftItem().id)).toBe(76019);
    expect(await page.evaluate(()=>game.inventory.length)).toBe(20);
    expect(errors).toEqual([]);
});

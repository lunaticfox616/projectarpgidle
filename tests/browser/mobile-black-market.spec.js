const {test,expect}=require('@playwright/test');
test('black market paging and filters preserve original purchase and lock indices',async({page},info)=>{
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.route('https://**',r=>r.fulfill({status:204,body:''}));
    await page.goto('/');await page.locator('#btn-startup-guest').click();await page.locator('[data-class-id="warrior"]').click();
    await page.waitForFunction(()=>battleAssets.ready&&!uiRefreshRunning&&!uiRefreshQueued);
    await page.evaluate(()=>{
        clearInterval(gameTickHandle);gameTickHandle=null;game.season=2;contentProgression.sync();contentProgression.purchase('craft');
        game.currencies.formlessDew=1000;game.currencies.magicBud=0;
        const bm=normalizeBlackMarketState();bm.extraSlots=44;bm.nextRefreshAt=Date.now()+600000;bm.lockedOffers={};
        bm.offers=Array.from({length:50},(_,i)=>({type:'exchange',from:'formlessDew',to:'magicBud',need:1,gain:i+1}));
        openTabPane('tab-items');switchItemSubtab('item-tab-market');marketUi.show('black');updateStaticUI();
    });
    await page.waitForFunction(()=>{if(uiRefreshRunning||uiRefreshQueued)return false;tutorialQueue.length=0;if(activeTutorial)dismissTutorial(false);return true;});
    const cards=page.locator('.market-black-offer');
    await expect(cards).toHaveCount(info.project.use.isMobile?6:50);
    if(info.project.use.isMobile){
        await page.setViewportSize({width:915,height:412});
        expect(await page.locator('#market-panel-black').evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(1);
        await page.setViewportSize({width:412,height:915});
        const next=page.locator('#ui-market-black .market-black-pages').getByRole('button',{name:'다음',exact:true});
        await next.click();await next.click();
        await expect(page.locator('#market-black-navigation .market-black-pages')).toContainText('3 / 9');
    }
    let target=cards.filter({hasText:'마법의 새싹 13개'});
    await target.getByRole('button',{name:'품목 잠금',exact:true}).click();
    expect(await page.evaluate(()=>game.blackMarket.lockedOffers[12])).toBe(true);
    if(info.project.use.isMobile){
        await page.getByRole('combobox',{name:'암거래상 품목 보기'}).selectOption('locked');
        await expect(cards).toHaveCount(1);
    }
    await target.getByRole('button',{name:'구매',exact:true}).click();
    await expect.poll(()=>page.evaluate(()=>game.currencies.magicBud)).toBe(13);
    expect(await page.evaluate(()=>game.currencies.formlessDew)).toBe(999);
    expect(await page.evaluate(()=>game.blackMarket.offers[12])).toBeNull();
    expect(await page.evaluate(()=>game.blackMarket.offers[0].gain)).toBe(1);
    if(info.project.use.isMobile){
        await expect(cards).toHaveCount(0);
        await page.evaluate(()=>{game.currencies.formlessDew=0;renderMarketUI();});
        await page.getByRole('combobox',{name:'암거래상 품목 보기'}).selectOption('available');
        await expect(cards).toHaveCount(0);
        await expect(page.locator('#ui-market-black')).toContainText('조건에 맞는 품목이 없습니다');
    }
    expect(errors).toEqual([]);
});

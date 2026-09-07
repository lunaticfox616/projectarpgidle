const {test,expect}=require('@playwright/test');
test('jewel pages search the full inventory and keep original item actions',async({page},info)=>{
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.route('https://**',r=>r.fulfill({status:204,body:''}));
    await page.goto('/');await page.locator('#btn-startup-guest').click();await page.locator('[data-class-id="warrior"]').click();
    await page.waitForFunction(()=>battleAssets.ready&&!uiRefreshRunning&&!uiRefreshQueued);
    await page.evaluate(()=>{
        clearInterval(gameTickHandle);gameTickHandle=null;game.season=20;contentProgression.sync();
        game.contentProgression.inherited.push('jewel');contentProgression.sync();
        game.jewelInventory=Array.from({length:60},(_,i)=>({id:1000+i,name:`보석-${i}`,rarity:'normal',stats:[]}));
        game.jewelInventory[59].stats=[{id:'crit',val:3,tier:1}];game.jewelSlots=[null,null];
        openTabPane('tab-jewel');updateStaticUI();
    });
    await page.waitForFunction(()=>{if(uiRefreshRunning||uiRefreshQueued)return false;tutorialQueue.length=0;if(activeTutorial)dismissTutorial(false);return true;});
    const cards=page.locator('.jewel-inventory-card');
    const top=page.getByRole('navigation',{name:'주얼 목록 페이지',exact:true});
    const bottom=page.getByRole('navigation',{name:'주얼 목록 하단 페이지',exact:true});
    await expect(cards).toHaveCount(info.project.use.isMobile?6:60);
    if(info.project.use.isMobile){
        await expect(top.getByRole('button',{name:'이전'})).toBeDisabled();
        await bottom.getByRole('button',{name:'다음'}).click();
        await expect(top).toContainText('2 / 10');
        await cards.filter({hasText:'보석-7'}).getByRole('button',{name:'융합선택',exact:true}).click();
        expect(await page.evaluate(()=>jewelFusionSelection)).toEqual([7]);
        await expect(page.locator('#ui-jewel-library')).toBeVisible();
        await top.getByRole('button',{name:'이전'}).click();
        await bottom.getByRole('button',{name:'다음'}).click();
        await expect(cards.filter({hasText:'보석-7'})).toHaveClass(/selected/);
    }else await expect(top).toBeHidden();
    const search=page.locator('input[data-search-key="jewel"]');
    await search.fill('crit');await expect(cards).toHaveCount(1);await expect(cards).toContainText('보석-59');
    await cards.getByRole('button',{name:'슬롯1',exact:true}).click();
    await expect.poll(()=>page.evaluate(()=>game.jewelSlots[0]?.id)).toBe(1059);
    await expect(cards).toHaveCount(0);await expect(page.locator('#ui-jewel-inventory')).toContainText('검색 조건에 맞는 주얼이 없습니다');
    expect(await page.evaluate(()=>game.jewelInventory[0].id)).toBe(1000);
    await search.fill('');await expect(cards).toHaveCount(info.project.use.isMobile?6:59);
    if(info.project.use.isMobile){
        await expect(top).toContainText('1 / 10');
        for(let i=0;i<9;i++)await top.getByRole('button',{name:'다음'}).click();
        await expect(top.getByRole('button',{name:'다음'})).toBeDisabled();await expect(cards).toHaveCount(5);
    }
    await page.evaluate(()=>{game.jewelInventory=game.jewelInventory.slice(0,7);updateStaticUI();});
    await expect(cards).toHaveCount(info.project.use.isMobile?1:7);
    if(info.project.use.isMobile)await expect(top).toContainText('2 / 2');
    await search.fill('없는보석');await expect(cards).toHaveCount(0);
    await expect(page.locator('#ui-jewel-inventory')).toContainText('검색 조건에 맞는 주얼이 없습니다');
    await page.evaluate(()=>{game.jewelInventory=[];updateStaticUI();});
    await expect(page.locator('#ui-jewel-inventory')).toContainText('주얼 인벤토리가 비었습니다');
    expect(errors).toEqual([]);
});

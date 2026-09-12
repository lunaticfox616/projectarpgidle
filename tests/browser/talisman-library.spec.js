const {test,expect}=require('@playwright/test');
test('talisman pages retain identity through rotation, full search and board placement',async({page},info)=>{
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.route('https://**',r=>r.fulfill({status:204,body:''}));
    await page.goto('/');await page.locator('#btn-startup-guest').click();await page.locator('[data-class-id="warrior"]').click();
    await page.waitForFunction(()=>battleAssets.ready&&!uiRefreshRunning&&!uiRefreshQueued);
    await page.evaluate(()=>{
        clearInterval(gameTickHandle);gameTickHandle=null;game.season=20;contentProgression.sync();
        game.contentProgression.inherited.push('talisman','jewel');contentProgression.sync();
        game.talismanInventory=Array.from({length:20},(_,i)=>({id:100+i,name:`검증 부적 ${i}`,shape:'DASH2',rarity:'일반',source:'sealShard',cells:[{x:0,y:0},{x:1,y:0}],stat:'crit',statName:'치명타 확률',value:i+1}));
        game.talismanBoard=Array(64).fill(null);game.talismanPlacements={};
        openTabPane('tab-talisman');updateStaticUI();
    });
    // This returning-player fixture has already read map notices unlocked by its forced loop.
    await page.evaluate(()=>game.seenTutorials.push(...MAP_PRIMARY_CONTENTS.map(row=>row.noticeKey).filter(Boolean)));
    await page.waitForFunction(()=>{if(uiRefreshRunning||uiRefreshQueued)return false;tutorialQueue.length=0;if(activeTutorial)dismissTutorial(false);return true;});
    const navigation=page.getByRole('tablist',{name:'부적 작업'});
    if(info.project.use.isMobile)await navigation.getByRole('tab',{name:'보관함',exact:true}).click();
    const cards=page.locator('.talisman-inventory-card');
    const top=page.getByRole('navigation',{name:'부적 목록 페이지',exact:true});
    await expect(cards).toHaveCount(info.project.use.isMobile?6:20);
    if(info.project.use.isMobile){
        await page.getByRole('navigation',{name:'부적 목록 하단 페이지'}).getByRole('button',{name:'다음'}).click();
        await expect(top).toContainText('2 / 4');
    }else await expect(top).toBeHidden();
    await cards.filter({hasText:'검증 부적 7'}).getByRole('button',{name:'회전',exact:true}).click();
    expect(await page.evaluate(()=>game.talismanInventory[7].cells)).toEqual([{x:0,y:0},{x:0,y:1}]);
    expect(await page.evaluate(()=>game.talismanInventory[0].cells)).toEqual([{x:0,y:0},{x:1,y:0}]);
    const search=page.locator('input[data-search-key="talisman"]');
    await search.fill('검증 부적 19');await expect(cards).toHaveCount(1);
    await cards.locator('.item-title').click();
    await page.locator('[data-talisman-x="3"][data-talisman-y="3"]').click();
    if(info.project.use.isMobile)await page.getByRole('button',{name:'이 위치에 배치',exact:true}).click();
    await expect.poll(()=>page.evaluate(()=>!!game.talismanPlacements[119])).toBe(true);
    if(info.project.use.isMobile)await navigation.getByRole('tab',{name:'보관함',exact:true}).click();
    await expect(cards).toHaveCount(0);await expect(page.locator('#ui-talisman-inventory')).toContainText('검색 조건에 맞는 부적이 없습니다');
    await search.fill('');await expect(cards).toHaveCount(info.project.use.isMobile?6:19);
    if(info.project.use.isMobile){
        await expect(top).toContainText('1 / 4');
        for(let i=0;i<3;i++)await top.getByRole('button',{name:'다음'}).click();
        await expect(top.getByRole('button',{name:'다음'})).toBeDisabled();await expect(cards).toHaveCount(1);
    }
    await page.evaluate(()=>{game.talismanInventory=game.talismanInventory.slice(0,7);updateStaticUI();});
    await expect(cards).toHaveCount(info.project.use.isMobile?1:7);
    if(info.project.use.isMobile)await expect(top).toContainText('2 / 2');
    await page.evaluate(()=>{game.talismanInventory=[];updateStaticUI();});
    await expect(cards).toHaveCount(0);await expect(page.locator('#ui-talisman-inventory')).toContainText('보유한 부적이 없습니다');
    expect(errors).toEqual([]);
});

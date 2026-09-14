const {test,expect}=require('@playwright/test');
test('jewel selection and fusion follow materials after equipment swaps and reordering',async({page},info)=>{
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.route('https://**',r=>r.fulfill({status:204,body:''}));
    await page.goto('/');await page.locator('#btn-startup-guest').click();await page.locator('[data-class-id="warrior"]').click();
    await page.waitForFunction(()=>battleAssets.ready&&!uiRefreshRunning&&!uiRefreshQueued);
    await page.evaluate(()=>{
        clearInterval(gameTickHandle);gameTickHandle=null;game.season=20;contentProgression.sync();
        game.contentProgression.inherited.push('jewel');contentProgression.sync();
        game.jewelInventory=['A','B','C','D'].map((name,id)=>({id,name:`선택 ${name}`,rarity:'magic',stats:[{id:'crit',val:2,tier:1}]}));
        game.jewelSlots=[null,null];game.currencies.jewelShard=20;
        announceMapPrimaryContentUnlocks();openTabPane('tab-jewel');updateStaticUI();
    });
    // This returning-player fixture has already read map notices unlocked by its forced loop.
    await page.evaluate(()=>game.seenTutorials.push(...MAP_PRIMARY_CONTENTS.map(row=>row.noticeKey).filter(Boolean)));
    await page.waitForFunction(()=>{if(uiRefreshRunning||uiRefreshQueued)return false;tutorialQueue.length=0;if(activeTutorial)dismissTutorial(false);return true;});
    const card=name=>page.locator('.jewel-inventory-card').filter({hasText:`선택 ${name}`});
    for(const name of ['B','D'])await card(name).getByRole('button',{name:'융합선택',exact:true}).click();
    await card('A').getByRole('button',{name:'슬롯1',exact:true}).click();
    await expect(card('B')).toHaveClass(/selected/);await expect(card('D')).toHaveClass(/selected/);
    await expect(card('C')).not.toHaveClass(/selected/);
    await card('B').getByRole('button',{name:'슬롯1',exact:true}).click();
    await expect(card('A')).not.toHaveClass(/selected/);await expect(card('D')).toHaveClass(/selected/);
    await card('C').getByRole('button',{name:'융합선택',exact:true}).click();
    if(info.project.use.isMobile){
        await page.getByRole('tab',{name:'제작 · 증폭',exact:true}).click();
        await page.locator('#jewel-craft-mode').selectOption('fusion');
    }
    await page.getByRole('button',{name:/선택한 주얼 융합/}).click();
    await expect(page.locator('#jewel-fusion-overlay')).toContainText('선택 C');
    await page.evaluate(()=>{game.jewelInventory.reverse();updateStaticUI();});
    await page.locator('#jewel-fusion-overlay').getByRole('button',{name:'융합',exact:true}).click();
    await expect.poll(()=>page.evaluate(()=>game.currencies.jewelShard)).toBe(14);
    expect(await page.evaluate(()=>game.jewelInventory.filter(j=>['선택 C','선택 D'].includes(j.name)).length)).toBe(0);
    expect(await page.evaluate(()=>game.jewelInventory.some(j=>j.name==='선택 A'))).toBe(true);
    expect(await page.evaluate(()=>game.jewelSlots[0].name)).toBe('선택 B');
    await page.evaluate(()=>{
        game.jewelInventory=['E','F','G'].map((name,id)=>({id:10+id,name,rarity:'magic',stats:[{id:'crit',val:2,tier:1}]}));
        game.currencies.voidChisel=1;openVoidJewelOverlay('craft',[1,2]);equipJewel(1,0);
    });
    expect(await page.evaluate(()=>getVoidJewelOverlaySelectedIndices('craft').map(i=>game.jewelInventory[i].name))).toEqual(['G']);
    await page.evaluate(()=>confirmVoidJewelCraft());
    expect(await page.evaluate(()=>game.currencies.voidChisel)).toBe(1);
    expect(await page.evaluate(()=>game.jewelInventory.map(j=>j.name))).toEqual(['E','선택 B','G']);
    expect(errors).toEqual([]);
});

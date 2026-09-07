const {test,expect}=require('@playwright/test');
test('touch talisman board previews rotation, placement, removal and unlock before committing',async({page},info)=>{
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.route('https://**',r=>r.fulfill({status:204,body:''}));
    await page.goto('/');await page.locator('#btn-startup-guest').click();await page.locator('[data-class-id="warrior"]').click();
    await page.waitForFunction(()=>battleAssets.ready&&!uiRefreshRunning&&!uiRefreshQueued);
    await page.evaluate(()=>{
        clearInterval(gameTickHandle);gameTickHandle=null;game.season=20;contentProgression.sync();
        game.contentProgression.inherited.push('talisman');contentProgression.sync();
        game.talismanInventory=[{...rollTalismanCandidate('sealShard'),id:5001,cells:[{x:0,y:0},{x:1,y:0}]}];
        game.talismanBoard=Array(64).fill(null);game.talismanPlacements={};game.currencies.sealShard=1000;
        openTabPane('tab-talisman');updateStaticUI();
    });
    await page.waitForFunction(()=>{if(uiRefreshRunning||uiRefreshQueued)return false;tutorialQueue.length=0;if(activeTutorial)dismissTutorial(false);return true;});
    await page.locator('.talisman-inventory-card').click();
    const cell=page.locator('[data-talisman-x="3"][data-talisman-y="3"]');
    const inspector=page.locator('#talisman-mobile-inspector');
    await cell.click();
    if(info.project.use.isMobile){
        expect(await page.evaluate(()=>game.talismanInventory.length)).toBe(1);
        await expect(inspector.getByRole('button',{name:'이 위치에 배치'})).toBeEnabled();
        await expect(page.locator('.talisman-mobile-footprint')).toHaveCount(2);
        const before=await page.evaluate(()=>JSON.stringify(game.talismanInventory[0].cells));
        await inspector.getByRole('button',{name:'회전',exact:true}).click();
        await expect.poll(()=>page.evaluate(()=>JSON.stringify(game.talismanInventory[0].cells))).not.toBe(before);
        await expect(page.locator('.talisman-mobile-footprint')).toHaveCount(2);
        await inspector.getByRole('button',{name:'이 위치에 배치'}).click();
    }else await expect(inspector).toBeHidden();
    await expect.poll(()=>page.evaluate(()=>game.talismanInventory.length)).toBe(0);
    expect(await page.evaluate(()=>game.talismanBoard.filter(Boolean).length)).toBe(2);
    await cell.click();
    if(info.project.use.isMobile){
        expect(await page.evaluate(()=>game.talismanInventory.length)).toBe(0);
        await inspector.getByRole('button',{name:'취소',exact:true}).click();
        expect(await page.evaluate(()=>game.talismanBoard.filter(Boolean).length)).toBe(2);
        await cell.click();await inspector.getByRole('button',{name:'부적 회수',exact:true}).click();
    }
    await expect.poll(()=>page.evaluate(()=>game.talismanInventory.length)).toBe(1);
    if(info.project.use.isMobile){
        await page.locator('.talisman-inventory-card').click();
        const invalid=await page.evaluate(()=>{
            for(let y=2;y<=5;y++)for(let x=2;x<=5;x++)if(!getTalismanPlacementPreviewAt(x,y).valid)return {x,y};
        });
        await page.locator(`[data-talisman-x="${invalid.x}"][data-talisman-y="${invalid.y}"]`).click();
        await expect(inspector.getByRole('button',{name:'이 위치에 배치'})).toBeDisabled();
        expect(await page.evaluate(()=>game.talismanInventory.length)).toBe(1);
        await inspector.getByRole('button',{name:'취소',exact:true}).click();
    }
    const locked=await page.evaluate(()=>{
        for(let y=0;y<8;y++)for(let x=0;x<8;x++)if(isTalismanBoardCellValid(x,y)&&!isTalismanCellUnlocked(x,y))return {x,y};
    });
    await page.locator(`[data-talisman-x="${locked.x}"][data-talisman-y="${locked.y}"]`).click();
    if(info.project.use.isMobile){
        expect(await page.evaluate(()=>game.currencies.sealShard)).toBe(1000);
        await expect(inspector).toContainText('해금 비용');
        await page.evaluate(()=>{game.currencies.sealShard=0;updateStaticUI();});
        await expect(inspector.getByRole('button',{name:'이 칸 해금'})).toBeDisabled();
        await page.evaluate(()=>{game.currencies.sealShard=1000;updateStaticUI();});
        await inspector.getByRole('button',{name:'이 칸 해금'}).click();
    }
    await expect.poll(()=>page.evaluate(({x,y})=>isTalismanCellUnlocked(x,y),locked)).toBe(true);
    expect(await page.evaluate(()=>game.currencies.sealShard)).toBeLessThan(1000);
    expect(errors).toEqual([]);
});
